---
name: test-pr
description: Run e2e tests for a pull request and attach video proof (only if user explicitly asks for it)
---

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
