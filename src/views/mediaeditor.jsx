import React, { useState, useRef } from 'react';
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
    RotateCcw
} from 'lucide-react';
import ReactCrop, { centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';


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

// 1. Add this helper outside your component
function centerAspectCrop(mediaWidth, mediaHeight, aspect) {
    return centerCrop(makeAspectCrop({ unit: '%', width: 90 }, aspect, mediaWidth, mediaHeight), mediaWidth, mediaHeight);
}

export default function MediaEditorView({ appUILanguage, mediaState, setMediaState, onNext, onPrev }) {
    // UI State Machine: 'DEFAULT' | 'ADJUST' | 'CROP'
    const [controlState, setControlState] = useState('DEFAULT');

    // Logic States
    const [cachedValues, setCachedValues] = useState(null);
    const [isProcessingCrop, setIsProcessingCrop] = useState(false);
    const [crop, setCrop] = useState();
    const [completedCrop, setCompletedCrop] = useState(null);
    const imgRef = useRef(null);

    const isEN = appUILanguage === "EN";
    const activeImg = mediaState;

    // --- Actions ---
    const handleAutoEnhance = () => {
        if (!activeImg.isEnhanced) {
            setCachedValues({ b: activeImg.brightness, c: activeImg.contrast, s: activeImg.saturation });
            setMediaState(prev => ({ ...prev, brightness: 65, contrast: 70, saturation: 75, isEnhanced: true }));
        } else {
            setMediaState(prev => ({
                ...prev, brightness: cachedValues.b, contrast: cachedValues.c, saturation: cachedValues.s, isEnhanced: false
            }));
            setCachedValues(null);
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

            setMediaState(prev => {
                if (prev.url) URL.revokeObjectURL(prev.url);
                return { ...prev, file: newBlob, url: newUrl };
            });

            setControlState('DEFAULT');
        } catch (err) {
            console.error("Failed to crop image:", err);
            // Assuming you'll hook this to your Toast system later
            alert(isEN ? "Failed to apply crop." : "Gagal memotong gambar.");
        } finally {
            setIsProcessingCrop(false);
            setCompletedCrop(null);
        }
    };

    const onImageLoad = (e) => {
        const { width, height } = e.currentTarget;
        setCrop(centerAspectCrop(width, height, 4 / 5));
    };

    const handleReset = () => {
        setMediaState(prev => ({
            ...prev,
            brightness: 50,
            contrast: 50,
            saturation: 50,
            isEnhanced: false
        }));
        setCachedValues(null);
    };


    // Calculate dynamic CSS filters based on 50 being the "Normal" baseline
    const imageFilters = {
        filter: `contrast(${activeImg.contrast / 50}) saturate(${activeImg.saturation / 50}) brightness(${activeImg.brightness / 50})`
    };

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
                    <div className="text-center md:mb-6 flex-shrink-0">
                        <h2 className="font-serif text-2xl md:text-5xl font-extrabold mb-1 md:mb-3">Let's make it pop.</h2>
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
                                        aspect={4 / 5}
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
                                <img
                                    src={activeImg.url}
                                    alt="Preview"
                                    className="max-w-full max-h-full object-contain transition-all duration-300 rounded-md"
                                    style={imageFilters}
                                />
                            )}
                        </div>

                        {/* Middle: Interaction Zone */}
                        <div className="mt-4 md:mt-6 flex-shrink-0 min-h-[80px] md:min-h-[100px] flex items-center justify-center px-2">
                            <div className="relative w-full max-w-sm mx-auto pt-6 md:pt-8">

                                {/* RESET BUTTON */}
                                {controlState !== 'CROP' && (
                                    <button
                                        onClick={handleReset}
                                        className={`absolute top-0 ${controlState === 'ADJUST' ? 'left-0' : 'right-0'} p-2 rounded-full bg-gray-50 text-gray-400 md:hover:bg-gray-100 md:hover:text-gray-700 active:scale-95 transition-all`}
                                        title={isEN ? "Reset edits" : "Tetap semula"}
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
                                                className={`w-12 h-12 md:w-16 md:h-16 rounded-2xl flex items-center justify-center transition-all duration-300 ${activeImg.isEnhanced
                                                    ? 'bg-white border border-gray-100 ai-shine-active'
                                                    : 'bg-gray-50 md:hover:bg-gray-100'
                                                    }`}
                                            >
                                                <Sparkles size={20} className="md:w-6 md:h-6" stroke={activeImg.isEnhanced ? "url(#gemini-gradient)" : "#6b7280"} />
                                            </button>
                                            <span className="text-[9px] md:text-xs font-semibold uppercase tracking-wider text-gray-500">
                                                {isEN ? "AI Enhance" : "AI Cantik"}
                                            </span>
                                        </div>

                                        {/* Crop */}
                                        <div className="flex flex-col items-center gap-1.5 md:gap-2">
                                            <button
                                                onClick={() => setControlState('CROP')}
                                                className="w-12 h-12 md:w-16 md:h-16 rounded-2xl bg-gray-50 text-gray-700 md:hover:bg-gray-100 flex items-center justify-center transition-all"
                                            >
                                                <CropIcon size={20} className="md:w-6 md:h-6" />
                                            </button>
                                            <span className="text-[9px] md:text-xs font-semibold uppercase tracking-wider text-gray-500">
                                                {isEN ? "Crop" : "Potong"}
                                            </span>
                                        </div>

                                        {/* Adjust */}
                                        <div className="flex flex-col items-center gap-1.5 md:gap-2">
                                            <button
                                                onClick={() => setControlState('ADJUST')}
                                                className="w-12 h-12 md:w-16 md:h-16 rounded-2xl bg-gray-50 text-gray-700 md:hover:bg-gray-100 flex items-center justify-center transition-all"
                                            >
                                                <SlidersHorizontal size={20} className="md:w-6 md:h-6" />
                                            </button>
                                            <span className="text-[9px] md:text-xs font-semibold uppercase tracking-wider text-gray-500">
                                                {isEN ? "Adjust" : "Ubah"}
                                            </span>
                                        </div>
                                    </div>
                                )}

                                {/* STATE: ADJUST */}
                                {controlState === 'ADJUST' && (
                                    <div className="flex flex-col gap-4 mt-1 md:mt-2 animate-[fadeIn_0.2s_ease]">
                                        <div className="flex items-center gap-2 md:gap-3">
                                            <Sun size={16} className="md:w-[18px] md:h-[18px] text-gray-400" />
                                            <span className="w-16 md:w-20 text-[10px] md:text-xs font-medium text-gray-600">{isEN ? "Brightness" : "Kecerahan"}</span>
                                            <input type="range" min="0" max="100" value={activeImg.brightness} onChange={(e) => handleSliderChange('brightness', e.target.value)}
                                                className="flex-1 h-1 bg-gray-200 rounded-full appearance-none accent-gray-800 outline-none" />
                                        </div>
                                        <div className="flex items-center gap-2 md:gap-3">
                                            <Contrast size={16} className="md:w-[18px] md:h-[18px] text-gray-400" />
                                            <span className="w-16 md:w-20 text-[10px] md:text-xs font-medium text-gray-600">{isEN ? "Contrast" : "Kontras"}</span>
                                            <input type="range" min="0" max="100" value={activeImg.contrast} onChange={(e) => handleSliderChange('contrast', e.target.value)}
                                                className="flex-1 h-1 bg-gray-200 rounded-full appearance-none accent-gray-800 outline-none" />
                                        </div>
                                        <div className="flex items-center gap-2 md:gap-3">
                                            <Droplets size={16} className="md:w-[18px] md:h-[18px] text-gray-400" />
                                            <span className="w-16 md:w-20 text-[10px] md:text-xs font-medium text-gray-600">{isEN ? "Saturation" : "Saturasi"}</span>
                                            <input type="range" min="0" max="100" value={activeImg.saturation} onChange={(e) => handleSliderChange('saturation', e.target.value)}
                                                className="flex-1 h-1 bg-gray-200 rounded-full appearance-none accent-gray-800 outline-none" />
                                        </div>
                                    </div>
                                )}

                                {/* STATE: CROP */}
                                {controlState === 'CROP' && (
                                    <div className="w-full flex gap-2 md:gap-3 animate-[fadeIn_0.2s_ease]">
                                        <button
                                            disabled={isProcessingCrop}
                                            onClick={() => setControlState('DEFAULT')}
                                            className="flex-1 px-3 py-2 md:px-4 md:py-3 rounded-xl text-sm md:text-base font-semibold transition-colors bg-gray-100 text-gray-600 md:hover:bg-gray-200 active:scale-95"
                                        >
                                            {isEN ? "Cancel" : "Batal"}
                                        </button>
                                        <button
                                            disabled={isProcessingCrop}
                                            onClick={handleApplyCrop}
                                            className="flex-1 px-3 py-2 md:px-4 md:py-3 rounded-xl text-sm md:text-base font-semibold transition-colors bg-[#1a0f0d] text-white shadow-md md:hover:bg-black flex items-center justify-center gap-2 active:scale-95"
                                        >
                                            {isProcessingCrop ? <span className="animate-pulse">...</span> : <><Check size={16} className="md:w-[18px] md:h-[18px]" /> {isEN ? "Apply" : "Teruskan"}</>}
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Bottom: Navigation Zone */}
                        {/* FIX 4: Changed mt-8 to mt-auto pt-4. This pushes the buttons firmly to the bottom but allows them to safely hug the sliders when space is tight. */}
                        <div className="mt-auto pt-5 flex flex-col gap-2.5 max-w-xs mx-auto w-full flex-shrink-0">
                            <button
                                onClick={onNext}
                                disabled={controlState === 'CROP' || isProcessingCrop}
                                className="bg-[#dc2626] text-white px-6 py-3 md:px-8 md:py-3.5 rounded-full text-sm md:text-base font-semibold shadow-[0_8px_20px_rgba(220,38,38,0.25)] md:hover:-translate-y-1 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
                            >
                                {isEN ? "Next" : "Seterusnya"} <ArrowRight size={16} className="md:w-[18px] md:h-[18px]" />
                            </button>

                            <button
                                onClick={onPrev}
                                disabled={controlState === 'CROP' || isProcessingCrop}
                                className="border-[1.5px] md:border-2 border-[#e5d5d0] text-[#1a0f0d] bg-white px-6 py-3 md:px-8 md:py-3.5 rounded-full text-sm md:text-base font-semibold md:hover:border-[#dc2626] md:hover:text-[#dc2626] active:bg-gray-50 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <ArrowLeft size={16} className="md:w-[18px] md:h-[18px]" /> {isEN ? "Back" : "Kembali"}
                            </button>
                        </div>

                    </div>
                </section>
            </div>
        </div>
    );
}