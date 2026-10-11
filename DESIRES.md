# Desires

Capabilities that agents miss today. Each entry names the workaround until someone builds it.

- Add one bullet per capability: what is missing, the workaround, the upstream issue if one exists
- Remove the entry when the capability ships

- e2e: Maestro `setLocation` through agent-device. Workaround: set GPS with `xcrun simctl location` before the run ([development.md](docs/development.md#e2e-flows))
- e2e: testIDs on native header buttons (`Stack.Toolbar.Button`). Workaround: tap by label through `open-*.yaml` subflows ([development.md](docs/development.md#e2e-flows))
- e2e: `openLink` on iPhones outside `load-fixture.yaml` ([agent-device#2998](https://github.com/callstack/agent-device/issues/2998)). Workaround: `bun e2e run` loads fixtures with `devicectl`. Other flows with `openLink` do not run on iPhones ([development.md](docs/development.md#phones))
