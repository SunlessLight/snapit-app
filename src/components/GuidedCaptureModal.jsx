import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Camera, Loader2, AlertTriangle, ShieldAlert } from 'lucide-react';
import {
  computeLuminance,
  computeLaplacianVariance,
  evaluateTilt,
  evaluateBrightness,
  evaluateBlur,
  evaluateAngle,
  TILT_THRESHOLD_DEG,
} from '../utils/captureHeuristics';

const ANALYSIS_INTERVAL_MS = 200;
const DEBOUNCE_TICKS = 2; // ~400ms at 5Hz
const ANALYSIS_SIZE = 64;

export default function GuidedCaptureModal({ isOpen, onClose, onCapture }) {
  const { t } = useTranslation(['guidedCapture']);

  const videoRef = useRef(null);
  const analysisCanvasRef = useRef(null);
  const captureCanvasRef = useRef(null);
  const streamRef = useRef(null);
  const orientationRef = useRef({ gamma: null, beta: null });
  const orientationListenerRef = useRef(null);
  const analysisIntervalRef = useRef(null);
  const orientationGrantedRef = useRef(false);
  // counter for debouncing warning transitions: { key: { on: int, off: int } }
  const tickCountersRef = useRef({});

  const [permissionStatus, setPermissionStatus] = useState('idle'); // idle | requesting | granted | denied
  const [videoReady, setVideoReady] = useState(false);
  const [warnings, setWarnings] = useState({});
  const [isCapturing, setIsCapturing] = useState(false);

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (analysisIntervalRef.current) {
      clearInterval(analysisIntervalRef.current);
      analysisIntervalRef.current = null;
    }
    if (orientationListenerRef.current) {
      window.removeEventListener('deviceorientation', orientationListenerRef.current);
      orientationListenerRef.current = null;
    }
    orientationGrantedRef.current = false;
    setVideoReady(false);
    tickCountersRef.current = {};
  }, []);

  const handleClose = useCallback(() => {
    stopStream();
    onClose();
  }, [stopStream, onClose]);

  // Update warnings with debouncing — a warning must persist for DEBOUNCE_TICKS
  // ticks before showing or clearing. Prevents flicker from sensor noise.
  const updateWarning = useCallback((key, shouldShow, payload) => {
    const counters = tickCountersRef.current;
    if (!counters[key]) counters[key] = { on: 0, off: 0 };
    const c = counters[key];

    if (shouldShow) {
      c.on += 1;
      c.off = 0;
    } else {
      c.off += 1;
      c.on = 0;
    }

    setWarnings((prev) => {
      const currentlyOn = prev[key] !== undefined;
      if (shouldShow && !currentlyOn && c.on >= DEBOUNCE_TICKS) {
        return { ...prev, [key]: payload ?? true };
      }
      if (!shouldShow && currentlyOn && c.off >= DEBOUNCE_TICKS) {
        const next = { ...prev };
        delete next[key];
        return next;
      }
      // payload changed (e.g. tilt degree drifted) — update without debounce
      if (shouldShow && currentlyOn && payload !== undefined && prev[key] !== payload) {
        return { ...prev, [key]: payload };
      }
      return prev;
    });
  }, []);

  const analyzeFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = analysisCanvasRef.current;
    if (!video || !canvas || video.videoWidth === 0) return;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, ANALYSIS_SIZE, ANALYSIS_SIZE);
    let imageData;
    try {
      imageData = ctx.getImageData(0, 0, ANALYSIS_SIZE, ANALYSIS_SIZE);
    } catch (err) {
      // Some Safari versions throw when video isn't fully ready yet
      return;
    }

    const luminance = computeLuminance(imageData);
    const variance = computeLaplacianVariance(imageData);
    const brightness = evaluateBrightness(luminance);
    const isBlurry = evaluateBlur(variance);

    const { gamma, beta } = orientationRef.current;
    const tilt = evaluateTilt(gamma);
    const angle = evaluateAngle(beta);

    updateWarning('tilt', !tilt.ok, tilt.ok ? null : { degrees: Math.round(tilt.degrees), side: tilt.side });
    updateWarning('brightness', brightness !== null, brightness);
    updateWarning('blur', isBlurry, true);
    updateWarning('angle', angle !== null, angle);
  }, [updateWarning]);

  const startOrientationListener = useCallback(() => {
    const listener = (event) => {
      orientationRef.current.gamma = event.gamma;
      orientationRef.current.beta = event.beta;
    };
    window.addEventListener('deviceorientation', listener);
    orientationListenerRef.current = listener;
    orientationGrantedRef.current = true;
  }, []);

  const startCamera = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setPermissionStatus('denied');
      return;
    }

    setPermissionStatus('requesting');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 4096 },
          height: { ideal: 4096 },
        },
        audio: false,
      });
      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      video.srcObject = stream;
      setPermissionStatus('granted');

      // iOS 13+ requires explicit DeviceOrientation permission via a user gesture.
      // The original modal-open tap qualifies. ?.() because the method doesn't
      // exist on Android/desktop.
      if (typeof DeviceOrientationEvent !== 'undefined' &&
          typeof DeviceOrientationEvent.requestPermission === 'function') {
        try {
          const state = await DeviceOrientationEvent.requestPermission();
          if (state === 'granted') startOrientationListener();
        } catch {
          // user denied or unsupported — heuristics still work without tilt/angle
        }
      } else {
        startOrientationListener();
      }
    } catch (err) {
      console.warn('getUserMedia failed:', err);
      setPermissionStatus('denied');
    }
  }, [startOrientationListener]);

  // Lifecycle: open modal → request permission → start analysis loop
  useEffect(() => {
    if (!isOpen) return;
    startCamera();
    return () => stopStream();
  }, [isOpen, startCamera, stopStream]);

  // Start analysis loop only once stream is live and video has dimensions
  useEffect(() => {
    if (!videoReady || permissionStatus !== 'granted') return;
    analysisIntervalRef.current = setInterval(analyzeFrame, ANALYSIS_INTERVAL_MS);
    return () => {
      if (analysisIntervalRef.current) {
        clearInterval(analysisIntervalRef.current);
        analysisIntervalRef.current = null;
      }
    };
  }, [videoReady, permissionStatus, analyzeFrame]);

  // Pause analysis when tab backgrounded (Safari may freeze the video element)
  useEffect(() => {
    if (!isOpen) return;
    const onVisibility = () => {
      if (document.hidden && analysisIntervalRef.current) {
        clearInterval(analysisIntervalRef.current);
        analysisIntervalRef.current = null;
      } else if (!document.hidden && videoReady && permissionStatus === 'granted' && !analysisIntervalRef.current) {
        analysisIntervalRef.current = setInterval(analyzeFrame, ANALYSIS_INTERVAL_MS);
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [isOpen, videoReady, permissionStatus, analyzeFrame]);

  const handleVideoMetadata = () => setVideoReady(true);

  const handleShutter = () => {
    const video = videoRef.current;
    const canvas = captureCanvasRef.current;
    if (!video || !canvas || isCapturing || video.videoWidth === 0) return;
    setIsCapturing(true);
    navigator.vibrate?.(50);

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setIsCapturing(false);
          return;
        }
        const file = new File([blob], `snapit-capture-${Date.now()}.jpg`, { type: 'image/jpeg' });
        const previewUrl = URL.createObjectURL(blob);
        onCapture(file, previewUrl);
        stopStream();
        onClose();
      },
      'image/jpeg',
      0.92,
    );
  };

  if (!isOpen) return null;

  const isReady =
    permissionStatus === 'granted' && videoReady && Object.keys(warnings).length === 0;
  const showTiltIndicator = orientationGrantedRef.current && orientationRef.current.gamma != null;

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Close button */}
      <button
        onClick={handleClose}
        className="absolute top-4 right-4 z-20 w-10 h-10 rounded-full bg-black/40 text-white flex items-center justify-center backdrop-blur-sm"
        aria-label={t('guidedCapture:ui.closeAlt')}
      >
        <X size={22} strokeWidth={2.5} />
      </button>

      {/* Permission requesting */}
      {permissionStatus === 'requesting' && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center text-white gap-3 p-8 text-center">
          <Loader2 className="w-10 h-10 animate-spin text-[#dc2626]" />
          <p className="text-sm opacity-80">{t('guidedCapture:permission.requesting')}</p>
        </div>
      )}

      {/* Permission denied fallback */}
      {permissionStatus === 'denied' && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center text-white gap-4 p-8 text-center bg-[#1a0f0d]">
          <ShieldAlert className="w-12 h-12 text-[#dc2626]" />
          <h2 className="font-serif text-xl font-bold">{t('guidedCapture:permission.denied')}</h2>
          <p className="text-sm opacity-80 max-w-xs">{t('guidedCapture:permission.deniedHint')}</p>
          <button
            onClick={handleClose}
            className="mt-4 bg-[#dc2626] text-white px-6 py-3 rounded-2xl font-semibold"
          >
            {t('guidedCapture:permission.fallbackButton')}
          </button>
        </div>
      )}

      {/* Live preview */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        onLoadedMetadata={handleVideoMetadata}
        className="absolute inset-0 w-full h-full object-cover"
      />

      {/* Hidden canvases */}
      <canvas
        ref={analysisCanvasRef}
        width={ANALYSIS_SIZE}
        height={ANALYSIS_SIZE}
        className="hidden"
      />
      <canvas ref={captureCanvasRef} className="hidden" />

      {permissionStatus === 'granted' && (
        <>
          {/* Rule-of-thirds grid overlay */}
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none"
            preserveAspectRatio="none"
            viewBox="0 0 3 3"
          >
            <line x1="1" y1="0" x2="1" y2="3" stroke="white" strokeWidth="0.01" strokeOpacity="0.5" />
            <line x1="2" y1="0" x2="2" y2="3" stroke="white" strokeWidth="0.01" strokeOpacity="0.5" />
            <line x1="0" y1="1" x2="3" y2="1" stroke="white" strokeWidth="0.01" strokeOpacity="0.5" />
            <line x1="0" y1="2" x2="3" y2="2" stroke="white" strokeWidth="0.01" strokeOpacity="0.5" />
          </svg>

          {/* Tilt indicator — horizontal level bar */}
          {showTiltIndicator && (
            <div className="absolute top-20 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
              <div className="relative w-40 h-1 bg-white/30 rounded-full">
                <div
                  className={`absolute top-1/2 left-1/2 -translate-y-1/2 w-3 h-3 rounded-full -ml-1.5 transition-all ${
                    warnings.tilt ? 'bg-[#dc2626]' : 'bg-green-400'
                  }`}
                  style={{
                    transform: `translateX(${Math.max(-80, Math.min(80, (orientationRef.current.gamma || 0) * 4))}px) translateY(-50%)`,
                  }}
                />
              </div>
            </div>
          )}

          {/* Warning chips */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex flex-col gap-2 items-center max-w-[90vw]">
            {warnings.tilt && (
              <WarningChip>
                {warnings.tilt.side === 'left'
                  ? t('guidedCapture:warnings.tiltLeft', { degrees: warnings.tilt.degrees })
                  : t('guidedCapture:warnings.tiltRight', { degrees: warnings.tilt.degrees })}
              </WarningChip>
            )}
            {warnings.brightness === 'dark' && (
              <WarningChip>{t('guidedCapture:warnings.tooDark')}</WarningChip>
            )}
            {warnings.brightness === 'bright' && (
              <WarningChip>{t('guidedCapture:warnings.tooBright')}</WarningChip>
            )}
            {warnings.blur && (
              <WarningChip>{t('guidedCapture:warnings.blurry')}</WarningChip>
            )}
          </div>

          {/* Angle hint (bottom, above shutter) */}
          {warnings.angle && (
            <div className="absolute bottom-32 left-1/2 -translate-x-1/2 z-10 px-3 py-1 rounded-full bg-black/50 text-white text-xs font-semibold backdrop-blur-sm">
              {warnings.angle === 'topDown'
                ? t('guidedCapture:hints.topDown')
                : t('guidedCapture:hints.angle45')}
            </div>
          )}

          {/* Ready label */}
          {isReady && (
            <div className="absolute bottom-44 left-1/2 -translate-x-1/2 z-10 px-3 py-1 rounded-full bg-green-500/90 text-white text-xs font-bold uppercase tracking-wide">
              {t('guidedCapture:hints.ready')}
            </div>
          )}

          {/* Shutter button */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10">
            <button
              onClick={handleShutter}
              disabled={isCapturing || !videoReady}
              className={`w-20 h-20 rounded-full border-4 flex items-center justify-center shadow-2xl active:scale-95 transition-all disabled:opacity-50 ${
                isReady
                  ? 'bg-green-500 border-white'
                  : 'bg-[#dc2626] border-white'
              }`}
              aria-label={t('guidedCapture:ui.shutterAlt')}
            >
              {isCapturing ? (
                <Loader2 size={28} className="text-white animate-spin" />
              ) : (
                <Camera size={28} className="text-white" strokeWidth={2} />
              )}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function WarningChip({ children }) {
  return (
    <div className="px-3 py-1.5 rounded-full bg-[#dc2626]/90 text-white text-xs font-semibold backdrop-blur-sm flex items-center gap-1.5 shadow-md">
      <AlertTriangle size={12} strokeWidth={2.5} />
      {children}
    </div>
  );
}
