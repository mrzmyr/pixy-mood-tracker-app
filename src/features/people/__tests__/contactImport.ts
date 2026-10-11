import { buildContactRows } from "../contactImport";

describe("buildContactRows()", () => {
  const contacts = [
    { contactId: "c-zoe", name: "Zoë Park" },
    { contactId: "c-ann", name: "Ann Lee" },
    { contactId: "c-ben", name: "Ben Zoeller" },
  ];

  test("sorts by name and marks contacts that are already people", () => {
    const rows = buildContactRows({
      contacts,
      people: [{ contactId: "c-ben" }, { contactId: undefined }],
      query: "",
    });

    expect(rows).toEqual([
      { contactId: "c-ann", name: "Ann Lee", isAdded: false },
      { contactId: "c-ben", name: "Ben Zoeller", isAdded: true },
      { contactId: "c-zoe", name: "Zoë Park", isAdded: false },
    ]);
  });

  test("filters by name, ignoring case and accents", () => {
    const rows = buildContactRows({ contacts, people: [], query: " ZOE " });

    expect(rows.map((row) => row.contactId)).toEqual(["c-ben", "c-zoe"]);
  });
});
