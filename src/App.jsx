import React, { useState, useCallback, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

import WelcomeScreen from './views/welcomescreen'
import DashboardView from './views/dashboard';
import MediaEditorView from './views/mediaeditor';
import ContextConfigurationView from './views/contextconfiguration';
import ProcessingScreen from './views/processingscreen';
import ResultsHubView from './views/resultshub';
import foodImage from './assets/food_image.webp';
import snapitLogo from './assets/snapit-logo.png';
import Header from './views/header';
import DynamicTimeline from './views/dynamictimeline';

const DEFAULT_MEDIA_STATE = {
  file: null,
  url: foodImage,
  brightness: 50,
  contrast: 50,
  saturation: 50,
  isEnhanced: false,
  processedFile: null,
  processedUrl: null,
};
// const DEFAULT_MARKETING_CONFIG = { dishName: "Nasi Lemak", price: "RM 12", outputLanguage: "english", backgroundVibe: "Premium" };
const DEFAULT_MARKETING_CONFIG = { dishName: "", price: "", outputLanguage: "", backgroundVibe: "" };
const DEFAULT_AI_OUTPUT = {
  title: "🔥 Sedap Giler Nasi Lemak Ayam Goreng Berempah!",
  description: "Crispy on the outside, juicy on the inside! Our signature Nasi Lemak comes with freshly fried Ayam Berempah, fragrant coconut rice, and our secret recipe sambal that hits all the right notes.",
  caption: "Craving something pedas and sedap? 🤤 Come try our crowd-favorite Nasi Lemak today!\n\n📍 Find us at Food Court Subang\n💵 Only RM 12.00!\n\n#NasiLemak #MalaysianFood #SedapGiler",
  generatedImageBase64: null, // Leave null so our fallback triggers
  // Dummy AI-enhanced image (e.g., a beautifully lit version)
  imageUrl: foodImage
};

export default function App() {
  const [currentStep, setCurrentStep] = useState(0);
  const [userName, setUserName] = useState(' ');
  const [appUILanguage, setAppUILanguage] = useState("EN");

  const [mediaState, setMediaState] = useState(DEFAULT_MEDIA_STATE);
  const [marketingConfig, setMarketingConfig] = useState(DEFAULT_MARKETING_CONFIG);
  const [aiOutput, setAiOutput] = useState(DEFAULT_AI_OUTPUT);
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const lastScrollY = useRef(0);
  const isProcessingScreen = currentStep === 4;

  const nextStep = useCallback(() => setCurrentStep((prev) => Math.min(prev + 1, 5)), []);
  const prevStep = useCallback(() => setCurrentStep((prev) => Math.max(prev - 1, 1)), []);

  const handleStart = useCallback((name) => {
    setUserName(name);
    setCurrentStep(1);
  }, []);

  const handleImageSelect = useCallback((file, previewUrl) => {
    setMediaState(prev => {
      if (prev.processedUrl) URL.revokeObjectURL(prev.processedUrl);
      return {
        ...prev,
        file: file,
        url: previewUrl,
        processedFile: null,
        processedUrl: null
      }
    });
  }, []);

  const handleImageRemove = useCallback(() => {
    setMediaState(prev => {
      if (prev.url) URL.revokeObjectURL(prev.url);
      if (prev.processedUrl) URL.revokeObjectURL(prev.processedUrl);
      return DEFAULT_MEDIA_STATE;
    });
  }, []);

  const handleStartOver = useCallback(() => {
    setMediaState(prev => {
      if (prev.url) URL.revokeObjectURL(prev.url);
      if (prev.processedUrl) URL.revokeObjectURL(prev.processedUrl);
      return DEFAULT_MEDIA_STATE;
    });
    setMarketingConfig(DEFAULT_MARKETING_CONFIG);
    setAiOutput(DEFAULT_AI_OUTPUT);
    setCurrentStep(1);
  }, []);

  const activeUrls = useRef({ url: null, processedUrl: null });

  useEffect(() => {
    activeUrls.current = {
      url: mediaState.url,
      processedUrl: mediaState.processedUrl
    };
  }, [mediaState.url, mediaState.processedUrl]);

  useEffect(() => {
    return () => {
      // Cleanup both URLs when the App unmounts
      if (activeUrls.current.url) URL.revokeObjectURL(activeUrls.current.url);
      if (activeUrls.current.processedUrl) URL.revokeObjectURL(activeUrls.current.processedUrl);
    };
  }, []);

  // NEW: The Scroll Detector
  const handleScroll = (e) => {
    const currentScrollY = e.target.scrollTop;

    // Only trigger if scrolled more than 10px to avoid jitter/bouncing
    if (currentScrollY > lastScrollY.current + 10) {
      setIsHeaderVisible(false); // Scrolling down -> Hide
    } else if (currentScrollY < lastScrollY.current - 10) {
      setIsHeaderVisible(true);  // Scrolling up -> Show
    }

    lastScrollY.current = currentScrollY;
  };

  // Reset scroll state whenever the user moves to a new step
  useEffect(() => {
    setIsHeaderVisible(true);
    lastScrollY.current = 0;
  }, [currentStep]);

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
        return <ContextConfigurationView userName={userName} appUILanguage={appUILanguage} mediaState={mediaState} setMediaState={setMediaState} config={marketingConfig} setConfig={setMarketingConfig} onNext={nextStep} onPrev={prevStep} />;
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
    <div className="w-full h-[100dvh] bg-[#fff8f6] overflow-hidden relative">

      {/* Floating Global Header wrapper */}
      <div
        className={`absolute top-0 left-0 w-full z-50 transition-transform duration-500 ease-in-out pointer-events-none ${isHeaderVisible ? 'translate-y-0' : '-translate-y-full'
          }`}
      >
        {currentStep > 0 && (
          <div className="pointer-events-auto"> {/* Slight bottom padding so the shadow breathes */}
            <Header snapitLogo={snapitLogo} userName={userName} />
            <DynamicTimeline currentStep={currentStep} isEN={appUILanguage === "EN"} />
          </div>
        )}
      </div>

      {/* The Single Source of Truth for Scrolling */}
      <div className="absolute inset-0 w-full h-full">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            onScroll={handleScroll} // <-- Attach scroll listener here
            className={`w-full h-full pb-safe transition-[padding] duration-300 ${isProcessingScreen
              ? 'overflow-hidden pt-0' // Processing Screen: Locks scroll, scales to 100vh, slides under header
              : 'overflow-y-auto pt-[130px]' // Normal Screens: Scrollable, padded down
              }`}
          >
            {renderView()}
          </motion.div>
        </AnimatePresence>
      </div>

    </div>
  );
}