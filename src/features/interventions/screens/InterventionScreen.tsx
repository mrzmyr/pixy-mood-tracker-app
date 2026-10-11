import { Redirect, useLocalSearchParams } from "expo-router";
import { isInterventionId } from "../catalog";
import { InterventionFlow } from "./Flow";

/** Route `/interventions/[id]?surface=&session=`. Unknown ids go home. */
export const InterventionScreen = () => {
  const { id, surface, session } = useLocalSearchParams<{
    id: string;
    surface?: string;
    session?: string;
  }>();

  if (!isInterventionId(id) || !session) {
    return <Redirect href="/calendar" />;
  }

  return (
    <InterventionFlow
      id={id}
      surface={surface === "confirmation" ? "confirmation" : "calendar"}
      session={session}
    />
  );
};
