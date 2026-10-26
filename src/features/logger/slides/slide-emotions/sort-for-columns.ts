/**
 * Rearrange items so they read alphabetically when scanned column-by-column in a grid.
 *
 * Example with 6 items [A, B, C, D, E, F] and 2 columns:
 * - Row-by-row layout (wrong): A B / C D / E F → reads A,C,E,B,D,F down columns
 * - Column-by-column layout (correct): A D / B E / C F → reads A,B,C,D,E,F down columns
 *
 * @param items - Already sorted array
 * @param columns - Number of columns in the grid
 * @returns Items rearranged for column-by-column reading
 */
export const sortForColumns = <T>(items: T[], columns: number): T[] => {
  if (items.length === 0 || columns <= 1) {
    return items;
  }

  const rows = Math.ceil(items.length / columns);
  const result: T[] = [];

  // Fill the grid column by column, then read row by row
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < columns; col += 1) {
      const index = col * rows + row;
      if (index < items.length) {
        result.push(items[index]);
      }
    }
  }

  return result;
};
