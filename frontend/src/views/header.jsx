import React from 'react';
import { User } from 'lucide-react';

export default function Header({ snapitLogo, userName }) {
    return (
        <header className="flex items-center justify-between mb-3 md:mb-8 flex-shrink-0">
            <div className="flex items-center gap-2 md:gap-3">
                <img src={snapitLogo} alt="SnapIT" className="w-24 h-16 md:w-24 md:h-24 object-contain" />
                <div className="hidden sm:block">
                    <p className="text-sm opacity-70">Photos, elevated.</p>
                </div>
            </div>

            <div className="flex items-center gap-2 md:gap-3 bg-white px-3 py-1.5 rounded-full shadow-sm border border-gray-100">
                <span className="font-semibold text-sm pl-1 md:pl-2">{userName || "Guest"}</span>
                <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-[#dc2626] text-white flex items-center justify-center shadow-inner">
                    <User size={12} />
                </div>
            </div>
        </header>
    );
}