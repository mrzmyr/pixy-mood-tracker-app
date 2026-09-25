---
name: test-pr
description: Run e2e tests for a pull request and attach video proof
---

- run e2e tests on android and ios
- Upload video of them in PR desc, see `attach-pr-asset` skill
- We might run multiple in parallel locally, so make sure to not override something and use own instance of simulators
- don't stop until all are green and videos are in the PR
- Put android and ios in table next to each other + title in PR markdown
