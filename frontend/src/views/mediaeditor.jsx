import React, { useState, useRef } from 'react';
import { Sparkles, Image as ImageIcon, SlidersHorizontal, Sun, Contrast, Droplets, Wand2, ArrowLeft, Crop, Check, X } from 'lucide-react';
import ReactCrop, { centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

function centerAspectCrop(mediaWidth, mediaHeight, aspect) {
    return centerCrop(makeAspectCrop({ unit: '%', width: 90 }, aspect, mediaWidth, mediaHeight), mediaWidth, mediaHeight);
}

async function getCroppedImg(imageElement, cropConfig) {
    const canvas = document.createElement('canvas');
    const scaleX = imageElement.naturalWidth / imageElement.width;
    const scaleY = imageElement.naturalHeight / imageElement.height;

    // FIX: Set canvas dimensions to the INTRINSIC pixel size, not the display size
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
        canvas.width,  // FIX: Destination width must match the new scaled canvas width
        canvas.height  // FIX: Destination height must match the new scaled canvas height
    );

    return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
            if (!blob) {
                reject(new Error('Canvas is empty'));
                return;
            }
            blob.name = 'cropped_image.jpeg';
            resolve(blob);
        }, 'image/jpeg', 1.0); // Bumped quality to 1.0 for marketing assets
    });
}

