// Reconcile an authored source-segment census with declared row counts. The
// segment associations need independent source-pixel review; this checker does
// not discover column flow or infer which table owns an unheaded continuation.
export function auditSourceTableSegments(census, declaredCounts = null) {
  const errors = [];
  const tables = new Map();
  const segmentIds = new Set();
  const [minimum, maximum] = census.rollDomain || [];
  if (!Number.isInteger(minimum) || !Number.isInteger(maximum) || minimum > maximum) {
    throw new Error('An explicit integer roll domain is required.');
  }
  for (const tableId of census.tableIds || []) {
    if (typeof tableId !== 'string' || !tableId || tables.has(tableId)) throw new Error('Unique source table IDs are required.');
    tables.set(tableId, {physicalRows: 0, rolls: new Map()});
  }
  for (const segment of census.segments || []) {
    if (!segment.id || segmentIds.has(segment.id)) { errors.push(`Duplicate or missing source segment ID: ${segment.id}`); continue; }
    segmentIds.add(segment.id);
    const table = tables.get(segment.tableId);
    if (!table) { errors.push(`Unknown table for segment ${segment.id}: ${segment.tableId}`); continue; }
    for (const roll of segment.rolls || []) {
      table.physicalRows++;
      if (!Number.isInteger(roll) || roll < minimum || roll > maximum) errors.push(`Out-of-domain roll ${roll} in ${segment.id}`);
      table.rolls.set(roll, [...(table.rolls.get(roll) || []), segment.id]);
    }
  }
  const tableCounts = {};
  for (const [tableId, table] of tables) {
    const missing = [], duplicates = [];
    for (let roll = minimum; roll <= maximum; roll++) {
      const occurrences = table.rolls.get(roll) || [];
      if (!occurrences.length) missing.push(roll);
      if (occurrences.length > 1) duplicates.push({roll, segmentIds: occurrences});
    }
    tableCounts[tableId] = {physicalRows: table.physicalRows, uniqueRolls: table.rolls.size, missing, duplicates};
    if (missing.length) errors.push(`${tableId}: ${missing.length} domain outcomes absent from authored segments (${missing.join(', ')})`);
    if (duplicates.length) errors.push(`${tableId}: ${duplicates.length} outcomes assigned more than once`);
    const claimed = declaredCounts?.printedRowsByLevel?.[tableId];
    if (claimed !== undefined && claimed !== table.physicalRows) errors.push(`${tableId}: declared ${claimed} printed rows, source segments contain ${table.physicalRows}`);
  }
  const physicalRows = [...tables.values()].reduce((sum, table) => sum + table.physicalRows, 0);
  const missingOutcomes = Object.values(tableCounts).reduce((sum, table) => sum + table.missing.length, 0);
  if (declaredCounts?.printedRows !== undefined && declaredCounts.printedRows !== physicalRows) errors.push(`Total: declared ${declaredCounts.printedRows} printed rows, source segments contain ${physicalRows}`);
  if (declaredCounts?.unprintedExpectedSlots?.total !== undefined && declaredCounts.unprintedExpectedSlots.total !== missingOutcomes) errors.push(`Gap claim: declared ${declaredCounts.unprintedExpectedSlots.total} unprinted outcomes, source segments omit ${missingOutcomes}`);
  return {valid: errors.length === 0, errors, tableCounts, physicalRows, missingOutcomes, sourceSemanticApproval: false,
    scope: 'Authored source-segment/count consistency only; segment identities, row content, contextual associations and source readability require source review.'};
}
