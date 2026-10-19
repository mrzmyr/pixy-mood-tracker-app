export type { ContactList, ContactSummary, PeopleSources } from "./sources";
export { PeopleList } from "./components/people-list";
export { PersonAvatar } from "./components/person-avatar";
export { PersonChip } from "./components/person-chip";
export { usePersonActionSheet } from "./hooks/use-person-action-sheet";
export { movePerson } from "./people-order";
export { TILE_RING_GAP, TILE_RING_WIDTH } from "./tile";
export {
  deleteAllAvatars,
  getAvatarUri,
  readAvatarBase64,
  writeAvatarFromBase64,
} from "./avatars";
export { setPeopleSourcesOverride } from "./sources";
export { getPeopleLimit } from "./people-limit";
export * from "./people-provider";
