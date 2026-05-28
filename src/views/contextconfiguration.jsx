import React, { useEffect } from 'react';
import { Sparkles, ArrowLeft, Utensils, CheckCircle2, MessageSquare, Image as ImageIcon } from 'lucide-react';
import imageCompression from 'browser-image-compression'
import { useTranslation } from 'react-i18next';
import SegmentedControl from '../components/SegmentedControl';

// Phase 6.7.3 — scene thumbnails for the 2×2 vibe selector. import.meta.glob
// with eager:true bundles whichever files exist at build time; missing files
// simply yield `undefined` in the lookup and we fall back to the gradient
// rendering. Keeps the wiring shippable before Owner adds the JPEGs.
const SCENE_THUMB_MODULES = import.meta.glob('../assets/scenes/*.jpg', {
    eager: true,
    query: '?url',
    import: 'default',
});
const SCENE_THUMBS = Object.fromEntries(
    Object.entries(SCENE_THUMB_MODULES).map(([p, url]) => {
        const name = p.split('/').pop().replace(/\.jpg$/, '');
        return [name, url];
    })
);

// Apply a 3x3 convolution to ImageData in-place (used for sharpness when baking,
// because canvas ctx.filter = 'url(#...)' is not reliable across browsers).
const applyConvolution3x3 = (imageData, kernel) => {
    const { width, height, data } = imageData;
    const src = new Uint8ClampedArray(data);
    const k = kernel;
    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            const dstIdx = (y * width + x) * 4;
            for (let c = 0; c < 3; c++) {
                let sum = 0;
                let ki = 0;
                for (let ky = -1; ky <= 1; ky++) {
                    for (let kx = -1; kx <= 1; kx++) {
                        const srcIdx = ((y + ky) * width + (x + kx)) * 4 + c;
                        sum += src[srcIdx] * k[ki++];
                    }
                }
                data[dstIdx + c] = Math.max(0, Math.min(255, sum));
            }
            // preserve alpha
            data[dstIdx + 3] = src[dstIdx + 3];
        }
    }
};

const createProcessedBlob = (src, mediaState) => {
    const {
        brightness, contrast, saturation,
        isMediaEditorPro, hue = 50, blur = 0, sharpness = 0, vignette = 0
    } = mediaState;
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = img.width;
            canvas.height = img.height;

            const filterParts = [
                `brightness(${brightness * 2}%)`,
                `contrast(${contrast * 2}%)`,
                `saturate(${saturation * 2}%)`
            ];
            if (isMediaEditorPro) {
                const hueDeg = (hue - 50) * 3.6;
                const blurPx = blur / 25;
                filterParts.push(`hue-rotate(${hueDeg}deg)`);
                if (blurPx > 0) filterParts.push(`blur(${blurPx}px)`);
            }

            if (ctx.filter) {
                ctx.filter = filterParts.join(' ');
            } else {
                console.warn("Canvas filter not supported on this browser.");
            }

            ctx.drawImage(img, 0, 0);
            ctx.filter = 'none';

            // Pro: sharpness via JS convolution (portable across browsers)
            if (isMediaEditorPro && sharpness > 0) {
                const k = sharpness / 100;
                const kernel = [0, -k, 0, -k, 1 + 4 * k, -k, 0, -k, 0];
                try {
                    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                    applyConvolution3x3(imageData, kernel);
                    ctx.putImageData(imageData, 0, 0);
                } catch (err) {
                    console.warn("Sharpness bake failed (likely tainted canvas):", err);
                }
            }

            // Pro: vignette via radial gradient overlay
            if (isMediaEditorPro && vignette > 0) {
                const cx = canvas.width / 2;
                const cy = canvas.height / 2;
                const innerR = Math.min(cx, cy) * 0.45;
                const outerR = Math.sqrt(cx * cx + cy * cy);
                const gradient = ctx.createRadialGradient(cx, cy, innerR, cx, cy, outerR);
                gradient.addColorStop(0, 'rgba(0,0,0,0)');
                gradient.addColorStop(1, `rgba(0,0,0,${0.85 * (vignette / 100)})`);
                ctx.fillStyle = gradient;
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            }

            canvas.toBlob((blob) => {
                resolve(blob);
            }, 'image/jpeg', 0.95);
        };
        img.onerror = reject;
        img.src = src;
    });
};

