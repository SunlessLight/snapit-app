import React from 'react';
import { Sparkles, ArrowLeft, Utensils, Tag, CheckCircle2, MessageSquare, Image as ImageIcon } from 'lucide-react';

// Custom Segmented Control for Language
const SegmentedControl = ({ options, selected, onChange }) => (
    <div className="flex w-full bg-gray-50/80 p-1.5 rounded-2xl border border-gray-100">
        {options.map((option) => {
            const isSelected = selected === option;
            return (
                <button
                    key={option}
                    type="button"
                    onClick={() => onChange(option)}
                    className={`flex-1 py-2.5 px-2 rounded-xl text-sm md:text-base transition-all duration-200 ease-in-out font-sans whitespace-nowrap
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

export default function ContextConfigurationView({ appUILanguage, config, setConfig, onNext, onPrev }) {
    const isEN = appUILanguage === "EN";

    // Options matching our new frictionless architecture
    const languageOptions = ["English", "Bahasa Melayu", "Local Style"];

    const backgroundOptions = [
        {
            id: 'kopitiam',
            label: isEN ? 'Kopitiam' : 'Kopitiam',
            desc: isEN ? 'Marble & local feel' : 'Meja marmar klasik',
            gradient: 'from-slate-100 to-gray-200',
            textColor: 'text-slate-700'
        },
        {
            id: 'cafe',
            label: isEN ? 'Modern Cafe' : 'Kafe Moden',
            desc: isEN ? 'Wood & bright light' : 'Kayu & cahaya terang',
            gradient: 'from-amber-50 to-orange-100',
            textColor: 'text-amber-800'
        },
        {
            id: 'street',
            label: isEN ? 'Street Food' : 'Pasar Malam',
            desc: isEN ? 'Dark with neon bokeh' : 'Gelap & lampu neon',
            gradient: 'from-gray-800 to-slate-900',
            textColor: 'text-white'
        },
        {
            id: 'premium',
            label: isEN ? 'Premium' : 'Premium',
            desc: isEN ? 'Black slate & moody' : 'Batu hitam eksklusif',
            gradient: 'from-zinc-900 to-black',
            textColor: 'text-zinc-200'
        }
    ];

    const handleUpdate = (key, value) => setConfig(prev => ({ ...prev, [key]: value }));

    // Strict Validation: Check if ALL fields have values
    const isReady =
        (config.dishName?.trim() !== "" && config.dishName !== undefined) &&
        (config.price?.trim() !== "" && config.price !== undefined) &&
        (config.outputLanguage !== "") &&
        (config.backgroundVibe !== "");

    return (
        <div className="h-[100dvh] bg-[#fff8f6] text-[#1a0f0d] font-sans flex flex-col overflow-hidden relative">

            {/* Header Area */}
            <header className="pt-6 pb-4 px-6 flex-shrink-0 flex items-center bg-[#fff8f6] z-10">
                <button
                    onClick={onPrev}
                    className="p-2.5 bg-white rounded-full shadow-sm border border-gray-100 text-gray-800 hover:text-[#dc2626] transition-colors active:scale-95"
                >
                    <ArrowLeft size={22} />
                </button>
                <div className="flex-1 text-center pr-10"> {/* pr-10 to offset the absolute back button visual weight */}
                    <h1 className="text-xl md:text-2xl font-serif font-extrabold text-gray-900">
                        {isEN ? "The Details" : "Butiran"}
                    </h1>
                    <p className="text-xs md:text-sm text-gray-500 mt-0.5">
                        {isEN ? "Tell us what you're selling" : "Beritahu kami apa yang anda jual"}
                    </p>
                </div>
            </header>

            {/* Scrollable Form Body */}
            <div className="flex-1 overflow-y-auto px-4 md:px-6 pb-32 [&::-webkit-scrollbar]:hidden scroll-smooth">
                <div className="max-w-xl mx-auto space-y-5 pt-2">

                    {/* Card 1: Dish & Price */}
                    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-5 md:p-6">
                        <div className="flex items-center gap-2 mb-4">
                            <Utensils className="w-5 h-5 text-[#dc2626]" />
                            <h2 className="font-serif font-bold text-lg">{isEN ? "What's the dish?" : "Nama Hidangan?"}</h2>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5 ml-1">
                                    {isEN ? "Dish Name" : "Nama Makanan"}
                                </label>
                                <input
                                    type="text"
                                    placeholder={isEN ? "e.g., Nasi Lemak Ayam Goreng" : "cth., Nasi Lemak Ayam Goreng"}
                                    value={config.dishName || ""}
                                    onChange={(e) => handleUpdate('dishName', e.target.value)}
                                    className="w-full px-4 py-3.5 bg-gray-50/50 border border-gray-200 text-gray-900 rounded-2xl focus:outline-none focus:border-[#dc2626] focus:ring-1 focus:ring-[#dc2626] transition-all font-medium"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5 ml-1">
                                    {isEN ? "Price" : "Harga"}
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <span className="font-bold text-gray-400">RM</span>
                                    </div>
                                    <input
                                        type="number"
                                        placeholder="12.00"
                                        value={config.price || ""}
                                        onChange={(e) => handleUpdate('price', e.target.value)}
                                        className="w-full pl-12 pr-4 py-3.5 bg-gray-50/50 border border-gray-200 text-gray-900 rounded-2xl focus:outline-none focus:border-[#dc2626] focus:ring-1 focus:ring-[#dc2626] transition-all font-medium text-lg"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Card 2: Language */}
                    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-5 md:p-6">
                        <div className="flex items-center gap-2 mb-4">
                            <MessageSquare className="w-5 h-5 text-[#dc2626]" />
                            <h2 className="font-serif font-bold text-lg">{isEN ? "Caption Language" : "Bahasa Kapsyen"}</h2>
                        </div>
                        <SegmentedControl
                            options={languageOptions}
                            selected={config.outputLanguage}
                            onChange={(val) => handleUpdate('outputLanguage', val)}
                        />
                    </div>

                    {/* Card 3: Background Vibe */}
                    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-5 md:p-6">
                        <div className="flex items-center gap-2 mb-4">
                            <ImageIcon className="w-5 h-5 text-[#dc2626]" />
                            <h2 className="font-serif font-bold text-lg">{isEN ? "Background Vibe" : "Suasana Latar"}</h2>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            {backgroundOptions.map((bg) => {
                                const isSelected = config.backgroundVibe === bg.id;
                                return (
                                    <button
                                        key={bg.id}
                                        type="button"
                                        onClick={() => handleUpdate('backgroundVibe', bg.id)}
                                        className={`relative overflow-hidden text-left p-4 rounded-2xl border-2 transition-all duration-200 flex flex-col h-28 outline-none
                                            ${isSelected
                                                ? 'border-[#dc2626] shadow-md scale-[0.98]'
                                                : 'border-transparent shadow-sm hover:shadow-md hover:scale-[1.02]'
                                            }
                                        `}
                                    >
                                        {/* CSS Gradient serving as visual context since we have no actual images yet */}
                                        <div className={`absolute inset-0 bg-gradient-to-br ${bg.gradient} opacity-90`} />

                                        <div className="relative z-10 flex-1">
                                            <span className={`block font-serif font-bold text-sm md:text-base leading-tight ${bg.textColor}`}>
                                                {bg.label}
                                            </span>
                                            <span className={`block text-[10px] md:text-xs mt-1 opacity-80 ${bg.textColor}`}>
                                                {bg.desc}
                                            </span>
                                        </div>

                                        {isSelected && (
                                            <div className="relative z-10 self-end mt-auto">
                                                <div className="bg-white rounded-full p-0.5 shadow-sm">
                                                    <CheckCircle2 className="w-4 h-4 text-[#dc2626]" />
                                                </div>
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                </div>
            </div>

            {/* Sticky Footer Area - With subtle gradient fade */}
            <div className="absolute bottom-0 left-0 w-full z-50 pt-8 pb-6 px-4 md:px-6 bg-gradient-to-t from-[#fff8f6] via-[#fff8f6] to-transparent pointer-events-none">
                <div className="max-w-xl mx-auto pointer-events-auto">
                    <button
                        onClick={onNext}
                        disabled={!isReady}
                        className={`w-full py-4 rounded-[20px] font-bold text-lg flex items-center justify-center gap-2 transition-all duration-300
                            ${isReady
                                ? "bg-[#dc2626] text-white shadow-[0_8px_20px_rgba(220,38,38,0.3)] hover:-translate-y-1 active:scale-95 cursor-pointer"
                                : "bg-gray-200 text-gray-400 cursor-not-allowed"
                            }
                        `}
                    >
                        <Sparkles className={`w-5 h-5 ${isReady ? "animate-pulse" : ""}`} />
                        {isEN ? "Generate Magic" : "Jana Magik"}
                    </button>
                </div>
            </div>

        </div>
    );
}