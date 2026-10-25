import { t } from "@/lib/translation";
import type { PersonMoment } from "../types";

/** Why a person shows this period, as one short line. */
export const getMomentLine = (moment: PersonMoment) => {
  switch (moment.kind) {
    case "back": {
      return t("recaps_person_moment_back", { count: moment.weeks });
    }
    case "new": {
      return t("recaps_person_moment_new");
    }
    case "milestone": {
      return t("recaps_person_moment_milestone", {
        count: moment.days,
        year: moment.year,
      });
    }
    default: {
      const unknown: never = moment;
      return unknown;
    }
  }
};
