import React, { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import snapitLogo from '../assets/snapit-logo.png';

export default function WelcomeScreen({ onStart }) {
    const [userName, setUserName] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (userName.trim()) {
            onStart(userName.trim());
        }
    };

    return (
        <section className="h-full flex items-center justify-center px-6 bg-[#fff8f6] text-[#1a0f0d] font-sans">
            <div className="w-full max-w-md text-center animate-fade-in">

                {/* Replaced Icon/Text with user's PNG Logo */}
                <div className="flex justify-center mb-8">
                    <img
                        src={snapitLogo}
                        alt="SnapIT Logo"
                        className="h-24 w-auto object-contain"
                    />
                </div>

                <p className="text-lg opacity-70 mb-2 font-medium">
                    Snap  .  Generate  .  Sell
                </p>
                <p className="text-sm opacity-60 mb-10">
                    Instant captions and posters for your food business
                </p>

                <form onSubmit={handleSubmit} className="mb-6">
                    <input
                        type="text"
                        maxLength="30"
                        placeholder="What's your name?"
                        value={userName}
                        onChange={(e) => setUserName(e.target.value)}
                        className="w-full px-6 py-4 rounded-2xl border border-gray-200 bg-white focus:outline-none focus:border-[#dc2626] focus:ring-1 focus:ring-[#dc2626] text-lg mb-4 font-serif transition-all"
                        autoComplete="off"
                        required
                    />
                    <button
                        type="submit"
                        disabled={!userName.trim()}
                        className="w-full px-6 py-4 rounded-2xl text-base font-semibold inline-flex items-center justify-center gap-2 bg-[#dc2626] text-white hover:brightness-90 hover:-translate-y-[1px] hover:shadow-[0_8px_20px_rgba(220,38,38,0.3)] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:transform-none disabled:hover:shadow-none"
                    >
                        Let's go <ArrowRight size={18} />
                    </button>
                </form>

                <p className="text-xs opacity-40">
                    No account needed · Everything stays private
                </p>
            </div>
        </section>
    );
}