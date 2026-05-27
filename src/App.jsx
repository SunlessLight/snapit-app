import React, { useState, useCallback, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

import WelcomeScreen from './views/welcomescreen'
import DashboardView from './views/dashboard';
import MediaEditorView from './views/mediaeditor';
import ContextConfigurationView from './views/contextconfiguration';
import ProcessingScreen from './views/processingscreen';
import ReviewScreen from './views/reviewscreen';
import ResultsHubView from './views/resultshub';
import LoginScreen from './views/loginscreen';
import foodImage from './assets/food_image.webp';
import snapitLogo from './assets/snapit-logo.png';
import Header from './views/header';
import DynamicTimeline from './views/dynamictimeline';
import { authService } from './services/authService';
import i18n from './i18n';

const UI_LANGUAGE_STORAGE_KEY = 'snapit:uiLanguage';
const SUPPORTED_UI_LANGUAGES = ['EN', 'ZH', 'MS'];

const loadInitialUILanguage = () => {
  try {
    const stored = localStorage.getItem(UI_LANGUAGE_STORAGE_KEY);
    if (stored && SUPPORTED_UI_LANGUAGES.includes(stored)) return stored;
  } catch { /* storage disabled */ }
  return 'EN';
};

const DEFAULT_MEDIA_STATE = {
  file: null,
  url: foodImage,
  brightness: 50,
  contrast: 50,
  saturation: 50,
  isMediaEditorPro: false,
  hue: 50,
  blur: 0,
  sharpness: 0,
  vignette: 0,
  isEnhanced: false,
  processedFile: null,
  processedUrl: null,
  // Phase 6: untouched upload + crop region tracking. Claid enhance always operates
  // on originalFile; compositeCropRect (natural pixels of originalFile) is re-applied
  // to Claid's response so prior crops survive an enhance.
  originalFile: null,
  originalUrl: null,
  compositeCropRect: null,
  // Pre-enhance blob/url for the "second click reverts" UX. Stripped from persistence.
  preEnhanceFile: null,
  preEnhanceUrl: null,
};
// const DEFAULT_MARKETING_CONFIG = { dishName: "Nasi Lemak", price: "RM 12", outputLanguage: "english", backgroundVibe: "Premium" };
const DEFAULT_MARKETING_CONFIG = {
  dishName: "",
  price: "",
  outputLanguage: "",
  backgroundVibe: "",
  generateBackground: true,
  isContextPro: false,
  description: "",
  tone: "casual",
  captionLength: "short",
  backgroundDescription: "",
  // Assistive mode: Pro users land on Review (step 5) instead of skipping to Results
  // Hub (step 6). Defaults true so first-time Pro users get the in-loop experience;
  // they can opt out via the toggle in Context Config and that choice persists.
  assistiveMode: true,
};

const ALLOWED_TONES = new Set(['casual', 'punchy', 'polished', 'playful']);
const ALLOWED_LENGTHS = new Set(['short', 'medium', 'long']);

const MEDIA_STATE_STORAGE_KEY = 'snapit:mediaState';
const MARKETING_CONFIG_STORAGE_KEY = 'snapit:marketingConfig';

// Strip non-serializable fields (File objects, blob: URLs) before persisting.
// compositeCropRect is a plain object and persists fine; isEnhanced is dropped because
// the Blob it points at can't survive a reload — restoring isEnhanced=true without the
// pre-enhance blob would leave the UI in a half-state where revert silently does nothing.
const pickSerializableMediaState = (state) => {
  const {
    file, processedFile, url, processedUrl,
    originalFile, originalUrl, preEnhanceFile, preEnhanceUrl, isEnhanced,
    ...rest
  } = state;
  return {
    ...rest,
    url: typeof url === 'string' && !url.startsWith('blob:') ? url : null,
  };
};

const loadFromStorage = (key, defaults) => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw);
    return { ...defaults, ...parsed };
  } catch {
    return defaults;
  }
};
const DEFAULT_AI_OUTPUT = {
  title: "🔥 Sedap Giler Nasi Lemak Ayam Goreng Berempah!",
  description: "Crispy on the outside, juicy on the inside! Our signature Nasi Lemak comes with freshly fried Ayam Berempah, fragrant coconut rice, and our secret recipe sambal that hits all the right notes.",
  caption: "Craving something pedas and sedap? 🤤 Come try our crowd-favorite Nasi Lemak today!\n\n📍 Find us at Food Court Subang\n💵 Only RM 12.00!\n\n#NasiLemak #MalaysianFood #SedapGiler",
  generatedImageBase64: null, // Leave null so our fallback triggers
  // Dummy AI-enhanced image (e.g., a beautifully lit version)
  imageUrl: foodImage
};

