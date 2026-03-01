# GitHub Workflows Documentation

This directory contains automated GitHub Actions workflows for the CastorWorks repository.

## Dependabot Auto-merge Workflows

### Overview

The repository uses a label-driven auto-merge system for Dependabot PRs that:
1. Automatically labels patch updates for auto-merge
2. Waits for all required CI checks to pass
3. Respects branch protection rules
4. Allows opt-out on a per-PR basis

### Workflows

#### 1. `dependabot-label.yml` - Label Dependabot PRs

**Trigger:** When Dependabot opens/updates a PR

**What it does:**
- Analyzes the semver update type (patch, minor, major)
- Adds `automerge` label to **patch updates only**
- Adds informational labels (`dependencies`, `semver-patch`, etc.)
- Comments on the PR with update details and instructions

**Configuration:**
- Default behavior: Only patch updates are auto-merged
- To change which updates are auto-merged, edit the condition in the workflow:
  ```yaml
  if: steps.metadata.outputs.update-type == 'version-update:semver-patch'
  ```

**Available update types:**
- `version-update:semver-patch` - Bug fixes (1.0.0 → 1.0.1)
- `version-update:semver-minor` - New features (1.0.0 → 1.1.0)
- `version-update:semver-major` - Breaking changes (1.0.0 → 2.0.0)

#### 2. `auto-merge.yml` - Auto-merge Labeled PRs

**Trigger:** 
- When a PR is labeled with `automerge`
- When CI checks complete successfully

**What it does:**
- Monitors PRs with the `automerge` label
- Enables GitHub's auto-merge feature using squash strategy
- Automatically merges the PR once all required checks pass

**Merge strategy:** Squash merge (can be changed to `--merge` or `--rebase` in the workflow)

### Required GitHub Repository Settings

To use auto-merge, configure the following in your repository settings:

#### 1. Enable Auto-merge

Go to **Settings → General → Pull Requests**:
- ✅ Enable "Allow auto-merge"
- ✅ Enable "Allow squash merging" (or your preferred merge method)

#### 2. Branch Protection Rules

Go to **Settings → Branches → Branch protection rules** for `main`:

**Required settings:**
- ✅ Enable "Require status checks to pass before merging"
- ✅ Select required checks (e.g., `CI - Lint, Test, Build / lint`, `CI - Lint, Test, Build / test`, `CI - Lint, Test, Build / build`)
- ✅ Enable "Require branches to be up to date before merging" (recommended)

**Optional but recommended:**
- ✅ Enable "Require pull request reviews before merging" (1 approval)
  - If enabled and you want Dependabot PRs to auto-merge, you need to approve them manually or configure `secrets.GITHUB_TOKEN` with appropriate permissions
- ❌ Do NOT enable "Require review from Code Owners" for Dependabot PRs unless you want manual approval

#### 3. Actions Permissions

Go to **Settings → Actions → General → Workflow permissions**:
- ✅ Set to "Read and write permissions"
- ✅ Enable "Allow GitHub Actions to create and approve pull requests" (if you want Actions to approve PRs)

### How to Use

#### Auto-merge a Dependabot PR (Patch Updates)

**Automatic (default):**
1. Dependabot opens a patch update PR
2. `dependabot-label.yml` automatically adds the `automerge` label
3. `auto-merge.yml` enables auto-merge
4. Once CI checks pass, the PR is automatically merged

**Manual approval (if required):**
If branch protection requires approvals, you need to manually approve:
```bash
gh pr review <PR_NUMBER> --approve
```

#### Opt-out of Auto-merge

To prevent a specific PR from auto-merging:
1. Remove the `automerge` label from the PR, or
2. Add a `do-not-merge` label (if configured in branch protection)

#### Manually Enable Auto-merge

For non-patch Dependabot PRs or manual PRs:
```bash
gh pr edit <PR_NUMBER> --add-label "automerge"
```

Or via GitHub UI:
1. Go to the PR
2. Add the `automerge` label

