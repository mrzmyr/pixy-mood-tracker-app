---
name: pr-proof
description: Upload screenshots or videos to a PR body. Required for every PR with a visual change. Use also when asked for screenshots, video, before/after, or visual proof.
---

One method: `gh pr edit --attach`. Never commit proof files to any branch. No proof branches, no releases, no `docs/pr-evidence/`.

# When

- PR changes what the user sees (screens, components, colors, layout, copy, animation): screenshot required. Never open the PR without it
- Changed existing UI: add before and after
- Motion (animation, transition, gesture, scroll): add video too
- Capture on iOS and Android, see [run-app skill](../run-app/SKILL.md)

# Steps

1. Save files outside the repo, for example `/tmp/<pr>/`. Use unique file names per PR.
2. Video: speed and size per [test-pr video rules](../test-pr/SKILL.md#video).
3. Upload. Alt text follows `#`. Up to 50 files per command:

```sh
gh pr edit <n> --attach '/tmp/<pr>/before.png#Before: <state>' --attach '/tmp/<pr>/after.png#After: <state>'
```

4. Read URLs back. `--attach` appends them at the end of the body:

```sh
gh pr view <n> --json body --jq .body | grep -oE 'https://github.com/user-attachments/assets/[a-z0-9-]+'
```

5. Move URLs into the `Evidence` section of the [pr skill](../pr/SKILL.md) template. Delete the appended copies. Images: HTML table, `width=260`:

```html
<table>
  <tr><th>Before</th><th>After</th></tr>
  <tr>
    <td><img src="https://github.com/user-attachments/assets/<id>" width="260" alt="Before: <state>" /></td>
    <td><img src="https://github.com/user-attachments/assets/<id>" width="260" alt="After: <state>" /></td>
  </tr>
</table>
```

   Videos: bare URL in table cell, see [test-pr video rules](../test-pr/SKILL.md#video).

6. Write body back: `gh pr edit <n> --body-file /tmp/<pr>/body.md`
7. Check done: step 4 command prints one URL per uploaded file.

# Rules

- Done only when PR body contains `user-attachments` URLs. Never report proof done without step 7 output.
- `gh` exits non-zero when one upload fails. Body keeps the uploads that worked. Retry only the failed file.
- `--body` or `--body-file` replaces the whole body. Always start from step 4 body, never from an old local draft.
- Non-visual PR: command output is proof. No device build unless asked.
