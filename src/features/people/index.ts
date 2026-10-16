export type { ContactList, ContactSummary, PeopleSources } from "./sources";
export { PeopleList } from "./components/PeopleList";
export { SettingsPeople, SettingsPeopleArchive } from "./screens/People";
export { PersonAvatar } from "./components/PersonAvatar";
export { PersonChip } from "./components/PersonChip";
export { TILE_RING_GAP, TILE_RING_WIDTH } from "./tile";
export { ContactImport } from "./screens/ContactImport";
export { PersonCreate, PersonEdit } from "./screens/PersonForm";
export {
  deleteAllAvatars,
  getAvatarUri,
  readAvatarBase64,
  writeAvatarFromBase64,
} from "./avatars";
export { setPeopleSourcesOverride } from "./sources";
export { getPeopleLimit } from "./peopleLimit";
export { sortPeopleByUsage } from "./usage";
export * from "./PeopleProvider";
