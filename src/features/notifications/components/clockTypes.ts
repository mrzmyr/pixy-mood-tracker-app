/**
 * Props every platform `Clock` shares. The platform files add `style`.
 */
export interface ClockProps {
  timeDate: Date;
  /** Called with the picked time. Not called when the picker is dismissed. */
  onChange: (date: Date) => void;
}
