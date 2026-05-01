import React, { useState, useCallback, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

import DashboardView from './views/dashboard';
import MediaEditorView from './views/mediaeditor';
import ContextConfigurationView from './views/contextconfiguration';
import ProcessingScreen from './views/processingscreen';
import ResultsHubView from './views/resultshub';

const DEFAULT_MEDIA_STATE = {
  file: null,
  url: null,
  brightness: 50,
  contrast: 50,
  saturation: 50,
  isEnhanced: false

}

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
  const prevStep = useCallback(() => setCurrentStep((prev) => Math.max(prev - 1, 1)), []);

  const cleanupUrls = useCallback((images) => {
    images.forEach(img => {
      if (img.url) URL.revokeObjectURL(img.url);
    });
  }, []);

  const handleImageSelect = useCallback((file, previewUrl) => {
    setMediaState(prev => ({
      ...prev,          // Keeps your default brightness, contrast, etc.
      file: file,       // Overwrites the null file with the new file
      url: previewUrl   // Overwrites the null url with the new preview URL
    }));
  }, []);

  const handleImageRemove = useCallback(() => {
    setMediaState(prev => {
      if (prev.url) {
        URL.revokeObjectURL(prev.url);
      }
      return DEFAULT_MEDIA_STATE;
    });
  }, []);

  const handleProceedToEditor = useCallback(() => {
    setMediaState(prev => {
      const firstFilledIndex = prev.images.findIndex(img => img.file !== null);
      return { ...prev, selectedSlot: firstFilledIndex !== -1 ? firstFilledIndex : 0 };
    });
    nextStep();
  }, [nextStep]);

  const handleStartOver = useCallback(() => {
    setMediaState(prev => {
      cleanupUrls(prev.images);
      return DEFAULT_MEDIA_STATE;
    });
    setMarketingConfig(DEFAULT_MARKETING_CONFIG);
    setAiOutput(DEFAULT_AI_OUTPUT);
    setCurrentStep(1);
  }, [cleanupUrls]);

  // REFACTORED: Safe memory leak prevention without destroying active state
  const activeUrls = useRef([]);
  useEffect(() => {
    // Silently update the ref tracking active URLs whenever state changes
    activeUrls.current = mediaState.images.map(img => img.url).filter(Boolean);
  }, [mediaState.images]);

  useEffect(() => {
    // Only fire revocation on hard unmount
    return () => {
      activeUrls.current.forEach(url => URL.revokeObjectURL(url));
    };
  }, []);

  const renderView = () => {
    switch (currentStep) {
      case 1:
        return <DashboardView appUILanguage={appUILanguage} setAppUILanguage={setAppUILanguage} onImageSelect={handleImageSelect} onImageRemove={handleImageRemove} mediaState={mediaState} onNext={handleProceedToEditor} />;
      case 2:
        return <MediaEditorView appUILanguage={appUILanguage} mediaState={mediaState} setMediaState={setMediaState} onNext={nextStep} onPrev={prevStep} />;
      case 3:
        return <ContextConfigurationView appUILanguage={appUILanguage} config={marketingConfig} setConfig={setMarketingConfig} onNext={nextStep} onPrev={prevStep} />;
      case 4:
        return <ProcessingScreen appUILanguage={appUILanguage} onComplete={nextStep} />;
      case 5:
        return <ResultsHubView appUILanguage={appUILanguage} mediaState={mediaState} aiOutput={aiOutput} setAiOutput={setAiOutput} onStartOver={handleStartOver} onPrev={prevStep} />;
      default:
        return <DashboardView appUILanguage={appUILanguage} setAppUILanguage={setAppUILanguage} onImageSelect={handleImageSelect} onImageRemove={handleImageRemove} mediaState={mediaState} onNext={handleProceedToEditor} />;
    }
  };

  return (
    <div className="w-full min-h-screen bg-gray-900 overflow-hidden relative">
      <AnimatePresence mode="wait">
        <motion.div key={currentStep} initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} transition={{ duration: 0.3, ease: "easeInOut" }} className="absolute inset-0 w-full h-full">
          {renderView()}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}