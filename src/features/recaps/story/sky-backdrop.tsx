import { useSharedValue } from "react-native-reanimated";
import { Sky, SKY_DRIFT_SPEED } from "@/components/sky";

/** Drifting sky behind sky slides. One sky across slides in a row. */
export const SkyBackdrop = () => {
  const speed = useSharedValue(SKY_DRIFT_SPEED);
  return <Sky speed={speed} resumeKey="recap-story" />;
};
