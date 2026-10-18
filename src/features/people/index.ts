export type { ContactList, ContactSummary, PeopleSources } from "./sources";
export { PeopleList } from "./components/people-list";
export { PersonAvatar } from "./components/person-avatar";
export { PersonChip } from "./components/person-chip";
export { TILE_RING_GAP, TILE_RING_WIDTH } from "./tile";
export {
  deleteAllAvatars,
  getAvatarUri,
  readAvatarBase64,
  writeAvatarFromBase64,
} from "./avatars";
export { setPeopleSourcesOverride } from "./sources";
export { getPeopleLimit } from "./people-limit";
export { sortPeopleByUsage } from "./usage";
export * from "./people-provider";
