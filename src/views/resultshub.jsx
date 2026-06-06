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
import { cropBlobToRect } from '../utils/imageUtils';
import { saveResultMeta, saveResultImages } from '../utils/resultPersistence';

// iOS Safari ignores <a download> (it navigates to the image instead of saving),
// so there we route through the native share sheet's "Save Image". Desktop and
// Android keep the plain anchor download — gating on navigator.canShare({ files })
// was wrong because desktop Chrome (Win/ChromeOS) also reports it true and would
// hijack the download into a share sheet. iPadOS reports as MacIntel, hence the
// touch-points check.
const isIOS = () =>
    /iP(hone|ad|od)/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

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
    const { t } = useTranslation(['resultsHub', 'common']);
    // Slider opens on the right (100 = original fully shown); a mount tween then
    // sweeps it left to 0 (final shown). See the auto-slide effect below.
    const [sliderValue, setSliderValue] = useState(100);
    const [toastMessage, setToastMessage] = useState(null);
    // Flipped true on the first manual drag so the auto-slide tween bails out
    // immediately and hands control back to the user.
    const userInteractedRef = useRef(false);
    const autoSlideRafRef = useRef(null);

    // Per-platform captions: array of { platform, body, noteTitle? }. Guard
    // against a legacy single-caption shape just in case persisted/default
    // output predates the multi-platform change.
    const captions = Array.isArray(aiOutput?.captions) ? aiOutput.captions : [];
    const platformLabel = (platform) => t(`common:platforms.${platform}`, platform);

    // "before" = the user's composed input, framed to match the final. We start from
    // the raw upload (originalUrl — NOT url, which Claid's enhance overwrites) and, if
    // the user cropped, re-apply that crop so the before/after share one framing and
    // only enhancement / adjustments / bg-swap read as a difference (no content jump
    // while sliding). Deriving it from originalFile + compositeCropRect is exact; the
    // raw upload is the fallback when there was no crop (or originalFile is gone after
    // a reload).
    const rawBeforeSrc = mediaState.originalUrl || mediaState.url;
    const [croppedBeforeUrl, setCroppedBeforeUrl] = useState(null);

    useEffect(() => {
        let isMounted = true;
        let madeUrl = null;
        const { originalFile, compositeCropRect } = mediaState;
        if (!compositeCropRect || !originalFile) {
            setCroppedBeforeUrl(null);
            return;
        }
        cropBlobToRect(originalFile, compositeCropRect)
            .then((blob) => {
                if (!isMounted) return;
                madeUrl = URL.createObjectURL(blob);
                setCroppedBeforeUrl(madeUrl);
            })
            .catch(() => { if (isMounted) setCroppedBeforeUrl(null); });
        return () => {
            isMounted = false;
            if (madeUrl) URL.revokeObjectURL(madeUrl);
        };
    }, [mediaState.originalFile, mediaState.compositeCropRect]);

    const beforeSrc = croppedBeforeUrl || rawBeforeSrc;

    const hasAiImage = Boolean(aiOutput?.generatedImageBase64);
    let aiImgSrc = null;
    if (hasAiImage) {
        const hasDataPrefix = aiOutput.generatedImageBase64.startsWith('data:image');
        aiImgSrc = hasDataPrefix
            ? aiOutput.generatedImageBase64
            : `data:image/jpeg;base64,${aiOutput.generatedImageBase64}`;
    }

    // "after" = the fully-processed result. AI bg-swap output wins; otherwise the
    // filter-baked JPEG; otherwise it falls back to the before (no processing yet).
    const afterSrc = aiImgSrc || mediaState.processedUrl || beforeSrc;

    // Did anything *visible* change? Crop is deliberately excluded — it now lives in
    // both before and after (same framing), so a crop-only edit has nothing to
    // compare and renders a single image. Enhancement, slider adjustments, and
    // bg-swap are the real before/after diffs.
    const slidersDifferFromDefault =
        mediaState.brightness !== 50 || mediaState.contrast !== 50 || mediaState.saturation !== 50 ||
        (mediaState.isMediaEditorPro && (
            mediaState.hue !== 50 || mediaState.blur !== 0 ||
            mediaState.sharpness !== 0 || mediaState.vignette !== 0
        ));
    // `aiOutput.wasModified` is set only on a persisted-result restore (App.jsx seeds it
    // from the saved snapshot). On a reload the live signals above are all false —
    // isEnhanced is stripped from storage and there's no AI base64 — so without this the
    // before/after slider would silently disappear after a reload even though both images
    // were preserved. During a normal session it's undefined and contributes nothing.
    const wasModified = hasAiImage || mediaState.isEnhanced || slidersDifferFromDefault || Boolean(aiOutput?.wasModified);
    const showSlider = Boolean(wasModified && afterSrc && beforeSrc);

    // ----- Persist the latest result so it survives a tab close / reload -----
    // Split into two effects on purpose: the text snapshot is cheap and should re-save on
    // every inline caption edit, while the image write (fetch + IndexedDB) is heavier and
    // only needs to run when the resolved before/after URLs change (~once per landing).
    useEffect(() => {
        saveResultMeta({
            title: aiOutput?.title,
            description: aiOutput?.description,
            captions,
            // Restored next time so the slider gate (`wasModified`) holds across reload.
            wasModified,
        });
    }, [aiOutput?.title, aiOutput?.description, aiOutput?.captions, wasModified]);

    useEffect(() => {
        if (!beforeSrc || !afterSrc) return;
        saveResultImages(beforeSrc, afterSrc);
    }, [beforeSrc, afterSrc]);

    // Auto-slide reveal on mount: start on the original (slider right, value 100)
    // and sweep right→left to the final (value 0), so landing on Results Hub plays
    // a "here's what we did" wipe. Gated on showSlider (nothing to reveal otherwise),
    // cancelled the instant the user drags (userInteractedRef). Respects
    // prefers-reduced-motion by jumping straight to the final with no movement.
    useEffect(() => {
        if (!showSlider) return;
        const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
        if (reduceMotion) {
            setSliderValue(0);
            return;
        }
        const DURATION = 1200;
        const easeOut = (p) => 1 - Math.pow(1 - p, 3);
        let start = null;
        const tick = (now) => {
            if (userInteractedRef.current) return;
            if (start === null) start = now;
            const p = Math.min((now - start) / DURATION, 1);
            setSliderValue(100 - easeOut(p) * 100);
            if (p < 1) autoSlideRafRef.current = requestAnimationFrame(tick);
        };
        autoSlideRafRef.current = requestAnimationFrame(tick);
        return () => { if (autoSlideRafRef.current) cancelAnimationFrame(autoSlideRafRef.current); };
    }, [showSlider]);

    // Pre-fetch the before/after images to Blobs BEFORE any download/share click.
    // navigator.share() requires transient user activation, and an awaited fetch()
    // between the click and the share() call consumes/expires that activation on
    // iOS (NotAllowedError) — so the sheet never opens. Caching the Blobs here lets
    // the click handler wrap one in a File and call share() synchronously, with the
    // gesture's activation still fresh. (new File([blob], name) is synchronous.)
    const downloadBlobsRef = useRef({ before: null, after: null });
    useEffect(() => {
        let cancelled = false;
        const load = async (src) => {
            if (!src) return null;
            try {
                return await (await fetch(src)).blob();
            } catch {
                return null;
            }
        };
        (async () => {
            const [before, after] = await Promise.all([load(beforeSrc), load(afterSrc)]);
            if (!cancelled) downloadBlobsRef.current = { before, after };
        })();
        return () => { cancelled = true; };
    }, [beforeSrc, afterSrc]);

    const handleUpdateText = (key, value) => {
        setAiOutput(prev => ({ ...prev, [key]: value }));
    };

    // Edit one platform caption in place. `key` is 'body' or 'noteTitle'.
    const handleUpdateCaption = (index, key, value) => {
        setAiOutput(prev => {
            const next = Array.isArray(prev.captions) ? [...prev.captions] : [];
            if (!next[index]) return prev;
            next[index] = { ...next[index], [key]: value };
            return { ...prev, captions: next };
        });
    };

    const showToast = (msg) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(null), 3000);
    };

    const handleDownload = async () => {
        // Final occupies the right portion now, so it dominates at LOW values.
        const showingFinal = showSlider ? sliderValue <= 50 : true;

        const cleanName = aiOutput.title
            ? aiOutput.title.split(' ')[0].replace(/[^a-zA-Z0-9]/g, '')
            : 'Dish';

        const finalSuffix = hasAiImage ? 'SnapIT_AI' : 'SnapIT_Edit';
        const fileName = showingFinal
            ? `${cleanName}_${finalSuffix}.png`
            : `${cleanName}_Original.png`;

        const targetUrl = showingFinal ? afterSrc : beforeSrc;

        if (!targetUrl) {
            showToast(t('toast.downloadFailed'));
            return;
        }

        try {
            // iOS: route through the native share sheet ("Save Image"), since iOS
            // Safari ignores <a download>. Use the PRE-FETCHED blob and call share()
            // synchronously so the gesture's activation isn't consumed by an await
            // (see downloadBlobsRef). Only fall back to fetching if the cache missed.
            if (isIOS()) {
                const cached = showingFinal
                    ? downloadBlobsRef.current.after
                    : downloadBlobsRef.current.before;
                const blob = cached || await (await fetch(targetUrl)).blob();
                const file = new File([blob], fileName, { type: blob.type || 'image/png' });
                if (navigator.canShare?.({ files: [file] })) {
                    await navigator.share({ files: [file], title: fileName });
                    return;
                }
            }

            // Desktop / Android: plain anchor download. Works on both and never
            // hijacks into a share sheet.
            const blob = await (await fetch(targetUrl)).blob();
            const objectUrl = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = objectUrl;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(objectUrl);
        } catch (error) {
            // User dismissed the iOS share sheet — treat as no-op, not failure.
            if (error.name === 'AbortError') return;
            console.error("Error downloading:", error);
            showToast(t('toast.downloadFailed'));
        }
    };

    const handleGlobalShare = async () => {
        const captionsText = captions
            .map((c) => `${platformLabel(c.platform)}:\n${c.noteTitle ? c.noteTitle + '\n' : ''}${c.body || ''}`)
            .join('\n\n');
        const combinedText = `${aiOutput.title}\n\n${aiOutput.description}\n\n${captionsText}`;
        const targetShareUrl = afterSrc;

        try {
            // Same activation rule as handleDownload: prefer the pre-fetched "after"
            // blob so share() runs synchronously and iOS keeps the gesture activation.
            // Falls back to fetching only on a cache miss.
            const blob = downloadBlobsRef.current.after
                || await (await fetch(targetShareUrl)).blob();
            const file = new File([blob], 'SnapIT_Result.png', { type: blob.type || 'image/png' });

            if (navigator.canShare?.({ files: [file] })) {
                await navigator.share({
                    title: aiOutput.title,
                    text: combinedText,
                    files: [file]
                });
            } else {
                await navigator.clipboard.writeText(combinedText);
                showToast(t('toast.copied'));
            }
        } catch (error) {
            // User dismissed the system share sheet — treat as no-op, not failure.
            if (error.name === 'AbortError') return;
            console.error("Error sharing:", error);
            try {
                await navigator.clipboard.writeText(combinedText);
                showToast(t('toast.copiedFallback'));
            } catch {
                showToast(t('toast.shareFailed'));
            }
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
                        <div className="relative w-fit max-w-full mx-auto bg-white border border-gray-100 rounded-2xl md:rounded-3xl overflow-hidden shadow-sm group">

                            {/* In-flow base image ("before"). It alone sizes the card, so the
                                card can never collapse — even with no edits and no slider. */}
                            <img
                                src={beforeSrc}
                                alt="Before"
                                draggable={false}
                                className="block max-h-[500px] w-auto max-w-full object-contain select-none"
                            />

                            {showSlider && (
                                <>
                                    {/* The "after" (final) overlays the original on the RIGHT side
                                        [sliderValue%, 100%] — clip the left. So at value=100 it's
                                        fully hidden (original shown, handle right); dragging left
                                        grows the final from the right, covering the original. */}
                                    <div
                                        className="absolute inset-0 w-full h-full bg-[#fff8f6] pointer-events-none"
                                        style={{ clipPath: `inset(0 0 0 ${sliderValue}%)` }}
                                    >
                                        <img
                                            src={afterSrc}
                                            alt={hasAiImage ? "AI Enhanced" : "Edited"}
                                            className="w-full h-full object-contain"
                                        />
                                    </div>
                                    <input
                                        type="range"
                                        min="0" max="100"
                                        value={sliderValue}
                                        onChange={(e) => { userInteractedRef.current = true; setSliderValue(Number(e.target.value)); }}
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

                                    {/* Left side is the original, right side the final (matches
                                        the clip geometry above). */}
                                    <div className="absolute top-3 left-3 md:top-4 md:left-4 bg-black/60 text-white text-[10px] md:text-xs px-3 py-1.5 rounded-full backdrop-blur-md font-medium pointer-events-none opacity-100 group-hover:opacity-0 transition-opacity">
                                        {t('labels.original')}
                                    </div>
                                    <div className="absolute top-3 right-3 md:top-4 md:right-4 bg-black/60 text-white text-[10px] md:text-xs px-3 py-1.5 rounded-full backdrop-blur-md font-medium pointer-events-none opacity-100 group-hover:opacity-0 transition-opacity">
                                        {hasAiImage ? t('labels.aiEnhanced') : t('labels.edited')}
                                    </div>
                                </>
                            )}

                        </div>

                        {/* The "Smart" Single Download Button - Context aware */}
                        <button
                            onClick={handleDownload}
                            className={`w-full flex items-center justify-center gap-2 text-sm md:text-lg py-3 md:py-3.5 rounded-full font-semibold transition-all duration-300 shadow-sm ${showSlider && sliderValue <= 50
                                ? 'bg-[#dc2626] text-white hover:brightness-90 md:hover:-translate-y-1'
                                : 'bg-white border-2 border-gray-200 text-[#1a0f0d] hover:border-gray-300'
                                }`}
                        >
                            <Download size={18} />
                            {showSlider
                                ? (sliderValue <= 50
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
                        {captions.map((c, idx) => (
                            <React.Fragment key={c.platform || idx}>
                                {c.noteTitle !== undefined && (
                                    <ContentCard
                                        label={`${platformLabel(c.platform)} · ${t('common:platforms.xiaohongshuTitle', 'Title')}`}
                                        value={c.noteTitle}
                                        field="noteTitle"
                                        onUpdate={(_, val) => handleUpdateCaption(idx, 'noteTitle', val)}
                                    />
                                )}
                                <ContentCard
                                    label={platformLabel(c.platform)}
                                    value={c.body}
                                    field="body"
                                    onUpdate={(_, val) => handleUpdateCaption(idx, 'body', val)}
                                />
                            </React.Fragment>
                        ))}
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
