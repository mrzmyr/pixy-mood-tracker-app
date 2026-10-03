/**
 * One catalog entry: a component or block rendered with sample props.
 *
 * `source` is the file path under `src/`. `frame` sets the stage width:
 * `component` (default) is 560, `fluid` is full width, and `phone` is
 * phone width for blocks that fill a screen.
 */
export interface CatalogEntry {
  name: string;
  source: string;
  note?: string;
  frame?: "component" | "fluid" | "phone";
  render: () => React.ReactNode;
}

/** Named group of entries, shown as one sidebar link. */
export interface CatalogGroup {
  id: string;
  title: string;
  entries: CatalogEntry[];
}
