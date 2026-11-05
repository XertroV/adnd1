# Independent GitHub repository review — 4 November 2026

Repository explicitly supplied for this site: `https://github.com/XertroV/adnd1.git`.

## Read-only findings

The authenticated GitHub connector resolves the repository as `XertroV/adnd1` (repository ID `1445578674`) and the authenticated user as `XertroV` (user ID `1046448`). Repository metadata reports:

- Size: 0.
- Default branch: `master`.
- Visibility: public.
- Archived: false.
- Authenticated permissions: `admin`, `maintain`, `push`, `pull`, and `triage` are all true.

Exact remote checks:

```text
git ls-remote --symref https://github.com/XertroV/adnd1.git HEAD
exit 0; stdout empty

git ls-remote https://github.com/XertroV/adnd1.git
exit 0; stdout empty
```

No refs or commits are advertised. This agrees with the zero-size metadata: there is no existing checked-in content or history to preserve. A separate clone was therefore unnecessary.

## Write-access distinction

Connector metadata confirms repository push/admin permission for the authenticated user. The dedicated collaborator-permission operation independently returned `permission: admin` for `XertroV` on `XertroV/adnd1`. The executor CLI is a separate authentication path: `gh auth status` reports that the current `GH_TOKEN` is invalid. No credential values were read or printed, and no login was attempted. A successful CLI push has not been established; the authorized GitHub connector provides the available verified account-permission path.

## Preservation and publication boundaries

This review made no GitHub mutations, pushes, commits, branch changes, clones, or changes to the existing Sites origin. The owning agent retains deployment and repository-write responsibility. Preserve the existing Sites project identity and private audience independently of this public repository. Source PDFs, transfer helpers containing private metadata, raw OCR, and credentials must remain outside the repository.
# Read-only follow-up checkpoint — 2026-11-04

The remote now has `master` at `688087684236862f3c8b8815684f0e2ff8605399`, titled “Initialize Advanced Dungeons & Dragons reference site source”. Cloned the now-nonempty authorized repository into the new isolated path `/workspace/sites/adnd1-github-review` with `--no-checkout` and inspected history/tree only. The checkpoint contains one commit and only `README.md`; there are no PDFs, raw OCR files, or application source files at that checkpoint. `.gitignore` does not exist in that commit. This verifies the initialization outcome, not a completed application-source push. The reviewer made no remote changes or changes to the Sites source checkout.

