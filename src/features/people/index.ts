export type { ContactList, ContactSummary, PeopleSources } from "./sources";
export { PeopleList } from "./components/people-list";
export { PersonAvatar } from "./components/person-avatar";
export { PersonChip } from "./components/person-chip";
export { NoteContent } from "./components/note-content";
export { MentionSpans, MentionSuggestions } from "./components/mention-editor";
export { useMentionEditor } from "./hooks/use-mention-editor";
export {
  MENTION_TRIGGER,
  applyDisplayEdit,
  findMentionQuery,
  getMentionedIds,
  hasMention,
  matchMentionCandidates,
  noteToPlainText,
  parseNote,
  serializeNote,
  spliceSegments,
  toDisplayText,
} from "./mentions";
export type { NoteSegment } from "./mentions";
export { getPersonMenuActions, usePersonMenu } from "./hooks/use-person-menu";
export type {
  PersonMenuAction,
  PersonMenuActionId,
} from "./hooks/use-person-menu";
export { getInitials } from "./initials";
export { getLetterSection } from "./contact-import";
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
export { ROLE_PRESETS, RoleSchema, type RolePreset } from "./role-presets";
export * from "./people-provider";
