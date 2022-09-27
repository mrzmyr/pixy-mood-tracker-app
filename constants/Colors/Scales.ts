import colors from './TailwindColors';

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
    extremely_good: { background: '#1a9850', text: 'rgba(255,255,255,1)', },
    very_good: { background: '#91cf60', text: 'rgba(255,255,255,1)', },
    good: { background: '#d9ef8b', text: 'rgba(0,0,0,0.8)', },
    neutral: { background: '#ffffbf', text: 'rgba(0,0,0,0.6)', },
    bad: { background: '#fee08b', text: 'rgba(0,0,0,0.8)', },
    very_bad: { background: '#fc8d59', text: 'rgba(255,255,255,1)', },
    extremely_bad: { background: '#d73027', text: 'rgba(255,255,255,1)', },
    empty: { background: colors.neutral[100], border: colors.neutral[300], text: 'black', },
  },
  'ColorBrew-PiYG': {
    extremely_good: { background: '#4d9221', text: 'rgba(255,255,255,1)', },
    very_good: { background: '#a1d76a', text: 'rgba(255,255,255,1)', },
    good: { background: '#e6f5d0', text: 'rgba(0,0,0,0.8)', },
    neutral: { background: '#f7f7f7', text: 'rgba(0,0,0,0.6)', },
    bad: { background: '#fde0ef', text: 'rgba(0,0,0,0.8)', },
    very_bad: { background: '#e9a3c9', text: 'rgba(255,255,255,1)', },
    extremely_bad: { background: '#c51b7d', text: 'rgba(255,255,255,1)', },
    empty: { background: colors.neutral[100], border: colors.neutral[300], text: 'black', },
  },
  'ColorBrew-BrBG': {
    extremely_good: { background: '#01665e', text: 'rgba(255,255,255,1)', },
    very_good: { background: '#5ab4ac', text: 'rgba(255,255,255,1)', },
    good: { background: '#c7eae5', text: 'rgba(0,0,0,0.8)', },
    neutral: { background: '#f5f5f5', text: 'rgba(0,0,0,0.6)', },
    bad: { background: '#f6e8c3', text: 'rgba(0,0,0,0.8)', },
    very_bad: { background: '#d8b365', text: 'rgba(255,255,255,1)', },
    extremely_bad: { background: '#8c510a', text: 'rgba(255,255,255,1)', },
    empty: { background: colors.neutral[100], border: colors.neutral[300], text: 'black', },
  },
};

const dark: typeof light = {
  'ColorBrew-RdYlGn': {
    extremely_good: { background: colors.emerald[600], text: colors.emerald[100], },
    very_good: { background: colors.emerald[400], text: colors.emerald[900], },
    good: { background: colors.emerald[200], text: colors.emerald[900], },
    neutral: { background: colors.neutral[700], text: 'white', },
    bad: { background: colors.amber[100], text: colors.amber[900], },
    very_bad: { background: colors.orange[300], text: colors.amber[900], },
    extremely_bad: { background: colors.red[500], text: colors.red[100], },
    empty: {  background: colors.neutral[900], border: colors.neutral[600], text: 'white', },
  },
  'ColorBrew-RdYlGn-old': {
    extremely_good: { background: '#1a9850', text: 'rgba(255,255,255,1)', },
    very_good: { background: '#91cf60', text: 'rgba(255,255,255,1)', },
    good: { background: '#d9ef8b', text: 'rgba(0,0,0,0.8)', },
    neutral: { background: '#ffffbf', text: 'rgba(0,0,0,0.6)', },
    bad: { background: '#fee08b', text: 'rgba(0,0,0,0.8)', },
    very_bad: { background: '#fc8d59', text: 'rgba(255,255,255,1)', },
    extremely_bad: { background: '#d73027', text: 'rgba(255,255,255,1)', },
    empty: {  background: colors.neutral[900], border: colors.neutral[600], text: 'white', },
  },
  'ColorBrew-PiYG': {
    extremely_good: { background: '#4d9221', text: 'rgba(255,255,255,1)', },
    very_good: { background: '#a1d76a', text: 'rgba(255,255,255,1)', },
    good: { background: '#e6f5d0', text: 'rgba(0,0,0,0.8)', },
    neutral: { background: '#f7f7f7', text: 'rgba(0,0,0,0.6)', },
    bad: { background: '#fde0ef', text: 'rgba(0,0,0,0.8)', },
    very_bad: { background: '#e9a3c9', text: 'rgba(255,255,255,1)', },
    extremely_bad: { background: '#c51b7d', text: 'rgba(255,255,255,1)', },
    empty: {  background: colors.neutral[900], border: colors.neutral[600], text: 'white', },
  },
  'ColorBrew-BrBG': {
    extremely_good: { background: '#01665e', text: 'rgba(255,255,255,1)', },
    very_good: { background: '#5ab4ac', text: 'rgba(255,255,255,1)', },
    good: { background: '#c7eae5', text: 'rgba(0,0,0,0.8)', },
    neutral: { background: '#f5f5f5', text: 'rgba(0,0,0,0.6)', },
    bad: { background: '#f6e8c3', text: 'rgba(0,0,0,0.8)', },
    very_bad: { background: '#d8b365', text: 'rgba(255,255,255,1)', },
    extremely_bad: { background: '#8c510a', text: 'rgba(255,255,255,1)', },
    empty: {  background: colors.neutral[900], border: colors.neutral[600], text: 'white', },
  },
};

export type IScaleColors = keyof typeof light;

export default {
  dark,
  light,
};