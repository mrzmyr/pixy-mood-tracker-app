---
name: attach-pr-asset
description: Attach screenshot or video proof to a GitHub pull request without committing evidence files. Use when an agent-authored PR needs before-and-after images, recordings, or other visual proof in its body or comments.
---

# Attach PR Asset

1. Confirm every asset exists and contains no credentials, secrets, or personal data.
2. Resolve PR, repository, and PR head SHA:

```bash
PR_NUMBER="${PR_NUMBER:-$(gh pr view --json number --jq '.number')}"
REPO="${REPO:-$(gh repo view --json nameWithOwner --jq '.nameWithOwner')}"
HEAD_SHA="$(gh pr view "$PR_NUMBER" --repo "$REPO" --json headRefOid --jq '.headRefOid')"
TAG="pr-${PR_NUMBER}-assets-${HEAD_SHA:0:12}"
```

3. Create a public prerelease targeting PR head, then upload evidence files:

```bash
ASSETS=(/tmp/before.png /tmp/after.png) # May include .mp4 or .mov files.

gh release create "$TAG" "${ASSETS[@]}" \
  --repo "$REPO" \
  --target "$HEAD_SHA" \
  --title "PR #${PR_NUMBER} assets" \
  --notes "Visual evidence for PR #${PR_NUMBER}." \
  --prerelease \
  --latest=false
```

If release already exists, use `gh release upload "$TAG" <files...> --repo "$REPO"`. Replace an existing asset only after confirming exact target.

4. Read each asset's `browser_download_url`:

```bash
gh api "repos/$REPO/releases/tags/$TAG" \
  --jq '.assets[] | [.name, .browser_download_url] | @tsv'
```

5. Preserve existing PR body. Append `## Visual proof`, then update using `--body-file`:

```bash
BODY_FILE="$(mktemp)"
gh pr view "$PR_NUMBER" --repo "$REPO" --json body --jq '.body' > "$BODY_FILE"

{
  printf '\n\n## Visual proof\n\n'
  printf '<table>\n<tr>\n'
  printf '<td width="50%%"><strong>Before</strong><br><img src="%s" alt="Before" width="100%%"></td>\n' "$BEFORE_URL"
  printf '<td width="50%%"><strong>After</strong><br><img src="%s" alt="After" width="100%%"></td>\n' "$AFTER_URL"
  printf '</tr>\n</table>\n\n'
  printf '[Watch video](%s)\n' "$VIDEO_URL"
} >> "$BODY_FILE"

gh pr edit "$PR_NUMBER" --repo "$REPO" --body-file "$BODY_FILE"
```

Present two or more screenshots in a two-column grid. Put before and after screenshots side by side. Include environment, reproduction steps, expected result, actual result, and relevant edge cases. Omit missing asset types.

6. Verify links from signed-out/public context. Keep PR draft if proof is missing or inaccessible.

Never commit proof-only assets. Never overwrite existing PR body. Never delete PR asset release while PR depends on it.
