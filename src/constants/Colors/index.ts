import colors from './TailwindColors';

import { TAG_COLOR_NAMES } from '../Config';
import scales from './Scales';

type TagColorKey = typeof TAG_COLOR_NAMES[number];

type TagColors = {
  [tag: TagColorKey]: {
    title: string;
    dot: string;
    background: string;
    text: string;
    border: string;
  }
}

const tagsDark: TagColors = {}
const tagsLight: TagColors = {}

const tagColorNames = TAG_COLOR_NAMES;

tagColorNames.map(color => {
  tagsDark[color] = {
    title: color,
    dot: colors[color]['500'],
    background: colors[color]['700'],
    text: colors[color]['200'],
    border: colors[color]['600'],
  }
  tagsLight[color] = {
    title: color,
    dot: colors[color]['400'],
    background: colors[color]['200'],
    text: colors[color]['700'],
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
  logHeaderText: colors.neutral[600],
  logHeaderHighlight: colors.neutral[200],

  logBackground: colors.neutral[100],
  logBackgroundTransparent: 'rgba(245,245,245, 0)',

  logCardBackground: colors.white,
  logCardBackgroundTransparent: 'rgba(255,255,255, 0)',
  logCardBorder: colors.neutral[200],

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
  feedbackSelectionText: colors.neutral[900],
  feedbackBackground: colors.neutral[100],

  cardBackground: '#fff',
  cardBorder: colors.neutral[200],

  headerBorder: colors.neutral[300],

  tabsBackground: colors.neutral[100],
  tabsBorder: colors.neutral[300],

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

  secondaryButtonBackground: colors.blue[100],
  secondaryButtonText: colors.blue[600],
  secondaryButtonBorder: colors.blue[100],
  secondaryButtonBorderDisabled: colors.neutral[300],
  secondaryButtonBackgroundDisabled: colors.neutral[300],
  secondaryButtonTextDisabled: colors.neutral[500],

  tertiaryButtonBackground: colors.neutral[200],
  tertiaryButtonText: colors.neutral[600],
  tertiaryButtonBorder: colors.neutral[200],
  tertiaryButtonBorderDisabled: colors.neutral[300],

  dangerButtonBackground: colors.neutral[200],
  dangerButtonText: colors.red[500],
  dangerButtonBorder: colors.neutral[200],

  textInputBackground: colors.neutral[200],
  textInputText: colors.neutral[800],
  textInputPlaceholder: colors.neutral[400],
  textInputLabel: colors.neutral[700],
  textInputBorder: colors.neutral[200],
  textInputBorderHighlight: tintColorLight,

  tagErrorBackground: colors.red[100],
  tagErrorText: colors.red[800],
  tagSuccessBackground: colors.green[100],
  tagSuccessText: colors.green[900],

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
  statisticsFeedbackEmojiBackground: colors.neutral[100],
  statisticsFeedbackBorder: colors.neutral[200],
  statisticsFeedbackText: colors.neutral[500],
  statisticsWeekdayText: colors.neutral[400],
  statisticsWeekdayBorder: colors.neutral[200],
  statisticsCalendarDotBackground: colors.neutral[200],
  statisticsCalendarDotText: colors.neutral[500],
  statisticsCalendarDotBorder: colors.neutral[400],
  statisticsNoDataBorder: colors.neutral[300],
  statisticsNoDataText: colors.neutral[500],

  statisticsLinePrimary: colors.neutral[400],
  statisticsLineMuted: colors.neutral[300],
  statisticsLineHighlight: tintColorLight,
  statisticsLegendText: colors.neutral[400],
  statisticsGridLine: colors.neutral[200],

  statisticsNotEnoughDataTitle: colors.black,
  statisticsNotEnoughDataSubtitle: colors.neutral[500],
  statisticsNotEnoughDataBackdrop: 'rgba(255, 255, 255, 0.8)',

  statisticsTagsTrendMutedBackground: colors.neutral[200],
  statisticsTagsTrendMutedText: colors.neutral[800],

  yearPixelsEmptyDot: colors.neutral[200],
  yearPixelsLegendText: colors.neutral[400],

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

  sharingLogoBackground: colors.white,
  sharingLogoText: colors.neutral[600],

  entryBackground: colors.white,
  entryBorder: colors.neutral[200],
  entryItemBorder: colors.neutral[200],
  entryItemBackground: colors.white,

  promoBackground: tintColorLight,
  promoBorder: 'rgba(255, 255, 255, 0.1)',
  promoText: colors.white,

  emotionButtonBackground: colors.white,
  emotionButtonBackgroundActive: colors.neutral[900],
  emotionButtonBorder: colors.neutral[200],
  emotionButtonBorderActive: tintColorLight,
  emotionButtonText: colors.neutral[900],
  emotionButtonTextActive: colors.white,

  tooltipBackground: 'rgba(0, 0, 0, 0.8)',
  tooltipText: colors.white,
  tooltipTextSecondary: colors.neutral[400],

  feedbackBoxBackground: colors.amber[50],

  LogListAddButtonBorder: colors.neutral[300],
  LogListAddButtonText: colors.neutral[400],

  promoCardBackground: colors.white,
  promoCardText: colors.neutral[800],
  promoCardTextSecondary: colors.neutral[500],
  promoCardBorder: colors.neutral[200],

  sleepQualityEmpty: colors.indigo[100],
  sleepQualityFull: colors.indigo[500],

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
  link: tintColorDark,
  tint: tintColorDark,

  loadingIndicator: '#fff',

  keyboardToolbarIcon: colors.neutral[500],
  keyboardToolbarBackground: colors.neutral[200],

  logHeaderBackground: colors.neutral[900],
  logHeaderBorder: colors.neutral[800],
  logHeaderText: colors.neutral[300],
  logHeaderHighlight: colors.neutral[800],

  logBackground: colors.neutral[900],
  logBackgroundTransparent: 'rgba(23, 23, 23, 0)',

  logCardBackground: colors.neutral[800],
  logCardBackgroundTransparent: 'rgba(38,38,38,0)',
  logCardBorder: colors.neutral[700],

  logActionBackground: colors.neutral[800],
  logActionBorder: tintColorDark,
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
  feedbackSelectionText: colors.white,
  feedbackBackground: colors.neutral[900],

  cardBackground: colors.neutral[900],
  cardBorder: colors.neutral[800],

  headerBorder: colors.neutral[800],

  tabsBackground: 'transparent',
  tabsBorder: colors.neutral[800],

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

  linkButtonTextPrimary: tintColorDark,
  linkButtonTextPrimaryDisabled: colors.neutral[400],
  linkButtonTextSecondary: colors.neutral[500],
  linkButtonTextSecondaryDisabled: colors.neutral[400],
  linkButtonTextDanger: colors.red[500],
  linkButtonTextDangerDisabled: colors.neutral[400],

  primaryButtonBackground: tintColorDark,
  primaryButtonText: colors.white,
  primaryButtonBorder: tintColorDark,

  primaryButtonBackgroundDisabled: colors.neutral[800],
  primaryButtonTextDisabled: colors.neutral[400],
  primaryButtonBorderDisabled: colors.neutral[800],

  secondaryButtonBackground: colors.blue[900],
  secondaryButtonText: colors.blue[100],
  secondaryButtonBorder: colors.blue[900],
  secondaryButtonBackgroundDisabled: colors.neutral[800],
  secondaryButtonTextDisabled: colors.neutral[400],
  secondaryButtonBorderDisabled: colors.neutral[800],

  tertiaryButtonBackground: colors.neutral[800],
  tertiaryButtonText: colors.white,
  tertiaryButtonBorder: colors.neutral[800],
  tertiaryButtonBorderDisabled: colors.neutral[800],

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
  statisticsFeedbackEmojiBackground: colors.neutral[800],
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

  statisticsLinePrimary: colors.white,
  statisticsLineMuted: colors.neutral[500],
  statisticsLineHighlight: tintColorDark,
  statisticsLegendText: colors.neutral[600],
  statisticsGridLine: colors.neutral[700],

  statisticsNotEnoughDataTitle: colors.white,
  statisticsNotEnoughDataSubtitle: colors.neutral[500],
  statisticsNotEnoughDataBackdrop: 'rgba(0, 0, 0, 0.7)',

  yearPixelsEmptyDot: colors.neutral[800],
  yearPixelsLegendText: colors.neutral[500],

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

  sharingLogoBackground: colors.neutral[800],
  sharingLogoText: colors.neutral[400],

  entryBackground: colors.neutral[800],
  entryBorder: colors.neutral[700],
  entryItemBorder: colors.neutral[700],
  entryItemBackground: colors.neutral[800],

  promoBackground: tintColorDark,
  promoBorder: 'rgba(255, 255, 255, 0.1)',
  promoText: colors.white,

  emotionButtonBackground: colors.neutral[900],
  emotionButtonBackgroundActive: colors.white,
  emotionButtonBorder: colors.neutral[800],
  emotionButtonBorderActive: colors.white,
  emotionButtonText: colors.white,
  emotionButtonTextActive: colors.neutral[900],

  feedbackBoxBackground: colors.neutral[900],

  tooltipBackground: 'rgba(0, 0, 0, 0.8)',
  tooltipText: colors.white,
  tooltipTextSecondary: colors.neutral[400],

  LogListAddButtonBorder: colors.neutral[700],
  LogListAddButtonText: colors.neutral[500],

  promoCardBackground: colors.neutral[900],
  promoCardText: colors.white,
  promoCardTextSecondary: colors.neutral[400],
  promoCardBorder: colors.neutral[800],

  sleepQualityEmpty: colors.indigo[800],
  sleepQualityFull: colors.indigo[400],

  switchThumbColor: '#FFF',
  scales: scales.dark,
  tags: tagsDark,
  palette: colors,
}

export default {
  light,
  dark,
};
