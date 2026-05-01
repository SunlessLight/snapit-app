import React, { useRef, useState, useCallback, useEffect } from 'react';
import heic2any from 'heic2any';
import { PRO_TIPS } from '../constants';
import { Camera, ArrowRight, X, Loader2, UploadCloud, User } from 'lucide-react';
import snapitLogo from '../assets/snapit-logo.png';
import TimelineBar from './timelinebar';

export default function DashboardView({ userName, appUILanguage, setAppUILanguage, onImageSelect, onImageRemove, mediaState, onNext }) {
    const [isProcessing, setIsProcessing] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef(null);
    const cameraInputRef = useRef(null);

    const hasImage = mediaState.file !== null;

    // --- Pro Tips Carousel Logic ---
    const scrollRef = useRef(null);

    useEffect(() => {
        const carousel = scrollRef.current;
        if (!carousel) return;

        const interval = setInterval(() => {
            const maxScroll = carousel.scrollWidth - carousel.clientWidth;
            // If at the end, loop back to start. Otherwise, scroll right by one card.
            if (carousel.scrollLeft >= maxScroll - 10) {
                carousel.scrollTo({ left: 0, behavior: 'smooth' });
            } else {
                carousel.scrollBy({ left: 300, behavior: 'smooth' });
            }
        }, 4000); // Auto-rotates every 4 seconds

        return () => clearInterval(interval);
    }, []);

    // Extracted core logic so both onClick and onDrop can use it
    const processFile = async (selectedFile) => {
        if (!selectedFile) return;

        setIsProcessing(true);
        const startTime = performance.now();
        let finalProcessedFile = selectedFile;
        const isHeic = selectedFile.type === 'image/heic' || selectedFile.name.toLowerCase().endsWith('.heic');

        try {
            if (isHeic) {
                console.log("HEIC detected. Converting to JPEG...");
                const promisejpeg = await heic2any({ blob: selectedFile, toType: "image/jpeg" });
                const finalBlob = Array.isArray(promisejpeg) ? promisejpeg[0] : promisejpeg;
                finalProcessedFile = new File(
                    [finalBlob],
                    selectedFile.name.replace(/\.heic$/i, '.jpeg'),
                    { type: 'image/jpeg' }
                );
            }

            const url = URL.createObjectURL(finalProcessedFile);
            onImageSelect(finalProcessedFile, url);

            const endTime = performance.now();
            console.log(`File processed in ${(endTime - startTime).toFixed(2)} ms`);
        } catch (error) {
            console.error("File processing Failed:", error);
            alert("Failed to process image.");
        } finally {
            setIsProcessing(false);
            if (fileInputRef.current) fileInputRef.current.value = null;
            if (cameraInputRef.current) cameraInputRef.current.value = null;
        }
    };

    const handleFileChange = (event) => processFile(event.target.files[0]);

    // Drag and Drop Handlers
    const handleDragOver = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    }, []);

    const handleDrop = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            processFile(e.dataTransfer.files[0]);
        }
    }, []);

    return (
        <div className="min-h-screen bg-[#fff8f6] text-[#1a0f0d] font-sans flex flex-col pt-8 pb-12 px-6 md:px-12 max-w-6xl mx-auto w-full overflow-x-hidden">

            {/* Header: Logo & User Profile */}
            <header className="flex items-center justify-between mb-8 md:mb-12">
                <div className="flex items-center gap-3">
                    <img src={snapitLogo} alt="SnapIT" className="w-24 h-24 object-contain" />
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
            <TimelineBar currentStep={1} />

            {/* Main Content Area */}
            <section className="flex-1 flex flex-col justify-center animate-fade-in">

                {/* Hero Text */}
                <div className="text-center mb-8">
                    <h2 className="font-serif text-3xl md:text-5xl font-extrabold mb-3">Drop a photo in.</h2>
                    <p className="opacity-70 max-w-lg mx-auto">We'll polish it and turn it into something worth sharing.</p>
                </div>

                {/* Drop Zone Box */}
                <div className="w-full max-w-2xl mx-auto relative group">
                    <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} className="hidden" />

                    <div
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        onClick={() => !isProcessing && !hasImage && fileInputRef.current.click()}
                        className={`border-[2.5px] border-dashed rounded-3xl p-8 md:p-16 text-center transition-all bg-white relative overflow-hidden flex flex-col items-center justify-center min-h-[300px]
                            ${isDragging ? 'border-[#dc2626] bg-red-50/30' : 'border-[#e5c5bf]'}
                            ${hasImage ? 'border-solid border-gray-200 p-4' : 'cursor-pointer hover:border-[#dc2626] hover:bg-red-50/10'}
                        `}
                    >
                        {isProcessing ? (
                            <div className="flex flex-col items-center gap-4 text-[#dc2626]">
                                <Loader2 className="w-10 h-10 animate-spin" />
                                <span className="font-semibold text-sm animate-pulse tracking-wide uppercase">Processing File...</span>
                            </div>
                        ) : hasImage ? (
                            <>
                                <img src={mediaState.url} alt="Uploaded" className="w-full h-full object-contain rounded-2xl max-h-[400px]" />
                                <button
                                    onClick={(e) => { e.stopPropagation(); onImageRemove(); }}
                                    className="absolute top-6 right-6 bg-white text-[#1a0f0d] hover:text-[#dc2626] rounded-full p-2.5 shadow-lg border border-gray-100 transition-transform hover:scale-105 z-10"
                                >
                                    <X size={20} strokeWidth={2.5} />
                                </button>
                            </>
                        ) : (
                            <>
                                <div className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-5 bg-red-50 text-[#dc2626] group-hover:scale-110 transition-transform">
                                    <UploadCloud size={32} />
                                </div>
                                <p className="font-serif text-xl font-semibold mb-1">Drag & drop your photo</p>
                                <p className="text-sm opacity-60 mb-6">or click to browse — JPG, PNG, WEBP</p>
                                <span className="bg-[#dc2626] text-white px-5 py-2.5 rounded-full text-sm font-semibold inline-flex items-center gap-2 shadow-sm">
                                    Choose photo
                                </span>
                            </>
                        )}
                    </div>
                </div>

                {/* Sub-text */}
                {!hasImage && (
                    <p className="text-center text-xs opacity-50 mt-6">
                        Your photo stays in your browser. Nothing is uploaded anywhere.
                    </p>
                )}

                {/* Pro Tips Carousel - Sleek & Horizontal */}
                <div className="w-full max-w-2xl mx-auto mt-8 relative">
                    <div
                        ref={scrollRef}
                        className="flex overflow-x-auto snap-x snap-mandatory gap-4 pb-2 pt-1 px-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] scroll-smooth"
                    >
                        {PRO_TIPS.map((tip) => {
                            const Icon = tip.icon;
                            return (
                                <div
                                    key={tip.id}
                                    className="snap-center shrink-0 w-[85%] sm:w-[280px] bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition-shadow p-4 flex items-center gap-4"
                                >
                                    <div className="bg-red-50 text-[#dc2626] p-2.5 rounded-xl flex-shrink-0">
                                        <Icon className="w-5 h-5" strokeWidth={2.5} />
                                    </div>
                                    <p className="text-sm font-medium leading-tight text-gray-700 line-clamp-2">
                                        {appUILanguage === "EN" ? tip.textEN : tip.textMS}
                                    </p>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Bottom Actions */}
                <div className="mt-10 flex flex-col items-center gap-6">
                    {hasImage && !isProcessing ? (
                        <button
                            onClick={onNext}
                            className="bg-[#dc2626] text-white px-8 py-3.5 rounded-full font-semibold flex items-center gap-2 hover:brightness-90 transition-all hover:-translate-y-1 shadow-[0_8px_20px_rgba(220,38,38,0.25)] text-lg"
                        >
                            Proceed to Enhance <ArrowRight size={20} />
                        </button>
                    ) : (
                        <>
                            <input type="file" accept="image/*" capture="environment" ref={cameraInputRef} onChange={handleFileChange} className="hidden" />
                            <button
                                onClick={() => cameraInputRef.current.click()}
                                disabled={isProcessing}
                                className="w-16 h-16 rounded-full bg-white border border-gray-200 text-[#1a0f0d] flex items-center justify-center shadow-sm hover:border-[#dc2626] hover:text-[#dc2626] transition-colors active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Open Camera"
                            >
                                <Camera size={26} strokeWidth={2} />
                            </button>
                        </>
                    )}
                </div>

            </section>
        </div>
    );
}