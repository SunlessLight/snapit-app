import React from 'react';

import { Sparkles, DollarSign, ArrowLeft } from 'lucide-react';



const SegmentedControl = ({ options, selected, onChange }) => (

    <div className="flex w-full bg-amber-50 p-2 rounded-lg overflow-x-auto [&::-webkit-scrollbar]:hidden">

        {options.map((option) => (

            <button

                key={option} type="button" onClick={() => onChange(option)}

                className={`flex-1 min-w-[120px] whitespace-nowrap py-3 px-4 rounded-lg text-lg transition-all duration-300 ${selected === option ? "bg-emerald-600 text-white font-bold shadow-md" : "bg-transparent text-gray-600 font-medium hover:text-gray-900"}`}

            >

                {option}

            </button>

        ))}

    </div>

);



export default function ContextConfigurationView({ appUILanguage, config, setConfig, onNext, onPrev }) {

    const isEN = appUILanguage === "EN";



    const outputLanguageOptions = ["English", "Bahasa Melayu", "中文"];

    const toneOptions = ["Professional", "Casual Manglish", "Informal Malay", "MY English"];

    const posterStyleOptions = ["Professional", "Creative", "Bold Promo"];



    const handleUpdate = (key, value) => setConfig(prev => ({ ...prev, [key]: value }));



    return (

        <div className="min-h-screen bg-amber-50 p-4 flex flex-col">

            <header className="mb-6 mt-4 relative flex items-center justify-center">

                <button onClick={onPrev} className="absolute left-0 p-3 bg-white rounded-full shadow-md text-gray-800 hover:bg-gray-100 transition-colors">

                    <ArrowLeft size={24} />

                </button>

                <div className="text-center">

                    <h1 className="text-3xl font-bold text-gray-800">{isEN ? "Menu Details" : "Butiran Menu"}</h1>

                    <p className="text-lg text-gray-600 mt-1">{isEN ? "Configure your AI marketing copy" : "Tetapkan gaya pemasaran AI"}</p>

                </div>

            </header>



            <div className="flex-1 space-y-6 overflow-y-auto pb-32 [&::-webkit-scrollbar]:hidden">

                <div className="bg-white rounded-2xl shadow-md p-5">

                    <label className="block text-2xl font-bold text-gray-800 mb-4">{isEN ? "Price (RM)" : "Harga (RM)"}</label>

                    <div className="relative">

                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">

                            <DollarSign className="h-6 w-6 text-gray-500" />

                        </div>

                        <input type="number" placeholder="5.00" value={config.price} onChange={(e) => handleUpdate('price', e.target.value)} className="w-full pl-12 pr-4 py-4 bg-amber-50 text-gray-800 text-2xl rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600 transition-shadow" />

                    </div>

                </div>



                <div className="bg-white rounded-2xl shadow-md p-5">

                    <label className="block text-2xl font-bold text-gray-800 mb-4">{isEN ? "Output Language" : "Bahasa Output"}</label>

                    <SegmentedControl options={outputLanguageOptions} selected={config.outputLanguage} onChange={(val) => handleUpdate('outputLanguage', val)} />

                </div>



                <div className="bg-white rounded-2xl shadow-md p-5">

                    <label className="block text-2xl font-bold text-gray-800 mb-4">{isEN ? "Marketing Tone" : "Nada Pemasaran"}</label>

                    <SegmentedControl options={toneOptions} selected={config.tone} onChange={(val) => handleUpdate('tone', val)} />

                </div>



                <div className="bg-white rounded-2xl shadow-md p-5">

                    <label className="block text-2xl font-bold text-gray-800 mb-4">{isEN ? "Poster Style" : "Gaya Poster"}</label>

                    <SegmentedControl options={posterStyleOptions} selected={config.posterStyle} onChange={(val) => handleUpdate('posterStyle', val)} />

                </div>

            </div>



            <div className="fixed bottom-0 left-0 w-full p-4 bg-amber-50">

                <button onClick={onNext} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-2xl font-bold py-5 rounded-xl shadow-md flex items-center justify-center gap-3 transition-transform active:scale-95">

                    <Sparkles className="h-7 w-7" /> {isEN ? "Generate" : "Jana"}

                </button>

            </div>

        </div>

    );

}