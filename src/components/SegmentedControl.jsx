import React, { useRef, useState, useLayoutEffect } from 'react';

export default function SegmentedControl({ options, selected, onChange, size = 'md', className = '' }) {
    const padding = size === 'sm' ? 'py-1.5 px-3' : 'py-2.5 px-2';
    const textSize = size === 'sm' ? 'text-xs md:text-sm' : 'text-sm md:text-base';

    const selectedIndex = options.indexOf(selected);
    const hasSelection = selectedIndex >= 0;
    const pillIndex = hasSelection ? selectedIndex : 0;

    const buttonRefs = useRef([]);
    const [pillRect, setPillRect] = useState({ left: 0, width: 0 });

    // Measure the selected button's actual position + width, and re-measure
    // whenever any button resizes (font load, label change, container resize).
    useLayoutEffect(() => {
        const measure = () => {
            const btn = buttonRefs.current[pillIndex];
            if (btn) setPillRect({ left: btn.offsetLeft, width: btn.offsetWidth });
        };
        measure();

        const ro = new ResizeObserver(measure);
        buttonRefs.current.forEach((b) => b && ro.observe(b));
        return () => ro.disconnect();
    }, [pillIndex, options.length]);

    return (
        <div className={`relative inline-flex bg-gray-50/80 p-1.5 rounded-2xl border border-gray-100 ${className}`}>
            {/* Sliding white pill — width + left follow the selected button's real layout */}
            <div
                aria-hidden="true"
                className="absolute top-1.5 bottom-1.5 bg-white rounded-xl shadow-sm border border-gray-200/50 transition-[left,width,opacity] duration-300 ease-out"
                style={{
                    left: `${pillRect.left}px`,
                    width: `${pillRect.width}px`,
                    opacity: hasSelection ? 1 : 0,
                }}
            />
            {options.map((option, i) => {
                const isSelected = selected === option;
                return (
                    <button
                        key={option}
                        ref={(el) => { buttonRefs.current[i] = el; }}
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
