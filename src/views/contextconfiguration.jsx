import React, { useEffect } from 'react';
import { Sparkles, ArrowLeft, Utensils, CheckCircle2, MessageSquare, Image as ImageIcon } from 'lucide-react';
import imageCompression from 'browser-image-compression'

// Custom Segmented Control for Language
const SegmentedControl = ({ options, selected, onChange }) => (
    <div className="flex w-full bg-gray-50/80 p-1.5 rounded-2xl border border-gray-100">
        {options.map((option) => {
            const isSelected = selected === option;
            return (
                <button
                    key={option}
                    type="button"
                    onClick={() => onChange(option)}
                    className={`flex-1 py-2.5 px-2 rounded-xl text-sm md:text-base transition-all duration-200 ease-in-out font-sans whitespace-nowrap
                        ${isSelected
                            ? "bg-white text-[#dc2626] font-bold shadow-sm border border-gray-200/50"
                            : "bg-transparent text-gray-500 font-medium hover:text-gray-800"
                        }`}
                >
                    {option}
                </button>
            );
        })}
    </div>
);

const createProcessedBlob = (src, brightness, contrast, saturation) => {
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
};

export default function ContextConfigurationView({ appUILanguage, config, setConfig, onNext, onPrev, mediaState, setMediaState }) {
    const isEN = appUILanguage === "EN";

    useEffect(() => {
        let isMounted = true;

        const prepareFinalImage = async () => {
            // Skip if we already processed it or if there's no file
            if (!mediaState.file || mediaState.processedFile) return;

            try {
                // 1. Bake the CSS filters into a new Blob
                const bakedBlob = await createProcessedBlob(
                    mediaState.url,
                    mediaState.brightness,
                    mediaState.contrast,
                    mediaState.saturation
                );

                // 2. Compress the baked image
                const options = {
                    maxSizeMB: 1,
                    maxWidthOrHeight: 1200,
                    useWebWorker: true,
                    initialQuality: 0.85
                };
                const compressedFile = await imageCompression(bakedBlob, options);
                const compressedUrl = URL.createObjectURL(compressedFile);

                if (isMounted) {
                    // 3. Save silently to global state
                    setMediaState(prev => ({
                        ...prev,
                        processedFile: compressedFile,
                        processedUrl: compressedUrl
                    }));
                }
            } catch (error) {
                console.error("Background processing failed:", error);
                // Fallback to the raw file if compression fails
                if (isMounted) {
                    setMediaState(prev => ({
                        ...prev,
                        processedFile: prev.file,
                        processedUrl: prev.url
                    }));
                }
            }
        };

        prepareFinalImage();

        return () => { isMounted = false; };
    }, [mediaState.file, mediaState.brightness, mediaState.contrast, mediaState.saturation]);

    // Options matching our new frictionless architecture
    const languageOptions = ["English", "Bahasa Melayu", "Local Style"];

    const backgroundOptions = [
        {
            id: 'kopitiam',
            label: isEN ? 'Kopitiam' : 'Kopitiam',
            desc: isEN ? 'Classic marble table' : 'Meja marmar klasik',
            gradient: 'from-slate-100 to-gray-200',
            textColor: 'text-slate-700'
        },
        {
            id: 'cafe',
            label: isEN ? 'Modern Cafe' : 'Kafe Moden',
            desc: isEN ? 'Warm wooden table' : 'Meja kayu & terang',
            gradient: 'from-amber-50 to-orange-100',
            textColor: 'text-amber-800'
        },
        {
            id: 'street',
            label: isEN ? 'Street Food' : 'Pasar Malam',
            desc: isEN ? 'Night market vibes' : 'Suasana pasar malam',
            gradient: 'from-gray-800 to-slate-900',
            textColor: 'text-white'
        },
        {
            id: 'premium',
            label: isEN ? 'Premium' : 'Premium',
            desc: isEN ? 'Clean & elegant' : 'Bersih & eksklusif',
            gradient: 'from-zinc-900 to-black', // You can keep the dark gradient for the UI button, it looks premium.
            textColor: 'text-zinc-200'
        }
    ];

    const handleUpdate = (key, value) => setConfig(prev => ({ ...prev, [key]: value }));

    // Strict Validation: Check if ALL fields have values
    const isReady =
        (config.dishName?.trim() !== "" && config.dishName !== undefined) &&
        (config.price?.trim() !== "" && config.price !== undefined) &&
        (config.outputLanguage !== "") &&
        (config.backgroundVibe !== "") &&
        (!config.generateBackground || config.backgroundVibe !== "");

    return (
        <div className="min-h-full w-full bg-[#fff8f6] text-[#1a0f0d] font-sans flex flex-col md:py-8 px-4 md:px-12">
            {/* Header Area (Now flows naturally) */}
            <header className="pb-safe px-6 flex items-center">
                <button
                    onClick={onPrev}
                    className="p-2.5 bg-white rounded-full shadow-sm border border-gray-100 text-gray-800 hover:text-[#dc2626] transition-colors active:scale-95"
                >
                    <ArrowLeft size={22} />
                </button>
                <div className="flex-1 text-center pr-10">
                    <h1 className="text-xl md:text-2xl font-serif font-extrabold text-gray-900">
                        {isEN ? "The Details" : "Butiran"}
                    </h1>
                    <p className="text-xs md:text-sm text-gray-500 mt-0.5">
                        {isEN ? "Tell us what you're selling" : "Kongsi sikit apa yang anda jual"}
                    </p>
                </div>
            </header>

            {/* Form Body (No forced overflow, just let it stretch) */}
            <div className="px-4 md:px-6">
                <div className="max-w-xl mx-auto space-y-5 pt-2">

                    {/* Card 1: Dish & Price */}
                    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-5 md:p-6">
                        <div className="flex items-center gap-2 mb-4">
                            <Utensils className="w-5 h-5 text-[#dc2626]" />
                            <h2 className="font-serif font-bold text-lg">{isEN ? "What's the dish?" : "Nama Hidangan?"}</h2>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5 ml-1">
                                    {isEN ? "Dish Name" : "Nama Makanan"}
                                </label>
                                <input
                                    type="text"
                                    placeholder={isEN ? "e.g., Nasi Lemak Ayam Goreng" : "cth., Nasi Lemak Ayam Goreng"}
                                    value={config.dishName || ""}
                                    onChange={(e) => handleUpdate('dishName', e.target.value)}
                                    className="w-full px-4 py-3.5 bg-gray-50/50 border border-gray-200 text-gray-900 rounded-2xl focus:outline-none focus:border-[#dc2626] focus:ring-1 focus:ring-[#dc2626] transition-all font-medium"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5 ml-1">
                                    {isEN ? "Price" : "Harga"}
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <span className="font-bold text-gray-400">RM</span>
                                    </div>
                                    <input
                                        type="number"
                                        placeholder="12.00"
                                        value={config.price || ""}
                                        onChange={(e) => handleUpdate('price', e.target.value)}
                                        className="w-full pl-12 pr-4 py-3.5 bg-gray-50/50 border border-gray-200 text-gray-900 rounded-2xl focus:outline-none focus:border-[#dc2626] focus:ring-1 focus:ring-[#dc2626] transition-all font-medium text-lg"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Card 2: Language */}
                    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-5 md:p-6">
                        <div className="flex items-center gap-2 mb-4">
                            <MessageSquare className="w-5 h-5 text-[#dc2626]" />
                            <h2 className="font-serif font-bold text-lg">{isEN ? "Caption Language" : "Bahasa Kapsyen"}</h2>
                        </div>
                        <SegmentedControl
                            options={languageOptions}
                            selected={config.outputLanguage}
                            onChange={(val) => handleUpdate('outputLanguage', val)}
                        />
                    </div>

                    {/* Card 3: Background Vibe */}
                    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-5 md:p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <ImageIcon className="w-5 h-5 text-[#dc2626]" />
                                <h2 className="font-serif font-bold text-lg">{isEN ? "Change Background" : "Tukar Latar Belakang"}</h2>
                            </div>

                            {/* New Segmented Toggle (Matches Language Toggle Style) */}
                            <div className="flex bg-gray-100/80 p-1 rounded-full border border-gray-200 items-center">
                                <button
                                    type="button"
                                    onClick={() => handleUpdate('generateBackground', true)}
                                    className={`px-3 md:px-4 py-1.5 rounded-full text-xs md:text-sm font-bold transition-all duration-200 ${config.generateBackground
                                        ? 'bg-white text-gray-800 shadow-sm border border-gray-200/50'
                                        : 'text-gray-400 hover:text-gray-600 bg-transparent'
                                        }`}
                                >
                                    {isEN ? "ON" : "BUKA"}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleUpdate('generateBackground', false)}
                                    className={`px-3 md:px-4 py-1.5 rounded-full text-xs md:text-sm font-bold transition-all duration-200 ${!config.generateBackground
                                        ? 'bg-white text-gray-800 shadow-sm border border-gray-200/50'
                                        : 'text-gray-400 hover:text-gray-600 bg-transparent'
                                        }`}
                                >
                                    {isEN ? "OFF" : "TUTUP"}
                                </button>
                            </div>

                        </div>

                        <div className={`grid grid-cols-2 gap-3 transition-opacity duration-300 ${!config.generateBackground ? 'opacity-40 pointer-events-none grayscale-[0.5]' : 'opacity-100'} `}>
                            {backgroundOptions.map((bg) => {
                                const isSelected = config.backgroundVibe === bg.id;
                                return (
                                    <button
                                        key={bg.id}
                                        type="button"
                                        onClick={() => handleUpdate('backgroundVibe', bg.id)}
                                        className={`relative overflow-hidden text-left p-4 rounded-2xl border-2 transition-all duration-200 flex flex-col h-28 outline-none
                                        ${isSelected
                                                ? 'border-[#dc2626] shadow-md scale-[0.98]'
                                                : 'border-transparent shadow-sm hover:shadow-md hover:scale-[1.02]'
                                            }
                                    `}
                                    >
                                        <div className={`absolute inset-0 bg-gradient-to-br ${bg.gradient} opacity-90`} />
                                        <div className="relative z-10 flex-1">
                                            <span className={`block font-serif font-bold text-sm md:text-base leading-tight ${bg.textColor}`}>
                                                {bg.label}
                                            </span>
                                            <span className={`block text-[10px] md:text-xs mt-1 opacity-80 ${bg.textColor}`}>
                                                {bg.desc}
                                            </span>
                                        </div>
                                        {isSelected && (
                                            <div className="relative z-10 self-end mt-auto">
                                                <div className="bg-white rounded-full p-0.5 shadow-sm">
                                                    <CheckCircle2 className="w-4 h-4 text-[#dc2626]" />
                                                </div>
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                </div>
            </div>

            {/* Footer Area (Now inline, naturally pushed to the bottom) */}
            <div className="px-4 md:px-6 pt-8 max-w-xl mx-auto w-full">
                <button
                    onClick={onNext}
                    disabled={!isReady}
                    className={`w-full py-4 rounded-[20px] font-bold text-lg flex items-center justify-center gap-2 transition-all duration-300
                    ${isReady
                            ? "bg-[#dc2626] text-white shadow-[0_8px_20px_rgba(220,38,38,0.3)] hover:-translate-y-1 active:scale-[0.98] cursor-pointer"
                            : "bg-gray-200 text-gray-400 cursor-not-allowed"
                        }
                `}
                >
                    <Sparkles className={`w-5 h-5 ${isReady ? "animate-pulse" : ""}`} />
                    {isEN ? "Generate" : "Jana"}
                </button>
            </div>

        </div>
    );
}