export default function ContextConfigurationView({ config, setConfig, onNext, onPrev, mediaState, setMediaState }) {
    const { t } = useTranslation(['contextConfig', 'common']);

    useEffect(() => {
        let isMounted = true;

        const prepareFinalImage = async () => {
            // Skip if we already processed it or if there's no file
            if (!mediaState.file || mediaState.processedFile) return;

            try {
                // 1. Bake all filters (basic + Pro if enabled) into a new Blob
                const bakedBlob = await createProcessedBlob(mediaState.url, mediaState);

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
    }, [
        mediaState.file, mediaState.brightness, mediaState.contrast, mediaState.saturation,
        mediaState.isMediaEditorPro, mediaState.hue, mediaState.blur, mediaState.sharpness, mediaState.vignette
    ]);

    // Caption output language options — values are sent to backend Gemini prompt verbatim
    const languageOptions = ["English", "Bahasa Melayu", "中文", "Local Style"];

    const backgroundOptions = [
        {
            id: 'kopitiam',
            label: t('contextConfig:background.options.kopitiam.label'),
            desc: t('contextConfig:background.options.kopitiam.desc'),
            gradient: 'from-slate-100 to-gray-200',
            textColor: 'text-slate-700'
        },
        {
            id: 'cafe',
            label: t('contextConfig:background.options.cafe.label'),
            desc: t('contextConfig:background.options.cafe.desc'),
            gradient: 'from-amber-50 to-orange-100',
            textColor: 'text-amber-800'
        },
        {
            id: 'street',
            label: t('contextConfig:background.options.street.label'),
            desc: t('contextConfig:background.options.street.desc'),
            gradient: 'from-gray-800 to-slate-900',
            textColor: 'text-white'
        },
        {
            id: 'premium',
            label: t('contextConfig:background.options.premium.label'),
            desc: t('contextConfig:background.options.premium.desc'),
            gradient: 'from-zinc-900 to-black',
            textColor: 'text-zinc-200'
        }
    ];

    const handleUpdate = (key, value) => setConfig(prev => ({ ...prev, [key]: value }));
    const isPro = !!config.isContextPro;

    const toneOptions = [
        { id: 'casual', label: t('contextConfig:pro.tones.casual') },
        { id: 'punchy', label: t('contextConfig:pro.tones.punchy') },
        { id: 'polished', label: t('contextConfig:pro.tones.polished') },
        { id: 'playful', label: t('contextConfig:pro.tones.playful') },
    ];

    const lengthOptions = [
        { id: 'short', label: t('contextConfig:pro.lengths.short') },
        { id: 'medium', label: t('contextConfig:pro.lengths.medium') },
        { id: 'long', label: t('contextConfig:pro.lengths.long') },
    ];

    // Background fields: Pro uses a free-form description (pills are disabled),
    // Standard uses the vibe pill selection. Either path is only required when
    // generateBackground is ON.
    const bgFieldsReady = !config.generateBackground
        || (isPro
            ? (config.backgroundDescription?.trim() ?? "") !== ""
            : config.backgroundVibe !== "");

    // Strict Validation: Check if ALL fields have values.
    // Tone + captionLength always have Standard defaults — only the free-form
    // description still needs to be non-empty when Pro is on.
    const isReady =
        (config.dishName?.trim() !== "" && config.dishName !== undefined) &&
        (config.price?.trim() !== "" && config.price !== undefined) &&
        (config.outputLanguage !== "") &&
        bgFieldsReady &&
        (!isPro || config.description?.trim() !== "");

    return (
        <div className="min-h-full w-full bg-[#fff8f6] text-[#1a0f0d] font-sans flex flex-col md:py-8 px-4 md:px-12">
            {/* Header Area (Now flows naturally) */}
            <header className="pb-safe pt-4 px-6 flex items-center">
                <button
                    onClick={onPrev}
                    className="p-2.5 bg-white rounded-full shadow-sm border border-gray-100 text-gray-800 hover:text-[#dc2626] transition-colors active:scale-95"
                >
                    <ArrowLeft size={22} />
                </button>
                <div className="flex-1 text-center pr-10">
                    <h1 className="text-xl md:text-2xl font-serif font-extrabold text-gray-900">
                        {t('contextConfig:header.title')}
                    </h1>
                    <p className="text-xs md:text-sm text-gray-500 mt-0.5">
                        {t('contextConfig:header.subtitle')}
                    </p>
                </div>
            </header>

            {/* Form Body (No forced overflow, just let it stretch) */}
            <div className="px-4 md:px-6">
                <div className="max-w-xl mx-auto space-y-5 pt-2">

                    {/* Pro toggle (above-right of the first card) */}
                    <div className="flex justify-end -mb-3">
                        <SegmentedControl
                            options={['STA', 'PRO']}
                            selected={isPro ? 'PRO' : 'STA'}
                            onChange={(val) => handleUpdate('isContextPro', val === 'PRO')}
                            size="sm"
                        />
                    </div>

                    {/* Card 1: Dish & Price */}
                    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-5 md:p-6">
                        <div className="flex items-center gap-2 mb-4">
                            <Utensils className="w-5 h-5 text-[#dc2626]" />
                            <h2 className="font-serif font-bold text-lg">{t('contextConfig:dish.heading')}</h2>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5 ml-1">
                                    {t('contextConfig:dish.nameLabel')}
                                </label>
                                <input
                                    type="text"
                                    placeholder={t('contextConfig:dish.namePlaceholder')}
                                    value={config.dishName || ""}
                                    onChange={(e) => handleUpdate('dishName', e.target.value)}
                                    className="w-full px-4 py-3.5 bg-gray-50/50 border border-gray-200 text-gray-900 rounded-2xl focus:outline-none focus:border-[#dc2626] focus:ring-1 focus:ring-[#dc2626] transition-all font-medium"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5 ml-1">
                                    {t('contextConfig:dish.priceLabel')}
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
                            <h2 className="font-serif font-bold text-lg">{t('contextConfig:language.heading')}</h2>
                        </div>
                        <SegmentedControl
                            options={languageOptions}
                            selected={config.outputLanguage}
                            onChange={(val) => handleUpdate('outputLanguage', val)}
                            className="w-full"
                        />
                    </div>

                    {/* Pro Card: Description + Tone (only when Pro ON) */}
                    {isPro && (
                        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-5 md:p-6">
                            <div className="flex items-center gap-2 mb-4">
                                <Sparkles className="w-5 h-5 text-[#dc2626]" />
                                <h2 className="font-serif font-bold text-lg">{t('contextConfig:pro.heading')}</h2>
                                <span className="ml-auto text-[9px] font-bold uppercase tracking-widest text-[#dc2626] bg-red-50 px-2 py-0.5 rounded-full">PRO</span>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5 ml-1">
                                        {t('contextConfig:pro.descriptionLabel')}
                                    </label>
                                    <textarea
                                        rows={3}
                                        placeholder={t('contextConfig:pro.descriptionPlaceholder')}
                                        value={config.description || ""}
                                        onChange={(e) => handleUpdate('description', e.target.value)}
                                        className="w-full px-4 py-3.5 bg-gray-50/50 border border-gray-200 text-gray-900 rounded-2xl focus:outline-none focus:border-[#dc2626] focus:ring-1 focus:ring-[#dc2626] transition-all font-medium resize-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5 ml-1">
                                        {t('contextConfig:pro.toneLabel')}
                                    </label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {toneOptions.map((opt) => {
                                            const isSelected = config.tone === opt.id;
                                            return (
                                                <button
                                                    key={opt.id}
                                                    type="button"
                                                    onClick={() => handleUpdate('tone', opt.id)}
                                                    className={`py-2.5 px-2 rounded-xl text-xs md:text-sm font-semibold border-[1.5px] transition-all active:scale-95 ${isSelected
                                                        ? 'border-[#dc2626] text-[#dc2626] bg-red-50/50'
                                                        : 'border-gray-200 text-gray-500 bg-white hover:border-gray-300'
                                                        }`}
                                                >
                                                    {opt.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5 ml-1">
                                        {t('contextConfig:pro.lengthLabel')}
                                    </label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {lengthOptions.map((opt) => {
                                            const isSelected = config.captionLength === opt.id;
                                            return (
                                                <button
                                                    key={opt.id}
                                                    type="button"
                                                    onClick={() => handleUpdate('captionLength', opt.id)}
                                                    className={`py-2.5 px-2 rounded-xl text-xs md:text-sm font-semibold border-[1.5px] transition-all active:scale-95 ${isSelected
                                                        ? 'border-[#dc2626] text-[#dc2626] bg-red-50/50'
                                                        : 'border-gray-200 text-gray-500 bg-white hover:border-gray-300'
                                                        }`}
                                                >
                                                    {opt.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Card 3: Background Vibe */}
                    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-5 md:p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <ImageIcon className="w-5 h-5 text-[#dc2626]" />
                                <h2 className="font-serif font-bold text-lg">{t('contextConfig:background.heading')}</h2>
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
                                    {t('common:on')}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleUpdate('generateBackground', false)}
                                    className={`px-3 md:px-4 py-1.5 rounded-full text-xs md:text-sm font-bold transition-all duration-200 ${!config.generateBackground
                                        ? 'bg-white text-gray-800 shadow-sm border border-gray-200/50'
                                        : 'text-gray-400 hover:text-gray-600 bg-transparent'
                                        }`}
                                >
                                    {t('common:off')}
                                </button>
                            </div>

                        </div>

                        <div className={`grid grid-cols-2 gap-3 transition-opacity duration-300 ${(!config.generateBackground || isPro) ? 'opacity-40 pointer-events-none grayscale-[0.5]' : 'opacity-100'} `}>
                            {backgroundOptions.map((bg) => {
                                const isSelected = config.backgroundVibe === bg.id;
                                const thumbUrl = SCENE_THUMBS[bg.id];
                                return (
                                    <button
                                        key={bg.id}
                                        type="button"
                                        onClick={() => handleUpdate('backgroundVibe', bg.id)}
                                        className={`relative overflow-hidden text-left rounded-2xl border-2 transition-all duration-200 flex flex-col aspect-square outline-none
                                        ${isSelected
                                                ? 'border-[#dc2626] shadow-md scale-[0.98]'
                                                : 'border-transparent shadow-sm hover:shadow-md hover:scale-[1.02]'
                                            }
                                    `}
                                    >
                                        {/* Thumbnail when present, gradient fallback when not.
                                            Both paths render the label overlay so the tile is
                                            usable even before Owner-action assets land. */}
                                        {thumbUrl ? (
                                            <img
                                                src={thumbUrl}
                                                alt=""
                                                className="absolute inset-0 w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className={`absolute inset-0 bg-gradient-to-br ${bg.gradient}`} />
                                        )}
                                        {/* Semi-transparent black bar at the bottom carries
                                            the label — reads cleanly against any photo. */}
                                        <div className="absolute inset-x-0 bottom-0 bg-black/55 backdrop-blur-[2px] px-3 py-2 z-10">
                                            <span className="block font-serif font-bold text-sm md:text-base text-white leading-tight">
                                                {bg.label}
                                            </span>
                                            <span className="block text-[10px] md:text-xs text-white/80 mt-0.5 leading-tight">
                                                {bg.desc}
                                            </span>
                                        </div>
                                        {isSelected && (
                                            <div className="absolute top-2 right-2 z-10">
                                                <div className="bg-white rounded-full p-0.5 shadow-sm">
                                                    <CheckCircle2 className="w-4 h-4 text-[#dc2626]" />
                                                </div>
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Pro: free-form background description (replaces vibe pills) */}
                        {isPro && config.generateBackground && (
                            <div className="mt-4">
                                <div className="flex items-center gap-2 mb-1.5 ml-1">
                                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500">
                                        {t('contextConfig:background.descriptionLabel')}
                                    </label>
                                    <span className="text-[9px] font-bold uppercase tracking-widest text-[#dc2626] bg-red-50 px-2 py-0.5 rounded-full">PRO</span>
                                </div>
                                <textarea
                                    rows={3}
                                    maxLength={300}
                                    placeholder={t('contextConfig:background.descriptionPlaceholder')}
                                    value={config.backgroundDescription || ""}
                                    onChange={(e) => handleUpdate('backgroundDescription', e.target.value)}
                                    className="w-full px-4 py-3.5 bg-gray-50/50 border border-gray-200 text-gray-900 rounded-2xl focus:outline-none focus:border-[#dc2626] focus:ring-1 focus:ring-[#dc2626] transition-all font-medium resize-none"
                                />
                                {/* Thread 2 #1 — soft steer toward atmospheric
                                    description. No validator, no backend defang;
                                    just nudges the median Pro user away from
                                    listing props (cups/plates) that the
                                    Photoroom background generator can't render. */}
                                <p className="mt-1.5 ml-1 text-xs text-gray-500 leading-relaxed">
                                    {t('contextConfig:background.descriptionHint')}
                                </p>
                                <div className="mt-1 text-right text-[10px] text-gray-400">
                                    {(config.backgroundDescription || "").length} / 300
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Pro: assistive mode toggle (default ON for new Pro users — see App.jsx). */}
                    {isPro && (
                        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-5 md:p-6">
                            <div className="flex items-center justify-between gap-3 mb-3">
                                <div className="flex items-center gap-2 min-w-0">
                                    <Sparkles className="w-5 h-5 text-[#dc2626] flex-shrink-0" />
                                    <h2 className="font-serif font-bold text-lg truncate">{t('contextConfig:assistive.heading')}</h2>
                                </div>
                                <span className="text-[9px] font-bold uppercase tracking-widest text-[#dc2626] bg-red-50 px-2 py-0.5 rounded-full flex-shrink-0">PRO</span>
                            </div>
                            <p className="text-xs text-gray-500 mb-4 leading-relaxed">{t('contextConfig:assistive.subtitle')}</p>
                            <div className="flex bg-gray-100/80 p-1 rounded-full border border-gray-200 items-center w-full">
                                <button
                                    type="button"
                                    onClick={() => handleUpdate('assistiveMode', false)}
                                    className={`flex-1 px-3 py-2 rounded-full text-xs md:text-sm font-bold transition-all duration-200 ${!config.assistiveMode
                                        ? 'bg-white text-gray-800 shadow-sm border border-gray-200/50'
                                        : 'text-gray-400 hover:text-gray-600 bg-transparent'
                                        }`}
                                >
                                    {t('contextConfig:assistive.optionAuto')}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleUpdate('assistiveMode', true)}
                                    className={`flex-1 px-3 py-2 rounded-full text-xs md:text-sm font-bold transition-all duration-200 ${config.assistiveMode
                                        ? 'bg-white text-gray-800 shadow-sm border border-gray-200/50'
                                        : 'text-gray-400 hover:text-gray-600 bg-transparent'
                                        }`}
                                >
                                    {t('contextConfig:assistive.optionReview')}
                                </button>
                            </div>
                        </div>
                    )}

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
                    {t('common:generate')}
                </button>
            </div>

        </div>
    );
}