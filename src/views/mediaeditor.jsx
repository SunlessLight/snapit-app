import React, { useState, useRef, useEffect } from 'react';
import {
    Sparkles,
    SlidersHorizontal,
    Crop as CropIcon,
    ArrowLeft,
    ArrowRight,
    X,
    Sun,
    Contrast,
    Droplets,
    Check,
    RotateCcw,
    Palette,
    Aperture,
    Focus,
    CircleDot,
    Maximize,
    Square,
    RectangleVertical,
    RectangleHorizontal,
    Smartphone,
    Monitor,
    Loader2,
    Image as ImageIcon
} from 'lucide-react';

import { motion } from 'framer-motion';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
import ReactCrop, { centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { useTranslation } from 'react-i18next';
import SegmentedControl from '../components/SegmentedControl';
import { needsClaidEnhance, recommendLocalEnhance, LOCAL_ENHANCE_FALLBACK } from '../utils/captureHeuristics';
import { cropBlobToRect, getBlobDimensions } from '../utils/imageUtils';
import { authService } from '../services/authService';

// Downsample size for the enhance-cost gate. Matches dashboard's photo-check
// canvas — small enough to read pixels in <100ms, big enough for the blur/
// exposure heuristics to be meaningful.
const ENHANCE_ANALYSIS_SIZE = 512;

const ASPECT_RATIOS = [
    { label: 'Free', value: undefined, icon: Maximize },
    { label: '1:1', value: 1, icon: Square },
    { label: '4:5', value: 4 / 5, icon: RectangleVertical },
    { label: '9:16', value: 9 / 16, icon: Smartphone },
    { label: '5:4', value: 5 / 4, icon: RectangleHorizontal },
    { label: '16:9', value: 16 / 9, icon: Monitor },
    { label: '3:4', value: 3 / 4, icon: ImageIcon },
];


// --- Helper Functions (Preserved from your backend logic) ---
async function getCroppedImg(imageElement, cropConfig) {
    const canvas = document.createElement('canvas');
    const scaleX = imageElement.naturalWidth / imageElement.width;
    const scaleY = imageElement.naturalHeight / imageElement.height;

    canvas.width = Math.floor(cropConfig.width * scaleX);
    canvas.height = Math.floor(cropConfig.height * scaleY);

    const ctx = canvas.getContext('2d');

    ctx.drawImage(
        imageElement,
        cropConfig.x * scaleX,
        cropConfig.y * scaleY,
        cropConfig.width * scaleX,
        cropConfig.height * scaleY,
        0,
        0,
        canvas.width,
        canvas.height
    );

    return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
            if (!blob) {
                reject(new Error('Canvas is empty'));
                return;
            }
            blob.name = 'cropped_image.jpeg';
            resolve(blob);
        }, 'image/jpeg', 1.0);
    });
}

// Enhance-cost gate (budget §6a). Decode a File to downsampled ImageData and ask
// the heuristics whether this photo actually needs Claid's paid enhance, or
// whether a free local pass suffices. On any decode failure we resolve to
// { needed: true } — i.e. fail OPEN to Claid, because a photo we couldn't read
// is exactly the kind we shouldn't silently downgrade. Mirrors dashboard's
// runPhotoCheck so the two cost gates read the same way.
async function shouldUseClaidEnhance(file) {
    try {
        const url = URL.createObjectURL(file);
        try {
            const result = await new Promise((resolve) => {
                const img = new Image();
                img.onload = () => {
                    const naturalDimensions = { width: img.naturalWidth, height: img.naturalHeight };
                    const canvas = document.createElement('canvas');
                    canvas.width = ENHANCE_ANALYSIS_SIZE;
                    canvas.height = ENHANCE_ANALYSIS_SIZE;
                    const ctx = canvas.getContext('2d', { willReadFrequently: true });
                    if (!ctx) return resolve({ needed: true, reasons: ['decode'] });
                    ctx.drawImage(img, 0, 0, ENHANCE_ANALYSIS_SIZE, ENHANCE_ANALYSIS_SIZE);
                    try {
                        const imageData = ctx.getImageData(0, 0, ENHANCE_ANALYSIS_SIZE, ENHANCE_ANALYSIS_SIZE);
                        // Same decode feeds both the spend decision AND the adaptive
                        // local-enhance values, so the local pass is tuned to this photo
                        // instead of a fixed bump (the old washout bug).
                        resolve({
                            ...needsClaidEnhance(imageData, naturalDimensions),
                            adjustments: recommendLocalEnhance(imageData),
                        });
                    } catch {
                        resolve({ needed: true, reasons: ['decode'] });
                    }
                };
                img.onerror = () => resolve({ needed: true, reasons: ['decode'] });
                img.src = url;
            });
            return result;
        } finally {
            URL.revokeObjectURL(url);
        }
    } catch {
        return { needed: true, reasons: ['decode'] };
    }
}

