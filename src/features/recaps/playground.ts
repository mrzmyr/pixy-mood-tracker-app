/**
 * Recap story playground for dev tools: every slide state, or a whole
 * story, from fixture data instead of app state. Only `src/dev` imports
 * this entry, so production bundles never include it.
 */
export { PLAYGROUND_DECKS } from "./story/playground-pages";
export type { PlaygroundData } from "./story/playground-pages";
export { RecapStoryPlayground } from "./story/story-playground";
