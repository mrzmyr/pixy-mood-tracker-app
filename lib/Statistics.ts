import { LogItem } from './../hooks/useLogs';

export const getMovingAverage = (values: number[], period: number) => {
  const sum = values.reduce((a, b) => a + b, 0);
  return sum / period;
}

export const getValueFromRating = (rating: LogItem['rating']): number | null => {
  if(!rating) return null;
  
  return {
    'extremely_good': 7,
    'very_good': 6,
    'good': 5,
    'neutral': 4, 
    'bad': 3,
    'very_bad': 2,
    'extremely_bad': 1
  }[rating];
}

export const RATINGS = [
  { label: 'extremely_good', value: 7 },
  { label: 'very_good', value: 6 },
  { label: 'good', value: 5 },
  { label: 'neutral', value: 4 },
  { label: 'bad', value: 3 },
  { label: 'very_bad', value: 2 },
  { label: 'extremely_bad', value: 1 }
]