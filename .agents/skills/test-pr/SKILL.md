---
name: test-pr
description: Run e2e tests for a pull request and attach video proof (only if user explicitly asks for it)
---

- Run e2e tests, see skill `run-app`
- Upload video of them in PR desc
  - example: `gh issue comment 87 --repo monalisa/monas-cafe --body "Menu error below:" --attach ./menu-error.png;`
  - Ref: https://github.com/cli/cli/issues/13256#issuecomment-5330474190)
- Put android and ios in table next to each other + title in PR markdown
  - Use HTML table. Markdown table cells render video URLs as plain links
  - Keep blank lines around each video URL, else no player
- Post traces how long each step in the test lasted
- Before upload, speed up each video 2x (e2e recordings are slow/boring):
```sh
  ffmpeg -i ios.mp4 -filter:v "setpts=0.5*PTS" -an ios-2x.mp4
  ffmpeg -i android.mp4 -filter:v "setpts=0.5*PTS" -an android-2x.mp4
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
