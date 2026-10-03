import { DemoImage } from "@/components/DemoImage";

/**
 * Real screenshots of the widget flow on iOS. Replace the files in
 * `assets/images/widget` after a widget change.
 */
const GUIDE_IMAGES = [
  require("../../../../../assets/images/widget/step-1.jpg"),
  require("../../../../../assets/images/widget/step-2.jpg"),
  require("../../../../../assets/images/widget/step-3.jpg"),
];

/** Screenshot card for a guide step; `step` must be 1 to 3. */
export const GuideImage = ({ step }: { step: number }) => (
  <DemoImage source={GUIDE_IMAGES[step - 1]} />
);
