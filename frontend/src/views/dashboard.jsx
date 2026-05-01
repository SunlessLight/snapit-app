import React, { useRef, useState } from 'react';
import heic2any from 'heic2any';
import { Camera, Image as ImageIcon, ArrowRight, X, Loader2 } from 'lucide-react';
import { PRO_TIPS } from '../constants';
import snapitLogo from '../assets/snapit-logo.png';

export default function DashboardView({ appUILanguage, setAppUILanguage, onImageSelect, onImageRemove, mediaState, onNext }) {
    const [isProcessing, setIsProcessing] = useState(false);
    const fileInputRef = useRef(null);
    const cameraInputRef = useRef(null);
    const isEN = appUILanguage === "EN";
    const hasImage = mediaState.file !== null;
    const canProceed = hasImage;

    const toggleLanguage = () => setAppUILanguage((prev) => (prev === "EN" ? "MS" : "EN"));

    async function handleFileChange(event) {
        const selectedFile = event.target.files[0];
        if (!selectedFile) return;

        setIsProcessing(true);
        const startTime = performance.now();

        let finalProcessedFile = selectedFile;
        const isHeic = selectedFile.type === 'image/heic' || selectedFile.name.toLowerCase().endsWith('.heic');

        try {
            if (isHeic) {

                console.log("HEIC detected. Converting to JPEG...");
                const promisejpeg = await heic2any({ blob: selectedFile, toType: "image/jpeg" })

                const finalBlob = Array.isArray(promisejpeg) ? promisejpeg[0] : promisejpeg

                finalProcessedFile = new File(
                    [finalBlob],
                    selectedFile.name.replace(/\.heic$/i, '.jpeg'),
                    { type: 'image/jpeg' }
                );
            }

            const url = URL.createObjectURL(finalProcessedFile);
            onImageSelect(finalProcessedFile, url);

            const endTime = performance.now();
            console.log(`File processed in ${(endTime - startTime).toFixed(2)} ms`);
        } catch (error) {
            console.error("File processing Failed:", error);
            alert(isEN ? "Failed to process image." : "Gagal memproses gambar.");
        } finally {
            setIsProcessing(false); // Stop loading regardless of success/fail
            event.target.value = null;
        }
    };

    return (
        <div className="min-h-screen bg-amber-50 flex flex-col p-6 text-gray-800">
            <header className="flex justify-between items-center mb-6 w-full relative">
                <div className="w-16"></div>
                <div className="flex-1 flex justify-center">
                    <img src={snapitLogo} alt="SnapIT Logo" className="object-contain" />
                </div>
                <button onClick={toggleLanguage} className="w-16 h-12 bg-white rounded-xl shadow-md flex items-center justify-center text-lg font-bold hover:bg-gray-50 transition-colors">
                    {appUILanguage}
                </button>
            </header>

            <section className="flex-1 flex flex-col justify-center mb-6 overflow-hidden">
                <div className="flex justify-between items-end mb-4 px-2">
                    <h2 className="text-3xl font-bold">{isEN ? "Pro Tips" : "Tips Pro"}</h2>
                </div>

                <div className="flex overflow-x-auto snap-x snap-mandatory gap-4 pb-6 pt-2 px-2 -mx-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                    {PRO_TIPS.map((tip) => {
                        const Icon = tip.icon;
                        return (
                            <div key={tip.id} className="snap-center shrink-0 w-64 aspect-square bg-white rounded-2xl shadow-md p-6 flex flex-col items-center justify-center text-center gap-4">
                                <Icon className="w-8 h-8 text-orange-500" strokeWidth={2.5} />
                                <p className="text-lg font-semibold leading-snug">{isEN ? tip.textEN : tip.textMS}</p>
                            </div>
                        );
                    })}
                </div>
            </section>

            {/* REFACTORED: Image Management UI */}
            <div className="mb-6 flex gap-3 justify-center">
                <div className="w-48 h-48 bg-gray-200 rounded-xl relative shadow-inner overflow-hidden flex items-center justify-center">
                    {isProcessing ? (
                        <div className="flex flex-col items-center justify-center text-emerald-600 gap-2">
                            <Loader2 className="w-10 h-10 animate-spin" />
                            <span className="text-sm font-semibold animate-pulse">
                                {isEN ? "Converting..." : "Memproses..."}
                            </span>
                        </div>
                    ) : mediaState.url ? (
                        <>
                            <img src={mediaState.url} alt="Uploaded" className="w-full h-full object-cover" />
                            <button
                                onClick={onImageRemove}
                                className="absolute top-2 right-2 bg-red-500/80 text-white rounded-full p-2 hover:bg-red-600 transition-colors"
                            >
                                <X size={20} strokeWidth={3} />
                            </button>
                        </>
                    ) : (
                        <span className="text-gray-400 font-bold">{isEN ? "No Image" : "Tiada Gambar!"}</span>
                    )}
                </div>
            </div>

            <div className="text-center font-semibold text-gray-600 mb-4">
                {hasImage ? "1/1" : "0/1"} {isEN ? "Images Uploaded" : "Gambar Dimuat Naik"}
            </div>

            <section className="flex gap-4 pb-4">
                <input type="file" accept="image/*" capture="environment" ref={cameraInputRef} onChange={handleFileChange} className="hidden" />
                <button
                    onClick={() => cameraInputRef.current.click()}
                    disabled={hasImage || isProcessing}
                    className={`flex-1 bg-white hover:bg-gray-50 rounded-xl shadow-md py-8 flex flex-col items-center justify-center gap-3 transition-colors active:scale-95 ${(hasImage || isProcessing) ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                    <Camera className="w-10 h-10" />
                    <span className="text-lg font-bold">{isEN ? "Take Photo" : "Ambil Gambar"}</span>
                </button>

                <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
                <button
                    onClick={() => fileInputRef.current.click()}
                    disabled={hasImage || isProcessing}
                    className={`flex-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md py-8 flex flex-col items-center justify-center gap-3 transition-colors active:scale-95 ${(hasImage || isProcessing) ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                    <ImageIcon className="w-10 h-10" />
                    <span className="text-lg font-bold">{isEN ? "Upload Gallery" : "Muat Naik"}</span>
                </button>
            </section>

            {canProceed && (
                <button onClick={onNext} className="w-full mt-2 bg-orange-500 hover:bg-orange-600 text-white text-xl font-bold py-4 rounded-xl shadow-md transition-colors flex items-center justify-center gap-2 animate-in fade-in slide-in-from-bottom-4">
                    {isEN ? "Proceed to Editor" : "Teruskan ke Editor"} <ArrowRight className="w-6 h-6" />
                </button>
            )}
        </div>
    );
};