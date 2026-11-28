/** One drawing element: SVG tag name and its attributes, with a React `key`. */
export type GlyphElement = readonly [
  string,
  { readonly [attribute: string]: string | number },
];

/**
 * Pixy icon geometry on the 24 by 24 grid. `outline` is the line drawing.
 * `silhouette` is the closed body under it, for two-tone icons. Empty for
 * line glyphs like arrows.
 */
export interface Glyph {
  readonly outline: readonly GlyphElement[];
  readonly silhouette: readonly GlyphElement[];
}
