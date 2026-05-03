import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
    Share2,
    Download,
    Copy,
    Check,
    Edit2,
    ChevronsLeftRight,
    Sparkles
} from 'lucide-react';

// --- Sub-Component: Smart Content Card (No changes here) ---
const ContentCard = ({ label, value, field, onUpdate, isEN }) => {
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
        if (isEditing) adjustHeight();
    }, [isEditing]);

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
export default function ResultsHubView({ userName, appUILanguage, mediaState, aiOutput, setAiOutput, onStartOver }) {
    const isEN = appUILanguage === "EN";
    const [sliderValue, setSliderValue] = useState(100);
    const [toastMessage, setToastMessage] = useState(null);
    const [isProcessingDownload, setIsProcessingDownload] = useState(false); // Added loading state

    const originalImgSrc = mediaState.url;
    let aiImgSrc = null;

    if (aiOutput?.generatedImageBase64) {
        const hasDataPrefix = aiOutput.generatedImageBase64.startsWith('data:image');
        aiImgSrc = hasDataPrefix
            ? aiOutput.generatedImageBase64
            : `data:image/jpeg;base64,${aiOutput.generatedImageBase64}`;
    } else {
        aiImgSrc = aiOutput?.imageUrl;
    }

    const handleUpdateText = (key, value) => {
        setAiOutput(prev => ({ ...prev, [key]: value }));
    };

    const showToast = (msg) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(null), 3000);
    };

    const createProcessedBlob = useCallback((src, brightness, contrast, saturation) => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            // Handle cross-origin if needed (though usually okay with Object URLs)
            img.crossOrigin = "anonymous";
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                canvas.width = img.width;
                canvas.height = img.height;

                // 1. Build the filter string to match standard CSS structure
                // We use the same multiplier formula as the <img> display
                const filterString = [
                    `brightness(${brightness * 2}%)`,
                    `contrast(${contrast * 2}%)`,
                    `saturate(${saturation * 2}%)`
                ].join(' ');

                // 2. Set the canvas filter *before* drawing the image
                if (ctx.filter) { // Check if browser supports canvas filters (most do)
                    ctx.filter = filterString;
                } else {
                    console.warn("Canvas filter not supported on this browser. Falling back to raw image download.");
                }

                // 3. Bake the image onto the canvas (this actually modifies the pixels)
                ctx.drawImage(img, 0, 0);

                // 4. Reset filters (standard practice to avoid visual artifacts)
                ctx.filter = 'none';

                // 5. Convert canvas contents back into a Blob file (JPEG for speed)
                canvas.toBlob((blob) => {
                    resolve(blob);
                }, 'image/jpeg', 0.95); // High quality JPEG
            };
            img.onerror = reject;
            img.src = src; // Triggers the load
        });
    }, []);

    const handleDownload = async () => {
        const isShowingAI = sliderValue >= 50;

        const cleanName = aiOutput.title
            ? aiOutput.title.split(' ')[0].replace(/[^a-zA-Z0-9]/g, '')
            : 'Dish';

        const fileName = isShowingAI
            ? `${cleanName}_SnapIT_AI.png`
            : `${cleanName}_Original.png`;

        if (isShowingAI) {
            // Scene: AI Image - Standard download (no baking needed, Gemini did it)
            if (!aiImgSrc) return;
            const link = document.createElement('a');
            link.href = aiImgSrc;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } else {
            // Scene: Original Edit - Baking required (Scenario A)
            if (!originalImgSrc) return;

            try {
                // Inform user processing is happening as baking tall images takes time
                setIsProcessingDownload(true);
                showToast(isEN ? "Preparing high quality download..." : "Menyediakan muat turun berkualiti tinggi...");

                // 1. Call the baker utility to apply lighting edits permanently
                const processedBlob = await createProcessedBlob(
                    originalImgSrc,
                    mediaState.brightness,
                    mediaState.contrast,
                    mediaState.saturation
                );

                // 2. Create a temporary URL specifically for this processed file
                const downloadUrl = URL.createObjectURL(processedBlob);

                // 3. Trigger the browser download
                const link = document.createElement('a');
                link.href = downloadUrl;
                link.download = fileName;
                document.body.appendChild(link);
                link.click();

                // 4. Cleanup memory: revoke temporary URL immediately after clicking
                setTimeout(() => {
                    document.body.removeChild(link);
                    URL.revokeObjectURL(downloadUrl);
                    setIsProcessingDownload(false);
                }, 100);

            } catch (error) {
                console.error("Error creating baked download:", error);
                setIsProcessingDownload(false);
                showToast(isEN ? "Download failed. Please try again." : "Muat turun gagal. Sila cuba lagi.");
            }
        }
    };

    const handleGlobalShare = async () => {
        const combinedText = `${aiOutput.title}\n\n${aiOutput.description}\n\n${aiOutput.caption}`;

        try {
            const response = await fetch(aiImgSrc);
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
                showToast(isEN ? "Text copied to clipboard!" : "Teks disalin ke papan keratan!");
            }
        } catch (error) {
            console.error("Error sharing:", error);
            navigator.clipboard.writeText(combinedText);
            showToast(isEN ? "Copied text! Ready to paste." : "Teks disalin! Sedia untuk ditampal.");
        }
    };

    return (
        <div className="min-h-full bg-[#fff8f6] text-[#1a0f0d] font-sans flex flex-col md:py-8 px-4 md:px-12 w-full overflow-x-hidden">

            {toastMessage && (
                <div className="fixed top-10 left-1/2 -translate-x-1/2 z-50 bg-[#1a0f0d] text-white px-6 py-3 rounded-full shadow-xl text-sm font-medium animate-bounce">
                    {toastMessage}
                </div>
            )}

            <div className="max-w-6xl mx-auto w-full flex flex-col flex-1 min-h-0 pb-48 md:pb-56">

                <div className="text-center mb-4 md:mb-8 flex-shrink-0">
                    <h1 className="font-serif text-2xl md:text-4xl font-extrabold mb-1 md:mb-3 tracking-tight">
                        {isEN ? "Your Marketing Assets" : "Aset Pemasaran Anda"}
                    </h1>
                    <p className="opacity-70 text-sm md:text-base max-w-lg mx-auto">
                        {isEN ? "Ready to copy, download, and share." : "Sedia untuk disalin, dimuat turun, dan dikongsi."}
                    </p>
                </div>

                {/* Main Content Grid */}
                <div className="flex flex-col lg:flex-row gap-6 md:gap-10 w-full">

                    {/* LEFT COLUMN: The Before/After Comparison Slider */}
                    <section className="w-full lg:w-1/2 flex flex-col gap-4 md:gap-5">
                        <div className="relative w-full max-h-[500px] aspect-[4/5] md:aspect-square bg-white border border-gray-100 rounded-2xl md:rounded-3xl overflow-hidden shadow-sm group touch-none">
                            {originalImgSrc && (
                                <div className="absolute inset-0 w-full h-full pointer-events-none">
                                    <img
                                        src={originalImgSrc}
                                        alt="Original"
                                        className="w-full h-full object-contain"
                                        style={{
                                            // Vislual filter only - not saved to the image file itself
                                            filter: `brightness(${mediaState.brightness * 2}%) contrast(${mediaState.contrast * 2}%) saturate(${mediaState.saturation * 2}%)`
                                        }}
                                    />
                                </div>
                            )}

                            {aiImgSrc && (
                                <div
                                    className="absolute inset-0 w-full h-full bg-[#fff8f6] pointer-events-none"
                                    style={{ clipPath: `inset(0 ${100 - sliderValue}% 0 0)` }}
                                >
                                    <img
                                        src={aiImgSrc}
                                        alt="AI Enhanced"
                                        className="w-full h-full object-contain"
                                    />
                                </div>
                            )}

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
                                {isEN ? "AI Enhanced" : "Dijana AI"}
                            </div>
                            <div className="absolute top-3 right-3 md:top-4 md:right-4 bg-black/60 text-white text-[10px] md:text-xs px-3 py-1.5 rounded-full backdrop-blur-md font-medium pointer-events-none opacity-100 group-hover:opacity-0 transition-opacity">
                                {isEN ? "Original" : "Asal"}
                            </div>
                        </div>

                        {/* The "Smart" Single Download Button - Context aware */}
                        <button
                            onClick={handleDownload}
                            disabled={isProcessingDownload} // Prevent multiple clicks while baking tall images
                            className={`w-full flex items-center justify-center gap-2 text-sm md:text-lg py-3 md:py-3.5 rounded-full font-semibold transition-all duration-300 shadow-sm disabled:opacity-70 disabled:cursor-wait ${sliderValue >= 50
                                ? 'bg-[#dc2626] text-white hover:brightness-90 md:hover:-translate-y-1'
                                : 'bg-white border-2 border-gray-200 text-[#1a0f0d] hover:border-gray-300'
                                }`}
                        >
                            {isProcessingDownload ? (
                                <span className="animate-pulse">{isEN ? "Processing..." : "Memproses..."}</span>
                            ) : (
                                <>
                                    <Download size={18} />
                                    {sliderValue >= 50
                                        ? (isEN ? "Download Enhanced Image" : "Muat Turun Gambar AI")
                                        : (isEN ? "Download Original Edit" : "Muat Turun Gambar Asal")}
                                </>
                            )}
                        </button>
                    </section>

                    {/* RIGHT COLUMN: Editable Content Cards */}
                    <section className="w-full lg:w-1/2 space-y-3 md:space-y-4">
                        <ContentCard
                            label={isEN ? "Catchy Title" : "Tajuk Menarik"}
                            value={aiOutput.title}
                            field="title"
                            onUpdate={handleUpdateText}
                            isEN={isEN}
                        />
                        <ContentCard
                            label={isEN ? "Description" : "Penerangan"}
                            value={aiOutput.description}
                            field="description"
                            onUpdate={handleUpdateText}
                            isEN={isEN}
                        />
                        <ContentCard
                            label={isEN ? "Social Caption + Tags" : "Kapsyen Sosial + Tags"}
                            value={aiOutput.caption}
                            field="caption"
                            onUpdate={handleUpdateText}
                            isEN={isEN}
                        />
                    </section>
                </div>

                <div className="mt-8 md:mt-12 pt-6 md:pt-8 border-t border-gray-100 flex flex-col sm:flex-row items-center gap-3 md:gap-4 w-full">
                    <button
                        onClick={handleGlobalShare}
                        className="w-full sm:flex-1 bg-[#dc2626] hover:bg-black text-white text-sm md:text-lg font-semibold py-3 md:py-3.5 rounded-full shadow-lg flex items-center justify-center gap-2 md:gap-3 transition-transform active:scale-[0.98]"
                    >
                        <Share2 size={20} />
                        {isEN ? "Share to Social Media" : "Kongsi ke Media Sosial"}
                    </button>

                    <button
                        onClick={onStartOver}
                        // Added border, rounded corners, and hover states here
                        className="w-full sm:w-auto bg-white border-2 border-gray-200 text-[#1a0f0d] hover:border-gray-300 hover:bg-gray-50 text-sm md:text-base font-semibold py-3 md:py-3.5 px-6 rounded-full flex items-center justify-center gap-2 transition-all"
                    >
                        <Sparkles size={16} />
                        {isEN ? "Start New Dish" : "Mula Hidangan Baru"}
                    </button>
                </div>
            </div>
        </div>
    );
}