// Test-only facade giving the research candidate the public names used by the live tool.
// Do not import this facade from production; integration should keep these names in tools/.
export {
  buildContinuationAliasReportWithResolvedSourceIdentity as buildContinuationAliasReport,
  loadResolvedContinuationAliasReport as loadContinuationAliasReport,
} from '../dmg175-continuation-alias-audit-v1/continuation-alias-audit-source-identity-v1.mjs';
