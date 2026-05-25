import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import zh from './locales/zh-CN.json';
import en from './locales/en-US.json';

const saved = localStorage.getItem('epoch.locale');

void i18n.use(initReactI18next).init({
  resources: {
    'zh-CN': { translation: zh },
    'en-US': { translation: en },
  },
  lng: saved ?? 'zh-CN',
  fallbackLng: 'zh-CN',
  interpolation: { escapeValue: false },
});

export default i18n;
