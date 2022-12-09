import { t } from "@/helpers/translation";
import { Emotion } from "@/types";

export type LoggerStep = "rating" | "tags" | "message" | "feedback" | "reminder";

export const STEP_OPTIONS: LoggerStep[] = [
  "rating",
  "tags",
  "message",
  "feedback",
];

export const DEFAULT_STEPS: LoggerStep[] = [
  "rating",
  "tags",
  "message",
  "feedback"
]

export const EMOTIONS: Emotion[] = [{
  key: 'angry',
  label: t('log_emotion_angry'),
  category: 'very_negative',
}, {
  key: 'despairful',
  label: t('log_emotion_despairful'),
  category: 'very_negative',
}, {
  key: 'disrespected',
  label: t('log_emotion_disrespected'),
  category: 'very_negative',
}, {
  key: 'fearful',
  label: t('log_emotion_fearful'),
  category: 'very_negative',
}, {
  key: 'grieved',
  label: t('log_emotion_grieved'),
  category: 'very_negative',
}, {
  key: 'shameful',
  label: t('log_emotion_shameful'),
  category: 'very_negative',
}, {
  key: 'anxious',
  label: t('log_emotion_anxious'),
  category: 'very_negative',
}, {
  key: 'disgusted',
  label: t('log_emotion_disgusted'),
  category: 'very_negative',
}, {
  key: 'embarrassed',
  label: t('log_emotion_embarrassed'),
  category: 'very_negative',
}, {
  key: 'frustrated',
  label: t('log_emotion_frustrated'),
  category: 'very_negative',
}, {
  key: 'rejected',
  label: t('log_emotion_rejected'),
  category: 'very_negative',
},

{
  key: 'annoyed',
  label: t('log_emotion_annoyed'),
  category: 'negative',
}, {
  key: 'insecure',
  label: t('log_emotion_insecure'),
  category: 'negative',
}, {
  key: 'let_down',
  label: t('log_emotion_let_down'),
  category: 'negative',
}, {
  key: 'nervous',
  label: t('log_emotion_nervous'),
  category: 'negative',
}, {
  key: 'pessimistic',
  label: t('log_emotion_pessimistic'),
  category: 'negative',
}, {
  key: 'shocked',
  label: t('log_emotion_shocked'),
  category: 'negative',
}, {
  key: 'unmotivated',
  label: t('log_emotion_unmotivated'),
  category: 'negative',
}, {
  key: 'guilty',
  label: t('log_emotion_guilty'),
  category: 'negative',
}, {
  key: 'jealous',
  label: t('log_emotion_jealous'),
  category: 'negative',
}, {
  key: 'lonely',
  label: t('log_emotion_lonely'),
  category: 'negative',
}, {
  key: 'overwhelmed',
  label: t('log_emotion_overwhelmed'),
  category: 'negative',
}, {
  key: 'sad',
  label: t('log_emotion_sad'),
  category: 'negative',
}, {
  key: 'unfulfilled',
  label: t('log_emotion_unfulfilled'),
  category: 'negative',
}, {
  key: 'weak',
  label: t('log_emotion_weak'),
  category: 'negative',
}, {
  key: 'worried',
  label: t('log_emotion_worried'),
  category: 'negative',
},

{
  key: 'awekward',
  label: t('log_emotion_awekward'),
  category: 'neutral',
}, {
  key: 'busy',
  label: t('log_emotion_busy'),
  category: 'neutral',
}, {
  key: 'critiqued',
  label: t('log_emotion_critiqued'),
  category: 'neutral',
}, {
  key: 'distracted',
  label: t('log_emotion_distracted'),
  category: 'neutral',
}, {
  key: 'suspicous',
  label: t('log_emotion_suspicous'),
  category: 'neutral',
}, {
  key: 'unsure',
  label: t('log_emotion_unsure'),
  category: 'neutral',
}, {
  key: 'bored',
  label: t('log_emotion_bored'),
  category: 'neutral',
}, {
  key: 'confused',
  label: t('log_emotion_confused'),
  category: 'neutral',
}, {
  key: 'desire',
  label: t('log_emotion_desire'),
  category: 'neutral',
}, {
  key: 'impatient',
  label: t('log_emotion_impatient'),
  category: 'neutral',
}, {
  key: 'tired',
  label: t('log_emotion_tired'),
  category: 'neutral',
},

{
  key: 'appreciated',
  label: t('log_emotion_appreciated'),
  category: 'positive',
}, {
  key: 'calm',
  label: t('log_emotion_calm'),
  category: 'positive',
}, {
  key: 'comfortable',
  label: t('log_emotion_comfortable'),
  category: 'positive',
}, {
  key: 'curious',
  label: t('log_emotion_curious'),
  category: 'positive',
}, {
  key: 'inspired',
  label: t('log_emotion_inspired'),
  category: 'positive',
}, {
  key: 'nostalgic',
  label: t('log_emotion_nostalgic'),
  category: 'positive',
}, {
  key: 'relieved',
  label: t('log_emotion_relieved'),
  category: 'positive',
}, {
  key: 'surprised',
  label: t('log_emotion_surprised'),
  category: 'positive',
}, {
  key: 'grateful',
  label: t('log_emotion_grateful'),
  category: 'positive',
}, {
  key: 'motivated',
  label: t('log_emotion_motivated'),
  category: 'positive',
}, {
  key: 'optimistic',
  label: t('log_emotion_optimistic'),
  category: 'positive',
}, {
  key: 'satified',
  label: t('log_emotion_satified'),
  category: 'positive',
},

{
  key: 'brave',
  label: t('log_emotion_brave'),
  category: 'very_positive',
}, {
  key: 'creative',
  label: t('log_emotion_creative'),
  category: 'very_positive',
}, {
  key: 'free',
  label: t('log_emotion_free'),
  category: 'very_positive',
}, {
  key: 'love',
  label: t('log_emotion_love'),
  category: 'very_positive',
}, {
  key: 'respected',
  label: t('log_emotion_respected'),
  category: 'very_positive',
}, {
  key: 'confident',
  label: t('log_emotion_confident'),
  category: 'very_positive',
}, {
  key: 'excited',
  label: t('log_emotion_excited'),
  category: 'very_positive',
}, {
  key: 'happy',
  label: t('log_emotion_happy'),
  category: 'very_positive',
}, {
  key: 'proud',
  label: t('log_emotion_proud'),
  category: 'very_positive',
}]
