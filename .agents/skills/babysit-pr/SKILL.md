---
name: babysit-pr
description: Monitor a pull request until review comments and CI are handled. Use when the user asks to monitor, babysit, or watch a PR.
---

# Babysit PR

Goal: keep watching the current PR until review comments and CI are handled.

- keep watching the current PR; do not stop after one pass
- refresh live state each pass (`gh pr view`, `gh pr checks`, review comments)
- wait for multiple review agent post comments -> fix then → when done, resolve them
- conflicts -> resolve them
- build failing -> investigate -> fix
- test failing -> investigate -> fix
- if checks are still running and there is nothing to fix, wait (`gh pr checks --watch`) instead of polling in a tight loop
- push fixes; never force-push; never merge the PR
