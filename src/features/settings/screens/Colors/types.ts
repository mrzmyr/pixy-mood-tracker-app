/** Props of the scale choice list on the Colors screen. */
export interface ScaleListProps {
  /** Scale ids in display order, keys of `colors.scales`. */
  scaleIds: readonly string[];
  /** Currently selected scale id. */
  selectedId: string;
  onSelect: (id: string) => void;
  /** Note shown below the list. */
  footer: string;
}