export default function App() {
  // ========== AUTH STATE ==========
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [showLoginScreen, setShowLoginScreen] = useState(false);
  const [authMode, setAuthMode] = useState('login'); // 'login' or 'register'
  const isAuthenticated = !!session;

  // ========== APP STATE ==========
  const [currentStep, setCurrentStep] = useState(0);
  const [userName, setUserName] = useState(' ');
  const [appUILanguage, setAppUILanguage] = useState(loadInitialUILanguage);

  const [mediaState, setMediaState] = useState(() => {
    const stored = loadFromStorage(MEDIA_STATE_STORAGE_KEY, DEFAULT_MEDIA_STATE);
    // File and blob URLs can't be restored from storage; fall back to defaults for those
    return {
      ...stored,
      file: null,
      processedFile: null,
      url: stored.url || foodImage,
      processedUrl: null,
      originalFile: null,
      originalUrl: null,
      preEnhanceFile: null,
      preEnhanceUrl: null,
      isEnhanced: false,
    };
  });
  const [marketingConfig, setMarketingConfig] = useState(() => {
    const stored = loadFromStorage(MARKETING_CONFIG_STORAGE_KEY, DEFAULT_MARKETING_CONFIG);
    // Migrate: pre-redesign localStorage may carry legacy tones (funny/luxury/etc) or
    // no captionLength at all. Reset invalid values to Standard defaults so the Pro
    // pickers boot in a valid state instead of unselected/crashed.
    return {
      ...stored,
      tone: ALLOWED_TONES.has(stored.tone) ? stored.tone : 'casual',
      captionLength: ALLOWED_LENGTHS.has(stored.captionLength) ? stored.captionLength : 'short',
    };
  });
  const [aiOutput, setAiOutput] = useState(DEFAULT_AI_OUTPUT);
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const [headerHeight, setHeaderHeight] = useState(0);
  const headerWrapperRef = useRef(null);
  const lastScrollY = useRef(0);
  const isProcessingScreen = currentStep === 4;
  const showHeader = isAuthenticated && currentStep > 0;

  const nextStep = useCallback(() => setCurrentStep((prev) => Math.min(prev + 1, 6)), []);
  const prevStep = useCallback(() => setCurrentStep((prev) => Math.max(prev - 1, 1)), []);

  // ProcessingScreen calls this when the LLM job is done. Pro+assistive lands on
  // the Review screen (step 5); everyone else skips it and goes straight to
  // Results Hub (step 6). Routing decision lives here, not in ProcessingScreen,
  // so the processing screen stays unaware of the assistive concept.
  const handleProcessingComplete = useCallback(() => {
    const goReview = !!marketingConfig.isContextPro && !!marketingConfig.assistiveMode;
    setCurrentStep(goReview ? 5 : 6);
  }, [marketingConfig.isContextPro, marketingConfig.assistiveMode]);

  // Navigate to LoginScreen from WelcomeScreen
  const handleShowLogin = useCallback(() => {
    setAuthMode('login');
    setShowLoginScreen(true);
  }, []);

  const handleShowSignUp = useCallback(() => {
    setAuthMode('register');
    setShowLoginScreen(true);
  }, []);

  const handleImageSelect = useCallback((file, previewUrl) => {
    setMediaState(prev => {
      if (prev.processedUrl) URL.revokeObjectURL(prev.processedUrl);
      if (prev.originalUrl && prev.originalUrl !== prev.url) URL.revokeObjectURL(prev.originalUrl);
      if (prev.preEnhanceUrl) URL.revokeObjectURL(prev.preEnhanceUrl);
      // Mint a separate blob URL for `originalUrl` so it survives crop's revoke-of-url.
      const originalUrl = URL.createObjectURL(file);
      return {
        ...prev,
        file: file,
        url: previewUrl,
        processedFile: null,
        processedUrl: null,
        originalFile: file,
        originalUrl,
        compositeCropRect: null,
        preEnhanceFile: null,
        preEnhanceUrl: null,
        isEnhanced: false,
      }
    });
  }, []);

  const handleImageRemove = useCallback(() => {
    setMediaState(prev => {
      if (prev.url) URL.revokeObjectURL(prev.url);
      if (prev.processedUrl) URL.revokeObjectURL(prev.processedUrl);
      if (prev.originalUrl) URL.revokeObjectURL(prev.originalUrl);
      if (prev.preEnhanceUrl) URL.revokeObjectURL(prev.preEnhanceUrl);
      return DEFAULT_MEDIA_STATE;
    });
  }, []);

  const handleStartOver = useCallback(() => {
    setMediaState(prev => {
      if (prev.url) URL.revokeObjectURL(prev.url);
      if (prev.processedUrl) URL.revokeObjectURL(prev.processedUrl);
      if (prev.originalUrl) URL.revokeObjectURL(prev.originalUrl);
      if (prev.preEnhanceUrl) URL.revokeObjectURL(prev.preEnhanceUrl);
      return DEFAULT_MEDIA_STATE;
    });
    setMarketingConfig(DEFAULT_MARKETING_CONFIG);
    setAiOutput(DEFAULT_AI_OUTPUT);
    setCurrentStep(1);
    try {
      localStorage.removeItem(MEDIA_STATE_STORAGE_KEY);
      localStorage.removeItem(MARKETING_CONFIG_STORAGE_KEY);
    } catch { /* ignore */ }
  }, []);

  // ========== AUTH EFFECTS ==========
  useEffect(() => {
    authService.getSession().then((session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setUserName(session?.user?.user_metadata?.username || '');
      setAuthLoading(false);
      if (session) setCurrentStep(1);
    });

    const { data: { subscription } } = authService.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setUserName(session?.user?.user_metadata?.username || '');
    });

    return () => subscription.unsubscribe();
  }, []);

  // Handle login success — session/user already updated by onAuthStateChange
  const handleLoginSuccess = useCallback(({ username }) => {
    setUserName(username || '');
    setShowLoginScreen(false);
    setAuthMode('login');
    setCurrentStep(1);
  }, []);

  // Handle logout
  const handleLogout = useCallback(async () => {
    await authService.logout();
    setShowLoginScreen(false);
    setAuthMode('login');
    setCurrentStep(0);
  }, []);

  // ========== PERSISTENCE ==========
  useEffect(() => {
    try {
      localStorage.setItem(
        MEDIA_STATE_STORAGE_KEY,
        JSON.stringify(pickSerializableMediaState(mediaState))
      );
    } catch { /* storage full or disabled */ }
  }, [mediaState]);

  useEffect(() => {
    try {
      localStorage.setItem(MARKETING_CONFIG_STORAGE_KEY, JSON.stringify(marketingConfig));
    } catch { /* storage full or disabled */ }
  }, [marketingConfig]);

  // Sync appUILanguage to localStorage + i18next on every change
  useEffect(() => {
    try { localStorage.setItem(UI_LANGUAGE_STORAGE_KEY, appUILanguage); } catch { /* ignore */ }
    i18n.changeLanguage(appUILanguage.toLowerCase());
  }, [appUILanguage]);

  // ========== URL CLEANUP ==========
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

  // Measure actual header height so content padding tracks it dynamically
  useEffect(() => {
    const el = headerWrapperRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      setHeaderHeight(entry.contentRect.height);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const renderView = () => {
    // PROTECT ALL ROUTES: If user is not authenticated
    if (!isAuthenticated) {
      // Show LoginScreen if requested, otherwise show WelcomeScreen
      if (showLoginScreen) {
        return <LoginScreen onSuccess={handleLoginSuccess} authMode={authMode} />;
      }
      return <WelcomeScreen onLogin={handleShowLogin} onSignUp={handleShowSignUp} />;
    }

    // User is authenticated - show workflow
    switch (currentStep) {
      case 0:
        // This shouldn't happen (authenticated users skip to step 1), but keep as fallback
        return <WelcomeScreen onLogin={handleShowLogin} onSignUp={handleShowSignUp} />;
      case 1:
        // We can pass nextStep directly since we removed the array index wrapper
        return <DashboardView userName={userName} onImageSelect={handleImageSelect} onImageRemove={handleImageRemove} mediaState={mediaState} onNext={nextStep} />;
      case 2:
        return <MediaEditorView userName={userName} mediaState={mediaState} setMediaState={setMediaState} onNext={nextStep} onPrev={prevStep} />;
      case 3:
        return <ContextConfigurationView userName={userName} mediaState={mediaState} setMediaState={setMediaState} config={marketingConfig} setConfig={setMarketingConfig} onNext={nextStep} onPrev={prevStep} />;
      case 4:
        // Added the missing props so the component can read the form data
        return <ProcessingScreen userName={userName} mediaState={mediaState} marketingConfig={marketingConfig} setAiOutput={setAiOutput} onComplete={handleProcessingComplete} onPrev={prevStep} />;
      case 5:
        return <ReviewScreen userName={userName} mediaState={mediaState} marketingConfig={marketingConfig} aiOutput={aiOutput} setAiOutput={setAiOutput} onNext={nextStep} onPrev={prevStep} />;
      case 6:
        return <ResultsHubView userName={userName} mediaState={mediaState} aiOutput={aiOutput} setAiOutput={setAiOutput} onStartOver={handleStartOver} onPrev={prevStep} />;
      default:
        return <DashboardView userName={userName} onImageSelect={handleImageSelect} onImageRemove={handleImageRemove} mediaState={mediaState} onNext={nextStep} />;
    }
  };

  // Sharpness convolution kernel: identity at k=0, classic sharpen as k→1
  const sharpenK = (mediaState.sharpness ?? 0) / 100;
  const sharpenKernel = `0 ${-sharpenK} 0  ${-sharpenK} ${1 + 4 * sharpenK} ${-sharpenK}  0 ${-sharpenK} 0`;

  return (
    <div className="w-full h-[100dvh] bg-[#fff8f6] overflow-hidden relative">

      {/* Global SVG sharpen filter — referenced by CSS filter: url(#snapit-sharpen) */}
      <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
        <defs>
          <filter id="snapit-sharpen">
            <feConvolveMatrix order="3" kernelMatrix={sharpenKernel} preserveAlpha="true" />
          </filter>
        </defs>
      </svg>

      {/* Floating Global Header wrapper */}
      <div
        ref={headerWrapperRef}
        className={`absolute top-0 left-0 w-full z-50 transition-transform duration-500 ease-in-out pointer-events-none ${isHeaderVisible ? 'translate-y-0' : '-translate-y-full'
          }`}
      >
        {showHeader && (
          <div className="pointer-events-auto"> {/* Slight bottom padding so the shadow breathes */}
            <Header snapitLogo={snapitLogo} userName={userName} appUILanguage={appUILanguage} setAppUILanguage={setAppUILanguage} />
            <DynamicTimeline currentStep={currentStep} showReview={!!marketingConfig.isContextPro && !!marketingConfig.assistiveMode} />
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
            onScroll={handleScroll}
            style={showHeader && !isProcessingScreen ? { paddingTop: headerHeight } : undefined}
            className={`w-full h-full pb-safe transition-[padding] duration-300 ${isProcessingScreen
              ? 'overflow-hidden pt-0'
              : 'overflow-y-auto'
              }`}
          >
            {renderView()}
          </motion.div>
        </AnimatePresence>
      </div>

    </div>
  );
}