### Customization Options

#### Change Which Updates Auto-merge

Edit `.github/workflows/dependabot-label.yml`:

**Option 1: Include minor updates**
```yaml
if: |
  steps.metadata.outputs.update-type == 'version-update:semver-patch' ||
  steps.metadata.outputs.update-type == 'version-update:semver-minor'
```

**Option 2: Auto-merge everything (not recommended)**
```yaml
if: github.actor == 'dependabot[bot]'
```

#### Change Label Name

To use a different label (e.g., `auto-merge-approved`):

1. Update `dependabot-label.yml`:
   ```yaml
   run: gh pr edit "$PR_URL" --add-label "auto-merge-approved"
   ```

2. Update `auto-merge.yml`:
   ```yaml
   if: contains(github.event.pull_request.labels.*.name, 'auto-merge-approved')
   ```

#### Change Merge Strategy

Edit `.github/workflows/auto-merge.yml`:
- Squash merge: `gh pr merge "$PR_NUMBER" --auto --squash` (default)
- Regular merge: `gh pr merge "$PR_NUMBER" --auto --merge`
- Rebase merge: `gh pr merge "$PR_NUMBER" --auto --rebase`

### Security Considerations

#### Why `pull_request_target`?

Both workflows use `pull_request_target` instead of `pull_request` because:
1. It runs with write permissions to add labels and enable auto-merge
2. It's safe because we only perform metadata operations (no code checkout)
3. It can access secrets needed for the GitHub CLI

#### Least-Privilege Permissions

Workflows are configured with minimal permissions:
- `dependabot-label.yml`: `contents: read`, `pull-requests: write`
- `auto-merge.yml`: `contents: write`, `pull-requests: write`

### Troubleshooting

#### Auto-merge not working?

**Check 1: Is auto-merge enabled in repository settings?**
```bash
gh repo view --json autoMergeEnabled
```

**Check 2: Are required checks configured?**
- Go to Settings → Branches → main branch protection
- Verify required status checks are listed

**Check 3: Does the PR have the label?**
```bash
gh pr view <PR_NUMBER> --json labels
```

**Check 4: Check workflow runs**
```bash
gh run list --workflow=dependabot-label.yml
gh run list --workflow=auto-merge.yml
```

#### PR not getting labeled?

**Check 1: Is it a patch update?**
```bash
gh pr view <PR_NUMBER> --json title,body
```

**Check 2: Check workflow permissions**
- Go to Settings → Actions → General → Workflow permissions
- Ensure "Read and write permissions" is enabled

**Check 3: View workflow logs**
```bash
gh run view <RUN_ID> --log
```

#### Manual override

To force auto-merge (bypassing label checks):
```bash
gh pr merge <PR_NUMBER> --auto --squash
```

To disable auto-merge:
```bash
gh pr merge <PR_NUMBER> --disable-auto
```

### Examples

#### Example 1: Patch update (auto-merged)
```
PR: "Bump axios from 1.6.0 to 1.6.1"
Labels: automerge, dependencies, semver-patch
Result: ✅ Automatically merged after CI passes
```

#### Example 2: Minor update (manual review)
```
PR: "Bump axios from 1.6.0 to 1.7.0"
Labels: dependencies, semver-minor
Result: ⏸️ Requires manual review and merge
```

#### Example 3: Major update (manual review)
```
PR: "Bump axios from 1.6.0 to 2.0.0"
Labels: dependencies, semver-major
Result: ⏸️ Requires manual review and merge
```

### Related Documentation

- [GitHub Auto-merge Documentation](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/incorporating-changes-from-a-pull-request/automatically-merging-a-pull-request)
- [Dependabot Metadata Action](https://github.com/dependabot/fetch-metadata)
- [Branch Protection Rules](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)

### Support

For issues or questions about auto-merge workflows, please:
1. Check the troubleshooting section above
2. Review workflow run logs in the Actions tab
3. Open an issue with workflow logs attached
