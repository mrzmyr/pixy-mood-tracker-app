import type { Person } from "./people-provider";
import type { ContactSummary } from "./sources";

/** One row of the contact import list. */
export interface ContactRow extends ContactSummary {
  /** A person already links this contact; the row cannot be picked again. */
  isAdded: boolean;
}

/** A row with its precomputed search key. */
interface IndexedContactRow {
  row: ContactRow;
  /** Name without accents, lower case; `filterContactRows` matches on it. */
  searchKey: string;
}

/** Sorted import rows with search keys. Build once per contacts or people change. */
export type ContactIndex = IndexedContactRow[];

// Default locale and options: same order as `localeCompare()` without arguments.
const collator = new Intl.Collator();

const normalize = (text: string) =>
  text
    .normalize("NFD")
    .replaceAll(/[\u0300-\u036F]/gu, "")
    .toLowerCase();

/**
 * Rows for the import list, sorted by name and marked when a person already
 * links the contact. Normalizes and sorts once, so typing a query only filters.
 */
export const buildContactIndex = ({
  contacts,
  people,
}: {
  contacts: ContactSummary[];
  people: Pick<Person, "contactId">[];
}): ContactIndex => {
  const addedIds = new Set(people.map((person) => person.contactId));
  return contacts
    .map((contact) => ({
      row: { ...contact, isAdded: addedIds.has(contact.contactId) },
      searchKey: normalize(contact.name),
    }))
    .sort((a, b) => collator.compare(a.row.name, b.row.name));
};

/**
 * Rows whose name contains `query` (case and accent insensitive), in index
 * order. Returns the same row objects for every query.
 */
export const filterContactRows = (
  index: ContactIndex,
  query: string
): ContactRow[] => {
  const needle = normalize(query.trim());
  return index.flatMap(({ row, searchKey }) =>
    searchKey.includes(needle) ? [row] : []
  );
};