export default function MediaEditorView({ appUILanguage, mediaState, setMediaState, onNext, onPrev }) {
    const [cachedValues, setCachedValues] = useState({ 0: null, 1: null, 2: null });
    const [isProcessingCrop, setIsProcessingCrop] = useState(false);

    const isEN = appUILanguage === "EN";
    const [isCropMode, setIsCropMode] = useState(false);
    const [crop, setCrop] = useState();
    const [completedCrop, setCompletedCrop] = useState(null);
    const imgRef = useRef(null);

    const activeSlotIndex = mediaState.selectedSlot;
    const activeImg = mediaState.images[activeSlotIndex];
    const hasImage = !!activeImg.url;

    const handleAutoEnhance = () => {
        if (!hasImage) return;

        if (!activeImg.isEnhanced) {
            if (!cachedValues[activeSlotIndex]) {
                setCachedValues(prev => ({
                    ...prev,
                    [activeSlotIndex]: { b: activeImg.brightness, c: activeImg.contrast, s: activeImg.saturation }
                }));
            }
            setMediaState(prev => {
                const newImages = [...prev.images];
                newImages[activeSlotIndex] = { ...newImages[activeSlotIndex], brightness: 65, contrast: 70, saturation: 75, isEnhanced: true };
                return { ...prev, images: newImages };
            });
        } else {
            const cache = cachedValues[activeSlotIndex];
            setMediaState(prev => {
                const newImages = [...prev.images];
                newImages[activeSlotIndex] = { ...newImages[activeSlotIndex], brightness: cache.b, contrast: cache.c, saturation: cache.s, isEnhanced: false };
                return { ...prev, images: newImages };
            });
            setCachedValues(prev => ({ ...prev, [activeSlotIndex]: null }));
        }
    };

    const handleSliderChange = (key, value) => {
        if (!hasImage) return;
        setMediaState(prev => {
            const newImages = [...prev.images];
            newImages[activeSlotIndex] = { ...newImages[activeSlotIndex], [key]: Number(value), isEnhanced: false };
            return { ...prev, images: newImages };
        });
    };

    const onImageLoad = (e) => {
        const { width, height } = e.currentTarget;
        setCrop(centerAspectCrop(width, height, 1));
    };

    // REFACTORED: The function that executes the physical crop creation
    const handleApplyCrop = async () => {
        if (!completedCrop || !imgRef.current) {
            setIsCropMode(false);
            return;
        }

        try {
            setIsProcessingCrop(true);
            const newBlob = await getCroppedImg(imgRef.current, completedCrop);
            const newUrl = URL.createObjectURL(newBlob);

            setMediaState(prev => {
                const newImages = [...prev.images];
                const oldUrl = newImages[activeSlotIndex].url;

                newImages[activeSlotIndex] = {
                    ...newImages[activeSlotIndex],
                    file: newBlob,
                    url: newUrl
                };

                // Clean up the old, uncropped memory footprint
                if (oldUrl) URL.revokeObjectURL(oldUrl);

                return { ...prev, images: newImages };
            });
            setIsCropMode(false);
        } catch (err) {
            console.error("Failed to crop image:", err);
            alert(isEN ? "Failed to apply crop." : "Gagal memotong gambar.");
        } finally {
            setIsProcessingCrop(false);
            setCompletedCrop(null);
        }
    };

    return (
        <div className="min-h-screen bg-amber-50 flex flex-col p-4 text-lg text-white">
            <div className="flex items-center justify-between mb-4 mt-2">
                <button onClick={onPrev} className="p-3 bg-white rounded-full shadow-md text-gray-800 hover:bg-gray-100 transition-colors">
                    <ArrowLeft size={24} />
                </button>

                <div className="flex gap-4 overflow-x-auto snap-x flex-1 ml-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                    {[0, 1, 2].map((slot) => {
                        const thumbImg = mediaState.images[slot];
                        return (
                            <button
                                key={slot}
                                onClick={() => { setMediaState(prev => ({ ...prev, selectedSlot: slot })); setIsCropMode(false); }}
                                className={`snap-center shrink-0 w-16 h-16 rounded-2xl shadow-md flex items-center justify-center transition-all bg-white overflow-hidden ${activeSlotIndex === slot ? 'border-4 border-emerald-600' : 'border-2 border-transparent opacity-70 hover:opacity-100'}`}
                            >
                                {thumbImg.url ? (
                                    <img src={thumbImg.url} alt={`Slot ${slot + 1}`} className="w-full h-full object-cover" />
                                ) : (
                                    <div className={`p-2 rounded-full ${activeSlotIndex === slot ? 'bg-emerald-600' : 'bg-emerald-600/30'}`}>
                                        <ImageIcon className="w-6 h-6 text-white" />
                                    </div>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="flex-1 w-full bg-white rounded-2xl shadow-md mb-6 flex flex-col items-center justify-center relative overflow-hidden min-h-[300px]">
                {hasImage ? (
                    isCropMode ? (
                        <div className={`transition-opacity ${isProcessingCrop ? 'opacity-50' : 'opacity-100'}`}>
                            <ReactCrop crop={crop} onChange={(_, percentCrop) => setCrop(percentCrop)} onComplete={(c) => setCompletedCrop(c)} aspect={1} className="max-h-full">
                                <img ref={imgRef} src={activeImg.url} alt="Crop Preview" onLoad={onImageLoad} className="max-h-[50vh] w-auto object-contain" />
                            </ReactCrop>
                        </div>
                    ) : (
                        <>
                            <img src={activeImg.url} alt="Upload Preview" className="w-full h-full object-cover" />
                            <div
                                className="absolute inset-0 pointer-events-none transition-all duration-300"
                                style={{
                                    backgroundColor: `rgba(255, 255, 255, ${(activeImg.brightness - 50) / 200})`,
                                    mixBlendMode: 'overlay',
                                    backdropFilter: `contrast(${activeImg.contrast / 50}) saturate(${activeImg.saturation / 50})`,
                                    WebkitBackdropFilter: `contrast(${activeImg.contrast / 50}) saturate(${activeImg.saturation / 50})`
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

            <div className={`bg-white rounded-2xl shadow-md p-5 mb-6 text-gray-800 transition-opacity ${!hasImage ? 'opacity-50 pointer-events-none' : ''}`}>
                <div className="flex items-center justify-between mb-6">
                    {/* REFACTORED: Show Apply/Cancel buttons during crop mode */}
                    {isCropMode ? (
                        <div className="flex gap-2 w-full">
                            <button disabled={isProcessingCrop} onClick={() => setIsCropMode(false)} className="flex-1 px-4 py-3 rounded-lg font-bold transition-colors bg-gray-100 text-gray-600 hover:bg-gray-200 flex items-center justify-center gap-2">
                                <X className="w-5 h-5" /> {isEN ? "Cancel" : "Batal"}
                            </button>
                            <button disabled={isProcessingCrop} onClick={handleApplyCrop} className="flex-1 px-4 py-3 rounded-lg font-bold transition-colors bg-emerald-600 text-white shadow-md hover:bg-emerald-700 flex items-center justify-center gap-2">
                                <Check className="w-5 h-5" /> {isProcessingCrop ? (isEN ? "Cropping..." : "Memotong...") : (isEN ? "Apply" : "Teruskan")}
                            </button>
                        </div>
                    ) : (
                        <>
                            <div className="flex gap-2">
                                <button className={`px-4 py-2 rounded-lg font-bold transition-colors bg-emerald-600 text-white shadow-md`}>
                                    <SlidersHorizontal className="w-5 h-5 inline mr-1" /> {isEN ? "Tune" : "Ubah"}
                                </button>
                                <button onClick={() => setIsCropMode(true)} className={`px-4 py-2 rounded-lg font-bold transition-colors bg-gray-100 text-gray-500 hover:bg-gray-200`}>
                                    <Crop className="w-5 h-5 inline mr-1" /> {isEN ? "Crop" : "Potong"}
                                </button>
                            </div>
                            <button onClick={handleAutoEnhance} className={`rounded-xl px-4 py-2 shadow-md flex items-center gap-2 text-lg font-bold transition-all text-white bg-orange-500 ${activeImg.isEnhanced ? 'scale-95 opacity-80 shadow-inner' : 'hover:opacity-90'}`}>
                                <Sparkles className="w-5 h-5" /> {isEN ? "Auto-Enhance" : "Auto-Cantik"}
                            </button>
                        </>
                    )}
                </div>

                {!isCropMode && (
                    <div className="flex justify-around items-end h-40 gap-2 pb-2">
                        {/* BRIGHTNESS */}
                        <div className="flex flex-col items-center gap-3 w-1/3">
                            <input type="range" min="0" max="100" value={activeImg.brightness} onChange={(e) => handleSliderChange('brightness', e.target.value)} className="w-32 -rotate-90 appearance-none bg-gray-200 h-2 rounded-full outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:bg-emerald-600 [&::-webkit-slider-thumb]:rounded-full" />
                            <Sun className="w-6 h-6 text-emerald-700 mt-14" />
                        </div>
                        {/* CONTRAST */}
                        <div className="flex flex-col items-center gap-3 w-1/3">
                            <input type="range" min="0" max="100" value={activeImg.contrast} onChange={(e) => handleSliderChange('contrast', e.target.value)} className="w-32 -rotate-90 appearance-none bg-gray-200 h-2 rounded-full outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:bg-emerald-600 [&::-webkit-slider-thumb]:rounded-full" />
                            <Contrast className="w-6 h-6 text-emerald-700 mt-14" />
                        </div>
                        {/* SATURATION */}
                        <div className="flex flex-col items-center gap-3 w-1/3">
                            <input type="range" min="0" max="100" value={activeImg.saturation} onChange={(e) => handleSliderChange('saturation', e.target.value)} className="w-32 -rotate-90 appearance-none bg-gray-200 h-2 rounded-full outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:bg-emerald-600 [&::-webkit-slider-thumb]:rounded-full" />
                            <Droplets className="w-6 h-6 text-emerald-700 mt-14" />
                        </div>
                    </div>
                )}
            </div>

            <button disabled={isCropMode || isProcessingCrop} onClick={onNext} className={`w-full text-white text-2xl font-bold py-4 rounded-xl shadow-md transition-colors mt-auto flex items-center justify-center gap-2 ${(isCropMode || isProcessingCrop) ? 'bg-gray-400 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700'}`}>
                <Wand2 className="w-8 h-8" /> {isEN ? "Create" : "Cipta"}
            </button>
        </div>
    );
}