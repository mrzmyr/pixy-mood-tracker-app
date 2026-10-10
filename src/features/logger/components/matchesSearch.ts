/** Case-insensitive substring match; an empty query matches everything. */
export const matchesSearch = (text: string, query: string) =>
  text.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase());
