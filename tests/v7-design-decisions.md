# V7 source access decision

Goal and context: open exact original cited pages while keeping user-provided books private, avoiding cumulative republication and invented region verification. The executor still cannot obtain readable PDF images under the supported transfer policy. No original image region has been visually verified for this release.

| Idea | Preserve private books | Open exact cited originals | Avoid invented verified crops | Works in this context |
| --- | --- | --- | --- | --- |
| Host extracted crops across the catalog | Fails: cumulative book republication | Blocked by image access | Cannot verify regions | Fails |
| Leave citations without a reader | Pass | Fails | Pass | Fails the page-access goal |
| Render a matching user-selected PDF locally in the browser | Pass: no PDF upload or public book assets | Pass with the user's matching copy and documented mapping | Pass: full cited pages; focused regions explicitly pending | Selected |

The selected reader does not claim to supply the user's books, confirm the edition from content, or visually verify the rules. Its UI must disclose local-only handling and the need for a matching edition. Original test fixtures can verify renderer behavior, not original-book extraction accuracy.

Price decisions: all 35 missing prices are still extraction gaps; none has been established absent from the source. No estimate replaces an unreadable source value. Compact fields preserve the authored units and ranges; no inferred damage dice or fourth spell component is added.
