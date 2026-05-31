import React from 'react';
import { useTranslation } from 'react-i18next';
import { Lightbulb, Camera, ArrowRight } from 'lucide-react';

// Post-capture heads-up shown by the dashboard when heuristics flag the photo
// as severely blurry / under- or overexposed / too small. Framed as a tip, not
// a verdict: "Use this photo" is the primary action and each issue carries a
// one-line, actionable fix. The vendor decides — heuristics false-positive on
// intentional shots (moody dark dishes, shallow DOF close-ups), and the whole
// reason they're here is that taking a clean photo is hard for them.
export default function PhotoCheckModal({ isOpen, warnings, onRetake, onUseAnyway }) {
    const { t } = useTranslation(['photoCheck']);

    if (!isOpen || !warnings || warnings.length === 0) return null;

    return (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end md:items-center justify-center p-4 animate-fade-in">
            <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-6 md:p-7 flex flex-col gap-5">
                <div className="flex items-start gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0">
                        <Lightbulb size={22} strokeWidth={2.5} />
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
                            className="flex items-start gap-2.5 text-sm text-gray-800 bg-amber-50/70 rounded-2xl p-3"
                        >
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-2 flex-shrink-0" />
                            <span className="flex-1 min-w-0">
                                <span className="block leading-relaxed">{t(`photoCheck:warnings.${w.key}`)}</span>
                                <span className="block text-xs text-amber-700 mt-1 leading-relaxed">
                                    {t(`photoCheck:tips.${w.key}`)}
                                </span>
                            </span>
                        </li>
                    ))}
                </ul>

                <div className="flex flex-col gap-2.5 pt-1">
                    <button
                        type="button"
                        onClick={onUseAnyway}
                        className="w-full py-3.5 rounded-2xl font-bold text-sm md:text-base flex items-center justify-center gap-2 transition-all bg-[#dc2626] text-white shadow-[0_8px_20px_rgba(220,38,38,0.25)] active:scale-[0.98]"
                    >
                        {t('photoCheck:actions.useThisPhoto')}
                        <ArrowRight size={18} />
                    </button>
                    <button
                        type="button"
                        onClick={onRetake}
                        className="w-full py-3 rounded-2xl font-semibold text-sm bg-white border border-gray-200 text-gray-700 hover:border-gray-300 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                    >
                        <Camera size={16} />
                        {t('photoCheck:actions.retake')}
                    </button>
                </div>
            </div>
        </div>
    );
}
