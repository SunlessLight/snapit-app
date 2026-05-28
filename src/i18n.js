import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import enCommon from './locales/en/common.json';
import enDashboard from './locales/en/dashboard.json';
import enMediaEditor from './locales/en/mediaEditor.json';
import enContextConfig from './locales/en/contextConfig.json';
import enProcessing from './locales/en/processing.json';
import enResultsHub from './locales/en/resultsHub.json';
import enReview from './locales/en/review.json';
import enWelcome from './locales/en/welcome.json';
import enLogin from './locales/en/login.json';
import enHeader from './locales/en/header.json';
import enTimeline from './locales/en/timeline.json';
import enGuidedCapture from './locales/en/guidedCapture.json';
import enMaskPreview from './locales/en/maskPreview.json';

import zhCommon from './locales/zh/common.json';
import zhDashboard from './locales/zh/dashboard.json';
import zhMediaEditor from './locales/zh/mediaEditor.json';
import zhContextConfig from './locales/zh/contextConfig.json';
import zhProcessing from './locales/zh/processing.json';
import zhResultsHub from './locales/zh/resultsHub.json';
import zhReview from './locales/zh/review.json';
import zhWelcome from './locales/zh/welcome.json';
import zhLogin from './locales/zh/login.json';
import zhHeader from './locales/zh/header.json';
import zhTimeline from './locales/zh/timeline.json';
import zhGuidedCapture from './locales/zh/guidedCapture.json';
import zhMaskPreview from './locales/zh/maskPreview.json';

import msCommon from './locales/ms/common.json';
import msDashboard from './locales/ms/dashboard.json';
import msMediaEditor from './locales/ms/mediaEditor.json';
import msContextConfig from './locales/ms/contextConfig.json';
import msProcessing from './locales/ms/processing.json';
import msResultsHub from './locales/ms/resultsHub.json';
import msReview from './locales/ms/review.json';
import msWelcome from './locales/ms/welcome.json';
import msLogin from './locales/ms/login.json';
import msHeader from './locales/ms/header.json';
import msTimeline from './locales/ms/timeline.json';
import msGuidedCapture from './locales/ms/guidedCapture.json';
import msMaskPreview from './locales/ms/maskPreview.json';

const STORAGE_KEY = 'snapit:uiLanguage';

// Map UI codes (EN/ZH/MS) used in App.jsx state to i18next codes (en/zh/ms)
export const uiToI18n = (ui) => (ui || 'EN').toLowerCase();
export const i18nToUi = (code) => (code || 'en').toUpperCase();

const readStoredLanguage = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw && ['EN', 'ZH', 'MS'].includes(raw)) return raw.toLowerCase();
  } catch { /* storage disabled */ }
  return null;
};

const resources = {
  en: {
    common: enCommon,
    dashboard: enDashboard,
    mediaEditor: enMediaEditor,
    contextConfig: enContextConfig,
    processing: enProcessing,
    resultsHub: enResultsHub,
    review: enReview,
    welcome: enWelcome,
    login: enLogin,
    header: enHeader,
    timeline: enTimeline,
    guidedCapture: enGuidedCapture,
    maskPreview: enMaskPreview,
  },
  zh: {
    common: zhCommon,
    dashboard: zhDashboard,
    mediaEditor: zhMediaEditor,
    contextConfig: zhContextConfig,
    processing: zhProcessing,
    resultsHub: zhResultsHub,
    review: zhReview,
    welcome: zhWelcome,
    login: zhLogin,
    header: zhHeader,
    timeline: zhTimeline,
    guidedCapture: zhGuidedCapture,
    maskPreview: zhMaskPreview,
  },
  ms: {
    common: msCommon,
    dashboard: msDashboard,
    mediaEditor: msMediaEditor,
    contextConfig: msContextConfig,
    processing: msProcessing,
    resultsHub: msResultsHub,
    review: msReview,
    welcome: msWelcome,
    login: msLogin,
    header: msHeader,
    timeline: msTimeline,
    guidedCapture: msGuidedCapture,
    maskPreview: msMaskPreview,
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    lng: readStoredLanguage() || undefined,
    fallbackLng: 'en',
    supportedLngs: ['en', 'zh', 'ms'],
    nonExplicitSupportedLngs: true,
    ns: ['common', 'dashboard', 'mediaEditor', 'contextConfig', 'processing', 'resultsHub', 'review', 'welcome', 'login', 'header', 'timeline', 'guidedCapture', 'maskPreview'],
    defaultNS: 'common',
    interpolation: { escapeValue: false },
    detection: {
      order: ['navigator'],
      caches: [],
    },
  });

export default i18n;
