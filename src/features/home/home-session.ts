// Home opens once per app session on its own. Flags load after start, so
// the app root cannot pick Home at launch. Any later switch is the user's.
let hasOpenedHome = false;

/** Marks Home as opened in this session, so Calendar stays when chosen. */
export const markHomeOpened = () => {
  hasOpenedHome = true;
};

/** Whether Home opened in this app session. */
export const getHasOpenedHome = () => hasOpenedHome;
