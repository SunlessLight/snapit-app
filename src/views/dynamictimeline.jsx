import React from 'react';
import { Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';

// Internal router steps (mirrors the STEP map in App.jsx). Review (5) is a real
// router step but gets no timeline dot of its own — it shares Result's slot.
const STEP = { DASHBOARD: 1, EDITOR: 2, CONFIG: 3, PROCESSING: 4, REVIEW: 5, RESULTS: 6 };

// Always five visible stages. Each dot carries its internal router step (for the
// active/past comparison) and its locale key (for the label). Displayed numerals
// come from array position, so Result always shows "5" regardless of its
// internal id (6) — this is what keeps the timeline gap-free in the Standard flow.
const TIMELINE_DOTS = [
    { internal: STEP.DASHBOARD, labelKey: 1 },
    { internal: STEP.EDITOR, labelKey: 2 },
    { internal: STEP.CONFIG, labelKey: 3 },
    { internal: STEP.PROCESSING, labelKey: 4 },
    { internal: STEP.RESULTS, labelKey: 6 },
];

export default function DynamicTimeline({
    currentStep,
}) {
    const { t } = useTranslation('timeline');

    // Review has no dot, so collapse it onto Result for highlighting: while on the
    // Review screen the active pill rests on Result (its forward neighbour), and it
    // stays put when the vendor advances into Results Hub.
    const effectiveStep = currentStep === STEP.REVIEW ? STEP.RESULTS : currentStep;

    return (
        // Sticky wrapper that floats at the top
        <div className="sticky top-4 z-50 flex justify-center w-full pointer-events-none px-4">
            {/* The Frosted Glass Container */}
            <div className="bg-white/80 backdrop-blur-xl shadow-sm border border-gray-200/50 rounded-full px-3 py-2 flex items-center gap-2 md:gap-3 pointer-events-auto transition-all duration-500">

                {TIMELINE_DOTS.map((dot, index) => {
                    const isActive = dot.internal === effectiveStep;
                    const isPast = dot.internal < effectiveStep;
                    const displayNum = index + 1;

                    return (
                        <div
                            key={dot.internal}
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
                                    {t(`steps.${dot.labelKey}`)}
                                </span>
                            ) : isPast ? (
                                // Past State: Show Checkmark
                                <Check size={14} strokeWidth={3} />
                            ) : (
                                // Future State: Show sequential position (1-5), not the internal id
                                <span className="text-xs md:text-sm font-medium">{displayNum}</span>
                            )}
                        </div>
                    );
                })}

            </div>
        </div>
    );
}
