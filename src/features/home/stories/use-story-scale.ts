import useColors from "@/hooks/use-colors";
import { INITIAL_STATE } from "@/constants/settings";

/** Default mood scale of the current story theme. */
export const useStoryScale = () => useColors().scales[INITIAL_STATE.scaleType];
