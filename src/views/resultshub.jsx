import React, { useState, useRef, useEffect } from 'react';
import {
    Share2,
    Download,
    Copy,
    Check,
    Edit2,
    ChevronsLeftRight,
    Sparkles
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

// --- Sub-Component: Smart Content Card ---
const ContentCard = ({ label, value, field, onUpdate }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [isCopied, setIsCopied] = useState(false);
    const textareaRef = useRef(null);

    const adjustHeight = () => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
        }
    };

    useEffect(() => {
        if (isEditing && textareaRef.current) {
            // Reset height briefly to get the correct scrollHeight if text is deleted
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
        }
    }, [isEditing, value]);

    const handleChange = (e) => {
        onUpdate(field, e.target.value);
        adjustHeight();
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(value);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    };

    return (
        <div className={`relative bg-white border border-gray-100 rounded-xl md:rounded-2xl shadow-sm p-4 md:p-5 transition-all duration-300 ${isEditing ? 'border-[#dc2626] ring-4 ring-red-50' : ''}`}>
            <div className="flex items-center justify-between mb-2 md:mb-3">
                <span className="text-[10px] md:text-xs font-bold tracking-wider text-gray-400 uppercase">
                    {label}
                </span>
                <div className="flex gap-1.5 md:gap-2">
                    <button
                        onClick={() => setIsEditing(!isEditing)}
                        className="p-1.5 md:p-2 text-gray-400 hover:text-[#dc2626] hover:bg-red-50 rounded-full transition-colors"
                    >
                        {isEditing ? <Check size={16} className="text-[#dc2626]" /> : <Edit2 size={16} />}
                    </button>
                    <button
                        onClick={handleCopy}
                        className="p-1.5 md:p-2 text-gray-400 hover:text-[#dc2626] hover:bg-red-50 rounded-full transition-colors"
                    >
                        {isCopied ? <Check size={16} className="text-[#dc2626]" /> : <Copy size={16} />}
                    </button>
                </div>
            </div>

            {isEditing ? (
                <textarea
                    ref={textareaRef}
                    value={value}
                    onChange={handleChange}
                    onBlur={() => setIsEditing(false)}
                    className="w-full text-sm md:text-base text-[#1a0f0d] outline-none resize-none bg-transparent overflow-hidden"
                    autoFocus
                />
            ) : (
                <p className="text-sm md:text-base text-[#1a0f0d] whitespace-pre-wrap leading-relaxed">{value}</p>
            )}
        </div>
    );
};

