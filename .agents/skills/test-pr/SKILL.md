---
name: test-pr
description: Run changed e2e flows for a pull request and note the result. Attach video proof only if user explicitly asks for it
---

## Changed flows: always

- PR adds or changes `e2e/flows/*.yaml`: run each changed flow once before opening the PR, also without a video request
  - `bun e2e run --platform=<ios|android> --paths=e2e/flows/<flow>.yaml`
  - Add one line per flow to the PR body: `E2E: <flow> passed <platform>`
  - Flow fails: fix it first. Never open the PR with a flow that never ran
- `bun run test:cli` checks flow file paths and `id` selectors. It never proves the flow passes

## Video proof: only on request

- Run e2e tests, see skill `run-app`
- Upload video of them in PR desc with [pr-proof skill](../pr-proof/SKILL.md)
- Put android and ios in table next to each other + title in PR markdown
  - Use HTML table. Markdown table cells render video URLs as plain links
  - Keep blank lines around each video URL, else no player
- Post traces how long each step in the test lasted

## Video

- Speed up each video 2x before upload. e2e recordings are slow
- Scale to 590px wide. Keeps upload small, fits PR column

```sh
  ffmpeg -i ios.mp4 -filter:v "setpts=0.5*PTS,scale=590:-2" -an ios-2x.mp4
  ffmpeg -i android.mp4 -filter:v "setpts=0.5*PTS,scale=590:-2" -an android-2x.mp4
```

```md
## E2E proof

<table>
<tr><th>iOS</th><th>Android</th></tr>
<tr>
<td>

https://github.com/user-attachments/assets/<ios-video-id>

</td>
<td>

https://github.com/user-attachments/assets/<android-video-id>

</td>
</tr>
</table>
```
