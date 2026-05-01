import React from 'react';

export default function TimelineBar({ currentStep }) {
    const steps = [
        { num: 1, label: "Take picture" },
        { num: 2, label: "Enhance" },
        { num: 3, label: "Design" },
        { num: 4, label: "Caption" },
        { num: 5, label: "Result" }
    ];

    return (
        <div className="flex items-center justify-center gap-1 md:gap-3 mb-4 md:mb-8 overflow-x-auto pb-2 w-full max-w-full [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {steps.map((step, index) => {
                const isActive = step.num === currentStep;
                const isDone = step.num < currentStep;

                return (
                    <React.Fragment key={step.num}>
                        <div className="flex items-center gap-2">
                            <div
                                className={`w-9 h-9 rounded-full flex items-center justify-center font-semibold text-sm flex-shrink-0 transition-colors ${isActive || isDone
                                        ? 'bg-[#dc2626] text-white border-transparent'
                                        : 'bg-white border border-gray-200 text-gray-500'
                                    }`}
                            >
                                {step.num}
                            </div>
                            <span
                                className={`hidden sm:block text-sm font-medium whitespace-nowrap ${isActive || isDone ? 'text-gray-900' : 'opacity-50 text-gray-500'
                                    }`}
                            >
                                {step.label}
                            </span>
                        </div>
                        {/* Only render the line if it's not the last step */}
                        {index < steps.length - 1 && (
                            <div
                                className={`w-4 md:w-10 h-0.5 flex-shrink-0 transition-colors ${isDone ? 'bg-[#dc2626]' : 'bg-gray-200'
                                    }`}
                            ></div>
                        )}
                    </React.Fragment>
                );
            })}
        </div>
    );
}