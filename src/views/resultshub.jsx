// FIX: Imported ArrowLeft
import React from 'react';
import { Share2, Download, Image as ImageIcon, FileText, RotateCcw, ArrowLeft } from 'lucide-react';

// FIX: Wired the onPrev prop
export default function ResultsHubView({ appUILanguage, mediaState, aiOutput, setAiOutput, onStartOver, onPrev }) {
    const isEN = appUILanguage === "EN";

    const exportedVisuals = [
        { id: 1, type: 'image', label: isEN ? 'Edited Photo 1' : 'Gambar 1', aspectRatio: 'aspect-square' },
        { id: 2, type: 'image', label: isEN ? 'Edited Photo 2' : 'Gambar 2', aspectRatio: 'aspect-square' },
        { id: 3, type: 'image', label: isEN ? 'Edited Photo 3' : 'Gambar 3', aspectRatio: 'aspect-square' },
        { id: 4, type: 'poster', label: isEN ? 'Promo Poster' : 'Poster Promo', aspectRatio: 'aspect-[9/16]' },
    ];

    const handleUpdate = (key, value) => setAiOutput(prev => ({ ...prev, [key]: value }));

    const handleCopyAndShare = () => {
        navigator.clipboard.writeText(`${aiOutput.title}\n\n${aiOutput.description}\n\n${aiOutput.caption}`);
        alert(isEN ? "Copied to clipboard! Opening Instagram..." : "Disalin ke papan keratan! Membuka Instagram...");
    };

    return (
        <div className="min-h-screen bg-amber-50 pb-40 text-gray-800 relative">

            {/* FIX: Added Header with Back Navigation to resolve the UI trap */}
            <header className="px-6 pt-6 relative flex items-center justify-center">
                <button onClick={onPrev} className="absolute left-6 p-3 bg-white rounded-full shadow-md text-gray-800 hover:bg-gray-100 transition-colors">
                    <ArrowLeft size={24} />
                </button>
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-gray-800">{isEN ? "Your Assets" : "Aset Anda"}</h1>
                </div>
            </header>

            <section className="px-6 pt-8 space-y-6 mb-10">
                <div className="flex flex-col gap-2">
                    <label className="text-2xl font-bold flex items-center gap-2 text-emerald-800">
                        <FileText size={20} /> {isEN ? "Generated Title" : "Tajuk Dijana"}
                    </label>
                    <textarea value={aiOutput.title} onChange={(e) => handleUpdate('title', e.target.value)} className="w-full bg-white rounded-lg shadow-md p-4 text-lg text-gray-900 resize-none outline-none" rows="2" />
                </div>

                <div className="flex flex-col gap-2">
                    <label className="text-2xl font-bold flex items-center gap-2 text-emerald-800">
                        <FileText size={20} /> {isEN ? "Appetizing Description" : "Penerangan Menyelerakan"}
                    </label>
                    <textarea value={aiOutput.description} onChange={(e) => handleUpdate('description', e.target.value)} className="w-full bg-white rounded-lg shadow-md p-4 text-lg text-gray-900 resize-none outline-none" rows="5" />
                </div>

                <div className="flex flex-col gap-2">
                    <label className="text-2xl font-bold flex items-center gap-2 text-emerald-800">
                        <Share2 size={20} /> {isEN ? "Social Media Caption" : "Kapsyen Media Sosial"}
                    </label>
                    <textarea value={aiOutput.caption} onChange={(e) => handleUpdate('caption', e.target.value)} className="w-full bg-white rounded-lg shadow-md p-4 text-lg text-gray-900 resize-none outline-none" rows="7" />
                </div>
            </section>

            <section className="mb-6">
                <div className="flex overflow-x-auto gap-4 px-6 pb-6 snap-x snap-mandatory [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                    {exportedVisuals.map((visual) => (
                        <div key={visual.id} className="snap-center shrink-0 w-64 bg-white rounded-2xl shadow-md p-3 flex flex-col gap-3">
                            <div className={`w-full ${visual.aspectRatio} bg-gray-200 rounded-2xl flex flex-col items-center justify-center text-gray-500 overflow-hidden relative`}>
                                {visual.type === 'image' && mediaState?.imagePreviewUrl ? (
                                    <>
                                        <img src={mediaState.imagePreviewUrl} alt="Edited preview" className="w-full h-full object-cover" />
                                        <div
                                            className="absolute inset-0 pointer-events-none"
                                            style={{
                                                backgroundColor: `rgba(255, 255, 255, ${(mediaState.brightness - 50) / 200})`,
                                                mixBlendMode: 'overlay',
                                                backdropFilter: `contrast(${mediaState.contrast / 50}) saturate(${mediaState.saturation / 50})`,
                                                WebkitBackdropFilter: `contrast(${mediaState.contrast / 50}) saturate(${mediaState.saturation / 50})`
                                            }}
                                        />
                                    </>
                                ) : (
                                    <>
                                        {visual.type === 'poster' ? <FileText size={48} /> : <ImageIcon size={48} />}
                                    </>
                                )}
                            </div>
                            <span className="mt-2 text-lg font-bold text-center">{visual.label}</span>

                            <button className="w-full flex items-center justify-center gap-2 bg-white text-emerald-700 text-lg py-3 rounded-lg shadow-md font-bold mt-auto">
                                <Download size={18} /> {isEN ? "Save Image" : "Simpan Gambar"}
                            </button>
                        </div>
                    ))}
                </div>
            </section>

            <div className="fixed bottom-0 left-0 right-0 p-4 bg-amber-50/95 backdrop-blur-sm border-t border-amber-200 space-y-3 z-50">
                <button onClick={handleCopyAndShare} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xl font-bold py-4 rounded-xl shadow-md flex items-center justify-center gap-3 transition-transform active:scale-95">
                    <Share2 size={24} /> {isEN ? "Copy Text & Open Instagram" : "Salin Teks & Buka Instagram"}
                </button>
                <button onClick={onStartOver} className="w-full bg-white text-emerald-700 hover:bg-gray-50 text-lg font-bold py-3 rounded-xl shadow-sm flex items-center justify-center gap-2 transition-colors">
                    <RotateCcw size={20} /> {isEN ? "Start New Project" : "Mula Projek Baru"}
                </button>
            </div>
        </div>
    );
}