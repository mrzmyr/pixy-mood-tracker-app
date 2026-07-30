#!/usr/bin/env bash
# Runs the Pixy e2e suite on a connected Android device.
# Usage: ./e2e/run.sh [flow-file...]  (default: all flows in e2e/flows)
set -uo pipefail

cd "$(dirname "$0")/.."

# Maestro needs JDK 17+; ignore any preset JAVA_HOME pointing at an older JDK.
JAVA_HOME_17="$(/usr/libexec/java_home -v 17+ 2>/dev/null || true)"
if [ -n "$JAVA_HOME_17" ]; then
  export JAVA_HOME="$JAVA_HOME_17"
fi
export PATH="$JAVA_HOME/bin:$PATH"
export MAESTRO_CLI_NO_ANALYTICS=1
export MAESTRO_CLI_ANALYSIS_NOTIFICATION_DISABLED=true
MAESTRO="${MAESTRO:-$HOME/.maestro/bin/maestro}"

if ! adb get-state >/dev/null 2>&1; then
  echo "No Android device connected (adb)."; exit 1
fi

FLOWS=("$@")
if [ ${#FLOWS[@]} -eq 0 ]; then
  FLOWS=(e2e/flows/*.yaml)
fi

pass=0; fail=0; failed_flows=()
for f in "${FLOWS[@]}"; do
  echo "=== $f"
  if "$MAESTRO" test "$f"; then
    pass=$((pass+1))
  else
    fail=$((fail+1)); failed_flows+=("$f")
  fi
done

echo
echo "Passed: $pass  Failed: $fail"
if [ $fail -gt 0 ]; then
  printf 'Failed flows:\n'; printf '  %s\n' "${failed_flows[@]}"
  exit 1
fi
