import React from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, Camera, ArrowRight } from 'lucide-react';

// Hard-block modal shown by the dashboard when post-capture heuristics flag
// the photo as severely blurry / under- or overexposed / too small. Always
// offers Use Anyway — heuristics have false positives and we don't want to
// block intentional shots (moody dark dishes, shallow DOF close-ups).
export default function PhotoCheckModal({ isOpen, warnings, onRetake, onUseAnyway }) {
    const { t } = useTranslation(['photoCheck']);

    if (!isOpen || !warnings || warnings.length === 0) return null;

    return (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end md:items-center justify-center p-4 animate-fade-in">
            <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-6 md:p-7 flex flex-col gap-5">
                <div className="flex items-start gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-red-50 text-[#dc2626] flex items-center justify-center flex-shrink-0">
                        <AlertTriangle size={22} strokeWidth={2.5} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h2 className="font-serif text-xl font-extrabold text-[#1a0f0d]">
                            {t('photoCheck:modal.title')}
                        </h2>
                        <p className="text-xs md:text-sm text-gray-500 mt-1 leading-relaxed">
                            {t('photoCheck:modal.subtitle')}
                        </p>
                    </div>
                </div>

                <ul className="flex flex-col gap-2.5">
                    {warnings.map((w) => (
                        <li
                            key={w.key}
                            className="flex items-start gap-2.5 text-sm text-gray-800 bg-red-50/70 rounded-2xl p-3"
                        >
                            <span className="w-1.5 h-1.5 rounded-full bg-[#dc2626] mt-2 flex-shrink-0" />
                            <span className="leading-relaxed">{t(`photoCheck:warnings.${w.key}`)}</span>
                        </li>
                    ))}
                </ul>

                <div className="flex flex-col gap-2.5 pt-1">
                    <button
                        type="button"
                        onClick={onRetake}
                        className="w-full py-3.5 rounded-2xl font-bold text-sm md:text-base flex items-center justify-center gap-2 transition-all bg-[#dc2626] text-white shadow-[0_8px_20px_rgba(220,38,38,0.25)] active:scale-[0.98]"
                    >
                        <Camera size={18} />
                        {t('photoCheck:actions.retake')}
                    </button>
                    <button
                        type="button"
                        onClick={onUseAnyway}
                        className="w-full py-3 rounded-2xl font-semibold text-sm bg-white border border-gray-200 text-gray-700 hover:border-gray-300 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                    >
                        {t('photoCheck:actions.useAnyway')}
                        <ArrowRight size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
}
