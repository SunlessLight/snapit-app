import React, { useState, useCallback, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

import WelcomeScreen from './views/welcomescreen'
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
};

const DEFAULT_MARKETING_CONFIG = { dishName: "", price: "", outputLanguage: "", backgroundVibe: "" };
const DEFAULT_AI_OUTPUT = {
  title: "🔥 Sedap Giler Nasi Lemak Ayam Goreng Berempah!",
  description: "Crispy on the outside, juicy on the inside! Our signature Nasi Lemak comes with freshly fried Ayam Berempah...",
  caption: "Craving something pedas and sedap? 🤤 Come try our crowd-favorite Nasi Lemak today!\n\n📍 Find us at Food Court Subang\n💵 Only RM 8.50!\n\n#NasiLemak"
};

export default function App() {
  const [currentStep, setCurrentStep] = useState(0);
  const [userName, setUserName] = useState(' ');
  const [appUILanguage, setAppUILanguage] = useState("EN");

  const [mediaState, setMediaState] = useState(DEFAULT_MEDIA_STATE);
  const [marketingConfig, setMarketingConfig] = useState(DEFAULT_MARKETING_CONFIG);
  const [aiOutput, setAiOutput] = useState(DEFAULT_AI_OUTPUT);

  const nextStep = useCallback(() => setCurrentStep((prev) => Math.min(prev + 1, 5)), []);
  const prevStep = useCallback(() => setCurrentStep((prev) => Math.max(prev - 1, 1)), []);

  const handleStart = useCallback((name) => {
    setUserName(name);
    setCurrentStep(1);
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

  const handleStartOver = useCallback(() => {
    setMediaState(prev => {
      // Direct cleanup of the single URL
      if (prev.url) URL.revokeObjectURL(prev.url);
      return DEFAULT_MEDIA_STATE;
    });
    setMarketingConfig(DEFAULT_MARKETING_CONFIG);
    setAiOutput(DEFAULT_AI_OUTPUT);
    setCurrentStep(1);
  }, []);

  const activeUrl = useRef(null);
  useEffect(() => {
    activeUrl.current = mediaState.url;
  }, [mediaState.url]);

  useEffect(() => {
    return () => {
      if (activeUrl.current) URL.revokeObjectURL(activeUrl.current);
    };
  }, []);

  const renderView = () => {
    switch (currentStep) {
      case 0:
        return <WelcomeScreen onStart={handleStart} />;

      case 1:
        // We can pass nextStep directly since we removed the array index wrapper
        return <DashboardView userName={userName} appUILanguage={appUILanguage} setAppUILanguage={setAppUILanguage} onImageSelect={handleImageSelect} onImageRemove={handleImageRemove} mediaState={mediaState} onNext={nextStep} />;
      case 2:
        return <MediaEditorView userName={userName} appUILanguage={appUILanguage} mediaState={mediaState} setMediaState={setMediaState} onNext={nextStep} onPrev={prevStep} />;
      case 3:
        return <ContextConfigurationView userName={userName} appUILanguage={appUILanguage} config={marketingConfig} setConfig={setMarketingConfig} onNext={nextStep} onPrev={prevStep} />;
      case 4:
        // Added the missing props so the component can read the form data
        return <ProcessingScreen userName={userName} appUILanguage={appUILanguage} mediaState={mediaState} marketingConfig={marketingConfig} setAiOutput={setAiOutput} onComplete={nextStep} onPrev={prevStep} />;
      case 5:
        return <ResultsHubView userName={userName} appUILanguage={appUILanguage} mediaState={mediaState} aiOutput={aiOutput} setAiOutput={setAiOutput} onStartOver={handleStartOver} onPrev={prevStep} />;
      default:
        return <DashboardView userName={userName} appUILanguage={appUILanguage} setAppUILanguage={setAppUILanguage} onImageSelect={handleImageSelect} onImageRemove={handleImageRemove} mediaState={mediaState} onNext={nextStep} />;
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