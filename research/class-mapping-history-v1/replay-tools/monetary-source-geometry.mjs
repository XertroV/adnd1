const MAX_TOLERANCE_POINTS = 0.25;

function rectangle(value) {
  return Array.isArray(value) && value.length === 4 && value.every(Number.isFinite)
    ? value
    : null;
}

/**
 * Check whether a row's PDF-point focus rectangle is contained by its table crop.
 * Missing or deliberately unassessable focus metadata is reported separately from
 * malformed geometry. The default is strict containment; an explicit tolerance is
 * capped at 0.25 PDF points so it cannot hide a meaningful crop omission.
 */
export function validateSourceGeometry(row, {tolerancePoints = 0} = {}) {
  if (!Number.isFinite(tolerancePoints) || tolerancePoints < 0 || tolerancePoints > MAX_TOLERANCE_POINTS) {
    throw new RangeError(`tolerancePoints must be between 0 and ${MAX_TOLERANCE_POINTS}`);
  }

  const cropEvidence = row?.evidence?.tableCropBounds;
  const focusEvidence = row?.evidence?.rowHighlightBounds;
  if (focusEvidence?.status === 'not-assessable' || !cropEvidence?.pdfPagePoints || !focusEvidence?.pdfPagePoints) {
    return {status: 'not-assessable', reason: 'Table crop or row focus bounds are absent or explicitly not assessable.'};
  }

  const crop = rectangle(cropEvidence.pdfPagePoints);
  const focus = rectangle(focusEvidence.pdfPagePoints);
  if (!crop || !focus || crop[0] > crop[2] || crop[1] > crop[3] || focus[0] > focus[2] || focus[1] > focus[3]) {
    return {status: 'invalid-geometry', reason: 'PDF-point bounds must be finite [x0,y0,x1,y1] rectangles with ordered edges.'};
  }

  const outsideEdges = [];
  if (focus[0] < crop[0] - tolerancePoints) outsideEdges.push('left');
  if (focus[1] < crop[1] - tolerancePoints) outsideEdges.push('top');
  if (focus[2] > crop[2] + tolerancePoints) outsideEdges.push('right');
  if (focus[3] > crop[3] + tolerancePoints) outsideEdges.push('bottom');
  if (outsideEdges.length) {
    return {status: 'outside-crop', reason: `Row focus extends beyond the table crop at the ${outsideEdges.join(', ')} edge.`, outsideEdges, tolerancePoints};
  }
  return {status: 'contained', reason: 'Row focus is contained by the table crop.', tolerancePoints};
}

export {MAX_TOLERANCE_POINTS};