// 1. Add this helper outside your component
function centerAspectCrop(mediaWidth, mediaHeight, aspect) {
    return centerCrop(makeAspectCrop({ unit: '%', width: 90 }, aspect, mediaWidth, mediaHeight), mediaWidth, mediaHeight);
}

export default function MediaEditorView({ mediaState, setMediaState, onBalanceUpdate, onNext, onPrev }) {
    const { t } = useTranslation(['mediaEditor', 'common']);
    // UI State Machine: 'DEFAULT' | 'ADJUST' | 'CROP'
    const [controlState, setControlState] = useState('DEFAULT');

    // Logic States
    const [cachedValues, setCachedValues] = useState(null);
    const [isProcessingCrop, setIsProcessingCrop] = useState(false);
    const [isEnhancing, setIsEnhancing] = useState(false);
    const [crop, setCrop] = useState();
    const [completedCrop, setCompletedCrop] = useState(null);
    const imgRef = useRef(null);

    const activeImg = mediaState;
    const isPro = !!activeImg.isMediaEditorPro;

    // Crop aspect: Pro ON defaults to Free (undefined), Pro OFF locks to 4/5
    const [cropAspect, setCropAspect] = useState(isPro ? undefined : 4 / 5);

    // Snap aspect to 4/5 if user toggles Pro OFF while in crop mode
    useEffect(() => {
        if (!isPro && cropAspect !== 4 / 5) {
            setCropAspect(4 / 5);
            if (imgRef.current) {
                const { width, height } = imgRef.current;
                setCrop(centerAspectCrop(width, height, 4 / 5));
            }
        }
    }, [isPro]);

    const handleAspectChange = (newAspect) => {
        setCropAspect(newAspect);
        if (imgRef.current) {
            const { width, height } = imgRef.current;
            if (newAspect === undefined) {
                setCrop(undefined);
                setCompletedCrop(null);
            } else {
                setCrop(centerAspectCrop(width, height, newAspect));
            }
        }
    };

    const handleProToggle = (value) => {
        const nextPro = value === 'PRO';
        setMediaState(prev => ({ ...prev, isMediaEditorPro: nextPro }));
    };

    // --- Actions ---
    // Free local enhance: a brightness/contrast/saturation nudge that gets baked
    // into the final JPEG by ContextConfiguration.createProcessedBlob. Two callers:
    // (1) the cost gate, when a photo is already good enough that Claid's paid
    //     upscale/polish would add nothing — this is the credit-saving path;
    // (2) the failure fallback, so the button is never a dead end when Claid is
    //     unreachable. Caches prior slider values for the revert click.
    const applyLocalEnhance = (adjustments) => {
        // `adjustments` is measured per-photo by the cost gate (recommendLocalEnhance).
        // When absent (demo image / decode failure) fall back to a gentle, can't-wash-
        // out default. Either way these are slider values (50 = no change) that
        // ContextConfiguration.createProcessedBlob bakes into the final JPEG.
        const adj = adjustments ?? LOCAL_ENHANCE_FALLBACK;
        setCachedValues({
            b: activeImg.brightness, c: activeImg.contrast, s: activeImg.saturation,
            h: activeImg.hue, bl: activeImg.blur, sh: activeImg.sharpness, v: activeImg.vignette
        });
        setMediaState(prev => ({
            ...prev,
            brightness: adj.brightness, contrast: adj.contrast, saturation: adj.saturation,
            isEnhanced: true,
        }));
    };

    const handleAutoEnhance = async () => {
        if (isEnhancing) return;

        // Revert path. Restores image only — slider values are intentionally not
        // touched here (per Phase 6 spec). If we came from the dummy fallback we still
        // have cachedValues, so restore those too; otherwise sliders stay where they are.
        if (activeImg.isEnhanced) {
            setMediaState(prev => {
                // Only revoke a URL the *Claid* enhance minted (preEnhanceUrl is set,
                // and the current url differs from it). The local-enhance path never
                // swaps the file/url — preEnhanceUrl stays null — so here prev.url IS
                // the live image; revoking it (the old bug) killed the photo, and the
                // `?? prev.url` restore below then handed back a dead blob URL → the
                // "image disappears after enhance → revert → crop" report.
                if (prev.preEnhanceUrl && prev.url && prev.url !== prev.preEnhanceUrl) {
                    URL.revokeObjectURL(prev.url);
                }
                const restoredSliders = cachedValues ? {
                    brightness: cachedValues.b, contrast: cachedValues.c, saturation: cachedValues.s,
                    hue: cachedValues.h ?? prev.hue, blur: cachedValues.bl ?? prev.blur,
                    sharpness: cachedValues.sh ?? prev.sharpness, vignette: cachedValues.v ?? prev.vignette,
                } : {};
                return {
                    ...prev,
                    ...restoredSliders,
                    file: prev.preEnhanceFile ?? prev.file,
                    url: prev.preEnhanceUrl ?? prev.url,
                    preEnhanceFile: null,
                    preEnhanceUrl: null,
                    isEnhanced: false,
                };
            });
            setCachedValues(null);
            return;
        }

        // Enhance path. Requires originalFile (set on upload). Defensive guard for the
        // demo-image case where the user lands in step 2 without uploading anything.
        if (!activeImg.originalFile) {
            applyLocalEnhance();
            return;
        }

        setIsEnhancing(true);
        const controller = new AbortController();
        // Declared outside the try so the catch fallback can reuse the per-photo
        // adjustments if the gate already measured them before Claid threw.
        let gateAdjustments;
        try {
            // Cost gate (budget §6a). Only spend a Claid credit when the photo
            // needs what Claid uniquely does (recover blur, upscale low-res,
            // rescue severe exposure). A sharp, well-exposed, ≥1024px photo gets
            // the free local enhance instead — same visible "enhanced" state, no
            // credit burned. Fails open to Claid if the photo can't be decoded.
            const { needed, reasons, adjustments } = await shouldUseClaidEnhance(activeImg.originalFile);
            gateAdjustments = adjustments;
            if (!needed) {
                console.info('Enhance: photo already good — local enhance, Claid skipped (saved 1 credit).');
                applyLocalEnhance(adjustments);
                setIsEnhancing(false);
                return;
            }
            console.info('Enhance: Claid needed —', reasons.join(', '));

            const formData = new FormData();
            formData.append('image', activeImg.originalFile);

            const response = await fetch(`${API_BASE_URL}/api/enhance`, {
                method: 'POST',
                headers: await authService.authHeader(),
                body: formData,
                signal: controller.signal,
            });

            // Auth/credit/rate-limit: tell the vendor why, then still give them
            // the free local enhance (it costs no credit) so the button isn't a
            // dead end when they're out of paid enhances.
            if (response.status === 402 || response.status === 401 || response.status === 429) {
                const msg = response.status === 402 ? t('common:credits.outOfCredits')
                    : response.status === 401 ? t('common:credits.authExpired')
                        : t('common:credits.rateLimited');
                alert(msg);
                applyLocalEnhance(gateAdjustments);
                return;
            }
            if (!response.ok) {
                throw new Error(`Enhance failed: HTTP ${response.status}`);
            }

            const claidBlob = await response.blob();
            const newBalance = Number(response.headers.get('X-Credit-Balance'));
            if (!Number.isNaN(newBalance)) onBalanceUpdate?.(newBalance);
            let finalBlob = claidBlob;
            if (activeImg.compositeCropRect) {
                // compositeCropRect is in the ORIGINAL upload's natural pixels, but
                // Claid upscales its output (resizing 150%), so the enhanced blob is
                // on a larger pixel grid. Rescale the rect by the enhanced/original
                // dimension ratio so the crop lands in the same place it would have on
                // the original. Without this the rect samples the top-left fraction of
                // the bigger image — the "much bigger, only top-left corner" bug.
                const [origDims, enhDims] = await Promise.all([
                    getBlobDimensions(activeImg.originalFile),
                    getBlobDimensions(claidBlob),
                ]);
                const sx = enhDims.width / origDims.width;
                const sy = enhDims.height / origDims.height;
                const scaledRect = {
                    x: activeImg.compositeCropRect.x * sx,
                    y: activeImg.compositeCropRect.y * sy,
                    width: activeImg.compositeCropRect.width * sx,
                    height: activeImg.compositeCropRect.height * sy,
                };
                finalBlob = await cropBlobToRect(claidBlob, scaledRect);
            }

            const newUrl = URL.createObjectURL(finalBlob);
            setMediaState(prev => ({
                ...prev,
                file: finalBlob,
                url: newUrl,
                preEnhanceFile: prev.file,
                preEnhanceUrl: prev.url,
                isEnhanced: true,
                // Claid bakes brightness/contrast/saturation. Reset CSS-filter sliders so
                // any subsequent user tweak is additive, not compounded on top.
                brightness: 50, contrast: 50, saturation: 50,
                hue: 50, blur: 0, sharpness: 0, vignette: 0,
            }));
            setCachedValues(null);
        } catch (err) {
            console.error('Claid enhance failed, falling back to local slider-nudge:', err);
            alert(t('mediaEditor:enhance.failed'));
            applyLocalEnhance(gateAdjustments);
        } finally {
            setIsEnhancing(false);
        }
    };

    const handleSliderChange = (key, value) => {
        setMediaState(prev => ({ ...prev, [key]: Number(value), isEnhanced: false }));
    };

    const handleApplyCrop = async () => {
        if (!completedCrop || !imgRef.current) {
            setControlState('DEFAULT');
            return;
        }

        try {
            setIsProcessingCrop(true);
            const newBlob = await getCroppedImg(imgRef.current, completedCrop);
            const newUrl = URL.createObjectURL(newBlob);

            // Record the crop as FRACTIONS of the displayed image, then map those
            // onto the region of the ORIGINAL upload the displayed image represents.
            // This keeps compositeCropRect in originalFile pixels regardless of how
            // many times Claid upscaled the working file — so Results Hub can re-crop
            // the 1× original in-bounds. (Reading el.naturalWidth here would record the
            // rect in the *enhanced* grid, the bug that baked black borders into the
            // "before" image when a crop followed an enhance.)
            const el = imgRef.current;
            const fx = completedCrop.x / el.width;
            const fy = completedCrop.y / el.height;
            const fw = completedCrop.width / el.width;
            const fh = completedCrop.height / el.height;

            // Original-space dimensions — needed when this is the first crop on an
            // already-enhanced file, where el.naturalWidth != originalFile width.
            const origDims = await getBlobDimensions(activeImg.originalFile);

            setMediaState(prev => {
                // Never revoke the working url if it's actually originalUrl or
                // preEnhanceUrl — those are still referenced elsewhere (Results Hub's
                // "before" image reads originalUrl; revert restores preEnhanceUrl).
                // After enhance→revert the working url can alias one of them; revoking
                // it here would dangle that reference (latent sibling of the revert bug).
                if (prev.url && prev.url !== prev.originalUrl && prev.url !== prev.preEnhanceUrl) {
                    URL.revokeObjectURL(prev.url);
                }
                // The sub-rect of the ORIGINAL that the displayed image currently shows.
                const region = prev.compositeCropRect
                    ?? { x: 0, y: 0, width: origDims.width, height: origDims.height };
                const composed = {
                    x: region.x + fx * region.width,
                    y: region.y + fy * region.height,
                    width: fw * region.width,
                    height: fh * region.height,
                };
                return {
                    ...prev,
                    file: newBlob,
                    url: newUrl,
                    compositeCropRect: composed,
                };
            });

            setControlState('DEFAULT');
        } catch (err) {
            console.error("Failed to crop image:", err);
            // Assuming you'll hook this to your Toast system later
            alert(t('mediaEditor:crop.applyFailed'));
        } finally {
            setIsProcessingCrop(false);
            setCompletedCrop(null);
        }
    };

    const onImageLoad = (e) => {
        const { width, height } = e.currentTarget;
        if (cropAspect === undefined) {
            // Free-form: let user draw their own selection
            setCrop(undefined);
        } else {
            setCrop(centerAspectCrop(width, height, cropAspect));
        }
    };

    const handleReset = () => {
        setMediaState(prev => ({
            ...prev,
            brightness: 50,
            contrast: 50,
            saturation: 50,
            hue: 50,
            blur: 0,
            sharpness: 0,
            vignette: 0,
            isEnhanced: false
        }));
        setCachedValues(null);
    };


    // Calculate dynamic CSS filters based on 50 being the "Normal" baseline
    const hueDeg = ((activeImg.hue ?? 50) - 50) * 3.6;
    const blurPx = (activeImg.blur ?? 0) / 25;
    const sharpenRef = (activeImg.sharpness ?? 0) > 0 ? ' url(#snapit-sharpen)' : '';
    const imageFilters = {
        filter: `contrast(${activeImg.contrast / 50}) saturate(${activeImg.saturation / 50}) brightness(${activeImg.brightness / 50}) hue-rotate(${hueDeg}deg) blur(${blurPx}px)${sharpenRef}`
    };
    const vignetteOpacity = (activeImg.vignette ?? 0) / 100;

    return (
        <div className="min-h-full w-full bg-[#fff8f6] text-[#1a0f0d] font-sans flex flex-col md:py-8 px-4 md:px-12">

            <svg width="0" height="0" className="absolute">
                <defs>
                    <linearGradient id="gemini-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#4285F4" />
                        <stop offset="33%" stopColor="#9B72CB" />
                        <stop offset="66%" stopColor="#D96570" />
                        <stop offset="100%" stopColor="#F4B400" />
                    </linearGradient>
                </defs>
            </svg>

            <style>{`
                @keyframes aiShine {
                    0%, 100% { box-shadow: 0 0 8px rgba(155, 114, 203, 0.4); }
                    50% { box-shadow: 0 0 20px rgba(66, 133, 244, 0.7), inset 0 0 10px rgba(217, 101, 112, 0.2); }
                }
                .ai-shine-active { animation: aiShine 2s ease-in-out infinite; }
            `}</style>

            <div className="max-w-6xl mx-auto w-full flex flex-col flex-1 min-h-0">

                <section className="flex-1 flex flex-col justify-center animate-fade-in w-full min-h-0 max-w-3xl mx-auto pb-2 md:pb-4">

                    {/* Hero Text */}
                    <div className="text-center pt-4 md:mb-6 flex-shrink-0">
                        <h2 className="font-serif text-2xl md:text-5xl font-extrabold mb-1 md:mb-3">{t('mediaEditor:hero')}</h2>
                    </div>

                    {/* Pro toggle (above-right of the main card) */}
                    <div className={`flex justify-end mb-2 md:mb-3 flex-shrink-0 ${isEnhancing ? 'opacity-50 pointer-events-none' : ''}`}>
                        <SegmentedControl
                            options={['STA', 'PRO']}
                            selected={isPro ? 'PRO' : 'STA'}
                            onChange={handleProToggle}
                            size="sm"
                        />
                    </div>

                    {/* FIX 2: The Main Container Card. Allowed it to expand its height dynamically by changing flex properties. */}
                    <div className="bg-white rounded-2xl md:rounded-3xl p-3 md:p-6 shadow-sm border border-gray-100 flex-1 flex flex-col relative min-h-[400px]">

                        {/* Top: Image Preview Zone (The Shock Absorber) */}
                        {/* FIX 3: Removed max-h-[50vh] and strict min-h-[250px]. Used flex-1 and a smaller min-h-[150px] to act as a spring */}
                        <div className="flex-1 bg-[#f3e9e6]/50 rounded-xl md:rounded-2xl overflow-hidden relative flex items-center justify-center min-h-[150px] md:min-h-[250px] p-2">
                            {controlState === 'CROP' ? (
                                <div className={`w-full h-full flex items-center justify-center transition-opacity ${isProcessingCrop ? 'opacity-50' : 'opacity-100'}`}>
                                    <ReactCrop
                                        crop={crop}
                                        onChange={(_, percentCrop) => setCrop(percentCrop)}
                                        onComplete={(c) => setCompletedCrop(c)}
                                        aspect={cropAspect}
                                        className="max-h-full flex items-center justify-center"
                                    >
                                        <img
                                            ref={imgRef}
                                            src={activeImg.url}
                                            alt="Crop Target"
                                            onLoad={onImageLoad}
                                            className="max-h-full max-w-full w-auto object-contain rounded-md"
                                        />
                                    </ReactCrop>
                                </div>
                            ) : (
                                <div className="relative max-w-full max-h-full flex items-center justify-center">
                                    <img
                                        src={activeImg.url}
                                        alt="Preview"
                                        className={`max-w-full max-h-full object-contain transition-all duration-300 rounded-md ${isEnhancing ? 'opacity-50' : ''}`}
                                        style={imageFilters}
                                    />
                                    {vignetteOpacity > 0 && (
                                        <div
                                            className="absolute inset-0 rounded-md pointer-events-none"
                                            style={{
                                                background: 'radial-gradient(circle, transparent 45%, rgba(0,0,0,0.85) 100%)',
                                                opacity: vignetteOpacity
                                            }}
                                        />
                                    )}
                                    {isEnhancing && (
                                        <div className="absolute inset-0 rounded-md overflow-hidden pointer-events-auto">
                                            {/* Soft pastel sweep — same gradient + keyframes as the
                                                Processing screen so both "AI working" moments read as
                                                one system. bg-white/60 backing keeps the pastels true
                                                over a busy photo. */}
                                            <div className="absolute inset-0 bg-white/60" />
                                            <motion.div
                                                animate={{ backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }}
                                                transition={{ duration: 8, ease: "linear", repeat: Infinity }}
                                                className="absolute inset-0 opacity-90"
                                                style={{
                                                    background: "linear-gradient(-45deg, #e0f2fe, #ede9fe, #ffedd5, #d1fae5, #fae8ff, #fff7ed)",
                                                    backgroundSize: "300% 300%"
                                                }}
                                            />
                                            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                                                <span className="text-xs font-semibold uppercase tracking-wider text-gray-600">
                                                    {t('mediaEditor:enhance.loading')}
                                                </span>
                                                {/* Thin shimmer bar, mirrors Processing's minimal loader */}
                                                <div className="w-40 h-1 bg-gray-200/70 rounded-full overflow-hidden relative">
                                                    <motion.div
                                                        animate={{ x: ["-100%", "200%"] }}
                                                        transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                                                        className="absolute top-0 bottom-0 w-1/2 bg-gradient-to-r from-transparent via-gray-400/40 to-transparent rounded-full"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Middle: Interaction Zone */}
                        <div className="mt-4 md:mt-6 flex-shrink-0 min-h-[80px] md:min-h-[100px] flex items-center justify-center px-2">
                            <div className="relative w-full max-w-sm mx-auto">

                                {/* RESET BUTTON */}
                                {controlState !== 'CROP' && (
                                    <button
                                        onClick={handleReset}
                                        disabled={isEnhancing}
                                        className={`absolute top-0 ${controlState === 'ADJUST' ? 'left-0' : 'right-0'} p-2 rounded-full bg-gray-50 text-gray-400 md:hover:bg-gray-100 md:hover:text-gray-700 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed`}
                                        title={t('mediaEditor:actions.resetTitle')}
                                    >
                                        <RotateCcw size={16} className="md:w-[18px] md:h-[18px]" strokeWidth={2.5} />
                                    </button>
                                )}

                                {/* X (CLOSE) BUTTON */}
                                {controlState === 'ADJUST' && (
                                    <button
                                        onClick={() => setControlState('DEFAULT')}
                                        className="absolute top-0 right-0 p-2 rounded-full bg-gray-50 text-gray-400 md:hover:bg-red-50 md:hover:text-[#dc2626] active:bg-[#dc2626] active:text-white active:shadow-[0_0_15px_rgba(220,38,38,0.6)] transition-all"
                                    >
                                        <X size={16} className="md:w-[18px] md:h-[18px]" strokeWidth={2.5} />
                                    </button>
                                )}

                                {/* STATE: DEFAULT */}
                                {controlState === 'DEFAULT' && (
                                    <div className="flex items-center justify-center gap-4 md:gap-10 animate-[fadeIn_0.2s_ease]">
                                        {/* Enhance */}
                                        <div className="flex flex-col items-center gap-1.5 md:gap-2">
                                            <button
                                                onClick={handleAutoEnhance}
                                                disabled={isEnhancing}
                                                className={`w-12 h-12 md:w-16 md:h-16 rounded-2xl flex items-center justify-center transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed ${activeImg.isEnhanced
                                                    ? 'bg-white border border-gray-100 ai-shine-active'
                                                    : 'bg-gray-50 md:hover:bg-gray-100'
                                                    }`}
                                            >
                                                <Sparkles size={20} className="md:w-6 md:h-6" stroke={activeImg.isEnhanced ? "url(#gemini-gradient)" : "#6b7280"} />
                                            </button>
                                            <span className="text-[9px] md:text-xs font-semibold uppercase tracking-wider text-gray-500">
                                                {t('mediaEditor:actions.aiEnhance')}
                                            </span>
                                        </div>

                                        {/* Crop */}
                                        <div className="flex flex-col items-center gap-1.5 md:gap-2">
                                            <button
                                                onClick={() => setControlState('CROP')}
                                                disabled={isEnhancing}
                                                className="w-12 h-12 md:w-16 md:h-16 rounded-2xl bg-gray-50 text-gray-700 md:hover:bg-gray-100 flex items-center justify-center transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                <CropIcon size={20} className="md:w-6 md:h-6" />
                                            </button>
                                            <span className="text-[9px] md:text-xs font-semibold uppercase tracking-wider text-gray-500">
                                                {t('mediaEditor:actions.crop')}
                                            </span>
                                        </div>

                                        {/* Adjust */}
                                        <div className="flex flex-col items-center gap-1.5 md:gap-2">
                                            <button
                                                onClick={() => setControlState('ADJUST')}
                                                disabled={isEnhancing}
                                                className="w-12 h-12 md:w-16 md:h-16 rounded-2xl bg-gray-50 text-gray-700 md:hover:bg-gray-100 flex items-center justify-center transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                <SlidersHorizontal size={20} className="md:w-6 md:h-6" />
                                            </button>
                                            <span className="text-[9px] md:text-xs font-semibold uppercase tracking-wider text-gray-500">
                                                {t('mediaEditor:actions.adjust')}
                                            </span>
                                        </div>
                                    </div>
                                )}

                                {/* STATE: ADJUST */}
                                {controlState === 'ADJUST' && (
                                    <div className="flex flex-col gap-4 mt-6 md:mt-8 pt-4 animate-[fadeIn_0.2s_ease]">
                                        <div className="flex items-center gap-2 md:gap-3">
                                            <Sun size={16} className="md:w-[18px] md:h-[18px] text-gray-400" />
                                            <span className="w-16 md:w-20 text-[10px] md:text-xs font-medium text-gray-600">{t('mediaEditor:sliders.brightness')}</span>
                                            <input type="range" min="0" max="100" value={activeImg.brightness} onChange={(e) => handleSliderChange('brightness', e.target.value)}
                                                className="flex-1 h-1 bg-gray-200 rounded-full appearance-none accent-gray-800 outline-none" />
                                        </div>
                                        <div className="flex items-center gap-2 md:gap-3">
                                            <Contrast size={16} className="md:w-[18px] md:h-[18px] text-gray-400" />
                                            <span className="w-16 md:w-20 text-[10px] md:text-xs font-medium text-gray-600">{t('mediaEditor:sliders.contrast')}</span>
                                            <input type="range" min="0" max="100" value={activeImg.contrast} onChange={(e) => handleSliderChange('contrast', e.target.value)}
                                                className="flex-1 h-1 bg-gray-200 rounded-full appearance-none accent-gray-800 outline-none" />
                                        </div>
                                        <div className="flex items-center gap-2 md:gap-3">
                                            <Droplets size={16} className="md:w-[18px] md:h-[18px] text-gray-400" />
                                            <span className="w-16 md:w-20 text-[10px] md:text-xs font-medium text-gray-600">{t('mediaEditor:sliders.saturation')}</span>
                                            <input type="range" min="0" max="100" value={activeImg.saturation} onChange={(e) => handleSliderChange('saturation', e.target.value)}
                                                className="flex-1 h-1 bg-gray-200 rounded-full appearance-none accent-gray-800 outline-none" />
                                        </div>

                                        {isPro && (
                                            <>
                                                <div className="flex items-center gap-2 pt-2 mt-1 border-t border-gray-100">
                                                    <span className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-[#dc2626]">{t('mediaEditor:proLabel')}</span>
                                                    <div className="flex-1 h-px bg-gradient-to-r from-red-100 to-transparent" />
                                                </div>
                                                <div className="flex items-center gap-2 md:gap-3">
                                                    <Palette size={16} className="md:w-[18px] md:h-[18px] text-gray-400" />
                                                    <span className="w-16 md:w-20 text-[10px] md:text-xs font-medium text-gray-600">{t('mediaEditor:sliders.hue')}</span>
                                                    <input type="range" min="0" max="100" value={activeImg.hue ?? 50} onChange={(e) => handleSliderChange('hue', e.target.value)}
                                                        className="flex-1 h-1 bg-gray-200 rounded-full appearance-none accent-gray-800 outline-none" />
                                                </div>
                                                <div className="flex items-center gap-2 md:gap-3">
                                                    <Aperture size={16} className="md:w-[18px] md:h-[18px] text-gray-400" />
                                                    <span className="w-16 md:w-20 text-[10px] md:text-xs font-medium text-gray-600">{t('mediaEditor:sliders.blur')}</span>
                                                    <input type="range" min="0" max="100" value={activeImg.blur ?? 0} onChange={(e) => handleSliderChange('blur', e.target.value)}
                                                        className="flex-1 h-1 bg-gray-200 rounded-full appearance-none accent-gray-800 outline-none" />
                                                </div>
                                                <div className="flex items-center gap-2 md:gap-3">
                                                    <Focus size={16} className="md:w-[18px] md:h-[18px] text-gray-400" />
                                                    <span className="w-16 md:w-20 text-[10px] md:text-xs font-medium text-gray-600">{t('mediaEditor:sliders.sharpness')}</span>
                                                    <input type="range" min="0" max="100" value={activeImg.sharpness ?? 0} onChange={(e) => handleSliderChange('sharpness', e.target.value)}
                                                        className="flex-1 h-1 bg-gray-200 rounded-full appearance-none accent-gray-800 outline-none" />
                                                </div>
                                                <div className="flex items-center gap-2 md:gap-3">
                                                    <CircleDot size={16} className="md:w-[18px] md:h-[18px] text-gray-400" />
                                                    <span className="w-16 md:w-20 text-[10px] md:text-xs font-medium text-gray-600">{t('mediaEditor:sliders.vignette')}</span>
                                                    <input type="range" min="0" max="100" value={activeImg.vignette ?? 0} onChange={(e) => handleSliderChange('vignette', e.target.value)}
                                                        className="flex-1 h-1 bg-gray-200 rounded-full appearance-none accent-gray-800 outline-none" />
                                                </div>
                                            </>
                                        )}
                                    </div>
                                )}

                                {/* STATE: CROP */}
                                {controlState === 'CROP' && (
                                    <div className="w-full flex flex-col gap-3 animate-[fadeIn_0.2s_ease]">
                                        {/* Pro aspect-ratio picker */}
                                        {isPro && (
                                            <div className="w-full overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
                                                <style>{`.snapit-aspect-strip::-webkit-scrollbar { display: none; }`}</style>
                                                <div className="snapit-aspect-strip flex gap-2 px-1 py-1 min-w-min">
                                                    {ASPECT_RATIOS.map(({ label, value, icon: Icon }) => {
                                                        const isSelected = cropAspect === value;
                                                        return (
                                                            <button
                                                                key={label}
                                                                type="button"
                                                                onClick={() => handleAspectChange(value)}
                                                                className={`flex-shrink-0 flex flex-col items-center justify-center gap-1 w-14 h-14 rounded-xl border-[1.5px] transition-all active:scale-95 ${isSelected
                                                                    ? 'border-[#dc2626] text-[#dc2626] bg-red-50/50'
                                                                    : 'border-gray-200 text-gray-500 bg-white hover:border-gray-300'
                                                                    }`}
                                                                title={label}
                                                            >
                                                                <Icon size={16} strokeWidth={2} />
                                                                <span className="text-[9px] font-semibold tracking-wide">{label}</span>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                        <div className="w-full flex gap-2 md:gap-3">
                                            <button
                                                disabled={isProcessingCrop}
                                                onClick={() => setControlState('DEFAULT')}
                                                className="flex-1 px-3 py-2 md:px-4 md:py-3 rounded-xl text-sm md:text-base font-semibold transition-colors bg-gray-100 text-gray-600 md:hover:bg-gray-200 active:scale-95"
                                            >
                                                {t('common:cancel')}
                                            </button>
                                            <button
                                                disabled={isProcessingCrop}
                                                onClick={handleApplyCrop}
                                                className="flex-1 px-3 py-2 md:px-4 md:py-3 rounded-xl text-sm md:text-base font-semibold transition-colors bg-[#1a0f0d] text-white shadow-md md:hover:bg-black flex items-center justify-center gap-2 active:scale-95"
                                            >
                                                {isProcessingCrop ? <span className="animate-pulse">...</span> : <><Check size={16} className="md:w-[18px] md:h-[18px]" /> {t('common:apply')}</>}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Bottom: Navigation Zone */}
                        {/* FIX 4: Changed mt-8 to mt-auto pt-4. This pushes the buttons firmly to the bottom but allows them to safely hug the sliders when space is tight. */}
                        <div className="mt-auto pt-5 flex flex-col gap-2.5 max-w-xs mx-auto w-full flex-shrink-0">
                            <button
                                onClick={onNext}
                                disabled={controlState === 'CROP' || isProcessingCrop || isEnhancing}
                                className="bg-[#dc2626] text-white px-6 py-3 md:px-8 md:py-3.5 rounded-full text-sm md:text-base font-semibold shadow-[0_8px_20px_rgba(220,38,38,0.25)] md:hover:-translate-y-1 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
                            >
                                {t('common:next')} <ArrowRight size={16} className="md:w-[18px] md:h-[18px]" />
                            </button>

                            <button
                                onClick={onPrev}
                                disabled={controlState === 'CROP' || isProcessingCrop || isEnhancing}
                                className="border-[1.5px] md:border-2 border-[#e5d5d0] text-[#1a0f0d] bg-white px-6 py-3 md:px-8 md:py-3.5 rounded-full text-sm md:text-base font-semibold md:hover:border-[#dc2626] md:hover:text-[#dc2626] active:bg-gray-50 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <ArrowLeft size={16} className="md:w-[18px] md:h-[18px]" /> {t('common:back')}
                            </button>
                        </div>

                    </div>
                </section>
            </div>
        </div>
    );
}