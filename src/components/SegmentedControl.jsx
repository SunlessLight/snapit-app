import React from 'react';

export default function SegmentedControl({ options, selected, onChange, size = 'md', className = '' }) {
    const padding = size === 'sm' ? 'py-1.5 px-3' : 'py-2.5 px-2';
    const textSize = size === 'sm' ? 'text-xs md:text-sm' : 'text-sm md:text-base';

    return (
        <div className={`flex bg-gray-50/80 p-1.5 rounded-2xl border border-gray-100 ${className}`}>
            {options.map((option) => {
                const isSelected = selected === option;
                return (
                    <button
                        key={option}
                        type="button"
                        onClick={() => onChange(option)}
                        className={`flex-1 ${padding} rounded-xl ${textSize} transition-all duration-200 ease-in-out font-sans whitespace-nowrap
                            ${isSelected
                                ? "bg-white text-[#dc2626] font-bold shadow-sm border border-gray-200/50"
                                : "bg-transparent text-gray-500 font-medium hover:text-gray-800"
                            }`}
                    >
                        {option}
                    </button>
                );
            })}
        </div>
    );
}
