import React from 'react';
import { Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function DynamicTimeline({
    currentStep,
    showReview = false,
    showMaskPreviewDot = false,
    useShiftedNumbering = false,
}) {
    const { t } = useTranslation('timeline');

    // Step numbers shift when Phase 6.7.5's mask-preview flag is on at build
    // time. With shifted numbering: 1=Upload, 2=Edit, 3=Vibe, 4=MaskPreview,
    // 5=AI Magic, [6=Review], 7=Result. Without: 1=Upload, …, 4=AI Magic,
    // [5=Review], 6=Result.
    //
    // `showMaskPreviewDot` is a separate concept — it controls whether dot 4
    // appears in the timeline at all. When the user opts bg-off, the mask
    // preview step is skipped entirely (same UX pattern as how the !showReview
    // case removes dot 5/6 from the strip), but `useShiftedNumbering` stays
    // true so currentStep values still map to the right labels.
    const labelForStep = (num) => {
        if (useShiftedNumbering) {
            if (num === 1) return t('steps.1');
            if (num === 2) return t('steps.2');
            if (num === 3) return t('steps.3');
            if (num === 4) return t('steps.7'); // MaskPreview label
            if (num === 5) return t('steps.4'); // AI Magic shifts to slot 5
            if (num === 6) return t('steps.5'); // Review shifts to slot 6
            if (num === 7) return t('steps.6'); // Result shifts to slot 7
            return '';
        }
        return t(`steps.${num}`);
    };

    let stepNums;
    if (useShiftedNumbering) {
        // Resolved-step numbers: which dots actually appear, given the user's
        // current Review/bg choices.
        const base = [1, 2, 3];
        if (showMaskPreviewDot) base.push(4);
        base.push(5); // AI Magic always appears
        if (showReview) base.push(6);
        base.push(7); // Result always appears
        stepNums = base;
    } else {
        stepNums = showReview ? [1, 2, 3, 4, 5, 6] : [1, 2, 3, 4, 6];
    }
    const steps = stepNums.map(num => ({ num, label: labelForStep(num) }));

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
