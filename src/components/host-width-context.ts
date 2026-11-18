import { createContext } from "react";

/**
 * Width of a cell whose content renders inside a SwiftUI host
 * (`RNHostView`), like the iOS emotion context menu. There, flex does not
 * shrink text: a long label draws past its parent. A label with
 * `useLabelMore` reads this width and gets a number as `maxWidth`.
 * Undefined outside a host, where flex works.
 */
export const HostWidthContext = createContext<number | undefined>(undefined);
