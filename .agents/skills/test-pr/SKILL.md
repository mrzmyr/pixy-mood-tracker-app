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
