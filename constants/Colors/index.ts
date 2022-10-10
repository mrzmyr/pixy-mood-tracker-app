import colors from './TailwindColors';

import scales from './Scales';
import { COLOR_NAMES } from '../../hooks/useSettings';

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

const tagColorNames = COLOR_NAMES;

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

const light = {
  text: '#000',
  textSecondary: colors.neutral[500],
  background: colors.neutral[100],
  backgroundSecondary: colors.neutral[300],
  link: tintColorLight,
  tint: tintColorLight,

  loadingIndicator: colors.neutral[500],

  keyboardToolbarIcon: colors.neutral[500],
  keyboardToolbarBackground: colors.neutral[200],
  
  logHeaderBackground: colors.neutral[50],
  logHeaderBorder: colors.neutral[200],
  logHeaderText: colors.neutral[500],
  logBackground: colors.neutral[100],
  logCardBackground: colors.white,
  logBackgroundTransparent: 'rgba(245,245,245, 0)',

  logActionBackground: colors.neutral[200],
  logActionBorder: tintColorLight,
  logActionText: colors.neutral[500],
  
  tagBackground: colors.white,
  tagText: colors.neutral[800],
  tagBorder: colors.white,
  tagBackgroundActive: colors.blue[100],
  tagTextActive: colors.blue[600],
  tagBorderActive: colors.blue[600],
  
  stepperBackground: colors.neutral[300],
  stepperBackgroundActive: colors.neutral[700],

  miniButtonBackground: tintColorLight,
  miniButtonText: '#FFF',

  bottomSheetHeaderBackground: colors.neutral[50],
  bottomSheetBackground: colors.neutral[100],
  bottomSheetHeaderBorder: colors.neutral[200],
  bottomSheetHandle: 'rgba(255, 255, 255, 0.5)',

  feedbackSelectionBackground: colors.neutral[200],
  feedbackBackground: colors.neutral[100],
  
  cardBackground: '#fff',

  headerBorder: colors.neutral[300],
  tabsIconActive: tintColorLight,
  tabsIconInactive: colors.neutral[400],
  tabsTextActive: tintColorLight,
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
  
  linkButtonTextPrimary: tintColorLight,
  linkButtonTextPrimaryDisabled: colors.neutral[400],
  linkButtonTextSecondary: colors.neutral[500],
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
  secondaryButtonText: colors.neutral[900],
  secondaryButtonBorder: colors.neutral[200],
  
  dangerButtonBackground: colors.neutral[200],
  dangerButtonText: colors.red[500],
  dangerButtonBorder: colors.neutral[200],
  
  textInputBackground: colors.neutral[200],
  textInputText: colors.neutral[800],
  textInputPlaceholder: colors.neutral[400],
  textInputLabel: colors.neutral[700],
  textInputBorder: colors.neutral[200],
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
  statisticsCalendarDotText: colors.neutral[500],
  statisticsCalendarDotBorder: colors.neutral[400],
  statisticsNoDataBorder: colors.neutral[300],
  statisticsNoDataText: colors.neutral[500],
  statisticsLinePrimary: colors.neutral[600],
  statisticsLineMuted: colors.neutral[200],
  statisticsLineHighlight: tintColorLight,

  statisticsTagsTrendMutedBackground: colors.neutral[200],
  statisticsTagsTrendMutedText: colors.neutral[800],

  onboardingTitle: colors.black,
  onboardingBody: colors.neutral[700],
  
  onboardingTopBackground: colors.neutral[900],
  onboardingBottomBackground: colors.neutral[100],
  onboardingBottomBorder: colors.neutral[300],
  onboardingPaginationText: colors.neutral[500],
  onboardingPaginationDotActive: colors.neutral[500],
  onboardingPaginationDotInactive: colors.neutral[300],

  onboardingListItemDot: colors.neutral[500],
  onboardingListItemText: colors.neutral[700],

  onboardingPrivacyBadgeBackground: colors.black,
  onboardingPrivacyBadgeVector: colors.white,

  switchThumbColor: '#333',
  scales: scales.light,
  tags: tagsLight,
  palette: colors,
}

