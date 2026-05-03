import React from 'react';

export default function TimelineBar({ currentStep }) {
    const steps = [
        { num: 1, label: "Picture" },
        { num: 2, label: "Enhance" },
        { num: 3, label: "Caption" },
        { num: 4, label: "Result" }
    ];

    return (
        <div className="flex items-center justify-between w-full max-w-lg mx-auto
         md:mb-8 mt-2 px-2 mb-2 flex-shrink-0">
            {steps.map((step, index) => {
                const isActive = step.num === currentStep;
                const isDone = step.num < currentStep;

                return (
                    <React.Fragment key={step.num}>
                        <div className="flex flex-col items-center relative z-10">
                            {/* Added font-serif here to match the Drag & Drop text */}
                            <span
                                className={`absolute bottom-full mb-1.5 w-14 md:w-16 text-center font-bold text-[10px] md:text-[11px] leading-tight transition-colors ${isActive || isDone ? 'text-gray-900' : 'opacity-50 text-gray-500'
                                    }`}
                            >
                                {step.label}
                            </span>

                            <div
                                className={`w-7 h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center font-sans font-semibold text-xs md:text-sm transition-colors ${isActive || isDone
                                    ? 'bg-[#dc2626] text-white border-transparent shadow-sm'
                                    : 'bg-white border border-gray-200 text-gray-500'
                                    }`}
                            >
                                {step.num}
                            </div>
                        </div>

                        {index < steps.length - 1 && (
                            <div
                                className={`flex-1 h-0.5 mx-1 transition-colors ${isDone ? 'bg-[#dc2626]' : 'bg-gray-200'
                                    }`}
                            ></div>
                        )}
                    </React.Fragment>
                );
            })}
        </div>
    );
}