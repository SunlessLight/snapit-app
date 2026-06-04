import React from 'react';
import { User, Coins } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import LanguageToggle from './languagetoggle'

export default function Header({ snapitLogo, userName, credits, appUILanguage, setAppUILanguage }) {
    const { t } = useTranslation(['header', 'common']);
    // Only render the pill once we have a real number (null = not yet fetched).
    const showCredits = typeof credits === 'number';
    const isLow = showCredits && credits <= 3;
    return (
        <header className="flex items-center justify-between px-4 py-4 flex-shrink-0">
            <div className="flex items-center gap-2 md:gap-3">
                <img src={snapitLogo} alt="SnapIT" className="w-24 h-12 md:w-24 md:h-12 object-contain" />
                <div className="hidden sm:block">
                    <p className="font-serif text-sm opacity-70">{t('header:tagline')}</p>
                </div>
            </div>

            <div className="flex items-center gap-3 md:gap-4">
                {showCredits && (
                    <div
                        title={t('common:credits.tooltip')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full shadow-sm border text-sm font-bold ${isLow
                            ? 'bg-red-50 border-red-100 text-[#dc2626]'
                            : 'bg-white border-gray-100 text-gray-700'
                            }`}
                    >
                        <Coins size={14} className={isLow ? 'text-[#dc2626]' : 'text-[#dc2626]'} />
                        <span>{credits}</span>
                    </div>
                )}
                <LanguageToggle
                    appUILanguage={appUILanguage}
                    setAppUILanguage={setAppUILanguage} />

                <div className="flex items-center gap-2 md:gap-3 bg-white px-3 py-1.5 rounded-full shadow-sm border border-gray-100">
                    <span className="font-semibold text-sm pl-1 md:pl-2">{userName || t('common:guest')}</span>
                    <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-[#dc2626] text-white flex items-center justify-center shadow-inner">
                        <User size={12} />
                    </div>
                </div>
            </div>
        </header>
    );
}
