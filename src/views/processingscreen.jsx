import React, { useState, useEffect } from 'react';

export default function ProcessingScreen({ appUILanguage, onComplete }) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [fade, setFade] = useState(true);

    const loadingTexts = appUILanguage === "EN"
        ? ["1. Chopping up the data...", "2. Adding some Manglish spice...", "3. Plating your digital poster..."]
        : ["1. Memproses data...", "2. Menambah perisa AI...", "3. Menyediakan poster digital..."];

    useEffect(() => {
        let cycles = 0;
        const maxCycles = loadingTexts.length;
        let timeoutTimer; // FIX: Declared a variable to hold the timeout ID

        const cycleTimer = setInterval(() => {
            setFade(false);

            timeoutTimer = setTimeout(() => {
                cycles++;
                if (cycles >= maxCycles) {
                    clearInterval(cycleTimer);
                    onComplete();
                } else {
                    setCurrentIndex((prev) => prev + 1);
                    setFade(true);
                }
            }, 300);
        }, 2000);

        // FIX: Comprehensive cleanup to prevent memory leaks on unmount
        return () => {
            clearInterval(cycleTimer);
            if (timeoutTimer) clearTimeout(timeoutTimer);
        };
    }, [onComplete, loadingTexts.length]);

    return (
        <div className="min-h-screen w-full flex flex-col items-center justify-center bg-gradient-to-r from-emerald-400 via-amber-400 to-orange-500 px-6">
            <h2 className={`text-white font-bold text-2xl md:text-3xl text-center transition-opacity duration-300 ease-in-out ${fade ? 'opacity-100' : 'opacity-0'}`}>
                {loadingTexts[currentIndex]}
            </h2>
            <div className="w-64 max-w-full h-2 bg-white/30 rounded-full mt-10">
                <div className="h-full bg-white w-full rounded-full animate-pulse"></div>
            </div>
        </div>
    );
}