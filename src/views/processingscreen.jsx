import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export default function ProcessingScreen({
    mediaState,
    marketingConfig,
    setAiOutput,
    onComplete,
    onPrev
}) {
    const { t } = useTranslation('processing');
    const [currentIndex, setCurrentIndex] = useState(0);
    const [error, setError] = useState(null);

    const currentTexts = t('loadingTexts', { returnObjects: true });

    const selectedFile = mediaState.processedFile || mediaState.file || null;
    const dishName = marketingConfig?.dishName || "";

    const price = marketingConfig?.price || "";
    const outputLanguage = marketingConfig?.outputLanguage || "";
    const backgroundVibe = marketingConfig?.backgroundVibe || "";
    const generateBackground = marketingConfig?.generateBackground ?? true;
    const isMediaEditorPro = !!mediaState?.isMediaEditorPro;
    const isContextPro = !!marketingConfig?.isContextPro;
    const description = marketingConfig?.description || "";
    const tone = marketingConfig?.tone || "";
    const backgroundDescription = marketingConfig?.backgroundDescription || "";

    console.log("Current File:", mediaState.file)

    // 1. Text Animation Loop
    useEffect(() => {
        let isMounted = true;
        let cycleTimer;

        if (!error) {
            cycleTimer = setInterval(() => {
                if (!isMounted) return;
                setCurrentIndex((prev) => (prev + 1) % currentTexts.length);
            }, 2500); // Changed to 2.5s for smoother reading
        }

        return () => {
            isMounted = false;
            clearInterval(cycleTimer);
        };
    }, [error, currentTexts.length]);

    // 2. New Asynchronous Polling Logic
    useEffect(() => {
        let isMounted = true;
        let pollTimer = null;
        setError(null);

        const generateProAssets = async () => {
            try {
                if (!selectedFile) {
                    throw new Error(t('errors.noFile'));
                }

                // Prepare Data
                const formData = new FormData();
                formData.append('image', selectedFile, 'snapit-upload.png');
                formData.append('dishName', dishName);
                formData.append('price', price);
                formData.append('outputLanguage', outputLanguage);
                formData.append('backgroundVibe', backgroundVibe);
                formData.append('generateBackground', generateBackground);
                formData.append('isMediaEditorPro', isMediaEditorPro);
                formData.append('isContextPro', isContextPro);
                formData.append('description', description);
                formData.append('tone', tone);
                formData.append('backgroundDescription', backgroundDescription);

                // STEP 1: Initial POST to start the job
                const response = await fetch(`${API_BASE_URL}/api/generate`, {
                    method: 'POST',
                    body: formData,
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => null);
                    throw new Error(errorData?.error || `Server Error: ${response.status}`);
                }

                const { jobId } = await response.json();

                // STEP 2: Start Polling the status endpoint
                pollTimer = setInterval(async () => {
                    try {
                        const statusRes = await fetch(`${API_BASE_URL}/api/status/${jobId}`);

                        if (!statusRes.ok) throw new Error("Failed to check job status.");

                        const job = await statusRes.json();

                        if (!isMounted) return;

                        if (job.status === 'completed') {
                            clearInterval(pollTimer);
                            setAiOutput(job.data);
                            onComplete();
                        } else if (job.status === 'failed') {
                            clearInterval(pollTimer);
                            throw new Error(job.error || "AI Generation failed.");
                        }
                        // If status is 'processing', it just waits for the next 3s interval
                    } catch (pollErr) {
                        if (isMounted) {
                            clearInterval(pollTimer);
                            setError(pollErr.message);
                        }
                    }
                }, 3000); // Poll every 3 seconds

            } catch (err) {
                if (!isMounted) return;
                console.error("API Error:", err);
                setError(err.message || t('errors.network'));
            }
        };

        generateProAssets();

        return () => {
            isMounted = false;
            if (pollTimer) clearInterval(pollTimer);
        };
    }, [selectedFile, dishName, price, outputLanguage, backgroundVibe, setAiOutput, onComplete, t]);


    // 3. Error State UI
    if (error) {
        return (
            <div className="h-[100dvh] w-full flex flex-col items-center justify-center bg-[#fff8f6] px-6">
                <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center max-w-sm w-full text-center">
                    <div className="text-[#dc2626] mb-4 bg-red-50 p-4 rounded-full">
                        <svg className="w-10 h-10 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <h2 className="text-xl font-serif font-bold text-gray-900 mb-2">{t('errors.title')}</h2>
                    <p className="text-sm text-gray-500 mb-8">{error}</p>
                    <button
                        onClick={onPrev}
                        className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold py-3.5 px-6 rounded-2xl transition-colors text-sm"
                    >
                        {t('errors.retry')}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full w-full relative overflow-hidden bg-[#fafafa] flex flex-col items-center justify-center px-8">

            {/* The Animated Gradient Background - Subtle & Pearlescent */}
            <div className="absolute inset-0 pointer-events-none z-0 opacity-70">
                <motion.div
                    animate={{ backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }}
                    transition={{ duration: 8, ease: "linear", repeat: Infinity }}
                    className="w-full h-full"
                    style={{
                        // Ultra-light, barely-there pastels: Soft Sky, Pale Violet, Ghost Fuchsia, Warm Pearl
                        background: "linear-gradient(-45deg, #e0f2fe, #ede9fe, #ffedd5, #d1fae5, #fae8ff, #fff7ed)",
                        backgroundSize: "300% 300%"
                    }}
                />
            </div>

            {/* The Foreground UI */}
            <div className="relative z-20 flex flex-col items-center w-full max-w-sm backdrop-blur-md bg-white/50 p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/80">

                {/* Subtle Changing Text */}
                <div className="h-8 mb-6 flex items-center justify-center">
                    <AnimatePresence mode="wait">
                        <motion.p
                            key={currentIndex}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.8, ease: "easeOut" }}
                            className="text-base font-medium text-gray-600 tracking-wide text-center m-0"
                        >
                            {currentTexts[currentIndex]}
                        </motion.p>
                    </AnimatePresence>
                </div>

                {/* Refined Loading Bar */}
                <div className="w-56 h-1 bg-gray-100 rounded-full overflow-hidden relative">
                    <motion.div
                        animate={{ x: ["-100%", "200%"] }}
                        transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                        className="absolute top-0 bottom-0 w-1/2 bg-gradient-to-r from-transparent via-gray-400/30 to-transparent rounded-full"
                    />
                </div>
            </div>
        </div>
    );
}
