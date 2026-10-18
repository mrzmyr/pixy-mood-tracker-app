import { buildContactIndex, filterContactRows } from "../contact-import";

describe("contact import search", () => {
  const contacts = [
    { contactId: "c-zoe", name: "Zoë Park" },
    { contactId: "c-emile", name: "Émile Zola" },
    { contactId: "c-ben", name: "ben Zoeller" },
    { contactId: "c-ann", name: "Ann Lee" },
    { contactId: "c-emma", name: "Emma Öhrn" },
    { contactId: "c-carl", name: "Carl Ebert" },
  ];
  const index = buildContactIndex({ contacts, people: [] });
  const search = (query: string) =>
    filterContactRows(index, query).map((row) => row.contactId);

  test("sorts by name like localeCompare, not by code point", () => {
    expect(search("")).toEqual([
      "c-ann",
      "c-ben",
      "c-carl",
      "c-emile",
      "c-emma",
      "c-zoe",
    ]);
  });

  test.each([
    [" ZOE ", ["c-ben", "c-zoe"]],
    ["zo", ["c-ben", "c-emile", "c-zoe"]],
    ["ÉMILE", ["c-emile"]],
    ["emile", ["c-emile"]],
    ["ohrn", ["c-emma"]],
    ["Lee", ["c-ann"]],
    ["eb", ["c-carl"]],
    ["xyz", []],
  ])(
    "query %j matches given or family name, ignoring case and accents",
    (query, expected) => {
      expect(search(query)).toEqual(expected);
    }
  );

  test("marks contacts that are already people", () => {
    const rows = filterContactRows(
      buildContactIndex({
        contacts,
        people: [{ contactId: "c-ben" }, { contactId: undefined }],
      }),
      ""
    );

    expect(
      rows.filter((row) => row.isAdded).map((row) => row.contactId)
    ).toEqual(["c-ben"]);
  });

  test("keeps row objects across queries", () => {
    const all = filterContactRows(index, "");
    const filtered = filterContactRows(index, "zo");

    expect(filtered[0]).toBe(all.find((row) => row.contactId === "c-ben"));
  });
});
