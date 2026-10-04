export type { ContactList, ContactSummary, PeopleSources } from "./sources";
export { PeopleList } from "./components/PeopleList";
export {
  PeopleModal,
  SettingsPeople,
  SettingsPeopleArchive,
} from "./screens/People";
export { PersonAvatar } from "./components/PersonAvatar";
export {
  PersonChip,
  TILE_RING_GAP,
  TILE_RING_WIDTH,
} from "./components/PersonChip";
export { ContactImport } from "./screens/ContactImport";
export { PersonCreate, PersonEdit } from "./screens/PersonForm";
export {
  deleteAllAvatars,
  getAvatarUri,
  readAvatarBase64,
  writeAvatarFromBase64,
} from "./avatars";
export { setPeopleSourcesOverride } from "./sources";
export { sortPeopleByUsage } from "./usage";
export * from "./PeopleProvider";
