import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const LOADING_TEXTS = {
    EN: ["Chopping up the data...", "Adding some Malaglish spice...", "Plating your digital poster...", "Applying final touches..."],
    MY: ["Memproses data...", "Menambah perisa AI...", "Menyediakan poster digital...", "Sentuhan terakhir..."]
};

const FETCH_TIMEOUT_MS = 45000;

const sparkles = Array.from({ length: 30 }).map(() => ({
    top: `${Math.random() * 100}%`,
    left: `${Math.random() * 100}%`,
    size: Math.random() * 4 + 2,
    delay: Math.random() * 4,
    duration: Math.random() * 2 + 2
}));

export default function ProcessingScreen({
    appUILanguage,
    mediaState,
    marketingConfig,
    setAiOutput,
    onComplete,
    onPrev
}) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [error, setError] = useState(null);

    const isEN = appUILanguage === "EN";
    const currentTexts = isEN ? LOADING_TEXTS.EN : LOADING_TEXTS.MY;

    const selectedFile = mediaState.processedFile || mediaState.file || null;
    const dishName = marketingConfig?.dishName || "";
    const price = marketingConfig?.price || "";
    const outputLanguage = marketingConfig?.outputLanguage || "";
    const backgroundVibe = marketingConfig?.backgroundVibe || "";

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

    // 2. Network Request & Lifecycle Management
    useEffect(() => {
        let isMounted = true;
        setError(null);

        const abortController = new AbortController();
        let timeoutId;
        let isTimeoutAbort = false;

        const generateProAssets = async () => {
            try {

                if (!selectedFile) {
                    throw new Error(isEN ? "Critical Error: No image payload found." : "Ralat Kritikal: Tiada fail gambar dijumpai.");
                }

                const formData = new FormData();
                formData.append('image', selectedFile, 'snapit-upload.png');
                formData.append('dishName', dishName);
                formData.append('price', price);
                formData.append('outputLanguage', outputLanguage);
                formData.append('backgroundVibe', backgroundVibe);

                timeoutId = setTimeout(() => {
                    isTimeoutAbort = true;
                    abortController.abort();
                }, FETCH_TIMEOUT_MS);


                const response = await fetch('/.netlify/functions/generate-pro-assets', {
                    method: 'POST',
                    body: formData,
                    signal: abortController.signal
                });


                clearTimeout(timeoutId);

                if (!response.ok) {
                    const errorData = await response.json().catch(() => null);
                    const backendMessage = errorData?.error || `Status: ${response.status}`;
                    throw new Error(`${isEN ? "Server Error" : "Ralat Pelayan"}: ${backendMessage}`);
                }

                const result = await response.json();

                if (!isMounted) return;

                if (result.success && result.data) {
                    setAiOutput(result.data);
                    onComplete();
                } else {
                    throw new Error(result.message || (isEN ? "Backend returned an invalid data structure." : "Struktur data tidak sah dari pelayan."));
                }

            } catch (err) {
                if (!isMounted) return;

                if (err.name === 'AbortError') {
                    if (isTimeoutAbort) {
                        setError(isEN ? "The server took too long to respond. Please try again." : "Pelayan mengambil masa yang terlalu lama. Sila cuba lagi.");
                    } else {
                        console.info('Process aborted: Component unmounted cleanly.');
                    }
                    return;
                }

                console.error("API Error:", err);
                setError(err.message || (isEN ? "An unexpected network error occurred." : "Ralat rangkaian yang tidak dijangka berlaku."));
            }
        };

        generateProAssets();

        return () => {
            isMounted = false;
            clearTimeout(timeoutId);
            abortController.abort();
        };
    }, [selectedFile, dishName, price, outputLanguage, backgroundVibe, isEN, setAiOutput, onComplete]);

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
                    <h2 className="text-xl font-serif font-bold text-gray-900 mb-2">{isEN ? "Generation Failed" : "Penjanaan Gagal"}</h2>
                    <p className="text-sm text-gray-500 mb-8">{error}</p>
                    <button
                        onClick={onPrev}
                        className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold py-3.5 px-6 rounded-2xl transition-colors text-sm"
                    >
                        {isEN ? "Go Back & Try Again" : "Kembali & Cuba Lagi"}
                    </button>
                </div>
            </div>
        );
    }

    // 4. Loading State UI (Upgraded Apple Vibe + Mesh Gradient + Glister)
    return (
        <div className="h-full w-full relative overflow-hidden bg-transparent flex flex-col items-center justify-center px-8">

            {/* Background Container - Replaced with Veo Video */}
            <div className="absolute inset-0 pointer-events-none z-0 bg-[#f8f9fa]">
                <video
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="w-full h-full object-cover opacity-90"
                >
                    {/* Modern browsers prefer WebM for better compression/quality */}
                    <source src="/assets/veo-background.webm" type="video/webm" />
                    {/* MP4 as a fallback for older iOS devices */}
                    <source src="/assets/veo-background.mp4" type="video/mp4" />
                </video>

                {/* Optional: A very subtle white overlay to ensure the loading text remains readable */}
                <div className="absolute inset-0 bg-white/20 backdrop-blur-[2px]" />
            </div>

            {/* The Foreground UI */}
            <div className="relative z-20 flex flex-col items-center w-full max-w-sm backdrop-blur-md bg-white/10 p-8 rounded-3xl shadow-2xl border border-white/20">

                {/* Subtle Changing Text */}
                <div className="h-8 mb-6 flex items-center justify-center">
                    <AnimatePresence mode="wait">
                        <motion.p
                            key={currentIndex}
                            initial={{ opacity: 0, filter: "blur(8px)", y: 10 }}
                            animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
                            exit={{ opacity: 0, filter: "blur(8px)", y: -10 }}
                            transition={{ duration: 0.5, ease: "easeOut" }}
                            className="text-base font-semibold text-gray-800 tracking-wide text-center m-0"
                        >
                            {currentTexts[currentIndex]}
                        </motion.p>
                    </AnimatePresence>
                </div>

                {/* Upgraded Apple-Style Loading Bar */}
                <div className="w-56 h-1.5 bg-black/5 rounded-full overflow-hidden shadow-inner relative">
                    <motion.div
                        animate={{ x: ["-100%", "200%"] }}
                        transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                        className="absolute top-0 bottom-0 w-1/2 bg-gradient-to-r from-transparent via-gray-800/60 to-transparent rounded-full"
                    />
                </div>
            </div>
        </div>
    );
}