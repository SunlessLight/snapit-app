import React from 'react';

export default function LanguageToggle({ appUILanguage, setAppUILanguage }) {
    const isEN = appUILanguage === "EN";

    const toggleLanguage = () => {
        setAppUILanguage(isEN ? "MS" : "EN");
    };

    return (
        <button
            onClick={toggleLanguage}
            className="relative flex items-center bg-gray-100/80 p-1 rounded-full w-20 h-8 cursor-pointer border border-gray-200/50 shadow-inner"
            aria-label="Toggle Language"
        >
            {/* Sliding White Pill Background */}
            <div
                className={`absolute left-1 top-1 bottom-1 w-[34px] bg-white rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.12)] transition-transform duration-300 cubic-bezier(0.4, 0, 0.2, 1) ${isEN ? 'translate-x-0' : 'translate-x-[38px]'
                    }`}
            />

            {/* Labels */}
            <div className={`relative z-10 flex-1 text-center text-[11px] font-bold tracking-wide transition-colors duration-300 ${isEN ? 'text-[#dc2626]' : 'text-gray-400'}`}>
                EN
            </div>
            <div className={`relative z-10 flex-1 text-center text-[11px] font-bold tracking-wide transition-colors duration-300 ${!isEN ? 'text-[#dc2626]' : 'text-gray-400'}`}>
                BM
            </div>
        </button>
    );
}