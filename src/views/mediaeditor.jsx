import React, { useState, useRef } from 'react';
import { Sparkles, Image as ImageIcon, SlidersHorizontal, Sun, Contrast, Droplets, Wand2, ArrowLeft, Crop } from 'lucide-react';
import ReactCrop, { centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css'; // CRITICAL: Do not forget the CSS

// Helper to center the initial crop area (1:1 aspect ratio by default)
function centerAspectCrop(mediaWidth, mediaHeight, aspect) {
    return centerCrop(
        makeAspectCrop({ unit: '%', width: 90 }, aspect, mediaWidth, mediaHeight),
        mediaWidth,
        mediaHeight
    );
}

export default function MediaEditorView({ appUILanguage, mediaState, setMediaState, onNext, onPrev }) {
    const [cachedValues, setCachedValues] = useState({ b: 50, c: 50, s: 50 });
    // FIX: Added cache validity state to prevent baseline overwriting when user tweaks sliders
    const [isCacheValid, setIsCacheValid] = useState(false);
    const isEN = appUILanguage === "EN";
    // --- NEW: Cropping State ---
    const [isCropMode, setIsCropMode] = useState(false);
    const [crop, setCrop] = useState();
    const [completedCrop, setCompletedCrop] = useState(null);
    const imgRef = useRef(null);

    const handleAutoEnhance = () => {
        if (!mediaState.isEnhanced) {
            if (!isCacheValid) {
                setCachedValues({ b: mediaState.brightness, c: mediaState.contrast, s: mediaState.saturation });
                setIsCacheValid(true);
            }
            setMediaState(prev => ({ ...prev, brightness: 65, contrast: 70, saturation: 75, isEnhanced: true }));
        } else {
            setMediaState(prev => ({ ...prev, brightness: cachedValues.b, contrast: cachedValues.c, saturation: cachedValues.s, isEnhanced: false }));
            setIsCacheValid(false);
        }
    };

    const handleSliderChange = (key, value) => {
        // FIX: Merely touching the slider drops the enhance flag, but keeps our cache intact for restoral
        setMediaState(prev => ({ ...prev, [key]: Number(value), isEnhanced: false }));
    };

    const onImageLoad = (e) => {
        const { width, height } = e.currentTarget;
        setCrop(centerAspectCrop(width, height, 1)); // Default to 1:1 square
    };

    return (
        <div className="min-h-screen bg-amber-50 flex flex-col p-4 text-lg text-white">
            <div className="flex items-center justify-between mb-4 mt-2">
                <button onClick={onPrev} className="p-3 bg-white rounded-full shadow-md text-gray-800 hover:bg-gray-100 transition-colors">
                    <ArrowLeft size={24} />
                </button>
                {/* FIX: Replaced tailwind-scrollbar-hide plugin dependency with native arbitrary variants */}
                <div className="flex gap-4 overflow-x-auto snap-x flex-1 ml-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                    {[0, 1, 2].map((slot) => (
                        <button
                            key={slot} onClick={() => setMediaState(prev => ({ ...prev, selectedSlot: slot }))}
                            className={`snap-center shrink-0 w-16 h-16 rounded-2xl shadow-md flex items-center justify-center transition-all bg-white ${mediaState.selectedSlot === slot ? 'border-4 border-emerald-600' : 'border-2 border-transparent opacity-70 hover:opacity-100'}`}
                        >
                            <div className={`p-2 rounded-full ${mediaState.selectedSlot === slot ? 'bg-emerald-600' : 'bg-emerald-600/30'}`}>
                                <ImageIcon className="w-6 h-6 text-white" />
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* UPGRADED: Image Preview Area */}
            <div className="flex-1 w-full bg-white rounded-2xl shadow-md mb-6 flex flex-col items-center justify-center relative overflow-hidden min-h-[300px]">
                {mediaState.imagePreviewUrl ? (
                    isCropMode ? (
                        <ReactCrop
                            crop={crop}
                            onChange={(_, percentCrop) => setCrop(percentCrop)}
                            onComplete={(c) => setCompletedCrop(c)}
                            aspect={1} // Force square crop for food photography
                            className="max-h-full"
                        >
                            <img
                                ref={imgRef}
                                src={mediaState.imagePreviewUrl}
                                alt="Crop Preview"
                                onLoad={onImageLoad}
                                className="max-h-[50vh] w-auto object-contain"
                            />
                        </ReactCrop>
                    ) : (
                        <>
                            <img src={mediaState.imagePreviewUrl} alt="Upload Preview" className="w-full h-full object-cover" />
                            {/* CSS Filters Overlay */}
                            <div
                                className="absolute inset-0 pointer-events-none transition-all duration-300"
                                style={{
                                    backgroundColor: `rgba(255, 255, 255, ${(mediaState.brightness - 50) / 200})`,
                                    mixBlendMode: 'overlay',
                                    backdropFilter: `contrast(${mediaState.contrast / 50}) saturate(${mediaState.saturation / 50})`,
                                    WebkitBackdropFilter: `contrast(${mediaState.contrast / 50}) saturate(${mediaState.saturation / 50})`
                                }}
                            />
                        </>
                    )
                ) : (
                    <div className="absolute inset-0 bg-amber-50/50 flex items-center justify-center">
                        <div className="bg-emerald-600 p-4 rounded-full shadow-md"><ImageIcon className="text-white w-16 h-16" /></div>
                    </div>
                )}
            </div>

            {/* UPGRADED: Studio Controls */}
            <div className="bg-white rounded-2xl shadow-md p-5 mb-6 text-gray-800">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex gap-2">
                        <button
                            onClick={() => setIsCropMode(false)}
                            className={`px-4 py-2 rounded-lg font-bold transition-colors ${!isCropMode ? 'bg-emerald-600 text-white shadow-md' : 'bg-gray-100 text-gray-500'}`}
                        >
                            <SlidersHorizontal className="w-5 h-5 inline mr-1" /> {isEN ? "Tune" : "Ubah"}
                        </button>
                        <button
                            onClick={() => setIsCropMode(true)}
                            className={`px-4 py-2 rounded-lg font-bold transition-colors ${isCropMode ? 'bg-emerald-600 text-white shadow-md' : 'bg-gray-100 text-gray-500'}`}
                        >
                            <Crop className="w-5 h-5 inline mr-1" /> {isEN ? "Crop" : "Potong"}
                        </button>
                    </div>

                    {/* Hide Auto-Enhance while cropping so users don't get confused */}
                    {!isCropMode && (
                        <button onClick={handleAutoEnhance} className={`rounded-xl px-4 py-2 shadow-md flex items-center gap-2 text-lg font-bold transition-all text-white bg-orange-500 ${mediaState.isEnhanced ? 'scale-95 opacity-80 shadow-inner' : 'hover:opacity-90'}`}>
                            <Sparkles className="w-5 h-5" /> {isEN ? "Auto-Enhance" : "Auto-Cantik"}
                        </button>
                    )}
                </div>

                {/* Show Sliders ONLY if not in Crop Mode */}
                {!isCropMode && (
                    <div className="flex justify-around items-end h-40 gap-2 pb-2">
                        {/* ... (Keep your existing slider mapping code here) ... */}
                    </div>
                )}

                {isCropMode && (
                    <div className="h-40 flex items-center justify-center text-center text-gray-500 font-medium">
                        {isEN ? "Drag the corners to crop your dish." : "Tarik bucu untuk potong gambar."}
                    </div>
                )}
            </div>

            <button onClick={onNext} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-2xl font-bold py-4 rounded-xl shadow-md transition-colors mt-auto flex items-center justify-center gap-2">
                <Wand2 className="w-8 h-8" /> {isEN ? "Create" : "Cipta"}
            </button>
        </div>
    );
}