// --- Main View Component ---
export default function ResultsHubView({ mediaState, aiOutput, setAiOutput, onStartOver }) {
    const { t } = useTranslation('resultsHub');
    const [sliderValue, setSliderValue] = useState(100);
    const [toastMessage, setToastMessage] = useState(null);

    const originalImgSrc = mediaState.originalUrl || mediaState.url;
    const hasAiImage = Boolean(aiOutput?.generatedImageBase64);

    let aiImgSrc = null;
    if (hasAiImage) {
        const hasDataPrefix = aiOutput.generatedImageBase64.startsWith('data:image');
        aiImgSrc = hasDataPrefix
            ? aiOutput.generatedImageBase64
            : `data:image/jpeg;base64,${aiOutput.generatedImageBase64}`;
    }

    // "Final" = whatever the user should compare against the raw upload.
    // AI bg-swap output wins; otherwise the filter-baked JPEG; otherwise the raw itself.
    const finalImgSrc = aiImgSrc || mediaState.processedUrl || originalImgSrc;
    const showSlider = Boolean(finalImgSrc && originalImgSrc && finalImgSrc !== originalImgSrc);

    const handleUpdateText = (key, value) => {
        setAiOutput(prev => ({ ...prev, [key]: value }));
    };

    const showToast = (msg) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(null), 3000);
    };

    const handleDownload = async () => {
        const showingFinal = showSlider ? sliderValue >= 50 : true;

        const cleanName = aiOutput.title
            ? aiOutput.title.split(' ')[0].replace(/[^a-zA-Z0-9]/g, '')
            : 'Dish';

        const finalSuffix = hasAiImage ? 'SnapIT_AI' : 'SnapIT_Edit';
        const fileName = showingFinal
            ? `${cleanName}_${finalSuffix}.png`
            : `${cleanName}_Original.png`;

        const targetUrl = showingFinal ? finalImgSrc : originalImgSrc;

        if (!targetUrl) return;

        const link = document.createElement('a');
        link.href = targetUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleGlobalShare = async () => {
        const combinedText = `${aiOutput.title}\n\n${aiOutput.description}\n\n${aiOutput.caption}`;
        const targetShareUrl = finalImgSrc;

        try {
            const response = await fetch(targetShareUrl);
            const blob = await response.blob();
            const file = new File([blob], 'SnapIT_Result.png', { type: 'image/png' });

            if (navigator.share) {
                await navigator.share({
                    title: aiOutput.title,
                    text: combinedText,
                    files: [file]
                });
            } else {
                navigator.clipboard.writeText(combinedText);
                showToast(t('toast.copied'));
            }
        } catch (error) {
            console.error("Error sharing:", error);
            navigator.clipboard.writeText(combinedText);
            showToast(t('toast.copiedFallback'));
        }
    };

    return (
        <div className="min-h-full w-full bg-[#fff8f6] text-[#1a0f0d] font-sans flex flex-col md:py-8 px-4 md:px-12 ">

            {toastMessage && (
                <div className="fixed top-10 left-1/2 -translate-x-1/2 z-50 bg-[#1a0f0d] text-white px-6 py-3 rounded-full shadow-xl text-sm font-medium animate-bounce">
                    {toastMessage}
                </div>
            )}

            <div className="max-w-6xl mx-auto w-full flex flex-col flex-1 min-h-0 pb-48 md:pb-56">

                <div className="text-center pt-4 mb-4 md:mb-8 flex-shrink-0">
                    <h1 className="font-serif text-2xl md:text-4xl font-extrabold mb-1 md:mb-3 tracking-tight">
                        {t('heading')}
                    </h1>
                    <p className="opacity-70 text-sm md:text-base max-w-lg mx-auto">
                        {t('subheading')}
                    </p>
                </div>

                {/* Main Content Grid */}
                <div className="flex flex-col lg:flex-row gap-6 md:gap-10 w-full">

                    {/* LEFT COLUMN: The Before/After Comparison Slider */}
                    <section className="w-full lg:w-1/2 flex flex-col gap-4 md:gap-5">
                        <div className="relative w-full max-h-[500px] aspect-[4/5] md:aspect-square bg-white border border-gray-100 rounded-2xl md:rounded-3xl overflow-hidden shadow-sm group">

                            {originalImgSrc && (
                                <div className="absolute inset-0 w-full h-full pointer-events-none">
                                    <img
                                        src={originalImgSrc}
                                        alt="Original"
                                        className="w-full h-full object-contain"
                                    />
                                </div>
                            )}

                            {showSlider && (
                                <>
                                    <div
                                        className="absolute inset-0 w-full h-full bg-[#fff8f6] pointer-events-none"
                                        style={{ clipPath: `inset(0 ${100 - sliderValue}% 0 0)` }}
                                    >
                                        <img
                                            src={finalImgSrc}
                                            alt={hasAiImage ? "AI Enhanced" : "Edited"}
                                            className="w-full h-full object-contain"
                                        />
                                    </div>
                                    <input
                                        type="range"
                                        min="0" max="100"
                                        value={sliderValue}
                                        onChange={(e) => setSliderValue(e.target.value)}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-20"
                                    />

                                    <div
                                        className="absolute top-0 bottom-0 w-1 bg-white shadow-[0_0_10px_rgba(0,0,0,0.3)] z-10 pointer-events-none"
                                        style={{ left: `${sliderValue}%` }}
                                    >
                                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 md:w-10 md:h-10 bg-white rounded-full shadow-md flex items-center justify-center border border-gray-100 text-gray-700">
                                            <ChevronsLeftRight size={18} />
                                        </div>
                                    </div>

                                    <div className="absolute top-3 left-3 md:top-4 md:left-4 bg-black/60 text-white text-[10px] md:text-xs px-3 py-1.5 rounded-full backdrop-blur-md font-medium pointer-events-none opacity-100 group-hover:opacity-0 transition-opacity">
                                        {hasAiImage ? t('labels.aiEnhanced') : t('labels.edited')}
                                    </div>
                                    <div className="absolute top-3 right-3 md:top-4 md:right-4 bg-black/60 text-white text-[10px] md:text-xs px-3 py-1.5 rounded-full backdrop-blur-md font-medium pointer-events-none opacity-100 group-hover:opacity-0 transition-opacity">
                                        {t('labels.original')}
                                    </div>
                                </>
                            )}

                        </div>

                        {/* The "Smart" Single Download Button - Context aware */}
                        <button
                            onClick={handleDownload}
                            className={`w-full flex items-center justify-center gap-2 text-sm md:text-lg py-3 md:py-3.5 rounded-full font-semibold transition-all duration-300 shadow-sm ${showSlider && sliderValue >= 50
                                ? 'bg-[#dc2626] text-white hover:brightness-90 md:hover:-translate-y-1'
                                : 'bg-white border-2 border-gray-200 text-[#1a0f0d] hover:border-gray-300'
                                }`}
                        >
                            <Download size={18} />
                            {showSlider
                                ? (sliderValue >= 50
                                    ? (hasAiImage ? t('download.enhanced') : t('download.edited'))
                                    : t('download.original'))
                                : t('download.image')}
                        </button>
                    </section>

                    {/* RIGHT COLUMN: Editable Content Cards */}
                    <section className="w-full lg:w-1/2 space-y-3 md:space-y-4">
                        <ContentCard
                            label={t('labels.title')}
                            value={aiOutput.title}
                            field="title"
                            onUpdate={handleUpdateText}
                        />
                        <ContentCard
                            label={t('labels.description')}
                            value={aiOutput.description}
                            field="description"
                            onUpdate={handleUpdateText}
                        />
                        <ContentCard
                            label={t('labels.caption')}
                            value={aiOutput.caption}
                            field="caption"
                            onUpdate={handleUpdateText}
                        />
                    </section>
                </div>

                <div className="mt-8 md:mt-12 pt-6 md:pt-8 border-t border-gray-100 flex flex-col sm:flex-row items-center gap-3 md:gap-4 w-full">
                    <button
                        onClick={handleGlobalShare}
                        className="w-full sm:flex-1 bg-[#dc2626] hover:bg-black text-white text-sm md:text-lg font-semibold py-3 md:py-3.5 rounded-full shadow-lg flex items-center justify-center gap-2 md:gap-3 transition-transform active:scale-[0.98]"
                    >
                        <Share2 size={20} />
                        {t('share')}
                    </button>

                    <button
                        onClick={onStartOver}
                        className="w-full sm:w-auto bg-white border-2 border-gray-200 text-[#1a0f0d] hover:border-gray-300 hover:bg-gray-50 text-sm md:text-base font-semibold py-3 md:py-3.5 px-6 rounded-full flex items-center justify-center gap-2 transition-all"
                    >
                        <Sparkles size={16} />
                        {t('startOver')}
                    </button>
                </div>
            </div>
        </div>
    );
}
