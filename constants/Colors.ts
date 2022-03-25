
const tailwindGray = {
  '50': '#FAFAFA',
  '100': '#F5F5F5',
  '200': '#E5E5E5',
  '300': '#D4D4D4',
  '400': '#A3A3A3',
  '500': '#737373',
  '600': '#525252',
  '700': '#404040',
  '800': '#262626',
  '900': '#171717',
}

const tailwindBlue = {
  '50': '#EFF6FF',
  '100': '#DBEAFE',
  '200': '#BFDBFE',
  '300': '#93C5FD',
  '400': '#60A5FA',
  '500': '#3B82F6',
  '600': '#2563EB',
  '700': '#1D4ED8',
  '800': '#1E40AF',
  '900': '#1E3A8A',
}

const scales: {
  [type: string]: {
    [rating: string]: {
      background: string;
      text: string;
    }
  }
} = {
  'ColorBrew-RdYlGn': {
    extremely_good: { background: '#1a9850', text: 'rgba(255,255,255,1)', },
    very_good: { background: '#91cf60', text: 'rgba(255,255,255,1)', },
    good: { background: '#d9ef8b', text: 'rgba(0,0,0,0.8)', },
    neutral: { background: '#ffffbf', text: 'rgba(0,0,0,0.6)', },
    bad: { background: '#fee08b', text: 'rgba(0,0,0,0.8)', },
    very_bad: { background: '#fc8d59', text: 'rgba(255,255,255,1)', },
    extremely_bad: { background: '#d73027', text: 'rgba(255,255,255,1)', },
  },
  'ColorBrew-PiYG': {
    extremely_good: { background: '#4d9221', text: 'rgba(255,255,255,1)', },
    very_good: { background: '#a1d76a', text: 'rgba(255,255,255,1)', },
    good: { background: '#e6f5d0', text: 'rgba(0,0,0,0.8)', },
    neutral: { background: '#f7f7f7', text: 'rgba(0,0,0,0.6)', },
    bad: { background: '#fde0ef', text: 'rgba(0,0,0,0.8)', },
    very_bad: { background: '#e9a3c9', text: 'rgba(255,255,255,1)', },
    extremely_bad: { background: '#c51b7d', text: 'rgba(255,255,255,1)', },
  },
  'ColorBrew-BrBG': {
    extremely_good: { background: '#01665e', text: 'rgba(255,255,255,1)', },
    very_good: { background: '#5ab4ac', text: 'rgba(255,255,255,1)', },
    good: { background: '#c7eae5', text: 'rgba(0,0,0,0.8)', },
    neutral: { background: '#f5f5f5', text: 'rgba(0,0,0,0.6)', },
    bad: { background: '#f6e8c3', text: 'rgba(0,0,0,0.8)', },
    very_bad: { background: '#d8b365', text: 'rgba(255,255,255,1)', },
    extremely_bad: { background: '#8c510a', text: 'rgba(255,255,255,1)', },
  },
};

const tintColorLight = '#2598fe';
const tintColorDark = '#2598fe';

export default {
  light: {
    text: '#000',
    textSecondary: tailwindGray['500'],
    background: '#fff',
    backgroundSecondary: tailwindGray['100'],
    link: tintColorLight,
    tint: tintColorLight,

    menuListItemBackground: '#FFF',
    menuListItemText: '#000',
    menuListItemIcon: '#000',
    menuListItemBorder: tailwindGray['100'],
    
    notificationBackground: '#FFF',
    
    calendarItemTodayBackground: tailwindGray['100'],
    calendarItemTodayColor: tailwindGray['500'],
    calendarItemBackground: tailwindGray['200'],
    calendarItemTextColor: tailwindGray['500'],
    calendarWeekNameColor: '#000',
    calendarMonthNameColor: '#000',
    
    primaryLinkButtonText: tintColorLight,
    secondaryLinkButtonText: tailwindGray['900'],

    primaryButtonBackground: tintColorLight,
    primaryButtonTextColor: '#FFF',
    
    secondaryButtonBackground: tailwindGray['200'],
    secondaryButtonTextColor: tailwindGray['800'],
    
    textInputBackground: tailwindGray['100'],
    textInputText: tailwindGray['800'],
    textInputPlaceholder: tailwindGray['400'],
    textInputLabel: tailwindGray['300'],
    textInputBorder: tailwindGray['200'],
    textInputBorderHighlight: tintColorLight,

    tagErrorBackground: '#FECDD3',
    tagErrorText: '#9F1239',
    tagSuccessBackground: '#BBF7D0',
    tagSuccessText: '#14532D',
    switchThumbColor: '#333',
    scales
  },
  dark: {
    text: '#fff',
    textSecondary: tailwindGray['500'],
    background: tailwindGray['900'],
    backgroundSecondary: tailwindGray['900'],
    tint: tintColorDark,
    
    menuListItemBackground: tailwindGray['800'],
    menuListItemText: tailwindGray['50'],
    menuListItemIcon: tailwindGray['200'],
    menuListItemBorder: tailwindGray['700'],

    notificationBackground: tailwindGray['800'],
    
    calendarItemTodayBackground: tailwindGray['500'],
    calendarItemTodayColor: tailwindGray['900'],
    calendarItemBackground: tailwindGray['800'],
    calendarItemTextColor: tailwindGray['500'],
    calendarWeekNameColor: tailwindGray['500'],
    calendarMonthNameColor: tailwindGray['500'],
    
    primaryLinkButtonText: tintColorDark,
    secondaryLinkButtonText: tailwindGray['400'],
    
    primaryButtonBackground: tintColorDark,
    primaryButtonTextColor: '#FFF',

    secondaryButtonBackground: tailwindGray['800'],
    secondaryButtonTextColor: tailwindGray['200'],

    textInputBackground: tailwindGray['800'],
    textInputText: tailwindGray['200'],
    textInputPlaceholder: tailwindGray['500'],
    textInputBorder: tailwindGray['600'],
    textInputBorderHighlight: tintColorDark,
    textInputLabel: tailwindGray['600'],

    tagErrorBackground: '#9F1239',
    tagErrorText: '#FECDD3',
    tagSuccessBackground: '#14532D',
    tagSuccessText: '#BBF7D0',
    switchThumbColor: '#FFF',
    scales
  }
};
