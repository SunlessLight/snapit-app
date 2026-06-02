import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Camera, Check, Loader2, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// Phase 6.7.5 — pre-generation cutout checkpoint. Posts the food photo to
// /api/segmentation-preview, displays the returned PNG on a checkered
// transparency background, and lets the user accept ("Looks right" → advance
// to Processing) or bail ("Retake photo" → back to Upload). Sits between
// Context Config and Processing only when generateBackground is on AND
// VITE_ENABLE_MASK_PREVIEW is enabled (App.jsx gates the routing).
export default function MaskPreviewScreen({ mediaState, onLooksRight, onRetake, onPrev }) {
    const { t } = useTranslation(['maskPreview', 'common']);

    const [cutoutUrl, setCutoutUrl] = useState(null);
    const [error, setError] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    // Hold the object URL in a ref too so the unmount cleanup can revoke it
    // even after StrictMode's double-invoke fires the effect twice.
    const urlRef = useRef(null);

    const sourceImage = mediaState?.processedFile || mediaState?.file || mediaState?.originalFile;
    // Displayable URL for the "before" layer of the reveal wipe — matches the
    // file that was segmented above.
    const originalUrl = mediaState?.processedUrl || mediaState?.url || mediaState?.originalUrl || null;

    useEffect(() => {
        if (!sourceImage) {
            setError(t('maskPreview:errors.noImage'));
            setIsLoading(false);
            return undefined;
        }

        let isMounted = true;
        const abortController = new AbortController();
        setError(null);
        setIsLoading(true);

        (async () => {
            try {
                const formData = new FormData();
                formData.append('image', sourceImage, 'snapit-source.png');

                const res = await fetch(`${API_BASE_URL}/api/segmentation-preview`, {
                    method: 'POST',
                    body: formData,
                    signal: abortController.signal,
                });
                if (!res.ok) {
                    const errBody = await res.json().catch(() => null);
                    throw new Error(errBody?.error || `Server error: ${res.status}`);
                }
                const blob = await res.blob();
                if (!isMounted) return;
                const url = URL.createObjectURL(blob);
                urlRef.current = url;
                setCutoutUrl(url);
            } catch (err) {
                if (err.name === 'AbortError') return;
                if (isMounted) setError(err.message || t('maskPreview:errors.generic'));
            } finally {
                if (isMounted) setIsLoading(false);
            }
        })();

        return () => {
            isMounted = false;
            abortController.abort();
            if (urlRef.current) {
                URL.revokeObjectURL(urlRef.current);
                urlRef.current = null;
            }
        };
    }, [sourceImage, t]);

    return (
        <div className="min-h-full w-full bg-[#fff8f6] text-[#1a0f0d] font-sans flex flex-col md:py-8 px-4 md:px-12">
            <header className="pb-safe pt-4 px-6 flex items-center">
                <button
                    onClick={onPrev}
                    className="p-2.5 bg-white rounded-full shadow-sm border border-gray-100 text-gray-800 hover:text-[#dc2626] transition-colors active:scale-95"
                >
                    <ArrowLeft size={22} />
                </button>
                <div className="flex-1 text-center pr-10">
                    <h1 className="text-xl md:text-2xl font-serif font-extrabold text-gray-900">
                        {t('maskPreview:header.title')}
                    </h1>
                    <p className="text-xs md:text-sm text-gray-500 mt-0.5">
                        {t('maskPreview:header.subtitle')}
                    </p>
                </div>
            </header>

            <div className="px-4 md:px-6 pb-6">
                <div className="max-w-xl mx-auto space-y-4 pt-2">
                    <p className="text-sm text-gray-600 leading-relaxed text-center px-2">
                        {t('maskPreview:description')}
                    </p>

                    {/* Cutout preview on checkered transparency so the cut
                        edges are obvious. Pattern is a tiny SVG via inline
                        data-URL so there's no extra request. */}
                    <div
                        className={`relative mx-auto max-w-full rounded-3xl overflow-hidden border border-gray-200 shadow-sm ${cutoutUrl && !isLoading ? 'w-fit' : 'w-full aspect-square'}`}
                        style={{
                            backgroundImage:
                                "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='20' height='20'><rect width='10' height='10' fill='%23e5e7eb'/><rect x='10' y='10' width='10' height='10' fill='%23e5e7eb'/><rect x='10' width='10' height='10' fill='%23f3f4f6'/><rect y='10' width='10' height='10' fill='%23f3f4f6'/></svg>\")",
                            backgroundSize: '20px 20px',
                        }}
                    >
                        {isLoading && (
                            <div className="absolute inset-0 bg-white/70 backdrop-blur-sm flex flex-col items-center justify-center gap-2 z-10">
                                <Loader2 className="w-8 h-8 text-[#dc2626] animate-spin" />
                                <span className="text-xs text-gray-600 font-medium">{t('maskPreview:loading')}</span>
                            </div>
                        )}
                        {/* Back layer: the isolated cutout (revealed by the wipe). */}
                        {cutoutUrl && !isLoading && (
                            <img
                                src={cutoutUrl}
                                alt={t('maskPreview:previewAlt')}
                                className="block max-h-[500px] w-auto max-w-full object-contain"
                            />
                        )}

                        {/* Front layer: the original photo, wiped away right→left
                            on a one-shot ~1.4s sweep to expose the cutout behind.
                            clipPath insets the right edge inward (0% → 100%), so the
                            boundary travels leftward and the original dissolves to
                            reveal the isolated subject. Settles static, fully clipped. */}
                        {cutoutUrl && !isLoading && originalUrl && (
                            <motion.img
                                src={originalUrl}
                                alt="Original"
                                className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                                initial={{ clipPath: 'inset(0 0% 0 0)' }}
                                animate={{ clipPath: 'inset(0 100% 0 0)' }}
                                transition={{ duration: 1.4, ease: 'easeInOut', delay: 0.25 }}
                            />
                        )}
                    </div>

                    {error && (
                        <div className="flex items-start gap-2 text-xs text-[#dc2626] bg-red-50 rounded-xl p-3">
                            <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}
                </div>
            </div>

            <div className="px-4 md:px-6 pt-2 pb-8 max-w-xl mx-auto w-full space-y-3">
                <button
                    onClick={onRetake}
                    disabled={isLoading}
                    className="w-full py-3.5 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 transition-all bg-white border border-gray-200 text-gray-800 hover:border-[#dc2626] hover:text-[#dc2626] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <Camera className="w-4 h-4" />
                    {t('maskPreview:retake')}
                </button>
                <button
                    onClick={onLooksRight}
                    disabled={isLoading || !!error}
                    className="w-full py-4 rounded-[20px] font-bold text-lg flex items-center justify-center gap-2 transition-all duration-300 bg-[#dc2626] text-white shadow-[0_8px_20px_rgba(220,38,38,0.3)] hover:-translate-y-1 active:scale-[0.98] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-y-0"
                >
                    <Check className="w-5 h-5" />
                    {t('maskPreview:looksRight')}
                </button>
            </div>
        </div>
    );
}
