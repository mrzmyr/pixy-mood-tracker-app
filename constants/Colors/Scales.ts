import colors from './TailwindColors';

const textBlack = 'rgba(0, 0, 0, 0.6)';
const textWhite = 'white';

const light = {
  'ColorBrew-RdYlGn': {
    extremely_good: { background: colors.emerald[600], text: 'white', },
    very_good: { background: colors.emerald[400], text: 'white', },
    good: { background: colors.emerald[200], text: colors.emerald[900], },
    neutral: { background: colors.neutral[200], text: colors.neutral[600], },
    bad: { background: colors.orange[100], text: colors.orange[900], },
    very_bad: { background: colors.orange[300], text: colors.orange[900], },
    extremely_bad: { background: colors.red[500], text: 'white', },
    empty: { background: colors.neutral[100], border: colors.neutral[300], text: 'black', },
  },
  'ColorBrew-RdYlGn-old': {
    extremely_good: { background: '#1a9850', text: textWhite, },
    very_good: { background: '#91cf60', text: textBlack, },
    good: { background: '#d9ef8b', text: textBlack, },
    neutral: { background: '#ffffbf', text: textBlack, },
    bad: { background: '#fee08b', text: textBlack, },
    very_bad: { background: '#fc8d59', text: textBlack, },
    extremely_bad: { background: '#d73027', text: textWhite, },
    empty: { background: colors.neutral[100], border: colors.neutral[300], text: 'black', },
  },
  'ColorBrew-PuOr': {
    extremely_good: { background: '#542788', text: textWhite, },
    very_good: { background: '#998ec3', text: textBlack, },
    good: { background: '#d8daeb', text: textBlack, },
    neutral: { background: colors.neutral[200], text: textBlack, },
    bad: { background: '#fee0b6', text: textBlack, },
    very_bad: { background: '#f1a340', text: textBlack, },
    extremely_bad: { background: '#b35806', text: textWhite, },
    empty: { background: colors.neutral[100], border: colors.neutral[300], text: 'black', },
  },
  'ColorBrew-BrBG': {
    extremely_good: { background: '#01665e', text: textWhite, },
    very_good: { background: '#5ab4ac', text: textWhite, },
    good: { background: '#c7eae5', text: textBlack, },
    neutral: { background: colors.neutral[200], text: textBlack, },
    bad: { background: '#f6e8c3', text: textBlack, },
    very_bad: { background: '#d8b365', text: textWhite, },
    extremely_bad: { background: '#8c510a', text: textWhite, },
    empty: { background: colors.neutral[100], border: colors.neutral[300], text: 'black', },
  },
  'ColorBrew-RdYG': {
    extremely_good: { background: '#4d9221', text: textWhite, },
    very_good: { background: '#a1d76a', text: textBlack, },
    good: { background: '#e6f5d0', text: textBlack, },
    neutral: { background: colors.neutral[200], text: textBlack, },
    bad: { background: '#fddbc7', text: textBlack, },
    very_bad: { background: '#ef8a62', text: textBlack, },
    extremely_bad: { background: '#b2182b', text: textWhite, },
    empty: { background: colors.neutral[100], border: colors.neutral[300], text: 'black', },
  },
  'rainbow': {
    extremely_good: { background: '#3c3184', text: textBlack, },
    very_good: { background: '#458fff', text: textBlack, },
    good: { background: '#21eaad', text: textBlack, },
    neutral: { background: '#b1fa36', text: textBlack, },
    bad: { background: '#edd13b', text: textBlack, },
    very_bad: { background: '#f9791d', text: textBlack, },
    extremely_bad: { background: '#9b0f00', text: textWhite, },
    empty: { background: colors.neutral[100], border: colors.neutral[300], text: 'black', },
  }
};

const dark: typeof light = {
  'ColorBrew-RdYlGn': {
    extremely_good: { background: colors.emerald[600], text: colors.emerald[100], },
    very_good: { background: colors.emerald[400], text: colors.emerald[900], },
    good: { background: colors.emerald[200], text: colors.emerald[900], },
    // neutral: { background: colors.neutral[700], text: 'white', },
    neutral: { background: colors.neutral[100], text: 'black', },
    bad: { background: colors.amber[100], text: colors.amber[900], },
    very_bad: { background: colors.orange[300], text: colors.amber[900], },
    extremely_bad: { background: colors.red[500], text: colors.red[100], },
    empty: {  background: colors.neutral[900], border: colors.neutral[600], text: 'white', },
  },
  'ColorBrew-RdYlGn-old': {
    extremely_good: { background: '#1a9850', text: textWhite, },
    very_good: { background: '#91cf60', text: 'black', },
    good: { background: '#d9ef8b', text: textBlack, },
    neutral: { background: '#ffffbf', text: textBlack, },
    bad: { background: '#fee08b', text: textBlack, },
    very_bad: { background: '#fc8d59', text: 'black', },
    extremely_bad: { background: '#d73027', text: textWhite, },
    empty: {  background: colors.neutral[900], border: colors.neutral[600], text: 'white', },
  },
  'ColorBrew-PuOr': {
    extremely_good: { background: '#542788', text: textWhite, },
    very_good: { background: '#998ec3', text: textBlack, },
    good: { background: '#d8daeb', text: textBlack, },
    neutral: { background: colors.neutral[200], text: textBlack, },
    bad: { background: '#fee0b6', text: textBlack, },
    very_bad: { background: '#f1a340', text: textBlack, },
    extremely_bad: { background: '#b35806', text: textWhite, },
    empty: {  background: colors.neutral[900], border: colors.neutral[600], text: 'white', },
  },
  'ColorBrew-BrBG': {
    extremely_good: { background: '#01665e', text: textWhite, },
    very_good: { background: '#5ab4ac', text: textWhite, },
    good: { background: '#c7eae5', text: textBlack, },
    neutral: { background: colors.neutral[200], text: textBlack, },
    bad: { background: '#f6e8c3', text: textBlack, },
    very_bad: { background: '#d8b365', text: textWhite, },
    extremely_bad: { background: '#8c510a', text: textWhite, },
    empty: {  background: colors.neutral[900], border: colors.neutral[600], text: 'white', },
  },
  'ColorBrew-RdYG': {
    extremely_good: { background: '#4d9221', text: textWhite, },
    very_good: { background: '#a1d76a', text: textBlack, },
    good: { background: '#e6f5d0', text: textBlack, },
    neutral: { background: colors.neutral[200], text: textBlack, },
    bad: { background: '#fddbc7', text: textBlack, },
    very_bad: { background: '#ef8a62', text: textBlack, },
    extremely_bad: { background: '#b2182b', text: textWhite, },
    empty: {  background: colors.neutral[900], border: colors.neutral[600], text: 'white', },
  },
  'rainbow': {
    extremely_good: { background: '#3c3184', text: textBlack, },
    very_good: { background: '#458fff', text: textBlack, },
    good: { background: '#21eaad', text: textBlack, },
    neutral: { background: '#b1fa36', text: textBlack, },
    bad: { background: '#edd13b', text: textBlack, },
    very_bad: { background: '#f9791d', text: textBlack, },
    extremely_bad: { background: '#9b0f00', text: textBlack, },
    empty: {  background: colors.neutral[900], border: colors.neutral[600], text: 'white', },
  }
};

export type IScaleColors = keyof typeof light;

export default {
  dark,
  light,
};