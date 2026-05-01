import React, { useState, useEffect } from 'react';

const LOADING_TEXTS = {
    EN: ["1. Chopping up the data...", "2. Adding some Manglish spice...", "3. Plating your digital poster...", "4. Applying final touches..."],
    MY: ["1. Memproses data...", "2. Menambah perisa AI...", "3. Menyediakan poster digital...", "4. Sentuhan terakhir..."]
};

const FETCH_TIMEOUT_MS = 45000;

export default function ProcessingScreen({
    appUILanguage,
    mediaState,
    marketingConfig,
    setAiOutput,
    onComplete,
    onPrev
}) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [fade, setFade] = useState(true);
    const [error, setError] = useState(null);

    const isEN = appUILanguage === "EN";
    const currentTexts = isEN ? LOADING_TEXTS.EN : LOADING_TEXTS.MY;

    // HIGH SEVERITY FIX: Extract primitives to ensure referential stability and avoid stale closures
    const selectedFile = mediaState?.images?.[mediaState?.selectedSlot]?.file || null;
    const price = marketingConfig?.price || "";
    const outputLanguage = marketingConfig?.outputLanguage || "";
    const tone = marketingConfig?.tone || "";
    const posterStyle = marketingConfig?.posterStyle || "";

    // 1. Decoupled Animation Loop
    useEffect(() => {
        let isMounted = true; // LOW SEVERITY FIX: Localized mount tracker
        let cycleTimer;
        let timeoutTimer;

        if (!error) {
            cycleTimer = setInterval(() => {
                if (!isMounted) return;

                setFade(false);
                timeoutTimer = setTimeout(() => {
                    if (!isMounted) return;
                    setCurrentIndex((prev) => (prev + 1) % currentTexts.length);
                    setFade(true);
                }, 300);
            }, 2000);
        }

        return () => {
            isMounted = false;
            clearInterval(cycleTimer);
            if (timeoutTimer) clearTimeout(timeoutTimer);
        };
    }, [error, currentTexts.length]);

    // 2. Network Request & Lifecycle Management
    useEffect(() => {
        let isMounted = true;
        setError(null); // MEDIUM SEVERITY FIX: Clear residual error state on new mount/fetch

        const abortController = new AbortController();
        let timeoutId;
        let isTimeoutAbort = false;

        const generateProAssets = async () => {
            try {
                if (!selectedFile) {
                    throw new Error(isEN ? "Critical Error: No image payload found." : "Ralat Kritikal: Tiada fail gambar dijumpai.");
                }

                const formData = new FormData();
                formData.append('image', selectedFile);
                formData.append('price', price);
                formData.append('outputLanguage', outputLanguage);
                formData.append('tone', tone);
                formData.append('posterStyle', posterStyle);

                timeoutId = setTimeout(() => {
                    isTimeoutAbort = true;
                    abortController.abort();
                }, FETCH_TIMEOUT_MS);

                const response = await fetch('http://localhost:3000/generate-pro-assets', {
                    method: 'POST',
                    body: formData,
                    signal: abortController.signal
                });

                clearTimeout(timeoutId);

                if (!response.ok) {
                    throw new Error(`${isEN ? "Server rejected request" : "Pelayan menolak permintaan"} (Status: ${response.status})`);
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
                        // CRITICAL SEVERITY FIX: React 18 Strict Mode will abort the first request cleanly and fire a second one.
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
    }, [selectedFile, price, outputLanguage, tone, posterStyle, isEN, setAiOutput, onComplete]); // HIGH SEVERITY FIX: Strict dependency compliance

    // 3. Error State UI
    if (error) {
        return (
            <div className="min-h-screen w-full flex flex-col items-center justify-center bg-gray-900 px-6">
                <div className="bg-white p-8 rounded-2xl shadow-xl flex flex-col items-center max-w-md w-full text-center">
                    <div className="text-red-500 mb-4">
                        <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">{isEN ? "Generation Failed" : "Penjanaan Gagal"}</h2>
                    <p className="text-gray-600 mb-8">{error}</p>
                    <button
                        onClick={onPrev}
                        className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-3 px-6 rounded-lg transition-colors"
                    >
                        {isEN ? "Go Back & Try Again" : "Kembali & Cuba Lagi"}
                    </button>
                </div>
            </div>
        );
    }

    // 4. Loading State UI
    return (
        <div className="min-h-screen w-full flex flex-col items-center justify-center bg-gradient-to-r from-emerald-400 via-amber-400 to-orange-500 px-6">
            <h2 className={`text-white font-bold text-2xl md:text-3xl text-center transition-opacity duration-300 ease-in-out ${fade ? 'opacity-100' : 'opacity-0'}`}>
                {currentTexts[currentIndex]}
            </h2>
            <div className="w-64 max-w-full h-2 bg-white/30 rounded-full mt-10 overflow-hidden">
                <div className="h-full bg-white w-full rounded-full animate-pulse"></div>
            </div>
        </div>
    );
}