import React from 'react';
import { Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function DynamicTimeline({ currentStep, showReview = false }) {
    const { t } = useTranslation('timeline');
    // Assistive Pro users get the Review step (5) between AI Magic (4) and Result (6).
    // Everyone else sees a 5-dot timeline and jumps straight from AI Magic to Result.
    const stepNums = showReview ? [1, 2, 3, 4, 5, 6] : [1, 2, 3, 4, 6];
    const steps = stepNums.map(num => ({ num, label: t(`steps.${num}`) }));

    return (
        // Sticky wrapper that floats at the top
        <div className="sticky top-4 z-50 flex justify-center w-full pointer-events-none px-4">
            {/* The Frosted Glass Container */}
            <div className="bg-white/80 backdrop-blur-xl shadow-sm border border-gray-200/50 rounded-full px-3 py-2 flex items-center gap-2 md:gap-3 pointer-events-auto transition-all duration-500">

                {steps.map((step) => {
                    const isActive = step.num === currentStep;
                    const isPast = step.num < currentStep;

                    return (
                        <div
                            key={step.num}
                            className={`flex items-center justify-center rounded-full transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] overflow-hidden
                                ${isActive
                                    ? 'bg-[#dc2626] text-white px-4 py-1.5 shadow-md' // The expanded active pill
                                    : isPast
                                        ? 'bg-gray-200 text-gray-500 w-8 h-8 md:w-9 md:h-9' // Past steps (subtle dots)
                                        : 'bg-gray-100 text-gray-400 w-8 h-8 md:w-9 md:h-9' // Future steps
                                }
                            `}
                        >
                            {isActive ? (
                                // Active State: Show Text
                                <span className="text-xs md:text-sm font-semibold whitespace-nowrap">
                                    {step.label}
                                </span>
                            ) : isPast ? (
                                // Past State: Show Checkmark
                                <Check size={14} strokeWidth={3} />
                            ) : (
                                // Future State: Show Number
                                <span className="text-xs md:text-sm font-medium">{step.num}</span>
                            )}
                        </div>
                    );
                })}

            </div>
        </div>
    );
}
