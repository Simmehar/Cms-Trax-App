import i18n from './i18n';

export const getCurrencySymbol = () => {
  switch (i18n.language) {
    case 'es':
      return '€';
    default:
      return '$';
  }
};