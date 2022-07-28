import colors from './TailwindColors';

export interface Scales {
  [type: string]: {
    [rating: string]: {
      background: string;
      text: string;
    }
  }
}

const scales: Scales = {
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

type TagColors = {
  [tag: string]: {
    title: string;
    dot: string;
    background: string;
    text: string;
    border: string;
  }
}

const tagsDark: TagColors = {}
const tagsLight: TagColors = {}

const tagColorNames = ['slate', 'stone', 'red', 'orange', 'amber', 'yellow', 'lime', 'green', 'teal', 'sky', 'blue', 'indigo', 'purple', 'pink'];

tagColorNames.map(color => {
  tagsDark[color] = {
    title: color,
    dot: colors[color]['500'],
    background: colors[color]['800'],
    text: colors[color]['300'],
    border: colors[color]['600'],
  }
  tagsLight[color] = {
    title: color,
    dot: colors[color]['400'],
    background: colors[color]['200'],
    text: colors[color]['800'],
    border: colors[color]['400'],
  }
})

const tintColorLight = '#007aff';
const tintColorDark = '#0a84ff';

export interface IColors {
  text: string;
  textSecondary: string;
  background: string;
  backgroundSecondary: string;
  link: string;
  tint: string;

  logHeaderBackground: string;
  logHeaderBorder: string;
  logBackground: string;

  tagsBackground: string;
  tagsBackgroundSecondary: string;
  tagsText: string;
  tagsTextSecondary: string;
  
  feedbackSelectionBackground: string;
  feedbackBackground: string;
  
  cardBackground: string;

  headerBorder: string,
  tabsIconActive: string,
  tabsIconInactive: string;
  tabsTextActive: string;
  tabsTextInactive: string;
  
  passcodeDotBackground: string;
  passcodePadBackground: string,
  passcodePadBackgroundActive: string,
  
  menuListItemBackground: string;
  menuListItemText: string;
  menuListItemIcon: string;
  menuListItemBorder: string;
  
  notificationBackground: string;
  
  calendarBackground: string;
  calendarItemBackground: string;
  calendarItemBackgroundFuture: string;
  calendarItemTextColor: string;
  calendarWeekNameColor: string;
  calendarMonthNameColor: string;
  
  linkButtonText: string;
  linkButtonDisabledText: string;

  primaryButtonBackground: string;
  primaryButtonText: string;
  primaryButtonBorder: string;

  primaryButtonBackgroundDisabled: string;
  primaryButtonTextDisabled: string;
  primaryButtonBorderDisabled: string;
  
  secondaryButtonBackground: string;
  secondaryButtonText: string;
  secondaryButtonBorder: string;
  
  textInputBackground: string;
  textInputText: string;
  textInputPlaceholder: string;
  textInputLabel: string;
  textInputBorder: string;
  textInputBorderHighlight: string;

  tagErrorBackground: string;
  tagErrorText: string;
  tagSuccessBackground: string;
  tagSuccessText: string;

  checkboxBackground: string;
  checkboxBorder: string;
  checkboxText: string;
  checkboxCheckedBackground: string;
  checkboxCheckedBorder: string;
  checkboxCheckedText: string;
    
  statisticsBackground: string;
  statisticsCardBackground: string;
  statisticsLine: string;
  
  switchThumbColor: string;
  scales: Scales;
  tags: TagColors;
  palette: any;
}

const light: IColors = {
  text: '#000',
  textSecondary: colors.neutral[500],
  background: colors.neutral[100],
  backgroundSecondary: colors.neutral[300],
  link: tintColorLight,
  tint: tintColorLight,

  logHeaderBackground: colors.neutral[50],
  logHeaderBorder: colors.neutral[200],
  logBackground: '#FFF',

  tagsBackground: tintColorLight,
  tagsText: '#FFF',

  feedbackSelectionBackground: colors.neutral[100],
  feedbackBackground: '#FFF',
  
  cardBackground: '#fff',

  headerBorder: colors.neutral[300],
  tabsIconActive: colors.neutral[900],
  tabsIconInactive: colors.neutral[400],
  tabsTextActive: colors.neutral[900],
  tabsTextInactive: colors.neutral[400],
  
  passcodeDotBackground: colors.neutral[300],
  passcodePadBackground: colors.neutral[200],
  passcodePadBackgroundActive: colors.neutral[400],

  menuListItemBackground: '#FFF',
  menuListItemText: '#000',
  menuListItemIcon: '#000',
  menuListItemBorder: colors.neutral[100],
  
  notificationBackground: '#FFF',
  
  calendarBackground: colors.neutral[50],
  calendarItemBackground: '#FFF',
  calendarItemBackgroundFuture: colors.neutral[50],
  calendarItemTextColor: colors.neutral[500],
  calendarWeekNameColor: colors.neutral[400],
  calendarMonthNameColor: colors.neutral[400],
  
  linkButtonText: tintColorLight,
  linkButtonDisabledText: colors.neutral[400],

  primaryButtonBackground: tintColorLight,
  primaryButtonText: '#FFF',
  primaryButtonBorder: tintColorLight,

  primaryButtonBackgroundDisabled: colors.neutral[300],
  primaryButtonTextDisabled: colors.neutral[500],
  primaryButtonBorderDisabled: colors.neutral[300],
  
  secondaryButtonBackground: colors.neutral[200],
  secondaryButtonText: colors.neutral[800],
  secondaryButtonBorder: colors.neutral[200],
  
  textInputBackground: colors.neutral[100],
  textInputText: colors.neutral[800],
  textInputPlaceholder: colors.neutral[400],
  textInputLabel: colors.neutral[300],
  textInputBorder: colors.neutral[100],
  textInputBorderHighlight: tintColorLight,

  tagErrorBackground: '#FECDD3',
  tagErrorText: '#9F1239',
  tagSuccessBackground: '#BBF7D0',
  tagSuccessText: '#14532D',

  checkboxBackground: colors.neutral[100],
  checkboxBorder: colors.neutral[300],
  checkboxText: '#000',
  checkboxCheckedBackground: tintColorLight,
  checkboxCheckedBorder: tintColorLight,
  checkboxCheckedText: '#FFF',
  
  statisticsBackground: colors.neutral[100],
  statisticsCardBackground: '#FFF',
  statisticsLine: '#000',
  
  switchThumbColor: '#333',
  scales,
  tags: tagsLight,
  palette: colors,
}

const dark: IColors = {
  text: '#fff',
  textSecondary: colors.neutral[500],
  background: '#000',
  backgroundSecondary: colors.neutral[900],
  link: tintColorLight,
  tint: tintColorDark,

  logHeaderBackground: colors.neutral[900],
  logHeaderBorder: colors.neutral[800],
  logBackground: '#000',

  tagsBackground: tintColorDark,
  tagsText: '#fff',

  feedbackSelectionBackground: colors.neutral[900],
  feedbackBackground: '#000',
  
  cardBackground: colors.neutral[900],
  
  headerBorder: colors.neutral[800],
  tabsIconActive: colors.neutral[400],
  tabsIconInactive: colors.neutral[600],
  tabsTextActive: colors.neutral[400],
  tabsTextInactive: colors.neutral[600],
  
  passcodeDotBackground: colors.neutral[600],
  passcodePadBackground: colors.neutral[800],
  passcodePadBackgroundActive: colors.neutral[700],

  menuListItemBackground: colors.neutral[900],
  menuListItemText: colors.neutral[50],
  menuListItemIcon: colors.neutral[200],
  menuListItemBorder: colors.neutral[800],

  notificationBackground: colors.neutral[900],
  
  calendarBackground: '#000',
  calendarItemBackground: colors.neutral[800],
  calendarItemBackgroundFuture: '#000',
  calendarItemTextColor: colors.neutral[400],
  calendarWeekNameColor: colors.neutral[500],
  calendarMonthNameColor: colors.neutral[500],
  
  linkButtonText: tintColorLight,
  linkButtonDisabledText: colors.neutral[400],
  
  primaryButtonBackground: tintColorDark,
  primaryButtonText: '#FFF',
  primaryButtonBorder: tintColorDark,

  primaryButtonBackgroundDisabled: colors.neutral[800],
  primaryButtonTextDisabled: colors.neutral[400],
  primaryButtonBorderDisabled: colors.neutral[800],

  secondaryButtonBackground: colors.neutral[800],
  secondaryButtonText: colors.neutral[200],

  textInputBackground: colors.neutral[900],
  textInputText: colors.neutral[200],
  textInputPlaceholder: colors.neutral[500],
  textInputBorder: colors.neutral[900],
  textInputBorderHighlight: tintColorDark,
  textInputLabel: colors.neutral[600],

  tagErrorBackground: '#9F1239',
  tagErrorText: '#FECDD3',
  tagSuccessBackground: '#14532D',
  tagSuccessText: '#BBF7D0',

  checkboxBackground: colors.neutral[800],
  checkboxBorder: colors.neutral[700],
  checkboxText: '#000',
  checkboxCheckedBackground: tintColorDark,
  checkboxCheckedBorder: tintColorDark,
  checkboxCheckedText: '#FFF',

  statisticsBackground: '#000',
  statisticsCardBackground: colors.neutral[900],
  statisticsLine: '#FFF',
  
  switchThumbColor: '#FFF',
  scales,
  tags: tagsDark,
  palette: colors,
}

export default {
  light,
  dark,
};
