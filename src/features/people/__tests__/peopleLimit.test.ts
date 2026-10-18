import { MAX_PEOPLE } from "@/constants/Config";
import { getPeopleLimit } from "../peopleLimit";
import type { Person } from "../PeopleProvider";

const makePeople = (active: number, archived: number): Person[] =>
  Array.from({ length: active + archived }, (_, index) => ({
    id: `person-${index}`,
    name: `Person ${index}`,
    avatar: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    isArchived: index >= active,
  }));

describe("getPeopleLimit", () => {
  it("is not reached below the limit", () => {
    expect(getPeopleLimit(makePeople(MAX_PEOPLE - 1, 0)).reached).toBe(false);
  });

  it("is reached exactly at the limit", () => {
    expect(getPeopleLimit(makePeople(MAX_PEOPLE, 0)).reached).toBe(true);
  });

  it("counts archived people toward the limit", () => {
    const limit = getPeopleLimit(makePeople(MAX_PEOPLE - 2, 2));
    expect(limit.reached).toBe(true);
    expect(limit.remaining).toBe(0);
  });

  it("counts remaining slots for the contact import", () => {
    expect(getPeopleLimit(makePeople(10, 5)).remaining).toBe(MAX_PEOPLE - 15);
  });
});
