import React, { useRef } from 'react';
import { Camera, Image as ImageIcon } from 'lucide-react';
// FIX: Using standardized lowercase import to prevent OS case-sensitivity breaks
import { PRO_TIPS } from '../constants';
import snapitLogo from '../assets/snapit-logo.png'

export default function DashboardView({ appUILanguage, setAppUILanguage, onImageSelect }) {
    const fileInputRef = useRef(null);
    const cameraInputRef = useRef(null);
    const isEN = appUILanguage === "EN";

    const toggleLanguage = () => setAppUILanguage((prev) => (prev === "EN" ? "MS" : "EN"));

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const url = URL.createObjectURL(file);
            onImageSelect(file, url);
        }
    };

    return (
        <div className="min-h-screen bg-amber-50 flex flex-col p-6 text-gray-800">
            <header className="flex justify-between items-center mb-10 w-full relative">
                <div className="w-16"></div>
                <div className="flex-1 flex justify-center">
                    <img src={snapitLogo} alt="SnapIT Logo" className="object-contain" />
                </div>
                <button onClick={toggleLanguage} className="w-16 h-12 bg-white rounded-xl shadow-md flex items-center justify-center text-lg font-bold hover:bg-gray-50 transition-colors">
                    {appUILanguage}
                </button>
            </header>

            <section className="flex-1 flex flex-col justify-center mb-10 overflow-hidden">
                <div className="flex justify-between items-end mb-4 px-2">
                    <h2 className="text-3xl font-bold">{isEN ? "Pro Tips" : "Tips Pro"}</h2>
                    <span className="text-sm font-medium">Swipe 👉</span>
                </div>

                <div className="flex overflow-x-auto snap-x snap-mandatory gap-4 pb-6 pt-2 px-2 -mx-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                    {PRO_TIPS.map((tip) => {
                        const Icon = tip.icon;
                        return (
                            <div key={tip.id} className="snap-center shrink-0 w-64 aspect-square bg-white rounded-2xl shadow-md p-6 flex flex-col items-center justify-center text-center gap-4">
                                <Icon className="w-8 h-8 text-orange-500" strokeWidth={2.5} />
                                {/* FIX: Applied proper localization to map to the updated constants object */}
                                <p className="text-lg font-semibold leading-snug">{isEN ? tip.textEN : tip.textMS}</p>
                            </div>
                        );
                    })}
                </div>
            </section>

            <section className="flex gap-4 mt-auto pb-4">
                <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    ref={cameraInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                />
                <button onClick={() => cameraInputRef.current.click()} className="...">
                    <Camera className="w-10 h-10" />
                    <span className="text-lg font-bold">{isEN ? "Take Photo" : "Ambil Gambar"}</span>
                </button>

                <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
                <button onClick={() => fileInputRef.current.click()} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md py-8 flex flex-col items-center justify-center gap-3 transition-colors active:scale-95">
                    <ImageIcon className="w-10 h-10" />
                    <span className="text-lg font-bold">{isEN ? "Upload Gallery" : "Muat Naik"}</span>
                </button>
            </section>
        </div>
    );
}