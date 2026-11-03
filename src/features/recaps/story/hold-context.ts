import noop from "lodash/noop";
import { createContext } from "react";

/**
 * Lets slide content hold the story while the user looks at a detail, for
 * example a person's month on the orbit. `true` holds, `false` lets go. The
 * player lets go by itself on every slide change.
 */
export const StoryHoldContext = createContext<(isHeld: boolean) => void>(noop);
