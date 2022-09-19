import { IScale } from './Scales';
import colors from './TailwindColors';

import scales from './Scales'

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
  
  linkButtonTextPrimary: string;
  linkButtonTextPrimaryDisabled: string;
  linkButtonTextSecondary: string;
  linkButtonTextSecondaryDisabled: string;
  linkButtonTextDanger: string;
  linkButtonTextDangerDisabled: string;

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
  statisticsDescription: string;
  statisticsCardBackground: string;
  statisticsCardSubtitle: string;
  statisticsFeedbackEmojiOpacity: number;
  statisticsFeedbackBorder: string;
  statisticsFeedbackText: string;
  statisticsWeekdayText: string;
  statisticsWeekdayBorder: string;
  statisticsCalendarDotBackground: string;
  statisticsCalendarDotText: string;
  statisticsNoDataBorder: string;
  statisticsNoDataText: string;
  
  switchThumbColor: string;
  scales: IScale;
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
  calendarItemBackgroundFuture: colors.gray[50],
  calendarItemTextColor: colors.neutral[500],
  calendarWeekNameColor: colors.neutral[400],
  calendarMonthNameColor: colors.neutral[400],
  
  linkButtonTextPrimary: tintColorLight,
  linkButtonTextPrimaryDisabled: colors.neutral[400],
  linkButtonTextSecondary: tintColorLight,
  linkButtonTextSecondaryDisabled: colors.neutral[400],
  linkButtonTextDanger: colors.red[500],
  linkButtonTextDangerDisabled: colors.neutral[400],

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
  statisticsDescription: colors.neutral[500],
  statisticsCardBackground: '#FFF',
  statisticsCardSubtitle: colors.neutral[500],
  statisticsFeedbackEmojiOpacity: 1,
  statisticsFeedbackBorder: colors.neutral[200],
  statisticsFeedbackText: colors.neutral[500],
  statisticsWeekdayText: colors.neutral[400],
  statisticsWeekdayBorder: colors.neutral[200],
  statisticsCalendarDotBackground: colors.neutral[200],
  statisticsCalendarDotText: colors.neutral[400],
  statisticsNoDataBorder: colors.neutral[300],
  statisticsNoDataText: colors.neutral[400],

  switchThumbColor: '#333',
  scales: scales.light,
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
  calendarItemBackground: colors.neutral[900],
  calendarItemBackgroundFuture: '#000',
  calendarItemTextColor: colors.neutral[300],
  calendarWeekNameColor: colors.neutral[500],
  calendarMonthNameColor: colors.neutral[500],
  
  linkButtonTextPrimary: tintColorLight,
  linkButtonTextPrimaryDisabled: colors.neutral[400],
  linkButtonTextSecondary: tintColorLight,
  linkButtonTextSecondaryDisabled: colors.neutral[400],
  linkButtonTextDanger: colors.red[500],
  linkButtonTextDangerDisabled: colors.neutral[400],
  
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
  statisticsDescription: colors.neutral[500],
  statisticsCardBackground: colors.neutral[900],
  statisticsCardSubtitle: colors.neutral[400],
  statisticsFeedbackEmojiOpacity: 0.6,
  statisticsFeedbackBorder: colors.neutral[800],
  statisticsFeedbackText: colors.neutral[500],
  statisticsWeekdayText: colors.neutral[400],
  statisticsWeekdayBorder: colors.neutral[800],
  statisticsCalendarDotBackground: colors.neutral[800],
  statisticsCalendarDotText: colors.neutral[600],
  statisticsNoDataBorder: colors.neutral[800],
  statisticsNoDataText: colors.neutral[700],
  
  switchThumbColor: '#FFF',
  scales: scales.dark,
  tags: tagsDark,
  palette: colors,
}

export default {
  light,
  dark,
};
