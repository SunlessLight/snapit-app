import React from 'react';
import { User } from 'lucide-react';
import LanguageToggle from './languagetoggle'

export default function Header({ snapitLogo, userName, appUILanguage, setAppUILanguage }) {
    return (
        <header className="flex items-center justify-between px-4 py-2 md:mb-8 flex-shrink-0">
            <div className="flex items-center gap-2 md:gap-3">
                <img src={snapitLogo} alt="SnapIT" className="w-24 h-12 md:w-24 md:h-24 object-contain" />
                <div className="hidden sm:block">
                    <p className="font-serif text-sm opacity-70">Photos, elevated.</p>
                </div>
            </div>

            <div className="flex items-center gap-4">
                <LanguageToggle
                    appUILanguage={appUILanguage}
                    setAppUILanguage={setAppUILanguage} />

                <div className="flex items-center gap-2 md:gap-3 bg-white px-3 py-1.5 rounded-full shadow-sm border border-gray-100">
                    <span className="font-semibold text-sm pl-1 md:pl-2">{userName || "Guest"}</span>
                    <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-[#dc2626] text-white flex items-center justify-center shadow-inner">
                        <User size={12} />
                    </div>
                </div>
            </div>
        </header>
    );
}