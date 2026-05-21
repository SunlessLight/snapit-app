import React from 'react';
import { motion } from 'framer-motion';
import snapitLogo from '../assets/snapit-logo.png';

export default function WelcomeScreen({ onLogin, onSignUp }) {

    return (
        <section className="h-full flex items-center justify-center px-6 bg-[#fff8f6] text-[#1a0f0d] font-sans">
            <div className="w-full max-w-md text-center">
                {/* Logo */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="flex justify-center mb-8"
                >
                    <img
                        src={snapitLogo}
                        alt="SnapIT Logo"
                        className="h-24 w-auto object-contain"
                    />
                </motion.div>

                {/* Tagline */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                >
                    <p className="text-lg opacity-70 mb-2 font-medium">
                        Snap  .  Generate  .  Sell
                    </p>
                    <p className="text-sm opacity-60 mb-10">
                        Instant captions and posters for your food business
                    </p>
                </motion.div>

                {/* Buttons */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    className="space-y-3 mb-6"
                >
                    <button
                        onClick={onSignUp}
                        className="w-full px-6 py-3.5 rounded-2xl text-base font-semibold bg-[#dc2626] text-white hover:brightness-90 transition-all hover:-translate-y-[1px] hover:shadow-[0_8px_20px_rgba(220,38,38,0.3)]"
                    >
                        Sign Up
                    </button>
                    <button
                        onClick={onLogin}
                        className="w-full px-6 py-3.5 rounded-2xl text-base font-semibold bg-white text-[#dc2626] border border-gray-200 hover:bg-gray-50 transition-all hover:-translate-y-[1px]"
                    >
                        Login
                    </button>
                </motion.div>

                <p className="text-xs opacity-40">
                    Secure authentication · Your data stays private
                </p>
            </div>
        </section>
    );
}