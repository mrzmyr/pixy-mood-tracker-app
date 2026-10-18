declare namespace NodeJS {
  interface ProcessEnv {
    /**
     * Platform of the bundle. babel-preset-expo replaces it with a string
     * literal at build time, so branches for other platforms drop out.
     */
    EXPO_OS: "ios" | "android" | "web";
  }
}
