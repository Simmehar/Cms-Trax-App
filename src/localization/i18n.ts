import i18n from 'i18next';
import {initReactI18next} from 'react-i18next';
import * as RNLocalize from 'react-native-localize';

import en from './en';
import es from './es';

const resources = {
  en: {
    translation: en,
  },
  es: {
    translation: es,
  },
};

const getLanguage = () => {
  const locale = RNLocalize.getLocales()[0]?.languageCode;

  // Only allow English and Spanish
  return locale === 'es' ? 'es' : 'en';
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: getLanguage(),
    fallbackLng: 'en',

    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;