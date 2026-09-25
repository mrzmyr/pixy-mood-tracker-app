/**
 * Error with the structured fields required by the project error convention
 * (evlog pattern): `status`, `message`, `why`, and `fix`.
 */
export type StructuredError<Status extends string | number = string | number> =
  Error & {
    status: Status;
    why: string;
    fix: string;
  };

/**
 * Creates a real `Error` instance (keeps `stack` and `instanceof Error`)
 * enriched with `status`, `why`, and `fix`. `message` stays the plain error
 * message so existing checks on it keep working.
 */
export const createStructuredError = <Status extends string | number>({
  status,
  message,
  why,
  fix,
}: {
  status: Status;
  message: string;
  why: string;
  fix: string;
}): StructuredError<Status> =>
  Object.assign(new Error(message), {
    status,
    why,
    fix,
  });

/**
 * Error thrown when a context hook is used outside of its provider.
 * The message format `<hook> must be used within a <Provider>` is kept stable.
 */
export const createMissingProviderError = (
  hookName: string,
  providerName: string
): StructuredError =>
  createStructuredError({
    status: "missing_provider",
    message: `${hookName} must be used within a ${providerName}`,
    why: `${hookName} was called in a component that is not rendered inside ${providerName}`,
    fix: `Wrap the component tree using ${hookName} in ${providerName}`,
  });
