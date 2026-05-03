import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const LOADING_TEXTS = {
    EN: ["Chopping up the data...", "Adding some Malaglish spice...", "Plating your digital poster...", "Applying final touches..."],
    MY: ["Memproses data...", "Menambah perisa AI...", "Menyediakan poster digital...", "Sentuhan terakhir..."]
};

const FETCH_TIMEOUT_MS = 45000;

// Pre-calculate random values for the glister effect outside the component
// to prevent the sparkles from jumping around on every text re-render.
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

    const selectedFile = mediaState.file || null;
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


                const response = await fetch('http://localhost:3000/api/generate-pro-assets', {
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

            {/* Background Container */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 bg-[#f8f9fa]">

                {/* 1. Vibrant Rose Blob (Top Left -> Sweeps Right/Down) */}
                <motion.div
                    animate={{
                        x: ["0vw", "20vw", "-10vw", "0vw"],
                        y: ["0vh", "-10vh", "15vh", "0vh"],
                        scale: [1, 1.4, 0.8, 1],
                        rotate: [0, 90, 180, 360]
                    }}
                    transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-rose-400/50 rounded-full mix-blend-multiply filter blur-[80px] md:blur-[120px]"
                />

                {/* 2. Bright Yellow Blob (Top Right -> Sweeps Left/Down) */}
                <motion.div
                    animate={{
                        x: ["0vw", "-25vw", "10vw", "0vw"],
                        y: ["0vh", "20vh", "-15vh", "0vh"],
                        scale: [1, 0.8, 1.3, 1],
                        rotate: [360, 240, 120, 0]
                    }}
                    transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute top-[-10%] right-[-10%] w-[45vw] h-[45vw] bg-yellow-400/50 rounded-full mix-blend-multiply filter blur-[80px] md:blur-[120px]"
                />

                {/* 3. Deep Purple Blob (Bottom Left -> Sweeps Right/Up) */}
                <motion.div
                    animate={{
                        x: ["0vw", "30vw", "-15vw", "0vw"],
                        y: ["0vh", "-25vh", "10vh", "0vh"],
                        scale: [0.9, 1.5, 1, 0.9],
                        rotate: [0, -180, -360]
                    }}
                    transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute bottom-[-10%] left-[-10%] w-[55vw] h-[55vw] bg-purple-500/40 rounded-full mix-blend-multiply filter blur-[80px] md:blur-[120px]"
                />

                {/* 4. Emerald Green Blob (Bottom Right -> Sweeps Left/Up) */}
                <motion.div
                    animate={{
                        x: ["0vw", "-20vw", "25vw", "0vw"],
                        y: ["0vh", "-30vh", "15vh", "0vh"],
                        scale: [1.1, 0.8, 1.4, 1.1],
                        rotate: [0, 180, 360]
                    }}
                    transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-emerald-400/40 rounded-full mix-blend-multiply filter blur-[80px] md:blur-[120px]"
                />

                {/* 5. Sunset Orange Blob (Center -> Breathes and orbits) */}
                <motion.div
                    animate={{
                        x: ["-10vw", "15vw", "-10vw"],
                        y: ["-10vh", "15vh", "-10vh"],
                        scale: [0.8, 1.6, 0.8],
                        rotate: [0, 360]
                    }}
                    transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute top-[20%] left-[20%] w-[60vw] h-[60vw] bg-orange-400/40 rounded-full mix-blend-multiply filter blur-[80px] md:blur-[120px]"
                />

                {/* 6. Cyan Flow Blob (Center Right -> Drifts freely) */}
                <motion.div
                    animate={{
                        x: ["15vw", "-20vw", "15vw"],
                        y: ["15vh", "-15vh", "15vh"],
                        scale: [1.2, 0.7, 1.2],
                        rotate: [360, 0]
                    }}
                    transition={{ duration: 19, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute top-[30%] right-[10%] w-[40vw] h-[40vw] bg-cyan-400/30 rounded-full mix-blend-multiply filter blur-[80px] md:blur-[120px]"
                />

                {/* The Glister / Sparkle Overlay */}
                <div className="absolute inset-0 z-10 opacity-60">
                    {sparkles.map((sparkle, i) => (
                        <motion.div
                            key={i}
                            className="absolute bg-white rounded-full shadow-[0_0_8px_2px_rgba(255,255,255,0.8)]"
                            style={{
                                top: sparkle.top,
                                left: sparkle.left,
                                width: `${sparkle.size}px`,
                                height: `${sparkle.size}px`,
                            }}
                            animate={{
                                opacity: [0, 1, 0],
                                scale: [0, 1.5, 0],
                            }}
                            transition={{
                                duration: sparkle.duration,
                                repeat: Infinity,
                                delay: sparkle.delay,
                                ease: "easeInOut"
                            }}
                        />
                    ))}
                </div>
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