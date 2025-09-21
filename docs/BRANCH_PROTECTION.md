# Recommended branch protection for `main`

Apply these rules after switching the repository to public. Adjust to your team’s workflow as needed.

## Required checks

- Require status checks to pass before merging
  - ci/build (build:all)
  - unit tests (npm test)
  - formatting (check-format)
- Require branches to be up to date before merging (optional if using "Require merge queue").
- Require signed commits (optional).

## Reviews

- Require pull request reviews before merging
  - Minimum number of approvals: 1–2
  - Dismiss stale approvals when new commits are pushed
  - Require review from Code Owners (optional; add CODEOWNERS if used)

## Commit and push rules

- Restrict who can push to matching branches (disallow force-push to `main`).
- Require linear history (optional) or enable Merge Queue (recommended for busy repos).

## Additional protections

- Include administrators (recommended once policies are verified).
- Block force pushes and branch deletions for `main`.

## Notes

- Ensure GitHub Actions has permission to update status checks.
- If you enable Merge Queue, disable the “up to date before merging” requirement and rely on the queue.
- Consider protecting release tags (e.g., `v*`) by requiring a workflow to publish and tag via CI.
