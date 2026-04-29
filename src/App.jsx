import React, { useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

import DashboardView from './views/dashboard';
import MediaEditorView from './views/mediaeditor';
import ContextConfigurationView from './views/contextconfiguration';
import ProcessingScreen from './views/processingscreen';
import ResultsHubView from './views/resultshub';

const DEFAULT_MEDIA_STATE = { imageFile: null, imagePreviewUrl: null, selectedSlot: 0, brightness: 50, contrast: 50, saturation: 50, isEnhanced: false };
const DEFAULT_MARKETING_CONFIG = { price: "", outputLanguage: "Bahasa Melayu", tone: "Casual Manglish", posterStyle: "Bold Promo" };
const DEFAULT_AI_OUTPUT = {
  title: "🔥 Sedap Giler Nasi Lemak Ayam Goreng Berempah!",
  description: "Crispy on the outside, juicy on the inside! Our signature Nasi Lemak comes with freshly fried Ayam Berempah...",
  caption: "Craving something pedas and sedap? 🤤 Come try our crowd-favorite Nasi Lemak today!\n\n📍 Find us at Food Court Subang\n💵 Only RM 8.50!\n\n#NasiLemak"
};

export default function App() {
  const [currentStep, setCurrentStep] = useState(1);
  const [appUILanguage, setAppUILanguage] = useState("EN");

  const [mediaState, setMediaState] = useState(DEFAULT_MEDIA_STATE);
  const [marketingConfig, setMarketingConfig] = useState(DEFAULT_MARKETING_CONFIG);
  const [aiOutput, setAiOutput] = useState(DEFAULT_AI_OUTPUT);

  const nextStep = useCallback(() => setCurrentStep((prev) => Math.min(prev + 1, 5)), []);

  const prevStep = useCallback(() => {
    // FIX: Removed the hard reset of DEFAULT_MEDIA_STATE to prevent aggressive state wiping when going back
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  }, []);

  const handleImageSelect = useCallback((file, previewUrl) => {
    setMediaState(prev => ({ ...prev, imageFile: file, imagePreviewUrl: previewUrl }));
    nextStep();
  }, [nextStep]);

  const handleStartOver = useCallback(() => {
    setMediaState(DEFAULT_MEDIA_STATE);
    setMarketingConfig(DEFAULT_MARKETING_CONFIG);
    setAiOutput(DEFAULT_AI_OUTPUT);
    setCurrentStep(1);
  }, []);

  const renderView = () => {
    switch (currentStep) {
      case 1:
        return <DashboardView appUILanguage={appUILanguage} setAppUILanguage={setAppUILanguage} onImageSelect={handleImageSelect} />;
      case 2:
        return <MediaEditorView appUILanguage={appUILanguage} mediaState={mediaState} setMediaState={setMediaState} onNext={nextStep} onPrev={prevStep} />;
      case 3:
        return <ContextConfigurationView appUILanguage={appUILanguage} config={marketingConfig} setConfig={setMarketingConfig} onNext={nextStep} onPrev={prevStep} />;
      case 4:
        return <ProcessingScreen appUILanguage={appUILanguage} onComplete={nextStep} />;
      case 5:
        // FIX: Passed onPrev down to View 5 to resolve the dead end
        return <ResultsHubView appUILanguage={appUILanguage} mediaState={mediaState} aiOutput={aiOutput} setAiOutput={setAiOutput} onStartOver={handleStartOver} onPrev={prevStep} />;
      default:
        return <DashboardView appUILanguage={appUILanguage} setAppUILanguage={setAppUILanguage} onImageSelect={handleImageSelect} />;
    }
  };

  return (
    <div className="w-full min-h-screen bg-gray-900 overflow-hidden relative">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          className="absolute inset-0 w-full h-full"
        >
          {renderView()}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}