export type IColors = typeof light & {
  scales: typeof scales.light
  tags: typeof tagsLight
}

const dark: IColors & {
  scales: typeof scales.dark
  tags: typeof tagsDark
} = {
  text: '#fff',
  textSecondary: colors.neutral[400],
  background: '#000',
  backgroundSecondary: colors.neutral[900],
  link: tintColorLight,
  tint: tintColorDark,

  loadingIndicator: '#fff',

  keyboardToolbarIcon: colors.neutral[500],
  keyboardToolbarBackground: colors.neutral[200],
  
  logHeaderBackground: colors.neutral[900],
  logHeaderBorder: colors.neutral[800],
  logHeaderText: colors.neutral[300],
  logBackground: colors.neutral[900],
  logCardBackground: colors.neutral[800],
  logBackgroundTransparent: 'rgba(28,25,23, 0)',

  logActionBackground: colors.neutral[800],
  logActionBorder: tintColorLight,
  logActionText: colors.neutral[300],
  
  tagBackground: colors.neutral[900],
  tagText: colors.neutral[200],
  tagBorder: colors.neutral[800],
  tagBackgroundActive: colors.blue[900],
  tagTextActive: colors.blue[100],
  tagBorderActive: colors.blue[600],
  
  stepperBackground: colors.neutral[800],
  stepperBackgroundActive: colors.neutral[600],

  miniButtonBackground: tintColorDark,
  miniButtonText: '#fff',

  bottomSheetHeaderBackground: colors.neutral[900],
  bottomSheetBackground: colors.neutral[900],
  bottomSheetHeaderBorder: colors.neutral[800],
  bottomSheetHandle: 'rgba(255, 255, 255, 0.5)',

  feedbackSelectionBackground: colors.neutral[800],
  feedbackBackground: colors.neutral[900],
  
  cardBackground: colors.neutral[900],
  
  headerBorder: colors.neutral[800],
  tabsIconActive: tintColorDark,
  tabsIconInactive: colors.neutral[600],
  tabsTextActive: tintColorDark,
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
  linkButtonTextSecondary: colors.neutral[500],
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
  secondaryButtonText: 'white',
  secondaryButtonBorder: colors.neutral[800],

  dangerButtonBackground: colors.neutral[800],
  dangerButtonText: colors.red[500],
  dangerButtonBorder: colors.neutral[800],

  textInputBackground: colors.neutral[800],
  textInputText: colors.neutral[200],
  textInputPlaceholder: colors.neutral[500],
  textInputBorder: colors.neutral[900],
  textInputBorderHighlight: tintColorDark,
  textInputLabel: colors.neutral[500],

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
  statisticsCalendarDotBorder: colors.neutral[700],
  statisticsNoDataBorder: colors.neutral[800],
  statisticsNoDataText: colors.neutral[700],

  statisticsTagsTrendMutedBackground: colors.neutral[800],
  statisticsTagsTrendMutedText: colors.neutral[500],

  statisticsLinePrimary: colors.neutral[200],
  statisticsLineMuted: colors.neutral[500],
  statisticsLineHighlight: tintColorDark,
  
  onboardingTitle: colors.white,
  onboardingBody: colors.neutral[300],
  
  onboardingTopBackground: colors.neutral[900],
  onboardingBottomBackground: colors.neutral[800],
  onboardingBottomBorder: colors.neutral[700],
  onboardingPaginationText: colors.neutral[300],
  onboardingPaginationDotActive: colors.neutral[300],
  onboardingPaginationDotInactive: colors.neutral[700],

  onboardingPrivacyBadgeBackground: colors.white,
  onboardingPrivacyBadgeVector: colors.neutral[900],
  onboardingListItemDot: colors.neutral[700],
  onboardingListItemText: colors.neutral[300],
  
  switchThumbColor: '#FFF',
  scales: scales.dark,
  tags: tagsDark,
  palette: colors,
}

export default {
  light,
  dark,
};
