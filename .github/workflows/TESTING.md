# Dependabot Auto-merge Testing Plan

## Test Scenarios

### Scenario 1: Patch Update (Should Auto-merge)
**Given:** Dependabot opens a PR for a patch update (e.g., 1.0.0 → 1.0.1)
**Expected:**
1. `dependabot-label.yml` workflow runs
2. PR gets labeled with:
   - `automerge`
   - `dependencies`
   - `semver-patch`
3. Comment is added explaining auto-merge behavior
4. `auto-merge.yml` workflow enables auto-merge
5. After CI passes, PR is automatically merged

**Validation commands:**
```bash
# Check if PR has correct labels
gh pr view <PR_NUMBER> --json labels --jq '.labels[].name'

# Check if auto-merge is enabled
gh pr view <PR_NUMBER> --json autoMergeRequest

# Check workflow runs
gh run list --workflow=dependabot-label.yml --limit 5
gh run list --workflow=auto-merge.yml --limit 5
```

### Scenario 2: Minor Update (Should NOT Auto-merge)
**Given:** Dependabot opens a PR for a minor update (e.g., 1.0.0 → 1.1.0)
**Expected:**
1. `dependabot-label.yml` workflow runs
2. PR gets labeled with:
   - `dependencies`
   - `semver-minor`
3. PR does NOT get `automerge` label
4. Comment is added explaining manual review is needed
5. `auto-merge.yml` workflow does NOT enable auto-merge
6. PR waits for manual review and merge

**Validation commands:**
```bash
# Verify automerge label is NOT present
gh pr view <PR_NUMBER> --json labels --jq '.labels[].name' | grep -v automerge

# Check workflow runs
gh run list --workflow=dependabot-label.yml --limit 5
```

### Scenario 3: Major Update (Should NOT Auto-merge)
**Given:** Dependabot opens a PR for a major update (e.g., 1.0.0 → 2.0.0)
**Expected:**
1. `dependabot-label.yml` workflow runs
2. PR gets labeled with:
   - `dependencies`
   - `semver-major`
3. PR does NOT get `automerge` label
4. Comment is added explaining manual review is needed
5. PR waits for manual review and merge

**Validation commands:**
```bash
# Verify automerge label is NOT present
gh pr view <PR_NUMBER> --json labels --jq '.labels[].name' | grep -v automerge

# Check workflow runs
gh run list --workflow=dependabot-label.yml --limit 5
```

### Scenario 4: Manual PR (Should be Unaffected)
**Given:** A human opens a regular PR
**Expected:**
1. Workflows do NOT run (filtered by `if: github.actor == 'dependabot[bot]'`)
2. No labels are automatically added
3. Normal PR review process applies

**Validation commands:**
```bash
# Check workflow runs (should show no runs for this PR)
gh run list --workflow=dependabot-label.yml --commit <COMMIT_SHA>
```

### Scenario 5: Manual Opt-out
**Given:** A patch Dependabot PR that was labeled for auto-merge
**When:** User removes the `automerge` label
**Expected:**
1. Auto-merge is disabled
2. PR waits for manual review

**Validation commands:**
```bash
# Remove automerge label
gh pr edit <PR_NUMBER> --remove-label "automerge"

# Verify auto-merge is disabled
gh pr view <PR_NUMBER> --json autoMergeRequest
```

### Scenario 6: Manual Opt-in
**Given:** A minor/major Dependabot PR
**When:** User adds the `automerge` label manually
**Expected:**
1. `auto-merge.yml` workflow runs
2. Auto-merge is enabled
3. PR merges after CI passes

**Validation commands:**
```bash
# Add automerge label
gh pr edit <PR_NUMBER> --add-label "automerge"

# Verify auto-merge is enabled
gh pr view <PR_NUMBER> --json autoMergeRequest

# Check workflow runs
gh run list --workflow=auto-merge.yml --limit 5
```

## Pre-deployment Checklist

### Repository Settings
- [ ] Auto-merge is enabled in repository settings
- [ ] Branch protection is configured for `main` branch
- [ ] Required status checks are specified
- [ ] Actions have appropriate permissions (read/write)

### Workflow Validation
- [x] YAML syntax is valid (tested with yamllint)
- [x] No trailing spaces or formatting issues
- [ ] Permissions follow least-privilege principle
- [ ] Uses `pull_request_target` safely (no code checkout)

### Security Review
- [ ] Workflows use minimal permissions
- [ ] No secrets are exposed in logs
- [ ] Safe use of `pull_request_target` (metadata only)
- [ ] Branch protection prevents bypass

### Documentation
- [x] Comprehensive README in `.github/workflows/README.md`
- [x] Main README updated with link to workflow docs
- [x] Instructions for opt-in/opt-out included
- [x] Troubleshooting guide provided

## Post-deployment Monitoring

### Week 1: Monitor Closely
- [ ] Check all Dependabot PRs for correct labeling
- [ ] Verify patch updates are auto-merging successfully
- [ ] Verify minor/major updates are NOT auto-merging
- [ ] Monitor workflow run logs for errors

### Commands for Monitoring:
```bash
# List recent Dependabot PRs
gh pr list --author "dependabot[bot]" --limit 10

# Check workflow success rate
gh run list --workflow=dependabot-label.yml --status=failure
gh run list --workflow=auto-merge.yml --status=failure

# View recent workflow runs
gh run list --workflow=dependabot-label.yml --limit 10
gh run list --workflow=auto-merge.yml --limit 10
```

### Week 2-4: Verify Stability
- [ ] Confirm no unintended merges occurred
- [ ] Verify CI checks are always passing before merge
- [ ] Check for any workflow failures or edge cases
- [ ] Review merge history for Dependabot PRs

### Commands for Review:
```bash
# List all merged Dependabot PRs in the last month
gh pr list --author "dependabot[bot]" --state merged --limit 50

# Check for failed auto-merges
gh run list --workflow=auto-merge.yml --status=failure --limit 20
```

## Rollback Plan

If issues are detected:

1. **Disable auto-merge temporarily:**
   ```bash
   # Disable auto-merge on repository level
   gh api repos/alex-macedo/CastorWorks -X PATCH -F allow_auto_merge=false
   ```

2. **Disable workflows:**
   ```bash
   # Rename workflows to disable them
   mv .github/workflows/dependabot-label.yml .github/workflows/dependabot-label.yml.disabled
   mv .github/workflows/auto-merge.yml .github/workflows/auto-merge.yml.disabled
   ```

3. **Revert to previous auto-merge workflow:**
   ```bash
   git revert <COMMIT_HASH>
   ```

## Success Metrics

After 1 month of operation:
- [ ] 90%+ of patch Dependabot PRs are auto-merged successfully
- [ ] 0% of minor/major PRs are auto-merged without approval
- [ ] 0% of CI-failing PRs are merged
- [ ] All auto-merged PRs have passing CI checks
- [ ] No security incidents related to auto-merge

## Notes

### Known Limitations
1. If branch protection requires approvals, Dependabot PRs still need manual approval
2. Auto-merge only works if repository has auto-merge feature enabled
3. Workflows require write permissions for contents and pull-requests

### Future Enhancements
- Add Slack/Discord notifications for auto-merged PRs
- Create metrics dashboard for auto-merge success rate
- Add support for auto-approving Dependabot PRs (if desired)
- Configure different rules per dependency type (dev vs prod)
