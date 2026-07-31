jest.mock("posthog-react-native", () => {
  const client = {
    capture: jest.fn(),
    identify: jest.fn(),
    optIn: jest.fn(),
    optOut: jest.fn(),
    reset: jest.fn(),
  };

  return {
    PostHogProvider: ({ children }) => children,
    usePostHog: () => client,
  };
});
