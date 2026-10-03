import type { Person } from "./PeopleProvider";
import type { ContactSummary } from "./sources";

/** One row of the contact import list. */
export interface ContactRow extends ContactSummary {
  /** A person already links this contact; the row cannot be picked again. */
  isAdded: boolean;
}

const normalize = (text: string) =>
  text
    .normalize("NFD")
    .replaceAll(/[\u0300-\u036F]/gu, "")
    .toLowerCase();

/**
 * Rows for the import list: sorted by name, filtered by `query` (case and
 * accent insensitive), and marked when a person already links the contact.
 */
export const buildContactRows = ({
  contacts,
  people,
  query,
}: {
  contacts: ContactSummary[];
  people: Pick<Person, "contactId">[];
  query: string;
}): ContactRow[] => {
  const addedIds = new Set(people.map((person) => person.contactId));
  const needle = normalize(query.trim());
  return contacts
    .flatMap((contact) =>
      normalize(contact.name).includes(needle)
        ? [{ ...contact, isAdded: addedIds.has(contact.contactId) }]
        : []
    )
    .sort((a, b) => a.name.localeCompare(b.name));
};
