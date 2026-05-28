import React, { useRef, useState, useCallback, useEffect } from 'react';
import heic2any from 'heic2any';
import { useTranslation } from 'react-i18next';
import { Camera, ArrowRight, X, Loader2, UploadCloud, Sun, Focus, Lightbulb, Utensils, Crosshair, Users } from 'lucide-react';
import GuidedCaptureModal from '../components/GuidedCaptureModal';

const PRO_TIPS = [
    { id: 1, icon: Sun },
    { id: 2, icon: Focus },
    { id: 3, icon: Lightbulb },
    { id: 4, icon: Utensils },
];

export default function DashboardView({ onImageSelect, onImageRemove, mediaState, onNext, processingNudge, onDismissNudge }) {
    const { t } = useTranslation(['dashboard', 'common', 'guidedCapture', 'processing']);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [showGuidedCapture, setShowGuidedCapture] = useState(false);
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
        <div className="min-h-full w-full bg-[#fff8f6] text-[#1a0f0d] font-sans flex flex-col md:py-8 px-4 md:px-12">

            <div className="max-w-6xl mx-auto w-full flex flex-col flex-1 min-h-0">

                {/* Main Content Area */}
                <section className="flex-1 flex flex-col w-full min-h-0 animate-fade-in pb-2 md:pb-4">

                    {/* Hero Text - Margins tightened */}
                    <div className="text-center pt-4 mb-3 md:mb-6 flex-shrink-0">
                        <h2 className="font-serif text-xl md:text-3xl font-extrabold mb-1 md:mb-3">{t('dashboard:hero.title')}</h2>
                        <p className="opacity-70 text-sm md:text-base max-w-lg mx-auto">{t('dashboard:hero.subtitle')}</p>
                    </div>

                    {/* Phase 6.7.2 — re-shoot nudge banner. Surfaces when the
                        uncertainty gate detected humans in frame (-1 score)
                        and bounced the user back here. Dismissible. */}
                    {processingNudge === 'human_detected' && (
                        <div className="w-[85%] sm:w-full max-w-2xl mx-auto mb-3 md:mb-4 bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3 animate-fade-in">
                            <Users size={18} className="text-amber-600 mt-0.5 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-amber-900">
                                    {t('processing:humanDetected.title')}
                                </p>
                                <p className="text-xs text-amber-800 mt-0.5 leading-relaxed">
                                    {t('processing:humanDetected.body')}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={onDismissNudge}
                                className="p-1 text-amber-700 hover:text-amber-900 active:scale-95 transition-colors flex-shrink-0"
                                aria-label={t('processing:humanDetected.dismiss')}
                            >
                                <X size={16} strokeWidth={2.5} />
                            </button>
                        </div>
                    )}

                    {/* THE SHOCK ABSORBER: Drop Zone Box */}
                    {/* FIX 2: flex-1 combined with a tiny min-h-[130px] allows it to stretch and shrink based on the phone screen size */}
                    <div className="w-[85%] sm:w-full max-w-2xl mx-auto flex flex-col flex-1 min-h-[130px] md:min-h-[300px]">
                        <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} className="hidden" />

                        <div
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            onClick={() => !isProcessing && !hasImage && fileInputRef.current.click()}
                            // FIX 3: h-full forces the dashed box to expand to the edges of the shock absorber
                            className={`w-full h-full flex-1 border-[2px] md:border-[2.5px] rounded-2xl md:rounded-3xl p-2 md:p-10 transition-all bg-white flex flex-col items-center justify-center relative overflow-hidden group
                                ${isDragging ? 'border-[#dc2626] bg-red-50/30 border-dashed' : 'border-[#e5c5bf] border-dashed'}
                                ${hasImage ? 'border-solid border-gray-200' : 'cursor-pointer md:hover:border-[#dc2626] md:hover:bg-red-50/10'}
                            `}
                        >
                            {isProcessing ? (
                                <div className="flex flex-col items-center gap-2 md:gap-3 text-[#dc2626]">
                                    <Loader2 className="w-6 h-6 md:w-10 md:h-10 animate-spin" />
                                    <span className="font-semibold text-xs md:text-sm animate-pulse tracking-wide uppercase">{t('dashboard:dropZone.processing')}</span>
                                </div>
                            ) : hasImage ? (
                                // FIX 4: max-h-full ensures a tall uploaded image doesn't blow out the flexible container
                                <div className="relative w-full h-full flex items-center justify-center p-1 md:p-2">
                                    <img src={mediaState.url} alt="Uploaded" className="max-w-full max-h-full object-contain rounded-xl md:rounded-2xl" />
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onImageRemove(); }}
                                        className="absolute top-1 right-1 md:-top-2 md:-right-2 bg-white text-[#1a0f0d] hover:text-[#dc2626] rounded-full p-1.5 md:p-2.5 shadow-md border border-gray-100 transition-transform md:hover:scale-105 z-10"
                                    >
                                        <X size={16} strokeWidth={2.5} />
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <div className="w-10 h-10 md:w-16 md:h-16 mx-auto rounded-xl md:rounded-2xl flex items-center justify-center mb-2 md:mb-5 bg-red-50 text-[#dc2626] md:group-hover:scale-110 transition-transform">
                                        <UploadCloud size={24} className="md:w-8 md:h-8" />
                                    </div>
                                    <p className="font-serif text-xl font-semibold mb-1 hidden sm:block">{t('dashboard:dropZone.dragDesktop')}</p>
                                    <p className="font-serif text-base font-semibold mb-2 sm:hidden">{t('dashboard:dropZone.pressMobile')}</p>

                                    <p className="text-xs md:text-sm opacity-60 mb-4 hidden sm:block">{t('dashboard:dropZone.browseHint')}</p>
                                    <span className="bg-[#dc2626] text-white px-3 py-1.5 md:px-4 md:py-2 rounded-full text-[10px] md:text-sm font-semibold inline-flex items-center gap-2 shadow-sm">
                                        {t('dashboard:dropZone.choosePhoto')}
                                    </span>
                                </>
                            )}
                        </div>

                        {/* Privacy text moved here, tightly spaced */}
                        <p className="text-center text-[9px] md:text-xs opacity-50 mt-1.5 md:mt-3 flex-shrink-0 hidden md:block">
                            {t('dashboard:dropZone.privacyHint')}
                        </p>
                    </div>

                    {/* Pro Tips Carousel - Margins compressed */}
                    <div className="w-full max-w-2xl mx-auto mt-3 md:mt-6 relative flex-shrink-0">

                        <div ref={scrollRef} className="flex overflow-x-auto snap-x snap-mandatory gap-2 md:gap-3 pb-1 md:pb-2 pt-1 px-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] scroll-smooth">
                            {PRO_TIPS.map((tip) => {
                                const Icon = tip.icon;
                                return (
                                    <div
                                        key={tip.id}
                                        className="snap-center shrink-0 w-[85%] sm:w-[280px] bg-white border border-gray-100 rounded-lg md:rounded-xl shadow-sm p-2 md:p-4 flex items-center gap-2 md:gap-3"
                                    >
                                        <div className="bg-red-50 text-[#dc2626] p-1.5 md:p-2 rounded-md md:rounded-lg flex-shrink-0">
                                            <Icon className="w-3 h-3 md:w-5 md:h-5" strokeWidth={2.5} />
                                        </div>
                                        <p className="text-[10px] md:text-sm font-medium leading-tight text-gray-700 line-clamp-2">
                                            {t(`dashboard:proTips.${tip.id}`)}
                                        </p>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Bottom Actions - mt-auto pushes it down, but the compressed UI guarantees it stays on screen */}
                    <div className="mt-3 md:mt-auto pt-1 md:pt-4 flex flex-col items-center gap-2 md:gap-4 flex-shrink-0">
                        {hasImage && !isProcessing ? (
                            <button
                                onClick={onNext}
                                className="bg-[#dc2626] w-full max-w-xs justify-center text-white px-6 md:px-8 py-3 md:py-3.5 rounded-full font-semibold flex items-center gap-2 hover:brightness-90 transition-all md:hover:-translate-y-1 shadow-[0_8px_20px_rgba(220,38,38,0.25)] text-sm md:text-lg"
                            >
                                {t('dashboard:actions.edit')} <ArrowRight size={18} />
                            </button>
                        ) : (
                            <>
                                <input type="file" accept="image/*" capture="environment" ref={cameraInputRef} onChange={handleFileChange} className="hidden" />
                                <div className="flex items-end gap-6 md:gap-10">
                                    <div className="flex flex-col items-center gap-1.5 md:gap-2">
                                        <button
                                            onClick={() => cameraInputRef.current.click()}
                                            disabled={isProcessing}
                                            className="w-14 h-14 md:w-20 md:h-20 rounded-full bg-[#dc2626] border-4 border-white text-white flex items-center justify-center shadow-lg md:shadow-xl md:hover:scale-105 transition-transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                                            title="Open Camera"
                                        >
                                            <Camera size={26} strokeWidth={2} className="md:w-8 md:h-8" />
                                        </button>
                                        <span className="text-[10px] md:text-xs font-semibold uppercase tracking-wider opacity-60">{t('dashboard:actions.takePhoto')}</span>
                                    </div>
                                    <div className="flex flex-col items-center gap-1.5 md:gap-2">
                                        <button
                                            onClick={() => setShowGuidedCapture(true)}
                                            disabled={isProcessing}
                                            className="w-14 h-14 md:w-20 md:h-20 rounded-full bg-white border-4 border-[#dc2626] text-[#dc2626] flex items-center justify-center shadow-lg md:shadow-xl md:hover:scale-105 transition-transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                                            title={t('guidedCapture:button.label')}
                                        >
                                            <Crosshair size={26} strokeWidth={2} className="md:w-8 md:h-8" />
                                        </button>
                                        <span className="text-[10px] md:text-xs font-semibold uppercase tracking-wider opacity-60">{t('guidedCapture:button.label')}</span>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                </section>
            </div>

            <GuidedCaptureModal
                isOpen={showGuidedCapture}
                onClose={() => setShowGuidedCapture(false)}
                onCapture={onImageSelect}
            />
        </div>
    );
}
