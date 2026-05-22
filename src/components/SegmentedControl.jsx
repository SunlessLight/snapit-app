import React from 'react';

export default function SegmentedControl({ options, selected, onChange, size = 'md', className = '' }) {
    const padding = size === 'sm' ? 'py-1.5 px-3' : 'py-2.5 px-2';
    const textSize = size === 'sm' ? 'text-xs md:text-sm' : 'text-sm md:text-base';

    const selectedIndex = options.indexOf(selected);
    const hasSelection = selectedIndex >= 0;
    const pillIndex = hasSelection ? selectedIndex : 0;

    return (
        <div className={`relative inline-flex bg-gray-50/80 p-1.5 rounded-2xl border border-gray-100 ${className}`}>
            {/* Sliding white pill */}
            <div
                aria-hidden="true"
                className="absolute top-1.5 bottom-1.5 bg-white rounded-xl shadow-sm border border-gray-200/50 transition-[transform,opacity] duration-300 ease-out"
                style={{
                    left: '6px',
                    width: `calc((100% - 12px) / ${options.length})`,
                    transform: `translateX(${pillIndex * 100}%)`,
                    opacity: hasSelection ? 1 : 0,
                }}
            />
            {options.map((option) => {
                const isSelected = selected === option;
                return (
                    <button
                        key={option}
                        type="button"
                        onClick={() => onChange(option)}
                        className={`relative z-10 flex-1 ${padding} rounded-xl ${textSize} transition-colors duration-200 ease-in-out font-sans whitespace-nowrap
                            ${isSelected
                                ? "text-[#dc2626] font-bold"
                                : "text-gray-500 font-medium hover:text-gray-800"
                            }`}
                    >
                        {option}
                    </button>
                );
            })}
        </div>
    );
}
