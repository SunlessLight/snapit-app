import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, RefreshCw, Loader2, Image as ImageIcon, Sparkles, MessageSquare, AlertCircle, AlertTriangle, Camera, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const AutosizeTextarea = ({ value, onChange, rows = 3, disabled = false, placeholder = '', maxLength, className = '' }) => {
    const ref = useRef(null);
    useEffect(() => {
        if (ref.current) {
            ref.current.style.height = 'auto';
            ref.current.style.height = `${ref.current.scrollHeight}px`;
        }
    }, [value]);
    return (
        <textarea
            ref={ref}
            rows={rows}
            value={value}
            disabled={disabled}
            placeholder={placeholder}
            maxLength={maxLength}
            onChange={(e) => onChange(e.target.value)}
            className={`w-full px-4 py-3 bg-gray-50/50 border border-gray-200 text-gray-900 rounded-2xl focus:outline-none focus:border-[#dc2626] focus:ring-1 focus:ring-[#dc2626] transition-all font-medium resize-none disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden ${className}`}
        />
    );
};

export default function ReviewScreen({ mediaState, marketingConfig, aiOutput, setAiOutput, onNext, onPrev, onRetake }) {
    const { t } = useTranslation(['review', 'common']);

    const [captionChangePrompt, setCaptionChangePrompt] = useState('');
    const [bgChangePrompt, setBgChangePrompt] = useState('');
    const [isRegeneratingCaptions, setIsRegeneratingCaptions] = useState(false);
    const [isRegeneratingBg, setIsRegeneratingBg] = useState(false);
    const [captionError, setCaptionError] = useState(null);
    const [bgError, setBgError] = useState(null);
    // Phase 6.7.4 — 'vary' picks a fresh random seed (new composition);
    // 'fix' replays aiOutput.bgSeed so the prompt-delta is the only thing
    // that changes. Default vary because users usually click regen when
    // they didn't like the composition.
    const [seedMode, setSeedMode] = useState('vary');
    // Chip is dismissible but the underlying reason stays on aiOutput so a
    // back-nav-then-resubmit doesn't keep re-rendering it for the same job.
    // Local state covers the dismiss action within this view's lifetime.
    const [chipDismissed, setChipDismissed] = useState(false);

    // Phase 6.7.2 — only render the chip + Retake when the gate routed us here
    // because of low-confidence. Normal Pro-assistive Review never sees this
    // (the chip would be noise for users who opted into Review).
    const isForcedReview = aiOutput?.forceReviewReason === 'low_confidence_cutout';
    const showChip = isForcedReview && !chipDismissed;

    const showBgPanel = !!marketingConfig.generateBackground;
    const sourceImage = mediaState.processedFile || mediaState.file || mediaState.originalFile;

    const bgImgSrc = aiOutput?.generatedImageBase64
        ? (aiOutput.generatedImageBase64.startsWith('data:image')
            ? aiOutput.generatedImageBase64
            : `data:image/jpeg;base64,${aiOutput.generatedImageBase64}`)
        : (mediaState.processedUrl || mediaState.url);

    const handleUpdateField = (key, value) => setAiOutput(prev => ({ ...prev, [key]: value }));

    const handleRegenerateCaptions = async () => {
        if (!sourceImage) {
            setCaptionError(t('review:errors.noImage'));
            return;
        }
        setCaptionError(null);
        setIsRegeneratingCaptions(true);

        try {
            const formData = new FormData();
            formData.append('image', sourceImage, 'snapit-source.png');
            formData.append('dishName', marketingConfig.dishName || '');
            formData.append('price', marketingConfig.price || '');
            formData.append('outputLanguage', marketingConfig.outputLanguage || '');
            formData.append('tone', marketingConfig.tone || 'casual');
            formData.append('captionLength', marketingConfig.captionLength || 'short');
            formData.append('isContextPro', String(!!marketingConfig.isContextPro));
            formData.append('description', marketingConfig.description || '');
            formData.append('currentTitle', aiOutput.title || '');
            formData.append('currentDescription', aiOutput.description || '');
            formData.append('currentCaption', aiOutput.caption || '');
            formData.append('changePrompt', captionChangePrompt);

            const res = await fetch(`${API_BASE_URL}/api/regenerate/captions`, {
                method: 'POST',
                body: formData,
            });
            const json = await res.json();
            if (!res.ok || !json.success) {
                throw new Error(json.error || `Server error: ${res.status}`);
            }
            setAiOutput(prev => ({
                ...prev,
                title: json.title,
                description: json.description,
                caption: json.caption,
            }));
            setCaptionChangePrompt('');
        } catch (err) {
            setCaptionError(err.message || t('review:errors.generic'));
        } finally {
            setIsRegeneratingCaptions(false);
        }
    };

    const handleRegenerateBackground = async () => {
        if (!sourceImage) {
            setBgError(t('review:errors.noImage'));
            return;
        }
        if (!aiOutput?.backgroundPrompt) {
            setBgError(t('review:errors.noBgPrompt'));
            return;
        }
        setBgError(null);
        setIsRegeneratingBg(true);

        try {
            const formData = new FormData();
            formData.append('image', sourceImage, 'snapit-source.png');
            formData.append('originalBackgroundPrompt', aiOutput.backgroundPrompt);
            formData.append('changePrompt', bgChangePrompt);
            formData.append('seedMode', seedMode);
            // Fix-mode only matters if we actually have a previous seed to
            // replay. Backend gracefully falls back to vary when lastSeed is
            // missing, but we surface intent explicitly for log clarity.
            if (seedMode === 'fix' && aiOutput?.bgSeed != null) {
                formData.append('lastSeed', String(aiOutput.bgSeed));
            }

            const res = await fetch(`${API_BASE_URL}/api/regenerate/background`, {
                method: 'POST',
                body: formData,
            });
            const json = await res.json();
            if (!res.ok || !json.success) {
                throw new Error(json.error || `Server error: ${res.status}`);
            }
            setAiOutput(prev => ({
                ...prev,
                generatedImageBase64: json.generatedImageBase64,
                backgroundPrompt: json.backgroundPrompt || prev.backgroundPrompt,
                bgSeed: json.bgSeed ?? prev.bgSeed,
            }));
            setBgChangePrompt('');
        } catch (err) {
            setBgError(err.message || t('review:errors.generic'));
        } finally {
            setIsRegeneratingBg(false);
        }
    };

    const anyLoading = isRegeneratingCaptions || isRegeneratingBg;

    return (
        <div className="min-h-full w-full bg-[#fff8f6] text-[#1a0f0d] font-sans flex flex-col md:py-8 px-4 md:px-12">
            <header className="pb-safe pt-4 px-6 flex items-center">
                <button
                    onClick={onPrev}
                    disabled={anyLoading}
                    className="p-2.5 bg-white rounded-full shadow-sm border border-gray-100 text-gray-800 hover:text-[#dc2626] transition-colors active:scale-95 disabled:opacity-50"
                >
                    <ArrowLeft size={22} />
                </button>
                <div className="flex-1 text-center pr-10">
                    <h1 className="text-xl md:text-2xl font-serif font-extrabold text-gray-900">
                        {t('review:header.title')}
                    </h1>
                    <p className="text-xs md:text-sm text-gray-500 mt-0.5">
                        {t('review:header.subtitle')}
                    </p>
                </div>
            </header>

            {showChip && (
                <div className="px-4 md:px-6 max-w-xl mx-auto w-full">
                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
                        <AlertTriangle size={18} className="text-amber-600 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-amber-900">
                                {t('review:lowConfidenceCutout.title')}
                            </p>
                            <p className="text-xs text-amber-800 mt-0.5 leading-relaxed">
                                {t('review:lowConfidenceCutout.body')}
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setChipDismissed(true)}
                            className="p-1 text-amber-700 hover:text-amber-900 active:scale-95 transition-colors flex-shrink-0"
                            aria-label={t('review:lowConfidenceCutout.dismiss')}
                        >
                            <X size={16} strokeWidth={2.5} />
                        </button>
                    </div>
                </div>
            )}

            <div className="px-4 md:px-6 pb-8">
                <div className="max-w-xl mx-auto space-y-5 pt-2">

                    {showBgPanel && (
                        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-5 md:p-6">
                            <div className="flex items-center gap-2 mb-4">
                                <ImageIcon className="w-5 h-5 text-[#dc2626]" />
                                <h2 className="font-serif font-bold text-lg">{t('review:bg.heading')}</h2>
                            </div>

                            <div className="relative w-full aspect-square bg-gray-50 rounded-2xl overflow-hidden border border-gray-100 mb-4">
                                {bgImgSrc && (
                                    <img
                                        src={bgImgSrc}
                                        alt={t('review:bg.previewAlt')}
                                        className="w-full h-full object-contain"
                                    />
                                )}
                                {isRegeneratingBg && (
                                    <div className="absolute inset-0 bg-white/70 backdrop-blur-sm flex flex-col items-center justify-center gap-2">
                                        <Loader2 className="w-8 h-8 text-[#dc2626] animate-spin" />
                                        <span className="text-xs text-gray-600 font-medium">{t('review:bg.loading')}</span>
                                    </div>
                                )}
                            </div>

                            {/* Phase 6.7.4 — seed-mode toggle. Sits above
                                the delta-prompt so the mode choice frames
                                what the prompt is going to do. */}
                            <div className="mb-3">
                                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5 ml-1">
                                    {t('review:bgRegen.modeLabel')}
                                </label>
                                <div className="flex bg-gray-100/80 p-1 rounded-full border border-gray-200 items-center w-full">
                                    <button
                                        type="button"
                                        onClick={() => setSeedMode('vary')}
                                        disabled={isRegeneratingBg}
                                        className={`flex-1 px-3 py-2 rounded-full text-xs md:text-sm font-bold transition-all duration-200 disabled:opacity-50 ${seedMode === 'vary'
                                            ? 'bg-white text-gray-800 shadow-sm border border-gray-200/50'
                                            : 'text-gray-400 hover:text-gray-600 bg-transparent'
                                            }`}
                                    >
                                        {t('review:bgRegen.varyLabel')}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setSeedMode('fix')}
                                        disabled={isRegeneratingBg || aiOutput?.bgSeed == null}
                                        className={`flex-1 px-3 py-2 rounded-full text-xs md:text-sm font-bold transition-all duration-200 disabled:opacity-50 ${seedMode === 'fix'
                                            ? 'bg-white text-gray-800 shadow-sm border border-gray-200/50'
                                            : 'text-gray-400 hover:text-gray-600 bg-transparent'
                                            }`}
                                    >
                                        {t('review:bgRegen.fixLabel')}
                                    </button>
                                </div>
                                <p className="text-[10px] text-gray-400 mt-1.5 ml-1 leading-relaxed">
                                    {seedMode === 'fix'
                                        ? t('review:bgRegen.fixHint')
                                        : t('review:bgRegen.varyHint')}
                                </p>
                            </div>

                            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5 ml-1">
                                {t('review:bg.changePromptLabel')}
                            </label>
                            <AutosizeTextarea
                                value={bgChangePrompt}
                                onChange={setBgChangePrompt}
                                rows={2}
                                maxLength={300}
                                disabled={isRegeneratingBg}
                                placeholder={t('review:bg.changePromptPlaceholder')}
                            />
                            <div className="mt-1 text-right text-[10px] text-gray-400">
                                {bgChangePrompt.length} / 300
                            </div>

                            {bgError && (
                                <div className="mt-2 flex items-start gap-2 text-xs text-[#dc2626] bg-red-50 rounded-xl p-2.5">
                                    <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
                                    <span>{bgError}</span>
                                </div>
                            )}

                            <button
                                type="button"
                                onClick={handleRegenerateBackground}
                                disabled={isRegeneratingBg}
                                className="mt-3 w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl font-bold text-sm bg-gray-900 text-white hover:bg-black active:scale-[0.98] transition-all disabled:bg-gray-300 disabled:cursor-not-allowed"
                            >
                                {isRegeneratingBg
                                    ? <Loader2 className="w-4 h-4 animate-spin" />
                                    : <RefreshCw className="w-4 h-4" />}
                                {t('review:bg.regenerateButton')}
                            </button>
                        </div>
                    )}

                    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-5 md:p-6">
                        <div className="flex items-center gap-2 mb-4">
                            <MessageSquare className="w-5 h-5 text-[#dc2626]" />
                            <h2 className="font-serif font-bold text-lg">{t('review:captions.heading')}</h2>
                        </div>
                        <p className="text-xs text-gray-500 mb-4 leading-relaxed">{t('review:captions.subtitle')}</p>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5 ml-1">
                                    {t('review:captions.titleLabel')}
                                </label>
                                <input
                                    type="text"
                                    value={aiOutput.title || ''}
                                    disabled={isRegeneratingCaptions}
                                    onChange={(e) => handleUpdateField('title', e.target.value)}
                                    className="w-full px-4 py-3 bg-gray-50/50 border border-gray-200 text-gray-900 rounded-2xl focus:outline-none focus:border-[#dc2626] focus:ring-1 focus:ring-[#dc2626] transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5 ml-1">
                                    {t('review:captions.descriptionLabel')}
                                </label>
                                <AutosizeTextarea
                                    value={aiOutput.description || ''}
                                    onChange={(v) => handleUpdateField('description', v)}
                                    rows={3}
                                    disabled={isRegeneratingCaptions}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5 ml-1">
                                    {t('review:captions.captionLabel')}
                                </label>
                                <AutosizeTextarea
                                    value={aiOutput.caption || ''}
                                    onChange={(v) => handleUpdateField('caption', v)}
                                    rows={5}
                                    disabled={isRegeneratingCaptions}
                                />
                            </div>
                        </div>

                        <div className="mt-5 pt-4 border-t border-gray-100">
                            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5 ml-1">
                                {t('review:captions.changePromptLabel')}
                            </label>
                            <AutosizeTextarea
                                value={captionChangePrompt}
                                onChange={setCaptionChangePrompt}
                                rows={2}
                                maxLength={300}
                                disabled={isRegeneratingCaptions}
                                placeholder={t('review:captions.changePromptPlaceholder')}
                            />
                            <div className="mt-1 text-right text-[10px] text-gray-400">
                                {captionChangePrompt.length} / 300
                            </div>

                            {captionError && (
                                <div className="mt-2 flex items-start gap-2 text-xs text-[#dc2626] bg-red-50 rounded-xl p-2.5">
                                    <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
                                    <span>{captionError}</span>
                                </div>
                            )}

                            <button
                                type="button"
                                onClick={handleRegenerateCaptions}
                                disabled={isRegeneratingCaptions}
                                className="mt-3 w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl font-bold text-sm bg-gray-900 text-white hover:bg-black active:scale-[0.98] transition-all disabled:bg-gray-300 disabled:cursor-not-allowed"
                            >
                                {isRegeneratingCaptions
                                    ? <Loader2 className="w-4 h-4 animate-spin" />
                                    : <RefreshCw className="w-4 h-4" />}
                                {t('review:captions.regenerateButton')}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="px-4 md:px-6 pt-2 pb-8 max-w-xl mx-auto w-full space-y-3">
                {isForcedReview && onRetake && (
                    <button
                        onClick={onRetake}
                        disabled={anyLoading}
                        className="w-full py-3.5 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 transition-all bg-white border border-gray-200 text-gray-800 hover:border-[#dc2626] hover:text-[#dc2626] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Camera className="w-4 h-4" />
                        {t('review:lowConfidenceCutout.retake')}
                    </button>
                )}
                <button
                    onClick={onNext}
                    disabled={anyLoading}
                    className="w-full py-4 rounded-[20px] font-bold text-lg flex items-center justify-center gap-2 transition-all duration-300 bg-[#dc2626] text-white shadow-[0_8px_20px_rgba(220,38,38,0.3)] hover:-translate-y-1 active:scale-[0.98] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-y-0"
                >
                    <Sparkles className="w-5 h-5" />
                    {t('review:finaliseButton')}
                </button>
            </div>
        </div>
    );
}
