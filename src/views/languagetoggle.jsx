import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';

const CYCLE = ['EN', 'ZH', 'MS'];
const LABELS = { EN: 'EN', ZH: '中', MS: 'BM' };

export default function LanguageToggle({ appUILanguage, setAppUILanguage }) {
    const current = CYCLE.includes(appUILanguage) ? appUILanguage : 'EN';

    const cycleLanguage = () => {
        const i = CYCLE.indexOf(current);
        setAppUILanguage(CYCLE[(i + 1) % CYCLE.length]);
    };

    return (
        <button
            onClick={cycleLanguage}
            className="relative flex items-center justify-center bg-white p-1 rounded-full w-12 h-8 cursor-pointer border border-gray-200 shadow-inner overflow-hidden active:scale-95 transition-transform"
            aria-label="Cycle language"
        >
            <AnimatePresence mode="wait" initial={false}>
                <motion.span
                    key={current}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.18 }}
                    className="text-[12px] font-bold tracking-wide text-[#dc2626]"
                >
                    {LABELS[current]}
                </motion.span>
            </AnimatePresence>
        </button>
    );
}
