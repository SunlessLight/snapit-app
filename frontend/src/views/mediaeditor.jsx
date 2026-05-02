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
    User,
    RotateCcw
} from 'lucide-react';
import ReactCrop, {centerCrop, makeAspectCrop} from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

import snapitLogo from '../assets/snapit-logo.png';
import TimelineBar from './timelinebar';

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

export default function MediaEditorView({ userName, appUILanguage, mediaState, setMediaState, onNext, onPrev }) {
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
        <div className="h-[100dvh] bg-[#fff8f6] text-[#1a0f0d] font-sans flex flex-col py-4 md:py-8 px-4 md:px-12 max-w-6xl mx-auto w-full overflow-x-hidden">
            
            <svg width="0" height="0" className="absolute">
                <defs>
                    <linearGradient id="gemini-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#4285F4" />   {/* Blue */}
                        <stop offset="33%" stopColor="#9B72CB" />  {/* Purple */}
                        <stop offset="66%" stopColor="#D96570" />  {/* Red */}
                        <stop offset="100%" stopColor="#F4B400" /> {/* Yellow */}
                    </linearGradient>
                </defs>
            </svg>

            {/* Inject Custom CSS for the specific AI Pulse ring animation */}
            <style>{`
                @keyframes aiShine {
                    0%, 100% { box-shadow: 0 0 8px rgba(155, 114, 203, 0.4); }
                    50% { box-shadow: 0 0 20px rgba(66, 133, 244, 0.7), inset 0 0 10px rgba(217, 101, 112, 0.2); }
                }
                .ai-shine-active { animation: aiShine 2s ease-in-out infinite; }
            `}</style>

            {/* Header: Logo & User Profile (Mirrored from Dashboard) */}
            <header className="flex items-center justify-between mb-2 md:mb-8 flex-shrink-0">
                <div className="flex items-center gap-3">
                    <img src={snapitLogo} alt="SnapIT" className="w-16 h-16 md:w-24 md:h-24 object-contain" />
                    <div className="hidden sm:block">
                        <p className="text-sm opacity-70">Photos, elevated.</p>
                    </div>
                </div>

                <div className="flex items-center gap-3 bg-white px-3 py-1.5 rounded-full shadow-sm border border-gray-100">
                    <span className="font-semibold text-sm pl-2">{userName || "Guest"}</span>
                    <div className="w-8 h-8 rounded-full bg-[#dc2626] text-white flex items-center justify-center shadow-inner">
                        <User size={16} />
                    </div>
                </div>
            </header>

            {/* Timeline Bar */}
            <TimelineBar currentStep={2} />

            {/* Main Content Area */}
            <section className="flex-1 flex flex-col justify-center animate-fade-in w-full min-h-0 max-w-3xl mx-auto">
                
                {/* Hero Text */}
                <div className="text-center mb-6 md:mb-8 flex-shrink-0">
                    <h2 className="font-serif text-3xl md:text-5xl font-extrabold mb-1 md:mb-3">Let's make it pop.</h2>
                    <p className="opacity-70 text-sm md:text-base max-w-lg mx-auto">
                        {isEN ? "Toggle AI enhancement or manually adjust to perfection." : "Guna AI untuk mencantikkan gambar atau ubah secara manual."}
                    </p>
                </div>

                {/* The Main Container Card */}
                <div className="bg-white rounded-3xl p-4 md:p-6 shadow-sm border border-gray-100 flex-1 flex flex-col min-h-0 relative">
                    
                    {/* Top: Image Preview Zone */}
                    <div className="flex-1 bg-[#f3e9e6]/50 rounded-2xl overflow-hidden relative flex items-center justify-center min-h-[250px] max-h-[50vh]">
                        {controlState === 'CROP' ? (
                            <div className={`w-full h-full flex items-center justify-center transition-opacity ${isProcessingCrop ? 'opacity-50' : 'opacity-100'}`}>
                                <ReactCrop 
                                    crop={crop} 
                                    onChange={(_, percentCrop) => setCrop(percentCrop)} 
                                    onComplete={(c) => setCompletedCrop(c)} 
                                    aspect={4 / 5} // <- RESTORED FIXED ASPECT RATIO
                                    className="max-h-full"
                                >
                                    <img 
                                        ref={imgRef} 
                                        src={activeImg.url} 
                                        alt="Crop Target" 
                                        onLoad={onImageLoad} // <- RESTORED INITIALIZATION
                                        className="max-h-[45vh] w-auto object-contain" 
                                    />
                                </ReactCrop>
                            </div>
                        ) : (
                            <img 
                                src={activeImg.url} 
                                alt="Preview" 
                                className="w-full h-full object-contain transition-all duration-300"
                                style={imageFilters} 
                            />
                        )}
                    </div>

                    {/* Middle: Interaction Zone */}
                    <div className="mt-4 md:mt-6 flex-shrink-0 min-h-[100px] flex items-center justify-center px-2">
                        
                        <div className="relative w-full max-w-sm mx-auto pt-8">
                            
                            {/* RESET BUTTON */}
                            {controlState !== 'CROP' && (
                                <button 
                                    onClick={handleReset}
                                    className={`absolute top-0 ${controlState === 'ADJUST' ? 'left-0' : 'right-0'} p-2 rounded-full bg-gray-50 text-gray-400 hover:bg-gray-100 hover:text-gray-700 active:scale-95 transition-all`}
                                    title={isEN ? "Reset edits" : "Tetap semula"}
                                >
                                    <RotateCcw size={18} strokeWidth={2.5} />
                                </button>
                            )}

                            {/* X (CLOSE) BUTTON - Only visible during ADJUST */}
                            {controlState === 'ADJUST' && (
                                <button 
                                    onClick={() => setControlState('DEFAULT')}
                                    className="absolute top-0 right-0 p-2 rounded-full bg-gray-50 text-gray-400 hover:bg-red-50 hover:text-[#dc2626] active:bg-[#dc2626] active:text-white active:shadow-[0_0_15px_rgba(220,38,38,0.6)] transition-all"
                                >
                                    <X size={18} strokeWidth={2.5} />
                                </button>
                            )}

                            {/* STATE: DEFAULT (The 3 Buttons) */}
                            {controlState === 'DEFAULT' && (
                                <div className="flex items-center justify-center gap-6 md:gap-10 animate-[fadeIn_0.2s_ease]">
                                    {/* Enhance */}
                                    <div className="flex flex-col items-center gap-2">
                                        <button 
                                            onClick={handleAutoEnhance}
                                            className={`w-14 h-14 md:w-16 md:h-16 rounded-2xl flex items-center justify-center transition-all duration-300 ${
                                                activeImg.isEnhanced 
                                                    ? 'bg-white border border-gray-100 ai-shine-active' 
                                                    : 'bg-gray-50 hover:bg-gray-100'
                                            }`}
                                        >
                                            <Sparkles size={24} stroke={activeImg.isEnhanced ? "url(#gemini-gradient)" : "#6b7280"} />
                                        </button>
                                        <span className="text-[10px] md:text-xs font-semibold uppercase tracking-wider text-gray-500">
                                            {isEN ? "AI Enhance" : "AI Cantik"}
                                        </span>
                                    </div>

                                    {/* Crop */}
                                    <div className="flex flex-col items-center gap-2">
                                        <button 
                                            onClick={() => setControlState('CROP')}
                                            className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-gray-50 text-gray-700 hover:bg-gray-100 flex items-center justify-center transition-all"
                                        >
                                            <CropIcon size={24} />
                                        </button>
                                        <span className="text-[10px] md:text-xs font-semibold uppercase tracking-wider text-gray-500">
                                            {isEN ? "Crop" : "Potong"}
                                        </span>
                                    </div>

                                    {/* Adjust */}
                                    <div className="flex flex-col items-center gap-2">
                                        <button 
                                            onClick={() => setControlState('ADJUST')}
                                            className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-gray-50 text-gray-700 hover:bg-gray-100 flex items-center justify-center transition-all"
                                        >
                                            <SlidersHorizontal size={24} />
                                        </button>
                                        <span className="text-[10px] md:text-xs font-semibold uppercase tracking-wider text-gray-500">
                                            {isEN ? "Adjust" : "Ubah"}
                                        </span>
                                    </div>
                                </div>
                            )}

                            {/* STATE: ADJUST (Apple-like Sliders) */}
                            {controlState === 'ADJUST' && (
                                <div className="flex flex-col gap-5 mt-2 animate-[fadeIn_0.2s_ease]">
                                    <div className="flex items-center gap-3">
                                        <Sun size={18} className="text-gray-400" />
                                        <span className="w-20 text-xs font-medium text-gray-600">{isEN ? "Brightness" : "Kecerahan"}</span>
                                        <input type="range" min="0" max="100" value={activeImg.brightness} onChange={(e) => handleSliderChange('brightness', e.target.value)} 
                                            className="flex-1 h-1 bg-gray-200 rounded-full appearance-none accent-gray-800 outline-none" />
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Contrast size={18} className="text-gray-400" />
                                        <span className="w-20 text-xs font-medium text-gray-600">{isEN ? "Contrast" : "Kontras"}</span>
                                        <input type="range" min="0" max="100" value={activeImg.contrast} onChange={(e) => handleSliderChange('contrast', e.target.value)} 
                                            className="flex-1 h-1 bg-gray-200 rounded-full appearance-none accent-gray-800 outline-none" />
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Droplets size={18} className="text-gray-400" />
                                        <span className="w-20 text-xs font-medium text-gray-600">{isEN ? "Saturation" : "Saturasi"}</span>
                                        <input type="range" min="0" max="100" value={activeImg.saturation} onChange={(e) => handleSliderChange('saturation', e.target.value)} 
                                            className="flex-1 h-1 bg-gray-200 rounded-full appearance-none accent-gray-800 outline-none" />
                                    </div>
                                </div>
                            )}

                            {/* STATE: CROP (Cancel/Apply) */}
                            {controlState === 'CROP' && (
                                <div className="w-full flex gap-3 animate-[fadeIn_0.2s_ease]">
                                    <button 
                                        disabled={isProcessingCrop} 
                                        onClick={() => setControlState('DEFAULT')} 
                                        className="flex-1 px-4 py-3 rounded-xl font-semibold transition-colors bg-gray-100 text-gray-600 hover:bg-gray-200"
                                    >
                                        {isEN ? "Cancel" : "Batal"}
                                    </button>
                                    <button 
                                        disabled={isProcessingCrop} 
                                        onClick={handleApplyCrop} 
                                        className="flex-1 px-4 py-3 rounded-xl font-semibold transition-colors bg-[#1a0f0d] text-white shadow-md hover:bg-black flex items-center justify-center gap-2"
                                    >
                                        {isProcessingCrop ? <span className="animate-pulse">...</span> : <><Check size={18}/> {isEN ? "Apply" : "Teruskan"}</>}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Bottom: Navigation Zone */}
                    <div className="mt-8 flex flex-col gap-3 max-w-xs mx-auto w-full flex-shrink-0">
                        <button 
                            onClick={onNext}
                            disabled={controlState === 'CROP' || isProcessingCrop}
                            className="bg-[#dc2626] text-white px-8 py-3.5 rounded-full text-base font-semibold shadow-[0_8px_20px_rgba(220,38,38,0.25)] hover:-translate-y-1 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
                        >
                            {isEN ? "Pick a design" : "Pilih rekaan"} <ArrowRight size={18} />
                        </button>
                        
                        <button 
                            onClick={onPrev}
                            disabled={controlState === 'CROP' || isProcessingCrop}
                            className="border-2 border-[#e5d5d0] text-[#1a0f0d] bg-white px-8 py-3.5 rounded-full text-base font-semibold hover:border-[#dc2626] hover:text-[#dc2626] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <ArrowLeft size={18} /> {isEN ? "Back to Upload" : "Kembali"}
                        </button>
                    </div>

                </div>
            </section>
        </div>
    );
}