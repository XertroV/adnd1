import {createHash} from 'node:crypto';
import {existsSync, readFileSync, readdirSync, writeFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {validateSourceGeometry} from './monetary-source-geometry.mjs';
import {
  loadMonetarySourceRenderFrames,
  monetarySourceRenderFrameRegistry,
  resolveMonetarySourceRenderFrame,
} from './monetary-source-render-frames.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUTPUT_PATH = 'research/monetary-source-inventory.json';
const DEFAULT_INPUTS = {
  canonical: 'research/price-source-inventory.json',
  equipment: 'equipment.json',
  equipmentBindings: 'research/equipment-source-row-bindings.json',
  uaSupplement: 'research/source-audit-batch5-ua-additional-prices.json',
  uaDescriptionSupplement: 'research/source-audit-batch5-price-description-records.json',
  phbDmgSupplement: 'research/source-audit-batch5-phb-dmg-additional-prices.json',
  priceDiscoverySupplement: 'research/source-audit-batch5-price-discovery-reconciliation.json',
  phbDmgPricePassageSupplement: 'research/source-audit-batch5-phb-dmg-price-passage-records.json',
};

export const CURRENT_DENOMINATORS = Object.freeze({
  canonicalSourceRows: 710,
  currentEquipmentPriceClaims: 187,
  uaSupplementRows: 583,
  uaDescriptionRecords: 2,
  phbDmgTypedRowsOrClaims: 179,
  phb123RepeatedEquipmentRows: 165,
  priceDiscoveryCensusReceipts: 180,
  phbDmgPricePassageRecords: 34,
});

const CURRENCIES = new Set(['gp', 'sp', 'cp', 'ep', 'pp', 'usd']);
const CURRENCY_PATTERN = '(?:g\\.?p\\.?|s\\.?p\\.?|c\\.?p\\.?|e\\.?p\\.?|p\\.?p\\.?)';
const PURPOSE_PATTERNS = [
  [/starting[ -]?(?:money|wealth)|initial money/i, 'starting-money'],
  [/treasure|hoard|coin placement|coin[- ]generation|generates money|treasure[- ]distribution|illustrative supplies value/i, 'treasure'],
  [/hireling|wage|salary|monthly costs?|daily costs?/i, 'wage'],
  [/purchase|equipment cost/i, 'purchase'],
  [/sale-value|sale value|if sold/i, 'sale'],
  [/market valuation|valuation|worth|commodity|rare-fur|gem value|base value|value multiplier|tarot-card-wealth|card wealth/i, 'valuation'],
  [/tax|duty|fine|surtax|tariff/i, 'tax-or-duty'],
  [/service fee|\bfee\b|assassination|clerical casting|spellcasting|service|search[- ]cost|find prospective henchmen|method attempt/i, 'service-fee'],
  [/construction/i, 'construction-cost'],
  [/material cost|manufacture|manufacturing|scroll.*material|writing material/i, 'material-cost'],
  [/currency equivalence|currency exchange|exchange rate|conversion/i, 'currency-conversion'],
  [/research|sage|information discovery|enquiry|enquiries|knowledge/i, 'research-cost'],
  [/employment offer|applicant|henchman/i, 'employment-offer'],
];

function jsonPointer(parts) {
  return `/${parts.map(part => String(part).replaceAll('~', '~0').replaceAll('/', '~1')).join('/')}`;
}

function clone(value) {
  return value === undefined ? undefined : structuredClone(value);
}

function requireArtifact(artifact, name) {
  if (!artifact || typeof artifact !== 'object' || !artifact.data || typeof artifact.path !== 'string' || !/^[a-f0-9]{64}$/i.test(artifact.sha256 ?? '')) {
    throw new TypeError(`${name} must be {path, sha256, data}; sha256 must be a 64-character hex digest.`);
  }
  return artifact;
}

function amountNumber(text) {
  if (typeof text === 'number' && Number.isFinite(text)) return text;
  if (typeof text !== 'string') return null;
  const normalized = text.replaceAll(',', '').trim();
  if (!/^\d+(?:\.\d+)?$/.test(normalized)) return null;
  const amount = Number(normalized);
  return Number.isFinite(amount) ? amount : null;
}

function currencyFrom(value) {
  if (typeof value !== 'string') return null;
  const normalized = value.toLowerCase().replaceAll('.', '').trim();
  if (CURRENCIES.has(normalized)) return normalized;
  if (/^(?:us dollars?|usd|\$)$/.test(normalized)) return 'usd';
  if (/^(?:gold pieces?|gold|golds?)$/.test(normalized)) return 'gp';
  if (/^(?:silver pieces?|silver|silvers?)$/.test(normalized)) return 'sp';
  if (/^(?:copper pieces?|copper|coppers?)$/.test(normalized)) return 'cp';
  if (/^(?:electrum pieces?|electrum)$/.test(normalized)) return 'ep';
  if (/^(?:platinum pieces?|platinum)$/.test(normalized)) return 'pp';
  return ['gold nobles', 'silver nobles', 'silver nobbles'].includes(normalized) ? normalized : null;
}

function currencyFromKey(key) {
  if (typeof key !== 'string') return null;
  const match = key.match(/(?:^|[^a-z])(gp|sp|cp|ep|pp)(?:$|[^a-z])/i)
    ?? key.match(/(gp|sp|cp|ep|pp)(?=Each|Per|By|Value|$)/i);
  return match ? match[1].toLowerCase() : null;
}

function pointerAppend(path, key) {
  return `${path}/${String(key).replaceAll('~', '~0').replaceAll('/', '~1')}`;
}

function purposeFor(rawPurpose, rawCategory = '') {
  const source = `${rawPurpose ?? ''} ${rawCategory ?? ''}`;
  for (const [pattern, purpose] of PURPOSE_PATTERNS) if (pattern.test(source)) return purpose;
  return typeof rawPurpose === 'string' && rawPurpose.trim()
    ? 'other'
    : typeof rawCategory === 'string' && rawCategory.trim() ? 'other' : 'unknown';
}

function collectQualifiers(record) {
  const values = [];
  for (const candidate of [record?.qualifiers, record?.conditions, record?.notes, record?.footnotes]) {
    if (Array.isArray(candidate)) values.push(...candidate.filter(value => typeof value === 'string'));
    else if (typeof candidate === 'string' && candidate.trim()) values.push(candidate);
  }
  return [...new Set(values)];
}

function makeValue(kind, options = {}) {
  const result = {kind};
  for (const key of [
    'currency', 'amount', 'minimumAmount', 'maximumAmount', 'minimumCount', 'maximumCount', 'alternatives', 'formula', 'expression', 'base', 'increment',
    'unit', 'denominator', 'per', 'quantity', 'count', 'denomination', 'reference', 'condition', 'sourceText', 'reason', 'normalizationStatus', 'rawStructuredValue',
    'derivation', 'derivationStatus', 'printedAsRange', 'inclusive', 'percentage',
    'minimumPercentage', 'maximumPercentage', 'expression', 'isPrice', 'isSourcePrinted',
  ]) {
    if (options[key] !== undefined && options[key] !== null) result[key] = clone(options[key]);
  }
  return result;
}

function isExplicitNotForSale(text) {
  return /not for sale|not available (?:on|in) (?:the )?open market|cannot be sold|can't be sold|not marketable/i.test(text ?? '');
}

function normalizeMoneyText(text, context = {}) {
  const sourceText = typeof text === 'string' ? text.trim() : String(text ?? '');
  const currency = context.currency ?? (sourceText.match(new RegExp(`\\b(${CURRENCY_PATTERN})\\b`, 'i'))?.[1]
    ? currencyFrom(sourceText.match(new RegExp(`\\b(${CURRENCY_PATTERN})\\b`, 'i'))[1]) : null);
  const condition = context.condition ?? null;
  const unit = context.unit ?? null;
  const qualifierText = [context.qualifierText, condition].filter(Boolean).join(' ');

  if (/^(?:—+|–+|-{1,3})(?:\*+)?$/.test(sourceText)) {
    return [makeValue(isExplicitNotForSale(qualifierText) ? 'not-for-sale' : 'unknown', {
      currency,
      unit,
      condition,
      sourceText,
      reason: isExplicitNotForSale(qualifierText)
        ? 'Source qualifiers explicitly state the value is not available for sale.'
        : 'A dash is printed; the source does not provide an amount in this cell.',
      normalizationStatus: 'source-unavailable-cell',
    })];
  }

  if (currency && /\b(?:d\d+|\d+d\d+|roll|dice)\b/i.test(sourceText) && /\d[\d,]*/.test(sourceText)) {
    return [makeValue('formula', {
      currency,
      unit,
      condition,
      formula: sourceText,
      sourceText,
      normalizationStatus: 'source-formula-preserved',
    })];
  }

  const lowerBound = sourceText.match(/([\d,]+(?:\.\d+)?)\s*(?:gp|g\.?p\.?|sp|s\.?p\.?|cp|c\.?p\.?|ep|e\.?p\.?|pp|p\.?p\.?)?\s*(?:or more|and up|at least|or higher)/i);
  if (lowerBound && currency) {
    return [makeValue('lower-bound', {
      currency,
      amount: amountNumber(lowerBound[1]),
      unit,
      condition,
      sourceText,
      normalizationStatus: 'explicit-lower-bound',
    })];
  }

  const range = sourceText.match(/([\d,]+(?:\.\d+)?)\s*(?:–|—|\bto\b|-)\s*([\d,]+(?:\.\d+)?)/i);
  if (range && currency) {
    return [makeValue('range', {
      currency,
      minimumAmount: amountNumber(range[1]),
      maximumAmount: amountNumber(range[2]),
      unit,
      condition,
      sourceText,
      normalizationStatus: 'explicit-range',
    })];
  }

  const slashAlternatives = sourceText.match(/^\s*([\d,]+(?:\.\d+)?(?:\s*\/\s*[\d,]+(?:\.\d+)?)+)\s*$/);
  if (slashAlternatives && currency) {
    const alternatives = slashAlternatives[1].split('/').map(amountNumber);
    return [makeValue('conditional', {
      currency,
      alternatives,
      unit,
      condition,
      sourceText,
      reason: condition ? undefined : 'Source prints slash-separated amounts but this input does not map each amount to a separate condition.',
      normalizationStatus: condition ? 'conditional-alternatives-with-source-condition' : 'conditional-alternatives-candidate',
    })];
  }

  const plusParts = sourceText.split(/\s+\+\s+|\s+plus\s+/i).map(part => part.trim()).filter(Boolean);
  if (plusParts.length > 1 && currency) {
    const parts = plusParts.map((part, index) => {
      const match = part.match(/([\d,]+(?:\.\d+)?)/);
      if (!match) return null;
      const ownUnit = part.slice(match.index + match[0].length).trim() || unit;
      return makeValue('exact', {
        currency,
        amount: amountNumber(match[1]),
        unit: ownUnit,
        condition,
        sourceText: part,
        reason: index ? 'A distinct additive rate is printed in the same source expression.' : undefined,
        normalizationStatus: 'explicit-additive-component',
      });
    });
    if (parts.every(Boolean)) return parts;
  }

  const token = sourceText.match(/([\d,]+(?:\.\d+)?)/);
  if (token && currency) {
    const unitFromText = sourceText.slice(token.index + token[0].length).replace(new RegExp(CURRENCY_PATTERN, 'ig'), '').trim();
    const formulaLike = /\b(?:d\d+|\d+d\d+|roll|dice|%|percent)\b/i.test(sourceText);
    return [makeValue(formulaLike ? 'formula' : 'exact', {
      currency,
      amount: formulaLike ? undefined : amountNumber(token[1]),
      formula: formulaLike ? sourceText : undefined,
      unit: unitFromText || unit,
      condition,
      sourceText,
      normalizationStatus: formulaLike ? 'source-formula-preserved' : 'explicit-amount',
    })];
  }

  if (currency && /\b\d+(?:\.\d+)?\s*%/.test(sourceText)) {
    return [makeValue('formula', {
      currency,
      formula: sourceText,
      unit,
      condition,
      sourceText,
      reason: 'The source gives a proportional rate rather than a fixed currency amount.',
      normalizationStatus: 'explicit-proportional-formula',
    })];
  }

  return [];
}

function looksLikeMoneyField(key) {
  return /amount|price|cost|fee|wage|salary|sale|value|rate|worth|treasure|increment|additionalPerLevel|perLevel|spend/i.test(String(key))
    || currencyFromKey(key) !== null;
}

function isMoneyMapKey(key) {
  return /^(?:amounts?|prices?|costs?|fees?|rates?|values?)$/i.test(String(key))
    || /amountsBy|valuesBy|feesBy|pricesBy|costsBy|minimumFee.*By|saleValuesBy/i.test(String(key));
}

function extractMoneyLeaves(rawValue, rootPath, context = {}) {
  const output = [];
  const seenPaths = new Set();

  const emit = (path, value, currency, sourceText, extra = {}) => {
    if (seenPaths.has(path)) return;
    seenPaths.add(path);
    const values = Array.isArray(value) ? value : [value];
    for (const [index, normalized] of values.entries()) {
      output.push({
        path: values.length > 1 ? `${path}/${index}` : path,
        value: normalized,
        isMonetary: normalized.kind !== 'non-monetary-reference',
        ...extra,
      });
    }
  };

  const walk = (node, path, key, inherited = {}) => {
    const keyCurrency = currencyFromKey(key);
    const currency = currencyFrom(node?.currency) ?? keyCurrency ?? inherited.currency ?? context.currency ?? null;
    const keyMoney = looksLikeMoneyField(key) || inherited.moneyMap === true;
    const qualifierText = [...(context.qualifiers ?? []), ...(inherited.qualifiers ?? [])].join(' ');
    const condition = inherited.condition ?? context.condition ?? null;
    const unit = node && typeof node === 'object' && !Array.isArray(node)
      ? node.unit ?? node.per ?? inherited.unit ?? context.unit ?? null
      : inherited.unit ?? context.unit ?? null;

    if (node === null) {
      if (currency && (keyMoney || inherited.moneyMap)) {
        emit(path, makeValue('unknown', {
          currency, unit, condition, sourceText: null,
          reason: context.nullReason ?? 'Source value is explicitly null in a currency-denominated field; the exact printed meaning is not otherwise recorded.',
          normalizationStatus: 'explicit-null-cell',
        }));
      }
      return;
    }

    if (typeof node === 'string') {
      if (keyMoney && /\b(?:special|varies|not specified|not stated|consult .*description)\b/i.test(node)) {
        emit(path, makeValue('unknown', {
          currency,
          unit,
          condition,
          sourceText: node,
          reference: /consult .*description/i.test(node) ? node : undefined,
          reason: 'The source marks the monetary cell as special or variable and does not print a fixed amount in this row.',
          normalizationStatus: 'explicit-special-or-variable-source-cell',
        }));
        return;
      }
      const hasPrintedCurrencyToken = new RegExp(`\\b${CURRENCY_PATTERN}\\b`, 'i').test(node);
      if (!keyMoney && !inherited.moneyMap && !hasPrintedCurrencyToken && inherited.allowBareMoneyText !== true) return;
      const values = normalizeMoneyText(node, {currency, unit, condition, qualifierText});
      if (values.length) {
        emit(path, values, currency, node);
      } else if (currency && (keyMoney || inherited.moneyMap) && /\b(?:formula|roll|per|each|%|percent)\b/i.test(node)) {
        emit(path, makeValue('formula', {
          currency, unit, condition, formula: node, sourceText: node,
          reason: 'Source expression is retained as a formula because no fixed amount can be isolated safely.',
          normalizationStatus: 'formula-candidate',
        }));
      }
      return;
    }

    if (typeof node === 'number') {
      if (Number.isFinite(node) && currency && (keyMoney || inherited.moneyMap)) {
        emit(path, makeValue('exact', {currency, amount: node, unit, condition, sourceText: String(node), normalizationStatus: 'explicit-numeric-cell'}));
      }
      return;
    }

    if (Array.isArray(node)) {
      const moneyArray = keyMoney || inherited.rangeArray || inherited.moneyMap;
      if (moneyArray && currency && node.length === 2 && node.every(value => typeof value === 'number' && Number.isFinite(value))) {
        emit(path, makeValue('range', {
          currency,
          minimumAmount: Math.min(node[0], node[1]),
          maximumAmount: Math.max(node[0], node[1]),
          unit,
          condition,
          sourceText: JSON.stringify(node),
          normalizationStatus: 'explicit-two-bound-array',
        }));
        return;
      }
      node.forEach((value, index) => walk(value, pointerAppend(path, index), String(index), {
        ...inherited,
        currency,
        moneyMap: inherited.moneyMap === true,
        rangeArray: moneyArray,
        unit,
        condition,
        qualifiers: [...(context.qualifiers ?? []), ...(inherited.qualifiers ?? [])],
      }));
      return;
    }

    if (typeof node !== 'object') return;

    const directAmount = amountNumber(node.amount);
    const directMin = amountNumber(node.minimum ?? node.min);
    const directMax = amountNumber(node.maximum ?? node.max);
    const hasCurrencyCell = currency && (
      (node.amount !== undefined && node.amount !== null) ||
      (node.minimum !== undefined && node.minimum !== null) ||
      (node.min !== undefined && node.min !== null) ||
      (node.formula !== undefined && typeof node.formula === 'string') ||
      (node.expression !== undefined && typeof node.expression === 'string')
    );
    if (hasCurrencyCell) {
      let normalized;
      if (node.amount !== undefined) {
        normalized = makeValue(node.amount === null ? 'unknown' : 'exact', {
          currency,
          amount: directAmount ?? undefined,
          unit,
          condition,
          sourceText: node.sourceText ?? node.formula ?? String(node.amount),
          formula: node.formula,
          reason: node.amount === null ? (context.nullReason ?? 'Source records an empty amount cell.') : undefined,
          normalizationStatus: node.amount === null ? 'explicit-null-cell' : 'explicit-amount-currency-object',
        });
      } else if (directMin !== null && directMax !== null) {
        normalized = makeValue('range', {
          currency,
          minimumAmount: Math.min(directMin, directMax),
          maximumAmount: Math.max(directMin, directMax),
          unit,
          condition,
          formula: node.dice ?? node.formula,
          sourceText: node.sourceText ?? JSON.stringify({minimum: directMin, maximum: directMax}),
          normalizationStatus: 'explicit-min-max-object',
        });
      } else if (directMin !== null || directMax !== null) {
        normalized = makeValue('lower-bound', {
          currency,
          amount: directMin ?? directMax,
          unit,
          condition,
          formula: node.dice ?? node.formula,
          sourceText: node.sourceText ?? JSON.stringify(node),
          reason: 'Only one bound is present in the structured source cell.',
          normalizationStatus: 'single-explicit-bound',
        });
      } else {
        normalized = makeValue('formula', {
          currency,
          unit,
          condition,
          formula: node.formula ?? node.expression,
          sourceText: node.formula ?? node.expression,
          normalizationStatus: 'explicit-formula-object',
        });
      }
      emit(path, normalized);
      return;
    }

    const mapKeys = Object.keys(node);
    for (const childKey of mapKeys) {
      if (['currency', 'unit', 'per', 'sourceText', 'classification', 'status', 'conditions', 'condition', 'qualifiers', 'notes', 'footnoteMarkers', 'dice', 'formula', 'expression', 'derivation'].includes(childKey)) {
        if ((childKey === 'formula' || childKey === 'expression') && currency && !mapKeys.some(name => ['amount', 'minimum', 'maximum', 'min', 'max'].includes(name))) {
          emit(pointerAppend(path, childKey), makeValue('formula', {
            currency,
            unit,
            condition,
            formula: node[childKey],
            sourceText: node[childKey],
            normalizationStatus: 'explicit-formula-field',
          }));
        }
        continue;
      }
      const childCurrency = currencyFromKey(childKey) ?? currency;
      const childIsMoneyMap = isMoneyMapKey(childKey);
      const childCondition = childIsMoneyMap ? context.condition ?? inherited.condition : inherited.condition ?? context.condition;
      const childUnit = node.unit ?? node.per ?? inherited.unit ?? context.unit ?? null;
      walk(node[childKey], pointerAppend(path, childKey), childKey, {
        currency: childCurrency,
        moneyMap: childIsMoneyMap || inherited.moneyMap === true,
        rangeArray: /range|cost|price|value|amount/i.test(childKey) && childCurrency !== null,
        unit: childUnit,
        condition: childCondition,
        qualifiers: [...(context.qualifiers ?? []), ...(inherited.qualifiers ?? [])],
      });
    }
  };

  walk(rawValue, rootPath, context.rootKey ?? 'value', {
    currency: context.currency ?? null,
      moneyMap: context.moneyMap ?? false,
    rangeArray: context.rangeArray ?? false,
      allowBareMoneyText: context.allowBareMoneyText ?? false,
    unit: context.unit ?? null,
    condition: context.condition ?? null,
    qualifiers: context.qualifiers ?? [],
  });
  return output;
}

function sourcePage(rawSource = {}, fallback = {}) {
  return {
    book: rawSource.bookKey ?? rawSource.book ?? fallback.book ?? null,
    sourcePdfSha256: rawSource.sourceFileSha256 ?? rawSource.sourcePdfSha256 ?? rawSource.sourceSha256 ?? fallback.sourcePdfSha256 ?? null,
    printedPage: rawSource.printedPage ?? rawSource.page ?? fallback.printedPage ?? null,
    pdfPage: rawSource.pdfPage ?? fallback.pdfPage ?? null,
    sourceFile: rawSource.sourceFile ?? fallback.sourceFile ?? null,
  };
}

function evidenceState(status, reason) {
  return {status, reason};
}

export function validateCropLocalSourceGeometry(crop, focus) {
  const dimensions = crop?.cropDimensionsPx ?? crop?.dimensionsPx;
  if (focus == null) return evidenceState('not-assessable', 'No crop-local highlight focus is recorded.');
  const hasSingle = Object.hasOwn(focus, 'focusBoundsCropPixelsLTRB') || Object.hasOwn(focus, 'bounds') || Object.hasOwn(focus, 'rect');
  const hasMultiple = Object.hasOwn(focus, 'focusRectsCropPixelsLTRB');
  if (hasSingle === hasMultiple) {
    return evidenceState('invalid-geometry', hasSingle
      ? 'Focus declares both single-rectangle and multi-rectangle geometry; the adapter refuses to select one silently.'
      : 'Focus declares neither single-rectangle nor multi-rectangle geometry.');
  }

  const rectangles = hasMultiple
    ? focus.focusRectsCropPixelsLTRB
    : [focus.focusBoundsCropPixelsLTRB ?? focus.bounds ?? focus.rect];
  if (!Array.isArray(rectangles) || rectangles.length === 0 || (hasMultiple && rectangles.length < 2)) {
    return evidenceState('invalid-geometry', hasMultiple
      ? 'Multi-rectangle focus must contain at least two non-empty crop-local rectangles.'
      : 'Single-rectangle focus is absent or not an array of numeric bounds.');
  }
  if (!Array.isArray(dimensions) || dimensions.length !== 2 || !dimensions.every(Number.isFinite)) {
    return evidenceState('not-assessable', 'Crop dimensions are absent or not numeric.');
  }
  const [width, height] = dimensions;
  if (width <= 0 || height <= 0) return evidenceState('invalid-geometry', 'Crop dimensions must be positive.');
  for (const rect of rectangles) {
    if (!Array.isArray(rect) || rect.length !== 4 || !rect.every(Number.isFinite)) {
      return evidenceState('invalid-geometry', 'Every crop-local focus rectangle must have four numeric [left, top, right, bottom] coordinates.');
    }
    const [left, top, right, bottom] = rect;
    if (left >= right || top >= bottom) {
      return evidenceState('invalid-geometry', 'Crop-local focus rectangles must have positive area and ordered [left, top, right, bottom] bounds.');
    }
  }
  if (hasMultiple) {
    for (let first = 0; first < rectangles.length; first++) {
      for (let second = first + 1; second < rectangles.length; second++) {
        const [aLeft, aTop, aRight, aBottom] = rectangles[first];
        const [bLeft, bTop, bRight, bBottom] = rectangles[second];
        if (Math.max(aLeft, bLeft) < Math.min(aRight, bRight) && Math.max(aTop, bTop) < Math.min(aBottom, bBottom)) {
          return {...evidenceState('invalid-geometry', `Multi-rectangle focus rectangles ${first} and ${second} overlap; disjoint rectangles are required.`), overlappingRectangles: [first, second]};
        }
      }
    }
  }
  const outsideEdges = new Set();
  for (const [left, top, right, bottom] of rectangles) {
    if (left < 0) outsideEdges.add('left');
    if (top < 0) outsideEdges.add('top');
    if (right > width) outsideEdges.add('right');
    if (bottom > height) outsideEdges.add('bottom');
  }
  const outside = [...outsideEdges];
  return outside.length
    ? {...evidenceState('outside-crop', `Focus bounds extend beyond crop-local ${outside.join(', ')} edge(s).`), outsideEdges: outside, rectangleCount: rectangles.length}
    : {...evidenceState('contained', `${rectangles.length} crop-local focus rectangle(s) are contained in the recorded crop dimensions.`), rectangleCount: rectangles.length};
}

function focusRectangles(focus) {
  if (!focus) return null;
  if (Array.isArray(focus.focusRectsCropPixelsLTRB)) return clone(focus.focusRectsCropPixelsLTRB);
  const bounds = focus.focusBoundsCropPixelsLTRB ?? focus.bounds ?? focus.rect;
  return Array.isArray(bounds) ? [clone(bounds)] : null;
}

function geometryForCanonical(row) {
  if (row?.evidence?.tableCropBounds?.pdfPagePoints && row?.evidence?.rowHighlightBounds?.pdfPagePoints) {
    return {...validateSourceGeometry(row), method: 'pdf-page-points', helper: 'tools/monetary-source-geometry.mjs'};
  }
  if (row?.cropCoordinates?.length && row?.highlightCoordinates?.length) {
    const cropSpace = row.cropCoordinates.map(entry => entry.coordinateSpace);
    const focusSpace = row.highlightCoordinates.map(entry => entry.coordinateSpace);
    if (cropSpace.every(space => space === focusSpace[0]) && cropSpace[0] === focusSpace[0]) {
      return evidenceState('not-assessable', 'Both bounds exist, but this index has no verified dimensions/transform for the common coordinate space.');
    }
    return evidenceState('not-assessable', 'Crop and highlight bounds use different coordinate spaces; no transform is recorded, so containment cannot be assessed.');
  }
  return evidenceState('not-assessable', 'No separate crop and highlight rectangle pair is recorded.');
}

function extractCanonicalValues(row) {
  const record = row.sourceRecord ?? {};
  const sourceValue = row.sourceValue;
  const currency = currencyFrom(sourceValue?.currency) ?? currencyFrom(record.currency) ?? currencyFrom(record.price?.currency) ?? null;
  const qualifiers = collectQualifiers(record);
  const rootPath = sourceValue !== null && sourceValue !== undefined ? '/sourceValue' : '/sourceRecord';
  const value = sourceValue !== null && sourceValue !== undefined ? sourceValue : record;
  const nullMeaning = record.nullCellMeaning ?? record.dashMeaning ?? null;
  if (sourceValue && typeof sourceValue === 'object' && sourceValue.amount === null && /special/i.test(sourceValue.classification ?? '')) {
    return [{path: '/sourceValue', value: makeValue('unknown', {
      unit: sourceValue.unit ?? null,
      sourceText: sourceValue.classification,
      reference: 'consult occupation description',
      reason: 'The source row explicitly marks this wage as special and directs the reader to the occupation description; no fixed amount is given here.',
      normalizationStatus: 'explicit-special-rate-reference',
      rawStructuredValue: clone(sourceValue),
    }), isMonetary: true}];
  }
  return extractMoneyLeaves(value, rootPath, {
    currency,
    qualifiers,
    condition: record.conditions ?? null,
    nullReason: nullMeaning ?? undefined,
    rootKey: sourceValue === null ? 'sourceRecord' : 'sourceValue',
    moneyMap: sourceValue === null && row.sourceCategory !== 'market-valuation-or-screening-finding',
    rangeArray: sourceValue === null && row.sourceCategory !== 'market-valuation-or-screening-finding',
    allowBareMoneyText: typeof value === 'string',
  });
}

function normalizeCandidateOrReference(rawValue, {currency = null, purpose = 'unknown', qualifiers = [], sourceText = null, reason = null} = {}) {
  const combined = [sourceText, ...qualifiers].filter(value => typeof value === 'string').join(' ');
  if (isExplicitNotForSale(combined)) {
    return makeValue('not-for-sale', {currency, sourceText, reason: reason ?? 'Source explicitly says the object is not for sale.', normalizationStatus: 'explicit-not-for-sale'});
  }
  if (currency && typeof rawValue === 'string') {
    const parsed = normalizeMoneyText(rawValue, {currency, qualifierText: combined});
    if (parsed.length) return parsed[0];
  }
  return makeValue(rawValue === null || rawValue === undefined ? 'unknown' : 'unassessable', {
    currency,
    sourceText,
    reason: reason ?? (rawValue === null || rawValue === undefined
      ? 'No numeric value is present in the supplied structured row.'
      : 'The structured value cannot be normalized as a monetary amount without assigning unsupported meaning.'),
    normalizationStatus: 'candidate-unassessable',
    rawStructuredValue: rawValue,
  });
}

function makeSiteMapping(mapping, fallbackReason = 'No site item/field mapping is recorded in the supplied artifacts.') {
  if (!mapping) return {status: 'unmapped', collection: null, itemId: null, fieldPointer: null, reason: fallbackReason};
  if (mapping.status === 'multiple-mappings' && Array.isArray(mapping.mappings)) {
    return {status: 'multiple-mappings', mappings: clone(mapping.mappings)};
  }
  const itemId = mapping.itemId ?? mapping.id ?? null;
  const collection = mapping.collection ?? null;
  const fieldPointer = mapping.fieldPointer ?? null;
  if (itemId && fieldPointer) return {status: mapping.status ?? 'mapped', collection, itemId, fieldPointer, evidence: mapping.evidence ?? null};
  if (itemId) return {status: 'item-mapped-field-unmapped', collection, itemId, fieldPointer, evidence: mapping.status ?? null};
  return {status: 'unmapped', collection, itemId: null, fieldPointer, reason: mapping.status ?? fallbackReason};
}

function makeReviewStatus(original, sourceClaimStatus = null, reviewDisposition = 'not-assessed-by-index') {
  return {
    originalSourceStatus: clone(original ?? null),
    sourceClaimStatus: sourceClaimStatus ?? 'not-recorded-in-source-artifact',
    independentSemanticReview: reviewDisposition,
    independentOverlayReview: reviewDisposition,
    indexReview: 'inventory-only; no semantic or overlay approval performed',
  };
}

function occurrenceBase({
  id, kind, object, variant = null, purpose, source, identity, evidence, siteMapping, provenance,
  reviewStatus = null, conditions = null, quantity = null, qualifiers = [], sourceRecord = null,
}) {
  return {
    sourceOccurrenceId: id,
    occurrenceKind: kind,
    object: object ?? null,
    variant: clone(variant),
    purpose,
    source,
    sourceIdentity: identity,
    evidence,
    siteMapping: makeSiteMapping(siteMapping),
    quantityOrScale: clone(quantity),
    conditions: clone(conditions),
    qualifiers: clone(qualifiers),
    sourceRecord: clone(sourceRecord),
    provenance,
    reviewStatus,
    valueClaimIds: [],
  };
}

function addValueClaims({claims, occurrence, leaves, sourcePath, sourceCellPointer, adjacentReferences = null, forceCandidateReason = null, fallbackValue = undefined}) {
  const values = leaves.length ? leaves : [{
    path: sourcePath,
    value: makeValue('unassessable', {
      reason: forceCandidateReason ?? 'No amount cell could be normalized from the supplied structure; retain the row for review.',
      normalizationStatus: 'candidate-unassessable',
      rawStructuredValue: fallbackValue,
    }),
    isMonetary: false,
  }];
  for (const leaf of values) {
    const suffix = leaf.path.startsWith('/') ? leaf.path : `/${leaf.path}`;
    const claimId = `${occurrence.sourceOccurrenceId}#${suffix}`;
    const localValuePointer = sourceCellPointer ?? leaf.path;
    const artifactRowPointer = occurrence.provenance.inputArtifact?.jsonPointer ?? '';
    const claim = {
      claimId,
      sourceOccurrenceId: occurrence.sourceOccurrenceId,
      object: occurrence.object,
      variant: clone(occurrence.variant),
      purpose: occurrence.purpose,
      valueSemantics: clone(leaf.value),
      monetaryAmount: leaf.isMonetary === true && ['exact', 'derived-amount', 'range', 'lower-bound', 'upper-bound', 'formula', 'conditional', 'rate', 'approximate', 'percentage', 'percentage-range'].includes(leaf.value.kind),
      monetaryClaim: leaf.isMonetary === true,
      quantityOrScale: clone(occurrence.quantityOrScale),
      conditions: clone(occurrence.conditions),
      qualifiers: clone(occurrence.qualifiers),
      adjacentReferences: clone(adjacentReferences),
      source: clone(occurrence.source),
      sourceIdentity: clone(occurrence.sourceIdentity),
      evidence: clone(occurrence.evidence),
      siteMapping: clone(occurrence.siteMapping),
      provenance: {
        ...clone(occurrence.provenance),
        sourceValueJsonPointer: `${artifactRowPointer}${localValuePointer}`,
        sourceValuePointerWithinRow: localValuePointer,
      },
      reviewStatus: clone(occurrence.reviewStatus),
    };
    occurrence.valueClaimIds.push(claimId);
    claims.push(claim);
  }
}

function appendUaDescriptionRecords({artifact, uaArtifact, occurrences, claims}) {
  const records = artifact.data.newSourceDescriptionRecords;
  const links = artifact.data.pointerResolutionLinks;
  if (!Array.isArray(records) || !Array.isArray(links)) throw new TypeError('UA description supplement must have newSourceDescriptionRecords and pointerResolutionLinks arrays.');
  if (artifact.data.inputSupplement?.sha256 !== uaArtifact.sha256) throw new Error('UA description supplement is pinned to a different UA source-row artifact.');

  const uaRows = uaArtifact.data.rowRecords;
  const sourceRowsById = new Map(uaRows.map(row => [row.recordId, row]));
  const occurrenceById = new Map(occurrences.map(row => [row.sourceOccurrenceId, row]));
  const claimById = new Map(claims.map(claim => [claim.claimId, claim]));
  const descriptionById = new Map(records.map(record => [record.recordId, record]));
  if (descriptionById.size !== records.length) throw new Error('UA description supplement contains duplicate record IDs.');

  const pointerRows = uaRows.filter(row => row.values?.gpSaleValue?.kind === 'description-pointer');
  const pointerIds = new Set(pointerRows.map(row => `ua:${row.recordId}#/values/gpSaleValue`));
  if (links.length !== pointerIds.size || links.some(link => !pointerIds.has(link.pointerClaimId)) || new Set(links.map(link => link.pointerClaimId)).size !== links.length) {
    throw new Error('UA description supplement must resolve every bounded description-pointer GP cell exactly once.');
  }

  const newDescriptionOccurrences = new Map();
  records.forEach((record, index) => {
    const source = record.source ?? {};
    if (source.sourcePdfSha256 !== artifact.data.sourcePdf?.sha256 || source.sourcePdfSha256 !== uaArtifact.data.source?.sha256) {
      throw new Error(`UA description record ${record.recordId} has a source PDF hash that does not match the UA source inventory.`);
    }
    const occurrenceId = `ua-description:${record.recordId}`;
    const gp = record.valueRecords?.gpSaleValue;
    const derived = record.valueRecords?.derivedBonusRange;
    const xp = record.valueRecords?.xpValue;
    if (!gp || !derived || !xp || !record.source?.sourcePassageIdentity || !record.source?.sourceArtifactSha256) {
      throw new Error(`UA description record ${record.recordId} lacks its typed GP/XP values or exact passage provenance.`);
    }
    if (!Number.isFinite(derived.minimum) || !Number.isFinite(derived.maximum) || derived.minimum > derived.maximum || derived.printedAsRange !== false) {
      throw new Error(`UA description record ${record.recordId} has an invalid or unqualified derived range.`);
    }
    const contextCrop = source.evidence?.contextCrop ?? {};
    const focus = source.evidence?.highlight ?? {};
    const occurrence = occurrenceBase({
      id: occurrenceId,
      kind: 'ua-source-description-passage',
      object: record.sourceObject,
      purpose: purposeFor(record.classification, record.classification),
      source: sourcePage({
        bookKey: source.bookKey,
        sourceFileSha256: source.sourcePdfSha256,
        printedPage: source.printedPage,
        pdfPage: source.pdfPage,
        sourceFile: source.sourceFile,
      }),
      identity: {
        descriptionRecordId: record.recordId,
        relatedSourceOccurrenceId: record.relatedSourceOccurrenceId,
        reference: record.reference,
        passageIdentity: source.sourcePassageIdentity,
        tableRowIdentity: source.sourceTableRowIdentity,
        printedPage: source.printedPage,
        pdfPage: source.pdfPage,
        sourcePdfSha256: source.sourcePdfSha256,
      },
      evidence: {
        contextCropBounds: clone(contextCrop.pdfPagePointsTopLeft ?? null),
        contextCropRenderedPixels: clone(contextCrop.renderedPagePixels150DpiTopLeft ?? null),
        contextCropCoordinateSpace: contextCrop.coordinateSpace ?? null,
        pageImageSha256: contextCrop.pageImageSha256At150Dpi ?? null,
        contextPixelReview: contextCrop.pixelReview ?? null,
        rowHighlightBounds: clone(focus.rectangles ?? null),
        highlightCoordinateSpace: focus.coordinateSpace ?? null,
        sourceReviewStatus: clone(record.sourceReviewStatus ?? null),
        geometryAssessment: {status: 'preserved-from-source-record; independent-overlay-review-pending', reason: 'The source description artifact keeps crop and focus spaces separate; the builder does not recalculate or approve those bounds.'},
        excerptPublication: {status: 'source-only; private crop is not published'},
      },
      siteMapping: null,
      provenance: {
        inputArtifact: {path: artifact.path, sha256: artifact.sha256, jsonPointer: jsonPointer(['newSourceDescriptionRecords', index])},
        sourceArtifact: {path: source.sourceArtifact, sha256: source.sourceArtifactSha256, sourcePdfSha256: source.sourcePdfSha256},
        sourceValueJsonPointer: '/valueRecords',
      },
      reviewStatus: makeReviewStatus(record.sourceReviewStatus, 'source description values transcribed and visually confirmed by author; independent semantic and overlay review pending', 'pending-independent-review'),
      conditions: clone(record.variantConditions ?? null),
      qualifiers: clone(record.qualifiers ?? []),
      sourceRecord: {
        classification: record.classification,
        sourceObject: record.sourceObject,
        valueRecords: clone(record.valueRecords),
        variantConditions: clone(record.variantConditions ?? null),
        valueLinkage: 'Separate description passage and variant table are linked by the exact printed item label and reference; source table GP cell remains a pointer.',
      },
    });
    const directGp = makeValue(gp.kind, {
      currency: currencyFrom(gp.currency),
      amount: gp.amount,
      base: gp.base,
      increment: gp.increment,
      denominator: gp.denominator,
      formula: gp.kind === 'formula' ? gp.sourceTextExcerpt : undefined,
      sourceText: gp.sourceTextExcerpt,
      normalizationStatus: 'source-description-value-transcribed',
      rawStructuredValue: gp,
    });
    const derivedGp = makeValue('range', {
      currency: currencyFrom(derived.currency),
      minimumAmount: derived.minimum,
      maximumAmount: derived.maximum,
      sourceText: `${derived.minimum}–${derived.maximum} ${derived.currency} (derived from the printed formula and bonus table; not printed as a range)`,
      formula: derived.derivation,
      derivation: derived.derivation,
      derivationStatus: 'derived-from-printed-formula-and-adjacent-variant-table',
      printedAsRange: false,
      normalizationStatus: 'source-derived-range-not-printed',
      rawStructuredValue: derived,
    });
    addValueClaims({
      claims,
      occurrence,
      leaves: [
        {path: '/valueRecords/gpSaleValue', value: directGp, isMonetary: true},
        {path: '/valueRecords/derivedBonusRange', value: derivedGp, isMonetary: true},
      ],
      sourcePath: '/valueRecords',
      sourceCellPointer: null,
      adjacentReferences: {xpValue: clone(xp)},
    });
    for (const claimId of occurrence.valueClaimIds) claimById.set(claimId, claims.find(claim => claim.claimId === claimId));
    occurrences.push(occurrence);
    newDescriptionOccurrences.set(record.recordId, occurrence);
  });

  const descriptionLinkSummary = [];
  for (const link of links) {
    const sourceRow = sourceRowsById.get(link.pointerRecordId);
    const pointerOccurrenceId = `ua:${link.pointerRecordId}`;
    const pointerOccurrence = occurrenceById.get(pointerOccurrenceId);
    const pointerClaim = claimById.get(link.pointerClaimId);
    const pointerValue = sourceRow?.values?.gpSaleValue;
    if (!sourceRow || !pointerOccurrence || !pointerClaim || link.sourceOccurrenceId !== pointerOccurrenceId || link.pointerCellJsonPointer !== '/values/gpSaleValue' || link.pointerCellKind !== 'description-pointer' || pointerValue?.kind !== 'description-pointer' || pointerValue.reference !== link.pointerCellReference || link.tableValueStatus !== 'amount unresolved by table') {
      throw new Error(`UA description link ${link.pointerClaimId} does not exactly match its source-table pointer cell.`);
    }

    let sourceDescriptionOccurrences = [];
    let gpSourceClaimIds = [];
    let xpSourceValues = [];
    if (link.descriptionResolutionStatus === 'linked-to-existing-source-description-rows') {
      if (!Array.isArray(link.descriptionSourceRecordIds) || !link.descriptionSourceRecordIds.length || link.descriptionSourceRecordIds.length !== link.descriptionSourceValues?.length) {
        throw new Error(`UA description link ${link.pointerClaimId} has incomplete description row records.`);
      }
      for (const [rowIndex, descriptionRecordId] of link.descriptionSourceRecordIds.entries()) {
        const descriptionRow = sourceRowsById.get(descriptionRecordId);
        const expected = link.descriptionSourceValues[rowIndex];
        if (!descriptionRow || !descriptionRecordId.startsWith(`${link.pointerCellReference}-item-`) || descriptionRow.object !== expected.object || JSON.stringify(descriptionRow.values?.gpSaleValue) !== JSON.stringify(expected.gpSaleValue) || JSON.stringify(descriptionRow.values?.xpValue) !== JSON.stringify(expected.xpValue)) {
          throw new Error(`UA description row ${descriptionRecordId} does not match the exact printed reference, label, and typed GP/XP values.`);
        }
        const descriptionOccurrenceId = `ua:${descriptionRecordId}`;
        const descriptionOccurrence = occurrenceById.get(descriptionOccurrenceId);
        const gpClaimId = `${descriptionOccurrenceId}#/values/gpSaleValue`;
        if (!descriptionOccurrence || !claimById.has(gpClaimId)) throw new Error(`UA description row ${descriptionRecordId} has no exact source occurrence and GP claim.`);
        sourceDescriptionOccurrences.push({sourceOccurrenceId: descriptionOccurrenceId, recordId: descriptionRecordId, object: descriptionRow.object});
        gpSourceClaimIds.push(gpClaimId);
        xpSourceValues.push({sourceOccurrenceId: descriptionOccurrenceId, recordId: descriptionRecordId, object: descriptionRow.object, value: clone(descriptionRow.values.xpValue), sourcePage: clone(descriptionOccurrence.source)});
      }
    } else if (link.descriptionResolutionStatus === 'new-source-description-record-added') {
      const description = descriptionById.get(link.descriptionRecordId);
      const occurrence = newDescriptionOccurrences.get(link.descriptionRecordId);
      if (!description || !occurrence || description.relatedSourceOccurrenceId !== pointerOccurrenceId || link.descriptionPassageIdentity !== description.source.sourcePassageIdentity || link.descriptionSourcePage?.printedPage !== description.source.printedPage || link.descriptionSourcePage?.pdfPage !== description.source.pdfPage) {
        throw new Error(`UA description link ${link.pointerClaimId} does not exactly match its new source passage record.`);
      }
      const directClaimId = `${occurrence.sourceOccurrenceId}#/valueRecords/gpSaleValue`;
      if (!claimById.has(directClaimId)) throw new Error(`UA description passage ${link.descriptionRecordId} has no exact typed GP claim.`);
      sourceDescriptionOccurrences.push({sourceOccurrenceId: occurrence.sourceOccurrenceId, recordId: link.descriptionRecordId, object: description.sourceObject, passageIdentity: link.descriptionPassageIdentity});
      gpSourceClaimIds.push(directClaimId);
      xpSourceValues.push({sourceOccurrenceId: occurrence.sourceOccurrenceId, recordId: link.descriptionRecordId, object: description.sourceObject, value: clone(description.valueRecords.xpValue), sourcePage: clone(occurrence.source)});
    } else {
      throw new Error(`UA description link ${link.pointerClaimId} has unsupported resolution status ${link.descriptionResolutionStatus}.`);
    }

    pointerClaim.descriptionResolution = {
      status: 'description-source-linked; table-pointer-amount-still-unresolved',
      tableValueStatus: 'amount unresolved by table',
      pointerCellJsonPointer: link.pointerCellJsonPointer,
      pointerCellReference: link.pointerCellReference,
      valueLinkage: link.valueLinkage,
      sourceDescriptionOccurrences,
      gpSourceValueClaimIds: gpSourceClaimIds,
      xpDescriptionValuesKeptSeparate: xpSourceValues,
    };
    descriptionLinkSummary.push({pointerClaimId: link.pointerClaimId, sourceDescriptionOccurrences: sourceDescriptionOccurrences.length, gpSourceValueClaims: gpSourceClaimIds.length, xpValuesSeparate: xpSourceValues.length});
  }
  return {recordCount: records.length, linkCount: links.length, descriptionLinkSummary};
}

function sourceRowSiteMappings(row, rowBindingLookup, fieldEvidenceBySourceRowId) {
  const bindings = rowBindingLookup.get(`${row.sourceFile}|${row.sourceRecordIndex}`) ?? [];
  const evidence = fieldEvidenceBySourceRowId.get(row.id) ?? [];
  const explicit = [];
  for (const binding of bindings) explicit.push({collection: 'equipment', itemId: binding.itemId, fieldPointer: '/price', status: 'explicit-source-row-binding'});
  for (const entry of evidence) explicit.push({collection: entry.collection, itemId: entry.itemId, fieldPointer: entry.fieldPointer, status: entry.reviewStatus ?? entry.status ?? 'recorded-field-evidence-binding'});
  if (explicit.length) {
    const unique = new Map();
    for (const entry of explicit) {
      const key = [entry.collection ?? '', entry.itemId ?? '', entry.fieldPointer ?? ''].join('|');
      const existing = unique.get(key);
      if (existing) existing.evidenceSources.push(entry.status);
      else unique.set(key, {...entry, evidenceSources: [entry.status]});
    }
    return [...unique.values()];
  }
  const siteMatch = row.siteMatch ?? row.sourceRecord?.siteMatch;
  if (siteMatch && (siteMatch.itemId || siteMatch.id)) {
    return [{collection: siteMatch.collection ?? null, itemId: siteMatch.itemId ?? siteMatch.id, fieldPointer: siteMatch.fieldPointer ?? null, status: siteMatch.status ?? 'source-row-site-match'}];
  }
  return [];
}

function findSourceRowForBinding(binding, rowLookup) {
  const rows = rowLookup.get(`${binding.sourceInventoryFile}|${binding.sourceRecordIndex}`) ?? [];
  return rows.find(row => (row.row.sourceObject ?? row.row.sourceRecord?.sourceObject) === binding.sourceObject) ?? rows[0] ?? null;
}

function makeCanonicalRowInput(sourceArtifact, inventory, inventoryIndex, row, rowIndex, rowBindingLookup, fieldEvidenceBySourceRowId) {
  const id = `canonical:${row.id}`;
  const rawSource = row.source ?? row.sourceRecord?.source ?? {};
  const physicalBookHash = rawSource.sourceSha256 ?? rawSource.sourceFileSha256 ?? inventory.sourceIdentity?.sourceSha256 ?? null;
  const source = sourcePage(rawSource, {sourcePdfSha256: physicalBookHash});
  const record = row.sourceRecord ?? {};
  const purpose = purposeFor(record.classification ?? row.sourceCategory, row.sourceCategory);
  const mappings = sourceRowSiteMappings(row, rowBindingLookup, fieldEvidenceBySourceRowId);
  const occurrence = occurrenceBase({
    id,
    kind: 'canonical-source-row',
    object: row.sourceObject ?? record.sourceObject ?? record.name ?? null,
    variant: record.variant ?? null,
    purpose,
    source,
    identity: {
      inventoryId: inventory.id,
      sourceRowId: row.id,
      sourceRecordIndex: row.sourceRecordIndex,
      sourceCategory: row.sourceCategory,
      section: row.section ?? record.section ?? null,
      passage: rawSource.passage ?? null,
      rowLabel: row.sourceObject ?? record.sourceObject ?? record.name ?? null,
    },
    evidence: {
      sourceRowCoordinates: clone(row.sourceRowCoordinates ?? null),
      tableCropBounds: clone(row.cropCoordinates ?? null),
      rowHighlightBounds: clone(row.highlightCoordinates ?? null),
      geometryAssessment: geometryForCanonical(row),
      sourceReviewStatus: clone(row.reviewStatus ?? null),
      excerptPublication: row.catalog ? {status: 'catalog-reference-present; rendered-publication-not-asserted', catalog: row.catalog} : {status: 'no-public-excerpt-recorded-for-this-source-row'},
    },
    siteMapping: mappings.length === 1 ? mappings[0] : mappings.length ? {collection: null, itemId: null, fieldPointer: null, status: 'multiple-mappings', mappings} : null,
    provenance: {
      inputArtifact: {path: sourceArtifact.path, sha256: sourceArtifact.sha256, jsonPointer: jsonPointer(['sourceInventories', inventoryIndex, 'sourceRows', rowIndex])},
      rowSourceArtifact: {
        path: row.sourceFile ?? inventory.integrity?.sourceFile ?? null,
        sha256: inventory.integrity?.sourceFileSha256 ?? null,
        jsonPointer: row.sourceRecordIndex === null || row.sourceRecordIndex === undefined ? null : jsonPointer(['sourceRows', row.sourceRecordIndex]),
      },
    },
    reviewStatus: makeReviewStatus(row.reviewStatus, row.reviewStatus?.sourceValues ?? row.reviewStatus?.final ?? null),
    conditions: record.conditions ?? null,
    quantity: row.sourceValue?.unit ?? record.price?.unit ?? record.rate?.unit ?? null,
    qualifiers: collectQualifiers(record),
    sourceRecord: {sourceCategory: row.sourceCategory, rawValue: clone(row.sourceValue), section: row.section ?? record.section ?? null},
  });
  occurrence.siteMappings = clone(mappings);
  return {occurrence, row, record, inventory, inventoryIndex, rowIndex, purpose, physicalBookHash};
}

function appendCanonicalRows({sourceArtifact, sourceRows, claims, rowBindingLookup, fieldEvidenceBySourceRowId, rowLookup}) {
  const canonicalRows = [];
  sourceArtifact.data.sourceInventories.forEach((inventory, inventoryIndex) => {
    if (!Array.isArray(inventory.sourceRows)) throw new TypeError(`Canonical inventory ${inventory.id} has no sourceRows array.`);
    inventory.sourceRows.forEach((row, rowIndex) => {
      const input = makeCanonicalRowInput(sourceArtifact, inventory, inventoryIndex, row, rowIndex, rowBindingLookup, fieldEvidenceBySourceRowId);
      const leaves = extractCanonicalValues(row);
      const expectedMoneyCategory = !['market-valuation-or-screening-finding'].includes(row.sourceCategory);
      const candidateLeaves = leaves.length ? leaves : [];
      addValueClaims({
        claims,
        occurrence: input.occurrence,
        leaves: candidateLeaves,
        sourcePath: row.sourceValue !== null && row.sourceValue !== undefined ? '/sourceValue' : '/sourceRecord',
        sourceCellPointer: null,
        forceCandidateReason: expectedMoneyCategory
          ? 'The source inventory classifies this row as monetary, but its structured sourceValue/sourceRecord has no safely normalizable monetary cell.'
          : 'This row is a screening/valuation finding without a safely isolatable currency-denominated amount.',
        fallbackValue: row.sourceValue !== null && row.sourceValue !== undefined ? row.sourceValue : row.sourceRecord,
      });
      sourceRows.push(input.occurrence);
      canonicalRows.push(input);
      const key = `${row.sourceFile}|${row.sourceRecordIndex}`;
      const bucket = rowLookup.get(key) ?? [];
      bucket.push(input);
      rowLookup.set(key, bucket);
    });
  });
  return canonicalRows;
}

function equipmentItemArray(artifact) {
  if (Array.isArray(artifact.data)) return {items: artifact.data, pointerPrefix: []};
  if (Array.isArray(artifact.data?.equipment)) return {items: artifact.data.equipment, pointerPrefix: ['equipment']};
  throw new TypeError('equipment data must be an array or an object with an equipment array.');
}

function makeEquipmentClaim({equipmentArtifact, item, itemIndex, itemPointerPrefix, binding, bindingIndex, rowInput}) {
  const itemId = item.id;
  const id = `site:equipment:${itemId}:/price`;
  const price = item.price;
  const source = {
    book: price.book ?? rowInput?.occurrence.source.book ?? null,
    sourcePdfSha256: rowInput?.physicalBookHash ?? null,
    printedPage: Array.isArray(price.pages) ? price.pages[0] ?? null : null,
    pdfPage: rowInput?.occurrence.source.pdfPage ?? null,
    sourceFile: binding?.sourceInventoryFile ?? null,
  };
  const exactPrice = price && typeof price === 'object' && price.amount !== undefined && currencyFrom(price.currency)
    ? makeValue('exact', {
      currency: currencyFrom(price.currency),
      amount: amountNumber(price.amount),
      unit: price.unit ?? null,
      sourceText: String(price.amount),
      normalizationStatus: 'explicit-equipment-price-field',
    })
    : normalizeCandidateOrReference(price, {currency: currencyFrom(price?.currency), purpose: 'purchase', sourceText: typeof price === 'string' ? price : null, reason: 'Current equipment price field does not expose a safely normalized amount/currency object.'});
  const sourceOccurrenceId = rowInput?.occurrence.sourceOccurrenceId ?? null;
  const siteMapping = {collection: 'equipment', itemId, fieldPointer: '/price', status: 'current-equipment-price-field'};
  const itemPointer = jsonPointer([...itemPointerPrefix, itemIndex]);
  return {
    claimId: id,
    sourceOccurrenceId,
    object: item.name ?? itemId,
    variant: item.variant ?? item.variantName ?? null,
    purpose: 'purchase',
    valueSemantics: exactPrice,
    monetaryAmount: ['exact', 'range', 'lower-bound', 'formula', 'conditional', 'rate', 'approximate'].includes(exactPrice.kind),
    monetaryClaim: true,
    quantityOrScale: price.unit ?? null,
    conditions: item.priceNote ?? null,
    qualifiers: [],
    adjacentReferences: null,
    source,
    sourceIdentity: {
      equipmentItemId: itemId,
      fieldPointer: '/price',
      linkedSourceRowId: binding ? rowInput?.row.id ?? null : null,
      sourceObject: binding?.sourceObject ?? rowInput?.row.sourceObject ?? null,
      sourceInventoryFile: binding?.sourceInventoryFile ?? null,
      sourceRecordIndex: binding?.sourceRecordIndex ?? null,
    },
    evidence: rowInput?.occurrence.evidence ?? {
      tableCropBounds: null,
      rowHighlightBounds: null,
      geometryAssessment: evidenceState('not-assessable', 'No linked source-row geometry is available.'),
      sourceReviewStatus: item.scanVerification ?? null,
      excerptPublication: {status: 'no-public-excerpt-recorded-for-this-field'},
    },
    siteMapping,
    provenance: {
      inputArtifact: {path: equipmentArtifact.path, sha256: equipmentArtifact.sha256, jsonPointer: itemPointer},
      bindingArtifact: binding ? {path: binding.path, sha256: binding.sha256, jsonPointer: jsonPointer(['bindings', bindingIndex])} : null,
      sourceValueJsonPointer: `${itemPointer}/price`,
      sourceValuePointerWithinRow: '/price',
    },
    reviewStatus: {
      originalSourceStatus: clone(item.scanVerification ?? null),
      sourceClaimStatus: item.price.status ?? item.priceState ?? 'source-listed-price-field',
      independentSemanticReview: 'not-assessed-by-index',
      independentOverlayReview: 'not-assessed-by-index',
      indexReview: 'inventory-only; no semantic or overlay approval performed',
    },
  };
}

function appendEquipmentClaims({equipmentArtifact, bindingArtifact, rowsByKey, claims}) {
  const {items: equipment, pointerPrefix: itemPointerPrefix} = equipmentItemArray(equipmentArtifact);
  const bindings = bindingArtifact.data.bindings;
  if (!Array.isArray(bindings)) throw new TypeError('equipment row-binding artifact must have a bindings array.');
  const bindingsByItem = new Map(bindings.map((binding, index) => [binding.itemId, {binding, index}]));
  const missingBindings = [];
  const occurrencesById = new Map();
  for (const [key, rows] of rowsByKey) for (const input of rows) occurrencesById.set(input.occurrence.sourceOccurrenceId, input);
  const priced = equipment.flatMap((item, index) => item?.price == null ? [] : [{item, index}]);
  for (const {item, index} of priced) {
    const ref = bindingsByItem.get(item.id);
    const binding = ref?.binding ?? null;
    const rowInput = binding ? findSourceRowForBinding(binding, rowsByKey) : null;
    if (!binding || !rowInput) missingBindings.push({itemId: item.id, reason: !binding ? 'no-equipment-source-row-binding' : 'binding-source-row-not-found'});
    const claim = makeEquipmentClaim({equipmentArtifact, item, itemIndex: index, itemPointerPrefix, binding, bindingIndex: ref?.index ?? null, rowInput});
    if (!binding || !rowInput) {
      claim.siteMapping = {status: 'unmapped', collection: 'equipment', itemId: item.id, fieldPointer: '/price', reason: !binding ? 'No source row binding is present.' : 'Binding does not match a canonical source occurrence.'};
    }
    claims.push(claim);
  }
  return {pricedEquipmentCount: priced.length, bindingsCount: bindings.length, missingBindings};
}

function cropMap(evidenceCrops = []) {
  return new Map(evidenceCrops.map(crop => [crop.cropId ?? crop.id, crop]));
}

function uaActiveContextTargetsForRow({group, row, uaSourcePdfSha256}) {
  const targets = group?.activeContextTargets;
  const links = row.evidence?.activeContextTargetLinks;
  if (targets === undefined && links === undefined) return [];
  if (!Array.isArray(targets) || !Array.isArray(links)) {
    throw new TypeError(`UA row ${row.recordId} has a partial active-context declaration; both group targets and row links are required.`);
  }

  const targetById = new Map();
  let previousTargetOrder = 0;
  for (const [index, target] of targets.entries()) {
    if (!target || typeof target.targetId !== 'string' || !target.targetId) {
      throw new TypeError(`UA active context target ${group.groupId}[${index}] lacks a stable targetId.`);
    }
    if (targetById.has(target.targetId)) throw new Error(`UA active context target ID is duplicated: ${target.targetId}`);
    if (!Number.isInteger(target.targetOrder) || target.targetOrder <= previousTargetOrder) {
      throw new Error(`UA active context targets for ${group.groupId} must retain strictly increasing 1-based targetOrder values.`);
    }
    previousTargetOrder = target.targetOrder;
    const source = target.source ?? {};
    const render = target.sourceRender ?? {};
    const crop = target.crop ?? {};
    const dimensions = value => Array.isArray(value) && value.length === 2 && value.every(number => Number.isInteger(number) && number > 0);
    const rectangle = value => Array.isArray(value) && value.length === 4 && value.every(Number.isFinite) && value[2] > value[0] && value[3] > value[1];
    const rasterRectangle = value => Array.isArray(value) && value.length === 4 && value.every(Number.isInteger) && value[2] > value[0] && value[3] > value[1];
    const pageBounds = render.pageBoundsPdfPagePointsTopLeftLTRB
      ?? (dimensions(render.sourceRenderDimensionsPx) && Number.isFinite(render.renderDpi) && render.renderDpi > 0
        ? [0, 0, render.sourceRenderDimensionsPx[0] * 72 / render.renderDpi, render.sourceRenderDimensionsPx[1] * 72 / render.renderDpi]
        : null);
    const rowIdentity = row.sourceRowIdentity ?? {};
    const rowSpecificTarget = Array.isArray(target.rowRecordIds);
    const sourceBookIsUa = source.book === 'UA' || /^unearthed arcana$/i.test(String(source.book ?? ''));
    if (!target.role || typeof target.role !== 'string'
      || typeof target.segmentId !== 'string' || !target.segmentId
      || !sourceBookIsUa || !/^[a-f0-9]{64}$/i.test(source.sourcePdfSha256 ?? '') || source.sourcePdfSha256 !== uaSourcePdfSha256
      || !Number.isInteger(source.printedPage) || source.printedPage <= 0 || !Number.isInteger(source.pdfPage) || source.pdfPage <= 0
      || typeof render.sourceRenderId !== 'string' || !render.sourceRenderId
      || !/^[a-f0-9]{64}$/i.test(render.sourceRenderSha256 ?? '') || !dimensions(render.sourceRenderDimensionsPx)
      || !Number.isFinite(render.renderDpi) || render.renderDpi <= 0 || !render.coordinateSpace
      || !rectangle(pageBounds) || !rectangle(crop.cropBoundsPdfPagePointsTopLeftLTRB)
      || crop.cropBoundsPdfPagePointsTopLeftLTRB[0] < pageBounds[0] || crop.cropBoundsPdfPagePointsTopLeftLTRB[1] < pageBounds[1]
      || crop.cropBoundsPdfPagePointsTopLeftLTRB[2] > pageBounds[2] || crop.cropBoundsPdfPagePointsTopLeftLTRB[3] > pageBounds[3]
      || !rasterRectangle(crop.cropBoundsPixelsLTRB) || crop.cropBoundsPixelsLTRB[0] < 0 || crop.cropBoundsPixelsLTRB[1] < 0
      || crop.cropBoundsPixelsLTRB[2] > render.sourceRenderDimensionsPx[0] || crop.cropBoundsPixelsLTRB[3] > render.sourceRenderDimensionsPx[1]
      || !dimensions(crop.cropDimensionsPx) || crop.cropDimensionsPx[0] !== crop.cropBoundsPixelsLTRB[2] - crop.cropBoundsPixelsLTRB[0]
      || crop.cropDimensionsPx[1] !== crop.cropBoundsPixelsLTRB[3] - crop.cropBoundsPixelsLTRB[1]
      || !/^[a-f0-9]{64}$/i.test(crop.cropSha256 ?? '') || !Number.isFinite(crop.renderDpi) || crop.renderDpi <= 0
      || !crop.coordinateSpace || !target.pixelReview?.status) {
      throw new Error(`UA active context target ${target.targetId} lacks source/page/render/crop hashes, dimensions, bounds, scale, or a pixel-review disposition.`);
    }
    targetById.set(target.targetId, target);
  }

  const rowSegmentId = row.sourceRowIdentity?.segmentId ?? row.evidence?.tableSegmentId ?? null;
  let previousLinkOrder = 0;
  const seenLinks = new Set();
  return links.map(link => {
    if (!link || typeof link.targetId !== 'string' || seenLinks.has(link.targetId)) {
      throw new Error(`UA row ${row.recordId} has a missing or duplicate active-context target link.`);
    }
    seenLinks.add(link.targetId);
    const target = targetById.get(link.targetId);
    if (!target) throw new Error(`UA row ${row.recordId} links missing active context target ${link.targetId}.`);
    if (typeof link.role !== 'string' || !link.role || link.role !== target.role) {
      throw new Error(`UA row ${row.recordId} active context link ${link.targetId} must carry the target's exact role.`);
    }
    if (!Number.isInteger(link.targetOrder) || link.targetOrder <= previousLinkOrder || link.targetOrder !== target.targetOrder) {
      throw new Error(`UA row ${row.recordId} must preserve linked target order exactly.`);
    }
    previousLinkOrder = link.targetOrder;
    const rowSpecificTarget = Array.isArray(target.rowRecordIds);
    const rowSpecific = rowSpecificTarget && target.rowRecordIds.includes(row.recordId);
    if (rowSpecificTarget ? !rowSpecific : target.segmentId !== rowSegmentId) {
      throw new Error(`UA row ${row.recordId} links context ${target.targetId} for a different physical segment.`);
    }
    if (typeof link.segmentId !== 'string' || !link.segmentId || link.segmentId !== target.segmentId) {
      throw new Error(`UA row ${row.recordId} context link ${target.targetId} changes its declared segment identity.`);
    }
    return clone(target);
  });
}

// This is a numeric frame check only. It says whether the declared focus rectangle
// fits inside the linked primary context crop; it does not verify printed glyphs,
// row identity, crop completeness, relevance, or source meaning.
export function assessUaPrimaryFocusContainment(row, activeTargets = []) {
  const rect = value => Array.isArray(value) && value.length === 4
    && value.every(Number.isFinite) && value[2] > value[0] && value[3] > value[1];
  const primary = activeTargets.filter(target => ['primary-table-context', 'primary-source-passage-context'].includes(target?.role));
  if (primary.length !== 1) {
    return evidenceState('not-assessable', primary.length
      ? 'The row does not have exactly one declared primary context target.'
      : 'No active primary context target is linked to the row.');
  }
  const target = primary[0];
  const focus = row?.evidence?.rowHighlightBounds?.pdfPagePoints;
  const crop = target?.crop?.cropBoundsPdfPagePointsTopLeftLTRB;
  if (!rect(focus) || !rect(crop)) {
    return { ...evidenceState('not-assessable', 'Primary focus or crop PDF-point bounds are absent or malformed.'), targetId: target?.targetId ?? null };
  }
  const rowIdentity = row?.sourceRowIdentity ?? {};
  const rowSourcePdfSha256 = row?.evidence?.sourcePdfSha256;
  const targetSource = target?.source ?? {};
  if (targetSource.sourcePdfSha256 !== rowSourcePdfSha256
    || targetSource.pdfPage !== rowIdentity.pdfPage
    || targetSource.printedPage !== rowIdentity.printedPage) {
    return {
      ...evidenceState('source-frame-mismatch', 'Primary target source PDF/page identity differs from the row focus source frame.'),
      targetId: target?.targetId ?? null,
      rowSource: {sourcePdfSha256: rowSourcePdfSha256 ?? null, printedPage: rowIdentity.printedPage ?? null, pdfPage: rowIdentity.pdfPage ?? null},
      targetSource: {sourcePdfSha256: targetSource.sourcePdfSha256 ?? null, printedPage: targetSource.printedPage ?? null, pdfPage: targetSource.pdfPage ?? null},
    };
  }
  const edgeOverflowPoints = {
    left: Math.max(0, crop[0] - focus[0]),
    top: Math.max(0, crop[1] - focus[1]),
    right: Math.max(0, focus[2] - crop[2]),
    bottom: Math.max(0, focus[3] - crop[3]),
  };
  const outsideEdges = Object.entries(edgeOverflowPoints).filter(([, amount]) => amount > 0).map(([edge]) => edge);
  return {
    ...evidenceState(outsideEdges.length ? 'outside-primary-crop' : 'contained', outsideEdges.length
      ? `Declared row focus extends beyond the linked primary crop's ${outsideEdges.join(', ')} edge(s).`
      : 'Declared row focus rectangle is contained in the linked primary context crop in the same PDF-point frame.'),
    targetId: target.targetId,
    sourceFrame: {sourcePdfSha256: rowSourcePdfSha256, printedPage: rowIdentity.printedPage, pdfPage: rowIdentity.pdfPage},
    focusBoundsPdfPagePointsTopLeftLTRB: clone(focus),
    primaryCropBoundsPdfPagePointsTopLeftLTRB: clone(crop),
    outsideEdges,
    edgeOverflowPoints,
    structuralOnly: true,
    sourcePixelOrSemanticPass: false,
  };
}

function phbDmgPurpose(record) {
  const explicit = purposeFor(record.purpose, record.sourceKind);
  if (explicit !== 'other' && explicit !== 'unknown') return explicit;
  return purposeFor(`${record.objectOrSubject ?? ''} ${record.purpose ?? ''}`, record.sourceKind);
}

function pdPointerValue(value, pointer) {
  if (typeof pointer !== 'string' || !pointer.startsWith('/') || pointer === '/') return {found: false};
  let current = value;
  for (const encoded of pointer.slice(1).split('/')) {
    if (/(?:~(?![01]))/.test(encoded)) return {found: false};
    const key = encoded.replaceAll('~1', '/').replaceAll('~0', '~');
    if (current === null || current === undefined || !Object.hasOwn(Object(current), key)) return {found: false};
    current = current[key];
  }
  return {found: true, value: current};
}

function partFocus(part, row) {
  return part?.focusBoundsCropPixelsLTRB
    ?? part?.focus?.focusBoundsCropPixelsLTRB
    ?? ((part?.contextCropId === row.focus?.contextCropId || part?.contextCropId === row.contextCropId)
      ? row.focus?.focusBoundsCropPixelsLTRB
      : null)
    ?? null;
}

const canonicalPartCoordinateSpace = dpi => `crop-local ${dpi}-dpi source-render pixels; left,top,right,bottom; half-open`;
const SOURCE_RENDER_PAGE_COORDINATE_SPACE = 'original source-render page pixels; top-left origin; [left,top,right,bottom] half-open';
const SOURCE_PAGE_GLOBAL_COORDINATE_SPACE = 'source-page-global source-render pixels; top-left origin; [left,top,right,bottom] half-open';
const dpiTextPattern = /([+-]?\d+(?:\.\d+)?)\s*-?\s*dpi/ig;

function dpiValuesInText(value) {
  if (typeof value !== 'string') return [];
  return [...value.matchAll(dpiTextPattern)].map(match => Number(match[1]));
}

function contextBookKey(value) {
  const normalized = String(value ?? '').normalize('NFKC').toLowerCase().replace(/\s+/g, ' ').trim();
  return ({
    dmg: 'DMG',
    'dungeon masters guide': 'DMG',
    'dungeon master’s guide': 'DMG',
    "dungeon master's guide": 'DMG',
    phb: 'PHB',
    'players handbook': 'PHB',
    "player's handbook": 'PHB',
    'player’s handbook': 'PHB',
    ua: 'UA',
    'unearthed arcana': 'UA',
    mm: 'MM',
    'monster manual': 'MM',
    mm2: 'MM2',
    mmii: 'MM2',
    'monster manual ii': 'MM2',
  })[normalized] ?? value ?? null;
}

function declaredPartDpi(part, crop) {
  return {
    partRenderDpi: part?.renderDpi ?? null,
    partSourceRenderDpi: part?.sourceRenderDpi ?? null,
    partFocusRenderDpi: part?.focus?.renderDpi ?? null,
    partFocusSourceRenderDpi: part?.focus?.sourceRenderDpi ?? null,
    partCropRenderDpi: part?.crop?.renderDpi ?? null,
    partCropSourceRenderDpi: part?.crop?.sourceRenderDpi ?? null,
    partSourceRenderRenderDpi: part?.sourceRender?.renderDpi ?? null,
    partSourceRenderSourceRenderDpi: part?.sourceRender?.sourceRenderDpi ?? null,
    cropRenderDpi: crop?.renderDpi ?? null,
    cropSourceRenderDpi: crop?.sourceRenderDpi ?? null,
    cropSourceRenderRenderDpi: crop?.sourceRender?.renderDpi ?? null,
    cropSourceRenderSourceRenderDpi: crop?.sourceRender?.sourceRenderDpi ?? null,
  };
}

function declaredPartCoordinateSpaces(part, crop) {
  return {
    part: part?.coordinateSpace ?? null,
    partFocus: part?.focus?.coordinateSpace ?? null,
    partFocusSourceCropFrame: part?.focus?.sourceCropFrame ?? null,
    partSourceCropFrame: part?.sourceCropFrame ?? null,
    partSourceRender: part?.sourceRender?.coordinateSpace ?? null,
    partSourceRenderSourceCropFrame: part?.sourceRender?.sourceCropFrame ?? null,
    partCrop: part?.crop?.coordinateSpace ?? null,
    partCropSourceCropFrame: part?.crop?.sourceCropFrame ?? null,
    crop: crop?.coordinateSpace ?? null,
    cropSourceRender: crop?.sourceRenderCoordinateSpace ?? null,
    cropSourceRenderFrame: crop?.sourceRender?.coordinateSpace ?? null,
    cropSourceRenderSourceCropFrame: crop?.sourceRender?.sourceCropFrame ?? null,
    cropSourceCropFrame: crop?.sourceCropFrame ?? null,
  };
}

function declaredPartSourceFrame(part, crop) {
  return {
    partSource: clone(part?.source ?? null),
    cropTopLevel: {
      bookKey: crop?.bookKey ?? null,
      book: crop?.book ?? null,
      printedPage: crop?.printedPage ?? null,
      page: crop?.page ?? null,
      pdfPage: crop?.pdfPage ?? null,
      sourceSha256: crop?.sourceSha256 ?? null,
      sourcePdfSha256: crop?.sourcePdfSha256 ?? null,
      sourceFileSha256: crop?.sourceFileSha256 ?? null,
      sha256: crop?.sha256 ?? null,
    },
    cropSource: clone(crop?.source ?? null),
    cropSourceFrame: clone(crop?.sourceFrame ?? null),
  };
}

function sourcePageForOrderedPart(rawSource) {
  const raw = rawSource && typeof rawSource === 'object' && !Array.isArray(rawSource) ? rawSource : {};
  const normalized = sourcePage(raw);
  normalized.book = contextBookKey(raw.bookKey ?? raw.book);
  normalized.sourcePdfSha256 = raw.sourceFileSha256 ?? raw.sourcePdfSha256 ?? raw.sourceSha256 ?? raw.sha256 ?? null;
  normalized.printedPage = raw.printedPage ?? raw.page ?? null;
  normalized.pdfPage = raw.pdfPage ?? null;
  return normalized;
}

function resolveContextDpi({part = null, crop = null, rowFocus = null, sourceIdentity = null, sameAsRowFocus = false} = {}) {
  const declarations = [];
  const invalid = [];
  const addNumeric = (object, property, path) => {
    if (!object || typeof object !== 'object' || !Object.hasOwn(object, property)) return;
    const value = object[property];
    declarations.push({path: `${path}.${property}`, value});
    if (!Number.isInteger(value) || value <= 0) invalid.push(`${path}.${property} must be a positive integer when declared.`);
  };
  const addCoordinate = (object, property, path, {parseOnlyWhenDpiText = false} = {}) => {
    if (!object || typeof object !== 'object' || !Object.hasOwn(object, property)) return;
    const value = object[property];
    if (typeof value !== 'string') {
      declarations.push({path: `${path}.${property}`, value});
      invalid.push(`${path}.${property} must be a string${parseOnlyWhenDpiText ? '' : ' containing an explicit DPI'} when declared.`);
      return;
    }
    if (parseOnlyWhenDpiText && value.trim() === '') {
      declarations.push({path: `${path}.${property}`, value});
      invalid.push(`${path}.${property} must not be empty when declared.`);
      return;
    }
    const matches = dpiValuesInText(value);
    if (matches.length || /dpi/i.test(value)) {
      declarations.push({path: `${path}.${property}`, value});
      if (!matches.length || matches.some(dpi => !Number.isInteger(dpi) || dpi <= 0)) {
        invalid.push(`${path}.${property} has no valid positive integer DPI declaration.`);
      } else {
        for (const dpi of matches) declarations.push({path: `${path}.${property}`, value: dpi, parsed: true});
      }
    } else if (!parseOnlyWhenDpiText) {
      declarations.push({path: `${path}.${property}`, value});
      invalid.push(`${path}.${property} has no valid positive integer DPI declaration.`);
    }
  };
  const collectNode = (object, path) => {
    addNumeric(object, 'renderDpi', path);
    addNumeric(object, 'sourceRenderDpi', path);
    addCoordinate(object, 'coordinateSpace', path);
    addCoordinate(object, 'sourceCropFrame', path, {parseOnlyWhenDpiText: true});
  };

  collectNode(part, 'part');
  collectNode(part?.focus, 'part.focus');
  collectNode(part?.crop, 'part.crop');
  collectNode(part?.sourceRender, 'part.sourceRender');
  collectNode(crop, 'crop');
  collectNode(crop?.sourceRender, 'crop.sourceRender');
  addCoordinate(crop, 'sourceRenderCoordinateSpace', 'crop');

  const declaredValues = declarations.flatMap(declaration => declaration.parsed
    ? [declaration.value]
    : typeof declaration.value === 'number' ? [declaration.value]
      : dpiValuesInText(declaration.value));
  const distinct = [...new Set(declaredValues)];
  if (distinct.length > 1) invalid.push(`Explicit DPI declarations disagree (${declarations.map(item => `${item.path}=${String(item.value)}`).join(', ')}).`);
  const hasOwnDeclaration = declarations.length > 0;
  const explicitDpi = distinct.length === 1 ? distinct[0] : null;
  const frameResolution = sourceIdentity ? resolveMonetarySourceRenderFrame(sourceIdentity) : {
    status: 'unknown-render',
    registry: monetarySourceRenderFrameRegistry,
  };
  const registeredDpi = frameResolution.status === 'matched' ? frameResolution.frame.renderDpi : null;
  if (frameResolution.status === 'conflicting-render-identity') {
    invalid.push(`Known source-render hash conflicts with its registered source/page/dimensions identity (${frameResolution.mismatchedFields.join(', ')}).`);
  }
  if (registeredDpi !== null && explicitDpi !== null && explicitDpi !== registeredDpi) {
    invalid.push(`Explicit DPI ${explicitDpi} conflicts with the reviewed source-render frame DPI ${registeredDpi}.`);
  }
  let dpi = explicitDpi;
  let usedRowFocusFallback = false;
  let resolutionMethod = hasOwnDeclaration ? 'explicit-part-or-crop-declaration' : null;
  let coordinateSpace = null;
  if (!hasOwnDeclaration && registeredDpi !== null) {
    dpi = registeredDpi;
    coordinateSpace = canonicalPartCoordinateSpace(dpi);
    resolutionMethod = 'hash-bound-reviewed-frame-registry';
  } else if (!hasOwnDeclaration) {
    const fallbackMatches = dpiValuesInText(rowFocus?.coordinateSpace);
    const fallbackDpis = [...new Set(fallbackMatches)];
    const fallbackDpi = fallbackMatches.length > 0 && fallbackDpis.length === 1
      && fallbackDpis.every(value => Number.isInteger(value) && value > 0)
      ? fallbackDpis[0]
      : null;
    if (sameAsRowFocus && fallbackDpi !== null) {
      dpi = fallbackDpi;
      coordinateSpace = rowFocus.coordinateSpace;
      usedRowFocusFallback = true;
      resolutionMethod = 'explicit-same-crop-primary-focus';
    } else {
      invalid.push(frameResolution.status === 'conflicting-render-identity'
        ? 'The source-render hash is known, but its source/page/dimensions identity conflicts with the reviewed registry.'
        : 'No explicit or registered part/crop DPI is available, and the part is not the row focus crop; the row focus DPI cannot be inherited across frames.');
    }
  } else if (dpi !== null) {
    coordinateSpace = canonicalPartCoordinateSpace(dpi);
  }

  // A part that points at the row's own crop shares that crop frame. A different
  // crop may be a continuation rendered from another source frame, so the row's
  // primary focus DPI is only a fallback there.
  if (sameAsRowFocus && dpi !== null) {
    const focusDpi = dpiValuesInText(rowFocus?.coordinateSpace);
    if (!focusDpi.length || focusDpi.some(value => !Number.isInteger(value) || value !== dpi)) {
      invalid.push(`The part references the row's focus crop but its DPI ${dpi} conflicts with the row focus DPI declaration.`);
    }
  }
  return {
    dpi,
    coordinateSpace,
    valid: invalid.length === 0 && dpi !== null,
    invalid,
    declarations,
    usedRowFocusFallback,
    resolutionMethod,
    registryResolution: clone(frameResolution),
    frameResolution: {
      status: frameResolution.status,
      registry: frameResolution.registry ?? monetarySourceRenderFrameRegistry,
      frameId: frameResolution.frame?.id ?? null,
      renderDpi: frameResolution.frame?.renderDpi ?? null,
      renderMode: frameResolution.frame?.renderMode ?? null,
      mismatchedFields: frameResolution.mismatchedFields ?? [],
    },
  };
}

function declaredSourceFrameErrors(raw, label, expected = {}, {requireComplete = false, comparePages = true} = {}) {
  const errors = [];
  const object = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : null;
  if (!object) {
    if (requireComplete) errors.push(`${label} must be an explicit source-frame object.`);
    return errors;
  }
  const own = keys => keys.filter(key => Object.hasOwn(object, key));
  const checkNonempty = (keys, description) => {
    for (const key of own(keys)) {
      const value = object[key];
      if (typeof value !== 'string' || !value.trim()) errors.push(`${label}.${key} must be a non-empty string when declared.`);
    }
  };
  const checkHash = keys => {
    const present = own(keys);
    for (const key of present) {
      const value = object[key];
      if (typeof value !== 'string' || !/^[a-f0-9]{64}$/i.test(value)) {
        errors.push(`${label}.${key} must be a SHA-256 hash when declared.`);
      } else if (expected.sourcePdfSha256 && value !== expected.sourcePdfSha256) {
        errors.push(`${label}.${key} conflicts with the part's source PDF hash.`);
      }
    }
    if (present.length > 1 && present.some(key => object[key] !== object[present[0]])) {
      errors.push(`${label} source PDF hash aliases disagree.`);
    }
    return present;
  };
  const bookKeys = own(['bookKey', 'book']);
  checkNonempty(['bookKey', 'book'], 'book identity');
  const seenBookKeys = [];
  for (const key of bookKeys) {
    const normalizedBook = contextBookKey(object[key]);
    seenBookKeys.push(normalizedBook);
    if (expected.book != null && normalizedBook !== contextBookKey(expected.book)) {
      errors.push(`${label}.${key} conflicts with the part's source book.`);
    }
  }
  if (new Set(seenBookKeys).size > 1) errors.push(`${label} book aliases disagree.`);

  const hashKeys = checkHash(['sourceFileSha256', 'sourcePdfSha256', 'sourceSha256', 'sha256']);
  const printedKeys = own(['printedPage', 'page']);
  for (const key of printedKeys) {
    if (!Number.isInteger(object[key]) || object[key] <= 0) errors.push(`${label}.${key} must be a positive integer when declared.`);
    if (comparePages && expected.printedPage != null && object[key] !== expected.printedPage) {
      errors.push(`${label}.${key} conflicts with the part's printed page.`);
    }
  }
  if (printedKeys.length > 1 && printedKeys.some(key => object[key] !== object[printedKeys[0]])) {
    errors.push(`${label} printed-page aliases disagree.`);
  }
  const hasPdfPage = Object.hasOwn(object, 'pdfPage');
  if (hasPdfPage && (!Number.isInteger(object.pdfPage) || object.pdfPage <= 0)) errors.push(`${label}.pdfPage must be a positive integer when declared.`);
  if (hasPdfPage && comparePages && expected.pdfPage != null && object.pdfPage !== expected.pdfPage) {
    errors.push(`${label}.pdfPage conflicts with the part's PDF page.`);
  }
  if (requireComplete) {
    if (!bookKeys.length) errors.push(`${label} is missing an explicit book identity.`);
    if (!hashKeys.length) errors.push(`${label} is missing an explicit source PDF hash.`);
    if (!printedKeys.length) errors.push(`${label} is missing an explicit printed page.`);
    if (!hasPdfPage) errors.push(`${label} is missing an explicit PDF page.`);
  }
  checkNonempty(['sourceFile'], 'source file');
  if (Object.hasOwn(object, 'sourceFile') && expected.sourceFile != null && object.sourceFile !== expected.sourceFile) {
    errors.push(`${label}.sourceFile conflicts with the part's source file.`);
  }
  return errors;
}

function rawPartFrameDeclarations(part, crop) {
  const linkedCrop = crop ? Object.fromEntries([
    'source', 'bookKey', 'book', 'sourceFile', 'sourceFileSha256', 'sourcePdfSha256', 'sourceSha256',
    'sha256', 'printedPage', 'page', 'pdfPage', 'source', 'sourceFrame', 'sourceRender', 'sourceRenderSha256',
    'sourceRenderDimensionsPx', 'renderDpi', 'sourceRenderDpi', 'coordinateSpace', 'sourceRenderCoordinateSpace', 'sourceCropFrame',
  ].filter(key => Object.hasOwn(crop, key)).map(key => [key, clone(crop[key])])) : null;
  return {
    partSource: clone(part?.source ?? null),
    partSourceRender: clone(part?.sourceRender ?? null),
    partCrop: clone(part?.crop ?? null),
    linkedCrop,
  };
}

function validPdCropMetadata(crop) {
  const bounds = crop?.cropBoundsPixelsLTRB;
  const dimensions = crop?.cropDimensionsPx;
  const renderDimensions = crop?.sourceRenderDimensionsPx;
  return Boolean(
    crop
    && /^[a-f0-9]{64}$/i.test(crop.cropSha256 ?? '')
    && /^[a-f0-9]{64}$/i.test(crop.sourceRenderSha256 ?? '')
    && typeof crop.sourceRender === 'string' && crop.sourceRender
    && Array.isArray(renderDimensions) && renderDimensions.length === 2
    && renderDimensions.every(value => Number.isInteger(value) && value > 0)
    && Array.isArray(bounds) && bounds.length === 4
    && bounds.every(value => Number.isInteger(value))
    && bounds[0] >= 0 && bounds[1] >= 0 && bounds[2] > bounds[0] && bounds[3] > bounds[1]
    && bounds[2] <= renderDimensions[0] && bounds[3] <= renderDimensions[1]
    && Array.isArray(dimensions) && dimensions.length === 2
    && dimensions.every(value => Number.isInteger(value) && value > 0)
    && dimensions[0] === bounds[2] - bounds[0]
    && dimensions[1] === bounds[3] - bounds[1]
  );
}

function sourceContextPartEvidence({artifact, row, rowIndex, source, cropLookup, cropIndexById, cropReferencesById}) {
  if (!Object.hasOwn(row, 'sourceContextParts')) return null;
  const rawParts = row.sourceContextParts;
  const parts = Array.isArray(rawParts) ? rawParts : [];
  const normalizedParts = [];
  const errors = [];
  const partIds = new Set();
  const cropIds = new Set();
  const sourceSha256 = source.sourcePdfSha256;
  const sourceBook = source.book;

  if (!Array.isArray(rawParts) || parts.length < 2) errors.push('At least two ordered sourceContextParts are required.');
  for (const [index, part] of parts.entries()) {
    const cropId = part?.contextCropId;
    const crop = cropLookup.get(cropId) ?? null;
    const partSourceRaw = part?.source;
    const partSource = sourcePageForOrderedPart(partSourceRaw);
    const rawRender = part?.sourceRender && typeof part.sourceRender === 'object' ? part.sourceRender : null;
    const sourceRenderIdentity = {
      book: partSource.book,
      printedPage: partSource.printedPage,
      pdfPage: partSource.pdfPage,
      sourcePdfSha256: partSource.sourcePdfSha256,
      sourceRenderSha256: crop?.sourceRenderSha256 ?? rawRender?.sourceRenderSha256,
      sourceRenderDimensionsPx: crop?.sourceRenderDimensionsPx ?? rawRender?.sourceRenderDimensionsPx,
    };
    const dpiResolution = resolveContextDpi({
      part,
      crop,
      rowFocus: row.focus,
      sourceIdentity: sourceRenderIdentity,
      sameAsRowFocus: cropId === (row.focus?.contextCropId ?? row.contextCropId),
    });
    const renderDpi = dpiResolution.dpi;
    const focusBounds = partFocus(part, row);
    const focusCoordinateSpace = Array.isArray(focusBounds) && Number.isInteger(renderDpi) && renderDpi > 0
      ? canonicalPartCoordinateSpace(renderDpi)
      : null;
    const declaredFrame = {
      ...rawPartFrameDeclarations(part, crop),
      dpiResolution: clone(dpiResolution),
    };
    const cropBoundsPdf = part?.cropBoundsPdfPagePointsTopLeftLTRB
      ?? part?.crop?.cropBoundsPdfPagePointsTopLeftLTRB
      ?? crop?.cropBoundsPdfPagePointsTopLeftLTRB
      ?? crop?.cropBoundsPdfPagePointsTopLeft
      ?? null;
    const sourceRender = crop ? {
      sourceRenderId: crop.sourceRender ?? null,
      sourceRenderSha256: crop.sourceRenderSha256 ?? null,
      sourceRenderDimensionsPx: clone(crop.sourceRenderDimensionsPx ?? null),
      renderDpi: Number.isFinite(renderDpi) ? renderDpi : null,
      coordinateSpace: SOURCE_RENDER_PAGE_COORDINATE_SPACE,
      declaredDpi: declaredPartDpi(part, crop),
      declaredCoordinateSpaces: declaredPartCoordinateSpaces(part, crop),
      dpiRegistryResolution: clone(dpiResolution.registryResolution),
      frameDpiResolution: clone(dpiResolution.frameResolution),
      pageBoundsPdfPagePointsTopLeftLTRB: clone(crop.pageBoundsPdfPagePointsTopLeftLTRB ?? null),
    } : null;
    const cropMetadata = crop ? {
      sourcePdfSha256: partSource.sourcePdfSha256,
      sourceRenderSha256: crop.sourceRenderSha256 ?? null,
      sourceRenderDimensionsPx: clone(crop.sourceRenderDimensionsPx ?? null),
      cropBoundsPdfPagePointsTopLeftLTRB: clone(cropBoundsPdf ?? null),
      cropBoundsPixelsLTRB: clone(crop.cropBoundsPixelsLTRB ?? null),
      cropDimensionsPx: clone(crop.cropDimensionsPx ?? null),
      cropSha256: crop.cropSha256 ?? null,
      renderDpi: Number.isFinite(renderDpi) ? renderDpi : null,
      coordinateSpace: SOURCE_PAGE_GLOBAL_COORDINATE_SPACE,
      cropBoundsPixelsCoordinateSpace: SOURCE_PAGE_GLOBAL_COORDINATE_SPACE,
      declaredSourceFrame: declaredPartSourceFrame(part, crop),
      frameDpiResolution: clone(dpiResolution.frameResolution),
    } : null;
    const normalized = {
      partId: part?.partId ?? null,
      order: part?.order ?? null,
      role: part?.role ?? null,
      factPointers: Array.isArray(part?.factPointers) ? clone(part.factPointers) : [],
      cropId: typeof cropId === 'string' ? cropId : null,
      source: {
        book: partSource.book,
        sourceFile: partSource.sourceFile,
        printedPage: partSource.printedPage,
        pdfPage: partSource.pdfPage,
        sourcePdfSha256: partSource.sourcePdfSha256,
      },
      sourceRender,
      crop: cropMetadata,
      focusBoundsCropPixelsLTRB: clone(focusBounds),
      focusCoordinateSpace,
      pixelReview: clone(part?.pixelReview ?? null),
      declaredFrame,
      recordedFocusStatus: part?.focus?.status
        ?? (part?.contextCropId === row.focus?.contextCropId || part?.contextCropId === row.contextCropId ? row.focus?.status : null)
        ?? null,
      cropPointer: Number.isInteger(cropIndexById.get(cropId))
        ? jsonPointer(['review', 'evidenceCrops', cropIndexById.get(cropId)])
        : null,
      sharedReferenceSourceOccurrenceIds: [...(cropReferencesById.get(cropId) ?? [])].sort(),
    };
    normalized.focusGeometryAssessment = normalized.focusBoundsCropPixelsLTRB && cropMetadata
      ? validateCropLocalSourceGeometry(cropMetadata, {focusBoundsCropPixelsLTRB: normalized.focusBoundsCropPixelsLTRB})
      : evidenceState('not-assessable', normalized.factPointers.length
        ? 'No crop-local focus is recorded for this fact-bearing part.'
        : 'This is a support-only context part and has no fact focus.');
    normalizedParts.push(normalized);

    if (!part || typeof part.partId !== 'string' || !part.partId || partIds.has(part.partId)) errors.push(`Part ${index} lacks a unique partId.`);
    if (!Number.isInteger(part?.order) || part.order !== index + 1) errors.push(`Part ${part?.partId ?? index} must have sequential 1-based order.`);
    if (typeof part?.role !== 'string' || !part.role) errors.push(`Part ${part?.partId ?? index} lacks a role.`);
    if (!Array.isArray(part?.factPointers) || part.factPointers.some(pointer => typeof pointer !== 'string' || !pdPointerValue(row, pointer).found)
      || new Set(part?.factPointers ?? []).size !== (part?.factPointers ?? []).length) {
      errors.push(`Part ${part?.partId ?? index} has invalid, unresolved, or duplicate factPointers.`);
    }
    if (typeof cropId !== 'string' || !cropId || cropIds.has(cropId)) errors.push(`Part ${part?.partId ?? index} has a missing or duplicate contextCropId.`);
    if (!crop) errors.push(`Part ${part?.partId ?? index} references missing crop ${cropId ?? '(missing)'}.`);
    if (!part?.source || partSource.book !== sourceBook || partSource.sourcePdfSha256 !== sourceSha256
      || !Number.isInteger(partSource.printedPage) || partSource.printedPage < 1
      || !Number.isInteger(partSource.pdfPage) || partSource.pdfPage < 1) {
      errors.push(`Part ${part?.partId ?? index} has incomplete or mismatched book/PDF/page identity.`);
    }
    const partFrameExpected = {
      book: sourceBook,
      sourcePdfSha256: sourceSha256,
      sourceFile: source.sourceFile,
      sourceRaw: row.source ?? {},
    };
    const partFrameErrors = declaredSourceFrameErrors(partSourceRaw, `Part ${part?.partId ?? index} source`, partFrameExpected, {
      requireComplete: true,
      comparePages: false,
    });
    if (partFrameErrors.length) errors.push(...partFrameErrors);
    if (!validPdCropMetadata(crop)) errors.push(`Part ${part?.partId ?? index} has invalid crop/render hashes, dimensions, or pixel bounds.`);
    if (!dpiResolution.valid || !Number.isInteger(renderDpi) || renderDpi <= 0) {
      errors.push(`Part ${part?.partId ?? index} has invalid or conflicting render DPI declarations: ${dpiResolution.invalid.join(' ')}`);
    }
    if (crop) {
      const sourceFrameExpected = {
        book: partSource.book,
        sourcePdfSha256: partSource.sourcePdfSha256,
        sourceFile: partSource.sourceFile,
        printedPage: partSource.printedPage,
        pdfPage: partSource.pdfPage,
        sourceRaw: partSourceRaw,
      };
      const frameErrors = [
        ...declaredSourceFrameErrors(crop, `Crop ${cropId}`, sourceFrameExpected),
        ...declaredSourceFrameErrors(crop.source, `Crop ${cropId} source`, sourceFrameExpected),
        ...declaredSourceFrameErrors(crop.sourceFrame, `Crop ${cropId} sourceFrame`, sourceFrameExpected),
        ...declaredSourceFrameErrors(crop.sourceRender, `Crop ${cropId} sourceRender`, sourceFrameExpected),
        ...declaredSourceFrameErrors(part?.crop, `Part ${part?.partId ?? index} crop`, sourceFrameExpected),
        ...declaredSourceFrameErrors(rawRender, `Part ${part?.partId ?? index} sourceRender`, sourceFrameExpected),
      ];
      if (frameErrors.length) errors.push(...frameErrors);
    }
    if (crop && (crop.sourcePdfSha256 && crop.sourcePdfSha256 !== partSource.sourcePdfSha256
      || rawRender && (rawRender.sourceRenderId !== crop.sourceRender
        || rawRender.sourceRenderSha256 !== crop.sourceRenderSha256
        || JSON.stringify(rawRender.sourceRenderDimensionsPx) !== JSON.stringify(crop.sourceRenderDimensionsPx)
        || Object.hasOwn(rawRender, 'renderDpi') && rawRender.renderDpi !== renderDpi
        || rawRender.pageBoundsPdfPagePointsTopLeftLTRB && JSON.stringify(rawRender.pageBoundsPdfPagePointsTopLeftLTRB) !== JSON.stringify(crop.pageBoundsPdfPagePointsTopLeftLTRB ?? null))
      || part?.crop && typeof part.crop === 'object' && Object.entries({
        sourcePdfSha256: partSource.sourcePdfSha256,
        sourceRenderSha256: crop.sourceRenderSha256,
        sourceRenderDimensionsPx: crop.sourceRenderDimensionsPx,
        cropBoundsPdfPagePointsTopLeftLTRB: cropBoundsPdf,
        cropBoundsPixelsLTRB: crop.cropBoundsPixelsLTRB,
        cropDimensionsPx: crop.cropDimensionsPx,
        cropSha256: crop.cropSha256,
        renderDpi,
        sourceRenderDpi: renderDpi,
      }).some(([key, expected]) => Object.hasOwn(part.crop, key) && JSON.stringify(part.crop[key]) !== JSON.stringify(expected)))) {
      errors.push(`Part ${part?.partId ?? index} conflicts with the referenced crop or source-render metadata.`);
    }
    if (cropBoundsPdf && (!Array.isArray(cropBoundsPdf) || cropBoundsPdf.length !== 4 || !cropBoundsPdf.every(Number.isFinite)
      || cropBoundsPdf[0] < 0 || cropBoundsPdf[1] < 0 || cropBoundsPdf[2] <= cropBoundsPdf[0] || cropBoundsPdf[3] <= cropBoundsPdf[1])) {
      errors.push(`Part ${part?.partId ?? index} has invalid PDF-page crop bounds.`);
    }
    const focus = normalized.focusBoundsCropPixelsLTRB;
    if (normalized.factPointers.length) {
      if (!Array.isArray(focus) || focus.length !== 4 || !focus.every(Number.isInteger)
        || focus[0] < 0 || focus[1] < 0 || focus[2] <= focus[0] || focus[3] <= focus[1]
        || !cropMetadata || focus[2] > cropMetadata.cropDimensionsPx?.[0] || focus[3] > cropMetadata.cropDimensionsPx?.[1]) {
        errors.push(`Fact-bearing part ${part?.partId ?? index} lacks a contained crop-local focus.`);
      }
    } else if (focus !== null) {
      errors.push(`Context-only part ${part?.partId ?? index} must not declare a fact focus.`);
    }
    if (part?.partId) partIds.add(part.partId);
    if (cropId) cropIds.add(cropId);
  }

  const factPointers = [...new Set(normalizedParts.flatMap(part => part.factPointers))];
  const primary = row.primaryPartIdByFact ?? row.primary ?? null;
  const primaryValid = factPointers.length
    ? Boolean(primary && typeof primary === 'object' && !Array.isArray(primary)
      && JSON.stringify(Object.keys(primary).sort()) === JSON.stringify([...factPointers].sort())
      && Object.entries(primary).every(([pointer, partId]) => normalizedParts.some(part => part.partId === partId && part.factPointers.includes(pointer))))
    : primary === null || (primary && typeof primary === 'object' && !Array.isArray(primary) && Object.keys(primary).length === 0);
  if (!primaryValid) errors.push('primaryPartIdByFact must map every declared fact pointer to a part that declares that exact pointer.');

  const declaredLinks = normalizedParts.map((part, index) => ({field: `sourceContextParts/${index}`, cropId: part.cropId, order: part.order}));
  const partCropIds = new Set(normalizedParts.map(part => part.cropId).filter(Boolean));
  const supplementalIds = [...new Set([row.contextCropId, row.focus?.contextCropId]
    .filter(cropId => typeof cropId === 'string' && cropId && !partCropIds.has(cropId)))];
  const supplementalContextCrops = supplementalIds.map(cropId => {
    const crop = cropLookup.get(cropId) ?? null;
    const supplementalSource = sourcePage(crop?.source ?? crop ?? {}, source);
    const supplementalSourceIdentity = {
      book: supplementalSource.book,
      printedPage: supplementalSource.printedPage,
      pdfPage: supplementalSource.pdfPage,
      sourcePdfSha256: supplementalSource.sourcePdfSha256,
      sourceRenderSha256: crop?.sourceRenderSha256,
      sourceRenderDimensionsPx: crop?.sourceRenderDimensionsPx,
    };
    const dpiResolution = resolveContextDpi({
      crop,
      rowFocus: row.focus,
      sourceIdentity: supplementalSourceIdentity,
      sameAsRowFocus: cropId === (row.focus?.contextCropId ?? row.contextCropId),
    });
    const cropDpi = dpiResolution.dpi;
    const topLevelSource = sourcePage(crop ?? {}, source);
    const cropBoundsPdf = crop?.cropBoundsPdfPagePointsTopLeftLTRB ?? crop?.cropBoundsPdfPagePointsTopLeft ?? null;
    const sourceDeclarationsAgree = supplementalSource.book === topLevelSource.book
      && supplementalSource.sourcePdfSha256 === topLevelSource.sourcePdfSha256
      && supplementalSource.printedPage === topLevelSource.printedPage
      && supplementalSource.pdfPage === topLevelSource.pdfPage;
    const supplementalSourceExpected = {
      book: source.book,
      sourcePdfSha256: source.sourcePdfSha256,
      sourceFile: source.sourceFile,
      printedPage: source.printedPage,
      pdfPage: source.pdfPage,
      sourceRaw: row.source ?? {},
    };
    const sourceAliasErrors = [
      ...declaredSourceFrameErrors(crop, `Supplemental crop ${cropId}`, supplementalSourceExpected),
      ...declaredSourceFrameErrors(crop?.source, `Supplemental crop ${cropId} source`, supplementalSourceExpected),
    ];
    const sourceMatches = supplementalSource.book === source.book
      && supplementalSource.sourcePdfSha256 === source.sourcePdfSha256
      && supplementalSource.printedPage === source.printedPage
      && supplementalSource.pdfPage === source.pdfPage
      && sourceDeclarationsAgree && sourceAliasErrors.length === 0;
    const dpiMatches = dpiResolution.valid && Number.isInteger(cropDpi) && cropDpi > 0;
    const pdfBoundsValid = cropBoundsPdf === null || (Array.isArray(cropBoundsPdf) && cropBoundsPdf.length === 4
      && cropBoundsPdf.every(Number.isFinite) && cropBoundsPdf[0] >= 0 && cropBoundsPdf[1] >= 0
      && cropBoundsPdf[2] > cropBoundsPdf[0] && cropBoundsPdf[3] > cropBoundsPdf[1]);
    const contextValid = Boolean(crop && sourceMatches && dpiMatches && pdfBoundsValid && validPdCropMetadata(crop));
    const validationReason = !crop ? `Crop ${cropId} is missing.`
      : !sourceMatches ? `Crop ${cropId} declares a source book/PDF/page frame that differs from its row.`
        : !dpiMatches ? `Crop ${cropId} declares invalid or mismatched render DPI: ${dpiResolution.invalid.join(' ')}`
          : !pdfBoundsValid ? `Crop ${cropId} declares invalid PDF-page crop bounds.`
            : !validPdCropMetadata(crop) ? `Crop ${cropId} declares invalid render/crop hashes, dimensions, or pixel bounds.`
              : null;
    const metadata = crop ? {
      sourcePdfSha256: supplementalSource.sourcePdfSha256,
      sourceRenderSha256: crop.sourceRenderSha256 ?? null,
      sourceRenderDimensionsPx: clone(crop.sourceRenderDimensionsPx ?? null),
      cropBoundsPdfPagePointsTopLeftLTRB: clone(cropBoundsPdf),
      cropBoundsPixelsLTRB: clone(crop.cropBoundsPixelsLTRB ?? null),
      cropDimensionsPx: clone(crop.cropDimensionsPx ?? null),
      cropSha256: crop.cropSha256 ?? null,
      renderDpi: cropDpi,
      coordinateSpace: SOURCE_PAGE_GLOBAL_COORDINATE_SPACE,
      cropBoundsPixelsCoordinateSpace: SOURCE_PAGE_GLOBAL_COORDINATE_SPACE,
      frameDpiResolution: clone(dpiResolution.frameResolution),
    } : null;
    return {
      cropId,
      role: 'supplemental-row-context',
      source: supplementalSource,
      sourceRender: crop ? {
        sourceRenderId: crop.sourceRender ?? null,
        sourceRenderSha256: crop.sourceRenderSha256 ?? null,
        sourceRenderDimensionsPx: clone(crop.sourceRenderDimensionsPx ?? null),
        renderDpi: cropDpi,
        coordinateSpace: SOURCE_RENDER_PAGE_COORDINATE_SPACE,
        frameDpiResolution: clone(dpiResolution.frameResolution),
      } : null,
      metadata,
      declaredFrame: crop ? {
        linkedCrop: Object.fromEntries([
          'source', 'bookKey', 'book', 'sourceFile', 'sourceFileSha256', 'sourcePdfSha256', 'sourceSha256',
          'printedPage', 'page', 'pdfPage', 'sourceRender', 'sourceRenderSha256', 'sourceRenderDimensionsPx',
          'renderDpi', 'sourceRenderDpi', 'coordinateSpace', 'sourceCropFrame',
        ].filter(key => Object.hasOwn(crop, key)).map(key => [key, clone(crop[key])])),
        dpiResolution: clone(dpiResolution),
      } : null,
      validation: {
        status: contextValid ? 'declared-supplemental-context-linked' : 'declared-supplemental-context-unassessable',
        reason: validationReason,
      },
      cropPointer: Number.isInteger(cropIndexById.get(cropId))
        ? jsonPointer(['review', 'evidenceCrops', cropIndexById.get(cropId)])
        : null,
      sharedReferenceSourceOccurrenceIds: [...(cropReferencesById.get(cropId) ?? [])].sort(),
    };
  });
  for (const supplemental of supplementalContextCrops) {
    if (supplemental.validation.status !== 'declared-supplemental-context-linked') {
      errors.push(`Supplemental crop ${supplemental.cropId} is unassessable: ${supplemental.validation.reason}`);
    }
  }

  const focusCropId = row.focus?.contextCropId ?? row.contextCropId;
  const focusPartValid = !focusCropId || normalizedParts.some(part => part.cropId === focusCropId) || cropLookup.has(focusCropId);
  if (!focusPartValid) errors.push('Legacy row focus crop is not available as an ordered part or supplemental crop.');
  const isValid = parts.length >= 2 && errors.length === 0;
  return {
    status: isValid ? 'declared-source-context-parts-linked' : 'declared-source-context-parts-unassessable',
    reason: isValid ? 'Ordered source-context parts, their exact source frames, crop metadata, fact pointers, and primary bindings are retained.' : [...new Set(errors)].join(' '),
    declaredLinks,
    sourceContextParts: normalizedParts,
    supplementalContextCrops,
    primaryPartIdByFact: clone(primary),
    evidenceCrops: normalizedParts.map(part => ({
      cropId: part.cropId,
      order: part.order,
      role: part.role,
      metadata: part.crop,
      sourceRender: part.sourceRender,
      cropPointer: part.cropPointer,
      sharedReferenceSourceOccurrenceIds: part.sharedReferenceSourceOccurrenceIds,
    })),
  };
}

function phbDmgLeaves(record) {
  const typed = record.typedValue;
  const amountLeaf = (path, kind, options, isMonetary = true) => ({path, value: makeValue(kind, options), isMonetary});
  // The V2 PHB/DMG candidate records an explicitly derived intermediate
  // research amount. Keep the amount as one derived claim, and keep its
  // printed basis as references attached to that claim rather than walking
  // through those references as if they were additional source rows.
  if (record.sourceKind === 'spell-research-success-threshold' && typed?.derivation?.status === 'derived-not-printed') {
    const derivation = typed.derivation;
    const inferred = derivation.inferredPoint;
    const basis = derivation.sourceBasis;
    const basisValid = Array.isArray(basis) && basis.length >= 2 && basis.every(item =>
      item && Number.isFinite(item.additionalGpPerLevel)
      && Number.isFinite(item.baseChanceFromPct)
      && Number.isFinite(item.baseChanceToPct)
      && ['printed', 'printed-maximum'].includes(item.classification));
    const amountValid = Number.isFinite(typed.additionalPerLevel)
      && currencyFrom(typed.currency) === 'gp'
      && inferred?.additionalGpPerLevel === typed.additionalPerLevel
      && inferred?.classification === 'derived'
      && derivation.classification === 'interpolated-intermediate'
      && basisValid
      && typeof derivation.method === 'string' && derivation.method.trim();
    if (!amountValid) {
      return [amountLeaf('/typedValue/additionalPerLevel', 'unassessable', {
        currency: currencyFrom(typed?.currency),
        unit: record.quantityOrScale ?? null,
        sourceText: Number.isFinite(typed?.additionalPerLevel) ? String(typed.additionalPerLevel) : null,
        reason: 'The row marks a derived, not printed, amount, but its explicit derivation record does not match the typed amount and supporting basis; no numeric claim is certified by the inventory.',
        derivation: clone(derivation),
        derivationStatus: 'derived-not-printed',
        isSourcePrinted: false,
        normalizationStatus: 'derived-amount-evidence-invalid',
        rawStructuredValue: clone(typed),
      }, false)];
    }
    return [amountLeaf('/typedValue/additionalPerLevel', 'derived-amount', {
      currency: 'gp',
      amount: typed.additionalPerLevel,
      unit: record.quantityOrScale ?? null,
      condition: record.conditions ?? null,
      sourceText: `${typed.additionalPerLevel} gp`,
      reason: 'The typed amount is explicitly marked as an intermediate derived value, not as a printed amount. Its printed schedule basis and stated interpolation method are retained as references; they are not separate monetary claims.',
      derivation: clone(derivation),
      derivationStatus: 'derived-not-printed',
      isSourcePrinted: false,
      normalizationStatus: 'explicit-derived-intermediate-not-printed',
    })];
  }
  if (record.sourceKind === 'coin-generation-table-row' && typed?.counts && typeof typed.counts === 'object') {
    return Object.entries(typed.counts).map(([denomination, count]) => ({
      path: `/typedValue/counts/${denomination}`,
      value: makeValue('treasure-quantity', {
        currency: currencyFrom(denomination),
        denomination,
        count,
        quantity: count,
        unit: 'coins of the printed denomination; total value not converted',
        reason: 'The source records a coin count for a generated treasure result, not a purchase price or a converted total.',
        rawStructuredValue: {denomination, count},
        normalizationStatus: 'explicit-coin-quantity-not-valued',
      }),
      isMonetary: false,
    }));
  }
  if (record.sourceKind === 'valuation-adjustment-row' && typeof typed?.formula === 'string') {
    return [amountLeaf('/typedValue/formula', 'formula', {
      formula: typed.formula,
      expression: clone(typed),
      condition: record.conditions ?? null,
      reason: 'Source rule adjusts a known gem base value; the base is not restated here, so the rule is preserved without calculating a value.',
      normalizationStatus: 'explicit-gem-valuation-rule',
      rawStructuredValue: clone(typed),
    })];
  }
  if (record.sourceKind === 'valuation-formula' && typeof typed?.effect === 'string') {
    return [amountLeaf('/typedValue/effect', 'formula', {
      formula: typed.effect,
      expression: clone(typed),
      sourceText: `${typed.roll ?? ''}: ${typed.effect}`.trim(),
      unit: record.quantityOrScale ?? null,
      reason: 'Source records a roll-dependent valuation rule without a fixed currency amount.',
      normalizationStatus: 'explicit-roll-dependent-valuation-formula',
      rawStructuredValue: clone(typed),
    })];
  }
  if (record.sourceKind === 'value-adjustment-table' && Array.isArray(typed?.outcomes)) {
    return typed.outcomes.map((outcome, index) => {
      const match = typeof outcome === 'string' ? outcome.match(/^\s*([^:]+):\s*(.*?)\s*$/) : null;
      const label = match?.[1] ?? `outcome ${index + 1}`;
      const effect = match?.[2] ?? String(outcome);
      const percent = effect.match(/^([+-]?\d+(?:\.\d+)?)\s*%$/);
      return percent
        ? amountLeaf(`/typedValue/outcomes/${index}`, 'rate', {
          amount: Number(percent[1]),
          unit: 'percent',
          per: 'listed commodity value',
          condition: `Die ${label}; ${record.conditions ?? ''}`.trim(),
          sourceText: `${label}: ${effect}`,
          normalizationStatus: 'explicit-commodity-value-adjustment-rate',
          rawStructuredValue: outcome,
        })
        : amountLeaf(`/typedValue/outcomes/${index}`, 'formula', {
          formula: effect,
          expression: outcome,
          condition: `Die ${label}; ${record.conditions ?? ''}`.trim(),
          sourceText: `${label}: ${effect}`,
          reason: 'The source identifies an outcome that retains the displayed value rather than giving a separate adjustment amount.',
          normalizationStatus: 'explicit-no-change-value-outcome',
          rawStructuredValue: outcome,
        });
    });
  }
  if (record.sourceKind === 'research-cost-prose' && typeof typed?.chargeFraction === 'string') {
    const fraction = typed.chargeFraction.match(/^(half|one[- ]half)\s+stated amount$/i);
    if (fraction) return [amountLeaf('/typedValue/chargeFraction', 'formula', {
      formula: 'one-half of the stated amount',
      expression: typed.chargeFraction,
      condition: record.conditions ?? null,
      per: 'the referenced charge',
      reason: 'The source gives a proportion of another stated research charge, not a standalone numeric amount.',
      normalizationStatus: 'explicit-fraction-of-referenced-charge',
      rawStructuredValue: clone(typed),
    })];
  }
  if (record.sourceKind === 'research-cost-prose' && typeof typed === 'string' && /no monetary amount stated/i.test(typed)) {
    return [amountLeaf('/typedValue', 'unknown', {
      sourceText: typed,
      condition: record.conditions ?? null,
      reason: 'The source explicitly records that this passage states no monetary amount; it does not establish a zero charge.',
      normalizationStatus: 'explicit-no-amount-stated',
      rawStructuredValue: typed,
    })];
  }
  if (typed && typeof typed === 'object' && Number.isFinite(typed.finePctOfValue)) {
    return [amountLeaf('/typedValue/finePctOfValue', 'rate', {
      amount: typed.finePctOfValue,
      unit: 'percent',
      per: 'value of foreign currency in possession',
      condition: record.conditions ?? null,
      sourceText: `${typed.finePctOfValue}% of value`,
      normalizationStatus: 'explicit-foreign-currency-fine-rate',
      rawStructuredValue: clone(typed),
    })];
  }
  if (typed && typeof typed === 'object' && Number.isFinite(typed.returnRatePct)) {
    const leaves = [amountLeaf('/typedValue/returnRatePct', 'rate', {
      amount: typed.returnRatePct,
      unit: 'percent',
      per: 'foreign currency exchanged',
      condition: record.conditions ?? null,
      sourceText: `${typed.returnRatePct}% returned in local denominations`,
      normalizationStatus: 'explicit-currency-exchange-rate',
      rawStructuredValue: clone(typed),
    })];
    if (Number.isFinite(typed.example?.foreignCoins) && Number.isFinite(typed.example?.localCoins)) {
      leaves.push(amountLeaf('/typedValue/example', 'formula', {
        formula: `${typed.example.foreignCoins} ${typed.example.currency ?? 'foreign'} coins → ${typed.example.localCoins} local coins`,
        expression: clone(typed.example),
        condition: record.conditions ?? null,
        reason: 'The printed example is retained as a conversion relation; the local coin denomination is not specified in this structured cell.',
        normalizationStatus: 'explicit-currency-exchange-example',
        rawStructuredValue: clone(typed.example),
      }));
    }
    return leaves;
  }
  if (typed?.threshold && Number.isFinite(typed.threshold.amount) && Number.isFinite(typed.finePctOfTotalForeignCoinValue)) {
    return [
      amountLeaf('/typedValue/threshold', 'exact', {
        currency: currencyFrom(typed.threshold.currency),
        amount: typed.threshold.amount,
        unit: 'foreign coin threshold',
        condition: record.conditions ?? null,
        sourceText: `${typed.threshold.amount} ${typed.threshold.currency}`,
        normalizationStatus: 'explicit-foreign-currency-threshold',
        rawStructuredValue: clone(typed.threshold),
      }),
      amountLeaf('/typedValue/finePctOfTotalForeignCoinValue', 'rate', {
        amount: typed.finePctOfTotalForeignCoinValue,
        unit: 'percent',
        per: 'total foreign coin value',
        condition: record.conditions ?? null,
        sourceText: `${typed.finePctOfTotalForeignCoinValue}% of total foreign coin value`,
        normalizationStatus: 'explicit-foreign-coin-fine-rate',
        rawStructuredValue: clone(typed),
      }),
    ];
  }
  if (typed && typeof typed === 'object' && Number.isFinite(typed.moneyReductionPct)) {
    return [amountLeaf('/typedValue/moneyReductionPct', 'rate', {
      amount: typed.moneyReductionPct,
      unit: 'percent reduction',
      per: 'the applicable monetary cost in the passage',
      condition: [record.conditions, 'typed source notes ambiguity in the breadth of the discount'].filter(Boolean).join('; '),
      sourceText: `${typed.moneyReductionPct}% money reduction`,
      reason: 'The monetary reduction is explicit, while the transcription separately preserves an ambiguity about which monetary costs it covers.',
      normalizationStatus: 'explicit-monetary-cost-reduction-rate-with-qualifier',
      rawStructuredValue: clone(typed),
    })];
  }
  if (record.sourceKind === 'treasure-generation-table-row' && Array.isArray(typed?.outcomes)) {
    return typed.outcomes.map((outcome, index) => {
      const path = `/typedValue/outcomes/${index}`;
      const currency = currencyFrom(outcome?.denomination);
      if (currency && Number.isFinite(outcome.min) && Number.isFinite(outcome.max)) {
        return amountLeaf(path, 'range', {
          currency,
          minimumAmount: Math.min(outcome.min, outcome.max),
          maximumAmount: Math.max(outcome.min, outcome.max),
          unit: 'coins of printed denomination',
          formula: outcome.dice ?? null,
          condition: record.conditions ?? null,
          sourceText: `${outcome.min}–${outcome.max} ${currency}`,
          normalizationStatus: 'explicit-treasure-amount-range-and-roll',
          rawStructuredValue: clone(outcome),
        });
      }
      if (outcome && typeof outcome.object === 'string' && Number.isFinite(outcome.min) && Number.isFinite(outcome.max)) {
        return amountLeaf(path, 'treasure-quantity', {
          minimumCount: Math.min(outcome.min, outcome.max),
          maximumCount: Math.max(outcome.min, outcome.max),
          unit: outcome.object,
          formula: outcome.dice ?? null,
          reason: 'This outcome gives an item count; its monetary valuation is determined separately and is not inferred here.',
          normalizationStatus: 'explicit-treasure-item-count-range',
          rawStructuredValue: clone(outcome),
        }, false);
      }
      if (typeof outcome?.formula === 'string') {
        return amountLeaf(`${path}/formula`, 'formula', {
          formula: outcome.formula,
          condition: record.conditions ?? null,
          sourceText: outcome.formula,
          reason: 'The outcome specifies a source treasure-table operation, not a fixed currency amount.',
          normalizationStatus: 'explicit-treasure-table-operation',
          rawStructuredValue: clone(outcome),
        });
      }
      return amountLeaf(path, 'non-monetary-reference', {
        reason: 'The structured result is not a currency amount; its source row remains preserved in the occurrence record.',
        normalizationStatus: 'explicit-noncurrency-treasure-result',
        rawStructuredValue: clone(outcome),
      }, false);
    });
  }
  if (record.sourceKind === 'treasure-map-result-row' && typeof typed?.result === 'string') {
    return [amountLeaf('/typedValue/result', 'formula', {
      formula: typed.result,
      condition: record.conditions ?? null,
      unit: record.quantityOrScale ?? null,
      reason: 'The map outcome points to monetary treasure but does not give an amount in this row.',
      normalizationStatus: 'explicit-treasure-result-reference',
      rawStructuredValue: clone(typed),
    })];
  }
  if (record.sourceKind === 'treasure-per-level-table-row') {
    if (typeof typed?.count === 'string' && /^\d+\s*[-–]\s*\d+$/.test(typed.count)) {
      const [minimumCount, maximumCount] = typed.count.split(/\s*[-–]\s*/).map(Number);
      return [amountLeaf('/typedValue/count', 'treasure-quantity', {
        minimumCount,
        maximumCount,
        unit: `${typed.object ?? 'items'} ${typed.per ?? record.quantityOrScale ?? ''}`.trim(),
        condition: record.conditions ?? null,
        reason: 'The result specifies a count of treasure items; the item values are determined separately.',
        normalizationStatus: 'explicit-per-level-item-count-range',
        rawStructuredValue: clone(typed),
      }, false)];
    }
    if (Number.isFinite(typed?.count)) return [amountLeaf('/typedValue/count', 'treasure-quantity', {
      count: typed.count,
      unit: `${typed.object ?? 'items'} ${typed.per ?? record.quantityOrScale ?? ''}`.trim(),
      condition: record.conditions ?? null,
      reason: 'The result specifies a count of treasure items; the item values are determined separately.',
      normalizationStatus: 'explicit-per-level-item-count',
      rawStructuredValue: clone(typed),
    }, false)];
  }
  if (record.sourceKind === 'treasure-generation-modifier' && typeof typed?.addition === 'string' && typed.rolls !== undefined) {
    const percent = typed.addition.match(/([+-]?\d+(?:\.\d+)?)\s*%/);
    return [
      amountLeaf('/typedValue/rolls', 'formula', {
        formula: typed.rolls,
        expression: typeof typed.rolls === 'number' ? `roll ${typed.rolls} times on the without-monster table` : typed.rolls,
        condition: record.conditions ?? null,
        reason: 'The source specifies a number of treasure-table rolls, not a fixed currency amount.',
        normalizationStatus: 'explicit-treasure-roll-count',
        rawStructuredValue: clone(typed),
      }),
      amountLeaf('/typedValue/addition', percent ? 'rate' : 'formula', {
        amount: percent ? Number(percent[1]) : undefined,
        unit: percent ? 'percent' : undefined,
        per: 'total of each roll',
        formula: percent ? undefined : typed.addition,
        condition: record.conditions ?? null,
        sourceText: typed.addition,
        normalizationStatus: percent ? 'explicit-per-roll-treasure-bonus-rate' : 'explicit-treasure-result-addition',
        rawStructuredValue: clone(typed),
      }),
    ];
  }
  const typedCurrency = currencyFrom(typed?.currency);
  if (Array.isArray(typed?.orderedValues) && typedCurrency && typed.orderedValues.every(value => Number.isFinite(value))) {
    return typed.orderedValues.map((amount, index) => ({
      path: `/typedValue/orderedValues/${index}`,
      value: makeValue('exact', {
        currency: typedCurrency,
        amount,
        unit: 'listed gem valuation amount',
        condition: `Ordered value ${index + 1} of ${typed.orderedValues.length}; source also records maxIncreaseSteps=${typed.maxIncreaseSteps ?? 'unspecified'} and absoluteMaximum=${typed.absoluteMaximum ?? 'unspecified'}.`,
        sourceText: String(amount),
        reason: 'The amount is one explicit member of the source ordered-value list; its ordinal is retained without inferring a roll or step rule.',
        normalizationStatus: 'explicit-ordered-valuation-list-member',
      }),
      isMonetary: true,
    }));
  }
  if (typedCurrency && Number.isFinite(typed?.minimumPerApplicantLevel)) {
    return [{
      path: '/typedValue/minimumPerApplicantLevel',
      value: makeValue('rate', {
        currency: typedCurrency,
        amount: typed.minimumPerApplicantLevel,
        per: 'applicant level',
        condition: [record.conditions, 'source field is minimumPerApplicantLevel'].filter(Boolean).join('; '),
        sourceText: `${typed.minimumPerApplicantLevel} ${typedCurrency} per applicant level (minimum field)`,
        normalizationStatus: 'explicit-minimum-per-level-rate',
        rawStructuredValue: clone(typed),
      }),
      isMonetary: true,
    }];
  }
  for (const [field, per] of [
    ['ratePct', 'the transaction or assessment base specified by the passage'],
    ['additionalRatePct', 'the applicable transaction base specified by the passage'],
    ['percentOfPlaceCostPerMonth', 'place cost per month'],
  ]) {
    if (Number.isFinite(typed?.[field])) {
      return [{
        path: `/typedValue/${field}`,
        value: makeValue('rate', {
          amount: typed[field],
          unit: 'percent',
          per,
          condition: record.conditions ?? null,
          sourceText: `${typed[field]}%`,
          reason: 'The source gives a percentage/rate, not a fixed currency amount; the underlying base is retained as stated in the typed field and row context.',
          normalizationStatus: 'explicit-percentage-rate',
          rawStructuredValue: clone(typed),
        }),
        isMonetary: true,
      }];
    }
  }
  if (typeof typed?.monetaryTreasureFormula === 'string') {
    return [{
      path: '/typedValue/monetaryTreasureFormula',
      value: makeValue('formula', {
        formula: typed.monetaryTreasureFormula,
        sourceText: typed.monetaryTreasureFormula,
        condition: record.conditions ?? null,
        reason: 'This is a source treasure-table lookup/formula, not a fixed GP amount. Referenced dice/table selections are retained without recomputing results.',
        normalizationStatus: 'explicit-treasure-table-formula',
        rawStructuredValue: clone(typed),
      }),
      isMonetary: true,
    }];
  }
  if (Number.isFinite(typed?.multiplier) && typeof typed?.baseline === 'string') {
    return [{
      path: '/typedValue/multiplier',
      value: makeValue('formula', {
        formula: `${typed.multiplier} × ${typed.baseline}`,
        expression: clone(typed),
        sourceText: `${typed.multiplier}× ${typed.baseline}`,
        condition: record.conditions ?? null,
        reason: 'A monetary-value multiplier is explicit, but the source does not supply the baseline amount in this row; no total is calculated.',
        normalizationStatus: 'explicit-value-multiplier-without-base-amount',
        rawStructuredValue: clone(typed),
      }),
      isMonetary: true,
    }];
  }
  if (typedCurrency && Number.isFinite(typed?.amount) && typed?.comparison === 'in excess of') {
    return [{
      path: '/typedValue/amount',
      value: makeValue('lower-bound', {
        currency: typedCurrency,
        amount: typed.amount,
        unit: 'narrative treasure valuation',
        condition: record.conditions ?? null,
        sourceText: `in excess of ${typed.amount} ${typedCurrency}`,
        reason: 'The source comparison explicitly establishes a lower bound; this illustrative treasure valuation is not a general price rule.',
        normalizationStatus: 'explicit-in-excess-of-lower-bound',
        rawStructuredValue: clone(typed),
      }),
      isMonetary: true,
    }];
  }
  if (typedCurrency && Number.isFinite(typed?.amount) && typeof typed?.qualifier === 'string' && /or so/i.test(typed.qualifier)) {
    return [{
      path: '/typedValue/amount',
      value: makeValue('approximate', {
        currency: typedCurrency,
        amount: typed.amount,
        unit: 'narrative treasure valuation',
        condition: record.conditions ?? null,
        sourceText: `${typed.amount} ${typedCurrency}; ${typed.qualifier}`,
        reason: 'The source wording explicitly marks this amount as approximate; the amount is not converted into an exact price.',
        normalizationStatus: 'explicit-approximate-source-amount',
        rawStructuredValue: clone(typed),
      }),
      isMonetary: true,
    }];
  }
  const context = {
    rootKey: 'typedValue',
    currency: currencyFrom(typed?.currency),
    unit: record.quantityOrScale ?? null,
    condition: record.conditions ?? null,
    qualifiers: [],
    nullReason: /dash/i.test(record.nullCellMeaning ?? '') ? record.nullCellMeaning : null,
  };
  const leaves = extractMoneyLeaves(typed, '/typedValue', context);
  if (leaves.length) return leaves;
  const purposeLooksMonetary = /fee|cost|wage|salary|price|purchase|sale|treasure|value|money|tax|duty|valuation/i.test(`${record.purpose ?? ''} ${record.sourceKind ?? ''}`);
  const explicitMoneyKey = (value) => {
    if (!value || typeof value !== 'object') return false;
    if (Array.isArray(value)) return value.some(explicitMoneyKey);
    return Object.entries(value).some(([key, child]) => key !== 'derivation' && (looksLikeMoneyField(key) || explicitMoneyKey(child)));
  };
  if (purposeLooksMonetary && (currencyFrom(typed?.currency) || explicitMoneyKey(typed))) {
    return [{
      path: '/typedValue',
      value: makeValue('unassessable', {
        currency: currencyFrom(typed?.currency),
        reason: 'The source row is a monetary claim but its structured value has no safely extractable amount cell; the original typed value is retained.',
        rawStructuredValue: clone(typed),
        normalizationStatus: 'candidate-unassessable',
      }),
      isMonetary: true,
    }];
  }
  return [{
    path: '/typedValue',
    value: makeValue('non-monetary-reference', {
      sourceText: typeof typed === 'string' ? typed : null,
      reason: 'The typed source value contains a noncurrency quantity, condition, result, or reference; no monetary amount is inferred.',
      rawStructuredValue: clone(typed),
      normalizationStatus: 'explicit-non-monetary-reference',
    }),
    isMonetary: false,
  }];
}

function makePhbDmgRow({artifact, row, rowIndex, groupMap, cropLookup, cropIndexById, cropReferencesById}) {
  const id = `phb-dmg:${row.sourceRowOrClaimId}`;
  const group = groupMap.get(row.groupId);
  const crop = cropLookup.get(row.contextCropId ?? row.focus?.contextCropId) ?? null;
  const focus = row.focus ?? null;
  const hasMultiFocus = Array.isArray(focus?.focusRectsCropPixelsLTRB);
  const geometry = hasMultiFocus && !focus?.contextCropId
    ? evidenceState('invalid-geometry', 'Multi-rectangle focus must name its contextCropId.')
    : hasMultiFocus && focus.coordinateSpace !== 'crop-local 150-dpi source-render pixels; left,top,right,bottom; half-open'
      ? evidenceState('invalid-geometry', 'Multi-rectangle focus must declare the crop-local 150-dpi source-render coordinate space.')
      : focus?.contextCropId && crop?.cropId && focus.contextCropId !== crop.cropId
        ? evidenceState('invalid-geometry', `Focus context crop ${focus.contextCropId} does not match the selected crop ${crop.cropId}.`)
        : hasMultiFocus && (!crop?.cropSha256 || !crop?.sourceRenderSha256 || !crop?.sourceRenderDimensionsPx || !crop?.cropBoundsPixelsLTRB)
          ? evidenceState('not-assessable', 'Multi-rectangle focus crop binding lacks crop/render hashes, crop dimensions, or source-page crop bounds.')
          : validateCropLocalSourceGeometry(crop, focus);
  const rectangles = focusRectangles(focus);
  const source = sourcePage(row.source);
  const purpose = phbDmgPurpose(row);
  const orderedContext = sourceContextPartEvidence({artifact, row, rowIndex, source, cropLookup, cropIndexById, cropReferencesById});
  const occurrence = occurrenceBase({
    id,
    kind: 'phb-dmg-typed-source-row-or-passage',
    object: row.objectOrSubject,
    variant: row.variant ?? null,
    purpose,
    source,
    identity: {
      groupId: row.groupId,
      groupTitle: group?.discoveryTitle ?? null,
      sourceKind: row.sourceKind,
      rowOrPassageIdentity: row.rowOrPassageIdentity ?? row.sourceRowOrClaimId,
      sourceRowOrClaimId: row.sourceRowOrClaimId,
      contextCropId: row.contextCropId ?? null,
    },
    evidence: {
      tableCropBounds: crop ? {
        bounds: clone(crop.cropBoundsPixelsLTRB ?? null),
        dimensionsPx: clone(crop.cropDimensionsPx ?? null),
        coordinateSpace: 'original source-render pixels; top-left origin; [left,top,right,bottom] half-open',
        cropSha256: crop.cropSha256 ?? null,
        renderSha256: crop.sourceRenderSha256 ?? null,
        sourceRenderSha256: crop.sourceRenderSha256 ?? null,
        sourceRenderDimensionsPx: clone(crop.sourceRenderDimensionsPx ?? null),
        cropBoundsSourcePagePixelsLTRB: clone(crop.cropBoundsPixelsLTRB ?? null),
        cropDimensionsPx: clone(crop.cropDimensionsPx ?? null),
        cropImageSha256: crop.cropSha256 ?? null,
        cropId: crop.cropId ?? null,
        sourcePage: {book: source.book, printedPage: source.printedPage, pdfPage: source.pdfPage, sourcePdfSha256: source.sourcePdfSha256},
        sourcePageSha256: null,
        pageRenderSha256: crop.sourceRenderSha256 ?? null,
        pageNumber: source.pdfPage,
      } : null,
      rowHighlightBounds: focus ? {
        bounds: rectangles?.length === 1 ? clone(rectangles[0]) : null,
        rectangles,
        rectangleCount: rectangles?.length ?? null,
        contextCropId: focus.contextCropId ?? row.contextCropId ?? null,
        coordinateSpace: focus.coordinateSpace ?? null,
        cropSha256: crop?.cropSha256 ?? null,
        sourceRenderSha256: crop?.sourceRenderSha256 ?? null,
        sourceRenderDimensionsPx: clone(crop?.sourceRenderDimensionsPx ?? null),
        cropBoundsSourcePagePixelsLTRB: clone(crop?.cropBoundsPixelsLTRB ?? null),
        cropDimensionsPx: clone(crop?.cropDimensionsPx ?? null),
        cropImageSha256: crop?.cropSha256 ?? null,
        sourcePage: {book: source.book, printedPage: source.printedPage, pdfPage: source.pdfPage, sourcePdfSha256: source.sourcePdfSha256},
        sourcePageSha256: null,
        pageRenderSha256: crop?.sourceRenderSha256 ?? null,
        pageNumber: source.pdfPage,
        status: focus.status ?? null,
      } : null,
      geometryAssessment: geometry,
      ...(orderedContext ? {
        sourceContextPartsStatus: orderedContext.status,
        sourceContextPartsReason: orderedContext.reason,
        sourceContextParts: orderedContext.sourceContextParts,
        sourceContextPartLinks: orderedContext.declaredLinks,
        sourceContextPartCropEvidence: orderedContext.evidenceCrops,
        supplementalContextCrops: orderedContext.supplementalContextCrops,
        primaryPartIdByFact: orderedContext.primaryPartIdByFact,
      } : {}),
      excerptPublication: {status: 'source-only; context crop is private and no public excerpt is attached'},
      sourceReviewStatus: focus?.status ?? 'no-row-focus-recorded',
    },
    siteMapping: null,
    provenance: {
      inputArtifact: {path: artifact.path, sha256: artifact.sha256, jsonPointer: jsonPointer(['review', 'sourceRowsOrClaims', rowIndex])},
      contextCropArtifact: crop ? {path: artifact.path, sha256: artifact.sha256, jsonPointer: jsonPointer(['review', 'evidenceCrops', (artifact.data.review.evidenceCrops ?? []).indexOf(crop)])} : null,
      sourceValueJsonPointer: '/typedValue',
    },
    reviewStatus: makeReviewStatus(focus?.status ?? null, artifact.data.review?.status ?? 'worker-transcribed; independent review pending', 'pending-independent-review'),
    conditions: row.conditions ?? null,
    quantity: row.quantityOrScale ?? null,
    qualifiers: [],
    sourceRecord: {typedValue: clone(row.typedValue), sourceKind: row.sourceKind},
  });
  return {occurrence, row, crop, geometry, group};
}

function appendPhbDmgRows({artifact, occurrences, claims}) {
  const rows = artifact.data.review?.sourceRowsOrClaims;
  if (!Array.isArray(rows)) throw new TypeError('PHB/DMG companion must have review.sourceRowsOrClaims array.');
  const groups = artifact.data.review?.groups ?? [];
  const crops = artifact.data.review?.evidenceCrops ?? [];
  const groupMap = new Map(groups.map(group => [group.recordId, group]));
  const cropLookup = cropMap(crops);
  const cropIndexById = new Map(crops.map((crop, index) => [crop.cropId ?? crop.id, index]));
  const cropReferencesById = new Map();
  for (const row of rows) {
    const occurrenceId = `phb-dmg:${row.sourceRowOrClaimId}`;
    const cropIds = new Set([row.contextCropId, row.focus?.contextCropId, ...(Array.isArray(row.sourceContextParts) ? row.sourceContextParts.map(part => part?.contextCropId) : [])].filter(value => typeof value === 'string' && value));
    for (const cropId of cropIds) {
      const references = cropReferencesById.get(cropId) ?? [];
      references.push(occurrenceId);
      cropReferencesById.set(cropId, references);
    }
  }
  const geometryCounts = {contained: 0, outsideCrop: 0, notAssessable: 0, invalid: 0};
  rows.forEach((row, index) => {
    const input = makePhbDmgRow({artifact, row, rowIndex: index, groupMap, cropLookup, cropIndexById, cropReferencesById});
    const status = input.geometry.status;
    if (status === 'contained') geometryCounts.contained++;
    else if (status === 'outside-crop') geometryCounts.outsideCrop++;
    else if (status === 'invalid-geometry') geometryCounts.invalid++;
    else geometryCounts.notAssessable++;
    const leaves = phbDmgLeaves(row);
    addValueClaims({
      claims,
      occurrence: input.occurrence,
      leaves,
      sourcePath: '/typedValue',
      sourceCellPointer: null,
      adjacentReferences: row.adjacentReferences ?? null,
      forceCandidateReason: 'Typed source row contains no safely normalizable monetary amount; source payload is retained for review.',
      fallbackValue: row.typedValue,
    });
    occurrences.push(input.occurrence);
  });
  return {count: rows.length, geometryCounts};
}

function makePhb123Row({artifact, row, rowIndex, cropLookup, baseRows, siteBindings}) {
  const sourceOccurrenceId = `phb123:${row.existingInventoryFile}:${row.inventorySourceRowIndex}`;
  const crop = cropLookup.get(row.p123ContextCropId) ?? null;
  const relatedRowIndex = row.inventorySourceRowIndex - 1;
  const relatedSource = baseRows.find(input => input.row.sourceFile === row.existingInventoryFile && input.row.sourceRecordIndex === relatedRowIndex && (input.row.sourceObject ?? input.row.sourceRecord?.sourceObject) === row.existingSourceObject) ?? null;
  const unholyReview = artifact.data.additionalReferenceSheetReview.unholyWaterVariantOfferReview;
  const isWaterRow = row.additionalVariantQualifier?.includes('unholy water') === true;
  const focus = isWaterRow && (unholyReview?.contextCrop?.cropId === row.p123ContextCropId || unholyReview?.sourceCropId === row.p123ContextCropId)
    ? {...clone(unholyReview.focus), contextCropId: row.p123ContextCropId}
    : null;
  const geometry = focus?.contextCropId && crop?.cropId && focus.contextCropId !== crop.cropId
    ? evidenceState('invalid-geometry', `Focus context crop ${focus.contextCropId} does not match the selected crop ${crop.cropId}.`)
    : validateCropLocalSourceGeometry(crop ? {cropDimensionsPx: crop.dimensionsPx} : null, focus);
  const rectangles = focusRectangles(focus);
  const source = sourcePage({
    bookKey: 'PHB',
    printedPage: row.p123PrintedPage,
    pdfPage: row.p123PdfPage,
    sourceFileSha256: row.p123SourceFileSha256,
    sourceFile: artifact.data.additionalReferenceSheetReview.source?.sourceFile,
  });
  const siteBinding = relatedSource ? siteBindings.get(relatedSource.row.id) ?? null : null;
  const occurrence = occurrenceBase({
    id: sourceOccurrenceId,
    kind: 'phb123-repeated-equipment-purchase-row',
    object: row.existingSourceObject,
    variant: row.additionalVariantQualifier ?? null,
    purpose: 'purchase',
    source,
    identity: {
      printedPage: row.p123PrintedPage,
      pdfPage: row.p123PdfPage,
      rowIdentity: `${row.section}: ${row.existingSourceObject}`,
      section: row.section,
      comparisonIndex: rowIndex,
      existingInventoryFile: row.existingInventoryFile,
      existingInventorySourceRecordIndex: relatedRowIndex,
      linkedSourceOccurrenceId: relatedSource?.occurrence.sourceOccurrenceId ?? null,
      comparisonStatus: row.comparisonStatus,
      additionalVariantQualifier: row.additionalVariantQualifier ?? null,
    },
    evidence: {
      tableCropBounds: crop ? {
        bounds: clone(crop.cropBoundsPixelsLTRB),
        dimensionsPx: clone(crop.dimensionsPx),
        coordinateSpace: 'original source-render pixels; top-left origin; [left,top,right,bottom] half-open',
        cropSha256: crop.sha256,
        cropBoundsSourcePagePixelsLTRB: clone(crop.cropBoundsPixelsLTRB),
        cropDimensionsPx: clone(crop.dimensionsPx),
        cropImageSha256: crop.sha256,
        sourcePage: {book: source.book, printedPage: source.printedPage, pdfPage: source.pdfPage, sourcePdfSha256: source.sourcePdfSha256},
        sourcePageSha256: null,
        pageRenderSha256: crop.sourceRenderSha256 ?? null,
        pageNumber: source.pdfPage,
      } : null,
      rowHighlightBounds: focus ? {
        bounds: rectangles?.length === 1 ? clone(rectangles[0]) : null,
        rectangles,
        rectangleCount: rectangles?.length ?? null,
        contextCropId: focus.contextCropId ?? null,
        coordinateSpace: focus.coordinateSpace ?? null,
        cropSha256: crop?.sha256 ?? null,
        sourceRenderSha256: crop?.sourceRenderSha256 ?? null,
        cropBoundsSourcePagePixelsLTRB: clone(crop?.cropBoundsPixelsLTRB ?? null),
        cropDimensionsPx: clone(crop?.dimensionsPx ?? null),
        cropImageSha256: crop?.sha256 ?? null,
        sourcePage: {book: source.book, printedPage: source.printedPage, pdfPage: source.pdfPage, sourcePdfSha256: source.sourcePdfSha256},
        sourcePageSha256: null,
        pageRenderSha256: crop?.sourceRenderSha256 ?? null,
        pageNumber: source.pdfPage,
        status: focus.status ?? null,
      } : null,
      geometryAssessment: geometry,
      excerptPublication: {status: 'source-only; PHB p.123 context crops are private and no public excerpt is attached'},
      sourceReviewStatus: focus?.status ?? 'comparison has no row-specific focus bounds recorded',
    },
    siteMapping: siteBinding ? {collection: 'equipment', itemId: siteBinding.itemId, fieldPointer: '/price', status: 'mapped-via-explicit-p35-or-p36-row-comparison'} : null,
    provenance: {
      inputArtifact: {path: artifact.path, sha256: artifact.sha256, jsonPointer: jsonPointer(['additionalReferenceSheetReview', 'rowComparisons', rowIndex])},
      contextCropArtifact: crop ? {path: artifact.path, sha256: artifact.sha256, jsonPointer: jsonPointer(['additionalReferenceSheetReview', 'sourceCrops', (artifact.data.additionalReferenceSheetReview.sourceCrops ?? []).indexOf(crop)])} : null,
      sourceValueJsonPointer: '/printedAmount',
    },
    reviewStatus: makeReviewStatus(focus?.status ?? null, artifact.data.additionalReferenceSheetReview.status ?? 'worker row comparison recorded; independent review pending', 'pending-independent-review'),
    quantity: row.printedAmount?.unit ?? null,
    conditions: row.additionalVariantQualifier ? 'Repeated PHB p.123 presentation; listed qualifier retained exactly and linked to the p.35/p.36 source row.' : null,
    qualifiers: row.additionalVariantQualifier ?? [],
    sourceRecord: {printedAmount: clone(row.printedAmount), additionalVariantQualifier: clone(row.additionalVariantQualifier ?? null)},
  });
  return {occurrence, row, relatedRow: relatedSource, siteBinding};
}

function appendPhb123Rows({artifact, occurrences, claims, baseRows, siteBindings}) {
  const supplement = artifact.data.additionalReferenceSheetReview;
  const rows = supplement?.rowComparisons;
  if (!Array.isArray(rows)) throw new TypeError('PHB/DMG companion must have additionalReferenceSheetReview.rowComparisons array.');
  const cropLookup = cropMap(supplement.sourceCrops ?? []);
  const geometryCounts = {contained: 0, outsideCrop: 0, notAssessable: 0, invalid: 0};
  rows.forEach((row, index) => {
    const input = makePhb123Row({artifact, row, rowIndex: index, cropLookup, baseRows, siteBindings});
    if (input.occurrence.evidence.geometryAssessment.status === 'contained') geometryCounts.contained++;
    else if (input.occurrence.evidence.geometryAssessment.status === 'outside-crop') geometryCounts.outsideCrop++;
    else if (input.occurrence.evidence.geometryAssessment.status === 'invalid-geometry') geometryCounts.invalid++;
    else geometryCounts.notAssessable++;
    const amount = row.printedAmount?.amount;
    const currency = currencyFrom(row.printedAmount?.currency);
    const leaves = amountNumber(amount) !== null && currency
      ? [{path: '/printedAmount', value: makeValue('exact', {
        currency,
        amount: amountNumber(amount),
        unit: row.printedAmount?.unit ?? null,
        sourceText: String(amount),
        reason: row.additionalVariantQualifier ? `The source comparison records additional variant qualifier(s): ${row.additionalVariantQualifier.join(', ')}.` : undefined,
        normalizationStatus: 'explicit-printed-purchase-amount',
      }), isMonetary: true}]
      : [];
    addValueClaims({claims, occurrence: input.occurrence, leaves, sourcePath: '/printedAmount', sourceCellPointer: '/printedAmount', forceCandidateReason: 'Comparison row has no explicit numeric amount and currency.', fallbackValue: row.printedAmount});
    input.occurrence.valueClaimIds.forEach(claimId => {
      const claim = claims.find(candidate => candidate.claimId === claimId);
      if (claim) claim.relatedSourceOccurrenceId = input.occurrence.sourceIdentity.linkedSourceOccurrenceId;
    });
    occurrences.push(input.occurrence);
  });
  return {count: rows.length, geometryCounts};
}

function appendPhb123Auxiliary({artifact, occurrences, claims}) {
  const supplement = artifact.data.additionalReferenceSheetReview;
  const excluded = supplement.separateExcludedMoneyContent;
  if (!excluded) return {startingMoneyRows: 0, currencyEquivalences: 0};
  const source = sourcePage(supplement.source);
  let startingMoneyRows = 0;
  for (const [index, row] of (excluded.startingMoneyRows ?? []).entries()) {
    const id = `phb123-aux:starting-money:${String(row.class).toLowerCase().replaceAll(/[^a-z0-9]+/g, '-')}`;
    const occurrence = occurrenceBase({
      id,
      kind: 'phb123-auxiliary-starting-money-row-outside-purchase-table',
      object: row.class,
      purpose: 'starting-money',
      source,
      identity: {printedPage: source.printedPage, pdfPage: source.pdfPage, rowIdentity: `starting-money row for ${row.class}`, auxiliaryIndex: index},
      evidence: {
        tableCropBounds: null,
        rowHighlightBounds: null,
        geometryAssessment: evidenceState('not-assessable', 'No crop or row-specific highlight bounds are recorded for this auxiliary content.'),
        excerptPublication: {status: 'source-only; no public excerpt or row-specific crop is attached'},
        sourceReviewStatus: 'scope explicitly excluded from 18-group and 165-purchase-row transcription',
      },
      siteMapping: null,
      provenance: {inputArtifact: {path: artifact.path, sha256: artifact.sha256, jsonPointer: jsonPointer(['additionalReferenceSheetReview', 'separateExcludedMoneyContent', 'startingMoneyRows', index])}, sourceValueJsonPointer: '/rangeGp'},
      reviewStatus: makeReviewStatus(null, 'auxiliary source fact recorded outside the typed 18-group denominator'),
      quantity: null,
      conditions: 'Outside the PHB p.123 165 equipment purchase-row and 18-group transcription denominators.',
      sourceRecord: clone(row),
    });
    const [minimumAmount, maximumAmount] = row.rangeGp ?? [];
    const leaf = minimumAmount !== undefined && maximumAmount !== undefined
      ? {path: '/rangeGp', value: makeValue('range', {currency: 'gp', minimumAmount, maximumAmount, formula: row.dice ?? null, sourceText: `${row.rangeGp.join('–')} gp`, normalizationStatus: 'explicit-starting-money-range'}), isMonetary: true}
      : null;
    addValueClaims({claims, occurrence, leaves: leaf ? [leaf] : [], sourcePath: '/rangeGp', sourceCellPointer: '/rangeGp'});
    occurrences.push(occurrence);
    startingMoneyRows++;
  }

  let currencyEquivalences = 0;
  for (const [index, relation] of (excluded.currencyEquivalences ?? []).entries()) {
    const id = `phb123-aux:currency-equivalence:${index + 1}`;
    const formula = `${relation.from.amount} ${relation.from.currency} = ${relation.to.amount} ${relation.to.currency}`;
    const occurrence = occurrenceBase({
      id,
      kind: 'phb123-auxiliary-currency-equivalence',
      object: 'Currency equivalence',
      purpose: 'currency-conversion',
      source,
      identity: {printedPage: source.printedPage, pdfPage: source.pdfPage, rowIdentity: formula, auxiliaryIndex: index},
      evidence: {
        tableCropBounds: null,
        rowHighlightBounds: null,
        geometryAssessment: evidenceState('not-assessable', 'No crop or row-specific highlight bounds are recorded for this auxiliary content.'),
        excerptPublication: {status: 'source-only; no public excerpt or row-specific crop is attached'},
        sourceReviewStatus: 'scope explicitly excluded from 18-group and 165-purchase-row transcription',
      },
      siteMapping: null,
      provenance: {inputArtifact: {path: artifact.path, sha256: artifact.sha256, jsonPointer: jsonPointer(['additionalReferenceSheetReview', 'separateExcludedMoneyContent', 'currencyEquivalences', index])}, sourceValueJsonPointer: ''},
      reviewStatus: makeReviewStatus(null, 'auxiliary source fact recorded outside the typed 18-group denominator'),
      sourceRecord: clone(relation),
    });
    addValueClaims({
      claims,
      occurrence,
      leaves: [{path: '/from', value: makeValue('formula', {currency: 'currency-equivalence', formula, sourceText: formula, rawStructuredValue: clone(relation), normalizationStatus: 'explicit-currency-equivalence'}), isMonetary: true}],
      sourcePath: '/from',
      sourceCellPointer: '/from',
    });
    occurrences.push(occurrence);
    currencyEquivalences++;
  }
  return {startingMoneyRows, currencyEquivalences};
}

function censusPurpose(receipt, raw = {}) {
  const text = `${receipt.claimType ?? ''} ${receipt.classification ?? ''} ${receipt.moneyCategory ?? ''} ${receipt.sourceObjectOrPassage ?? ''} ${raw.unit ?? ''}`.toLowerCase();
  if (/encumbrance|weight|carrying capacity|gp-weight/.test(text)) return 'encumbrance-weight';
  if (/experience.?point|\bxp\b/.test(text)) return 'experience-point-reference';
  if (/threshold/.test(text)) return 'treasure-threshold';
  if (/quantity|coin amount|treasure amount/.test(text)) return 'treasure-quantity';
  if (/treasure|hoard|gem.*(treasure|carried)|inventory-value/.test(text)) return 'treasure-or-inventory-valuation';
  if (/sale|market price|open market/.test(text)) return /price/.test(text) ? 'sale' : 'valuation';
  if (/wage|hireling|employment|pay chest|fare|fee|ceremony/.test(text)) return 'service-fee';
  if (/tax|duty/.test(text)) return 'tax-or-duty';
  if (/construction|creation|component|material|preparation/.test(text)) return 'material-or-construction-cost';
  if (/valuation|value|worth|base-value/.test(text)) return 'valuation';
  return 'source-census-claim';
}

function currencyToken(text) {
  if (typeof text !== 'string') return null;
  if (/(?:^|[^a-z])(?:usd|u\.?s\.?\s*\$|\$)(?:$|[^a-z])/i.test(text)) return 'usd';
  const match = text.match(/(?:^|[^a-z])(g\.?p\.?|s\.?p\.?|c\.?p\.?|e\.?p\.?|p\.?p\.?|gold pieces?|silver pieces?|copper pieces?|electrum pieces?|platinum pieces?)(?:$|[^a-z])/i);
  return match ? currencyFrom(match[1]) : null;
}

function parseDiscoverySegment(text, {currency = null, unit = null, condition = null, purpose = 'source-census-claim', raw = null} = {}) {
  const sourceText = String(text ?? '').trim();
  const discoveredCurrency = currencyToken(sourceText) ?? currencyToken(currency) ?? currencyFrom(currency) ?? null;
  const xpi = /\bexperience[ -]?points?|\bx\.?p\.?\b/i.test(`${sourceText} ${unit ?? ''} ${currency ?? ''}`);
  const weight = /encumbrance|weight|carrying capacity|gold-piece weight/i.test(`${purpose} ${sourceText} ${unit ?? ''}`);
  const baseOptions = {currency: xpi ? 'xp' : discoveredCurrency, unit, condition, sourceText, rawStructuredValue: raw ?? undefined};
  if (/in-kind-fee|\b(?:gp\s*\/\s*pp|gp\s*\/\s*item|coins?\s*\/\s*item|item\s*\/\s*gp)\b/i.test(`${purpose} ${currency ?? ''} ${sourceText}`)) {
    return [{path:'/typedClaim',value:makeValue('conditional',{...baseOptions,alternatives:[{kind:'in-kind-or-money',sourceText}],reason:'The census preserves alternative in-kind and currency payments, with no single cash price or fully resolved allocation.',normalizationStatus:'in-kind-alternatives-unresolved'}),isMonetary:true}];
  }
  if (xpi || weight) return [{path:'/typedClaim', value:makeValue('non-monetary-reference', {...baseOptions, reason:xpi ? 'Experience-point value is preserved separately from currency.' : 'Gold-piece wording is a weight/capacity measure, not money.', normalizationStatus:xpi ? 'explicit-xp-exclusion' : 'explicit-weight-exclusion'}), isMonetary:false}];

  if (/\b(?:no fixed (?:gp|gold)|below sale value|relative to (?:gp|gold)|proportionately higher|no fixed amount)\b/i.test(sourceText)) {
    return [{path:'/typedClaim', value:makeValue('unassessable', {...baseOptions, reason:'The census records a qualitative or relative monetary relation with no fixed amount; retain it without numeric conversion.', normalizationStatus:'source-typed-relative-value'}), isMonetary:true}];
  }
  if (/\b(?:free|no charge)\b/i.test(sourceText) && !/\d/.test(sourceText)) {
    return [{path:'/typedClaim', value:makeValue('non-monetary-reference', {...baseOptions, reason:'Source states service is free/no charge; no numeric amount is printed.', normalizationStatus:'explicit-free-service'}), isMonetary:false}];
  }

  if (!discoveredCurrency && !xpi && /\b(?:duration|time|weeks?|months?|days?|hours?)\b/i.test(`${raw?.claimType ?? ''} ${unit ?? ''} ${sourceText}`)) {
    return [{path:'/typedClaim', value:makeValue('non-monetary-reference', {...baseOptions, currency:null, reason:'The census records a labor or process duration without a currency amount; this is an explicit non-price reference.', normalizationStatus:'explicit-duration-exclusion'}), isMonetary:false}];
  }

  const formula = typeof raw?.formula === 'string' && raw.formula.trim() && !/no fixed|below sale value/i.test(raw.formula) ? raw.formula.trim() : null;
  const numbers = [...sourceText.matchAll(/[\d,]+(?:\.\d+)?/g)].map(match => amountNumber(match[0])).filter(Number.isFinite);
  const hasCurrency = Boolean(discoveredCurrency);
  const isThreshold = /threshold|under \d|unlikely|less than|or more|at least|not less|no less|maximum|up to|≤|</i.test(`${sourceText} ${purpose}`);

  if (formula && hasCurrency) {
    return [{path:'/typedClaim/formula', value:makeValue('formula', {...baseOptions, formula, expression:formula, reason:'Source-census formula retained as printed; no unstated scalar amount is derived.', normalizationStatus:'source-typed-formula-preserved'}), isMonetary:true}];
  }
  if (!hasCurrency || !numbers.length) {
    return [{path:'/typedClaim', value:makeValue('unassessable', {...baseOptions, reason:'A money-bearing passage is recorded, but the census value does not safely map to one currency-denominated amount; raw source value is retained.', normalizationStatus:'typed-census-value-unresolved'}), isMonetary:/money|value|price|fee|fare|sale|cost|threshold|treasure|valuation/i.test(purpose)}];
  }

  const range = sourceText.match(/([\d,]+(?:\.\d+)?)\s*(?:–|—|\bto\b|-)\s*([\d,]+(?:\.\d+)?)/i);
  const lower = sourceText.match(/(at least|not less than|no less than|minimum(?: of)?|more than|over)\s*\$?([\d,]+(?:\.\d+)?)/i);
  const upper = sourceText.match(/(up to|under|less than|no more than|at most|≤)\s*\$?([\d,]+(?:\.\d+)?)/i);
  let value;
  if (range && numbers.length >= 2) {
    value = makeValue('range', {...baseOptions, minimumAmount:amountNumber(range[1]), maximumAmount:amountNumber(range[2]), derivation:formula ?? undefined, normalizationStatus:'census-recorded-explicit-range'});
  } else if (lower) {
    value = makeValue('lower-bound', {...baseOptions, amount:amountNumber(lower[2]), inclusive:!/^more than|over$/i.test(lower[1]), normalizationStatus:'census-recorded-explicit-lower-bound'});
  } else if (upper) {
    value = makeValue('upper-bound', {...baseOptions, amount:amountNumber(upper[2]), inclusive:!/^under|less than$/i.test(upper[1]), normalizationStatus:'census-recorded-explicit-upper-bound'});
  } else if (/\s\/\s/.test(sourceText) && numbers.length > 1) {
    value = makeValue('conditional', {...baseOptions, alternatives:numbers, reason:'Slash-separated amounts remain alternatives; source-tier mapping is retained in the source conditions.', normalizationStatus:'census-recorded-alternatives'});
  } else if (/\b(?:under|less than|unlikely|not more than|≤)\b/i.test(sourceText) && numbers.length > 1) {
    value = makeValue('conditional', {...baseOptions, alternatives:numbers, reason:'Source qualifies more than one monetary threshold; the original statement is preserved without treating the likelihood as a fixed price.', normalizationStatus:'census-recorded-qualitative-threshold'});
  } else if (/\babout|approximately|or so\b/i.test(sourceText)) {
    value = makeValue('approximate', {...baseOptions, amount:numbers[0], normalizationStatus:'census-recorded-approximate-amount'});
  } else if (/\b(?:1d\d+|\d+d\d+|d\d+)\b/i.test(sourceText) || formula) {
    value = makeValue('formula', {...baseOptions, formula:formula ?? sourceText, normalizationStatus:'census-recorded-source-formula'});
  } else {
    value = makeValue('exact', {...baseOptions, amount:numbers[0], normalizationStatus:'census-recorded-explicit-amount'});
  }

  const notPrice = /treasure-quantity|treasure-threshold|behavior-threshold|gp-weight|experience-point-time|quantity/i.test(`${purpose} ${raw?.claimType ?? ''}`);
  if (notPrice) {
    value.isPrice = false;
    if (/quantity/.test(`${purpose} ${raw?.claimType ?? ''}`)) value.kind = 'treasure-quantity';
    else if (/threshold/.test(`${purpose} ${raw?.claimType ?? ''}`)) value.kind = 'treasure-threshold';
  }
  return [{path:'/typedClaim', value, isMonetary:!notPrice}];
}

function discoveryClaimLeaves(receipt) {
  const raw = receipt.typedClaim ?? {};
  const printedFieldKey = Object.hasOwn(raw,'printedValue') ? 'printedValue' : Object.hasOwn(raw,'amountOrFormula') ? 'amountOrFormula' : Object.hasOwn(raw,'amount') ? 'amount' : null;
  const printedValue = raw.printedValue ?? raw.amountOrFormula ?? raw.amount ?? null;
  const currency = raw.currency ?? receipt.currency ?? null;
  const unit = raw.unit ?? receipt.unit ?? null;
  const condition = raw.conditions ?? receipt.conditions ?? null;
  const purpose = censusPurpose(receipt, raw);
  const sourceText = typeof printedValue === 'string' ? printedValue : printedValue == null ? '' : String(printedValue);
  const compositeClauses = sourceText.includes(';') ? sourceText.split(';').map(part=>part.trim()).filter(Boolean) : null;
  if (compositeClauses?.length) {
    const alternatives = [];
    compositeClauses.forEach((clause,index)=>{
      const localCurrency=currencyToken(clause) ?? currencyFrom(currency);
      const label=clause.match(/\(([^)]+)\)/)?.[1] ?? condition;
      const parsed=parseDiscoverySegment(clause,{currency:localCurrency,unit,condition:label,purpose,raw:{...raw,claimType:receipt.claimType}});
      let amountValue=parsed[0]?.value??makeValue('unassessable',{sourceText:clause,reason:'Schedule component remains raw because no single typed amount was normalized.'});
      if (/\bfree|no charge\b/i.test(clause) && /\d/.test(clause) && amountValue.kind !== 'non-monetary-reference') amountValue=makeValue('conditional',{currency:amountValue.currency,alternatives:[{kind:'priced',value:clone(amountValue)},{kind:'free',value:0}],unit,condition:label,sourceText:clause,reason:'The census explicitly records both a fee range/amount and a free-service alternative.',normalizationStatus:'conditional-fee-or-free'});
      alternatives.push({condition:label,sourceText:clause,value:clone(amountValue)});
    });
    return [{path:`/typedClaim/${printedFieldKey??'printedValue'}`,value:makeValue('conditional',{currency:null,alternatives,unit,condition,sourceText,reason:'The source passage is a multi-service schedule with currency and free-service alternatives; each source-census segment is preserved with its own typed value and condition.',rawStructuredValue:clone(raw),normalizationStatus:'typed-multi-condition-schedule'}),isMonetary:true}];
  }
  return parseDiscoverySegment(sourceText,{currency,unit,condition,purpose,raw:{...raw,claimType:receipt.claimType}});
}

function appendPriceDiscoveryReceipts({artifact, passageArtifact, occurrences, claims}) {
  const receipts=artifact.data.claimReceipts;
  const passageRecords=passageArtifact.data.records;
  if (!Array.isArray(receipts) || receipts.length !== 180) throw new Error('Price-discovery adapter requires all 180 bounded census claimReceipts.');
  if (!Array.isArray(passageRecords) || passageRecords.length !== 34) throw new Error('PHB/DMG passage adapter requires all 34 bounded passage records.');
  const passageById=new Map(passageRecords.map(record=>[record.recordId,record]));
  if (passageById.size !== passageRecords.length) throw new Error('PHB/DMG passage supplement has duplicate record IDs.');
  const occurrenceBySourceRowId=new Map();
  const occurrenceById=new Map(occurrences.map(occurrence=>[occurrence.sourceOccurrenceId,occurrence]));
  for (const occurrence of occurrences) {
    for (const id of [occurrence.sourceIdentity?.sourceRowId,occurrence.sourceIdentity?.sourceRowOrClaimId,occurrence.sourceIdentity?.existingSourceRowId].filter(Boolean)) occurrenceBySourceRowId.set(id,occurrence);
    if (occurrence.sourceOccurrenceId.startsWith('canonical:')) occurrenceBySourceRowId.set(occurrence.sourceOccurrenceId.slice('canonical:'.length),occurrence);
    if (occurrence.sourceOccurrenceId.startsWith('ua:')) occurrenceBySourceRowId.set(occurrence.sourceOccurrenceId.slice('ua:'.length),occurrence);
    if (occurrence.sourceOccurrenceId.startsWith('phb-dmg:')) occurrenceBySourceRowId.set(occurrence.sourceOccurrenceId.slice('phb-dmg:'.length),occurrence);
  }
  const claimByOccurrence=new Map();
  for (const claim of claims) { const bucket=claimByOccurrence.get(claim.sourceOccurrenceId)??[]; bucket.push(claim); claimByOccurrence.set(claim.sourceOccurrenceId,bucket); }
  const canonicalInventories=artifact.data.inputArtifacts?.originalSourceInventory710;
  const sourceArtifactPath=artifact.path;
  const sourceHash=artifact.sha256;
  const passageArtifactPath=passageArtifact.path;
  const passageHash=passageArtifact.sha256;
  const directValuesByRecord=new Map();
  for (const record of passageRecords) directValuesByRecord.set(record.recordId,record.valueRecords??[]);

  const duplicateRowsByReceipt=new Map();
  const page239Record=passageById.get('dmg-removable-hireling-reference');
  if (!page239Record || page239Record.duplicateRowComparisonDenominator?.total !== 43 || page239Record.duplicateRowComparisonDenominator?.matched !== 43) throw new Error('DMG p.239 duplicate-source adapter requires 43 visually matched hireling rows.');
  const page239ReceiptId='dmg-removable-hireling-reference';
  const duplicateOccurrenceIds=[];
  page239Record.duplicateRowComparisons.forEach((row,index)=>{
    const original=occurrenceBySourceRowId.get(row.originalTypedSourceRowId);
    if (!original) throw new Error(`DMG p.239 comparison cannot link original row ${row.originalTypedSourceRowId}.`);
    const id=`price-discovery-duplicate:${page239ReceiptId}:${String(index+1).padStart(2,'0')}`;
    const source={book:'Dungeon Masters Guide',sourcePdfSha256:page239Record.source.sourcePdfSha256,printedPage:null,pdfPage:239,sourceFile:page239Record.source.sourceFile};
    const occurrence=occurrenceBase({
      id,kind:'removable-hireling-reference-duplicate-row',object:row.itemOrOccupation,purpose:'wage',source,
      identity:{receiptId:page239ReceiptId,table:row.removableSheetTable,rowIdentity:row.itemOrOccupation,duplicateOfSourceOccurrenceId:original.sourceOccurrenceId,originalTypedSourceRowId:row.originalTypedSourceRowId,printingStatus:'same supplied scan; exact publication printing unknown'},
      evidence:{contextCropBounds:{bounds:page239Record.sourcePassages[0].evidence.contextCropBoundsPdfPagePointsTopLeft,coordinateSpace:page239Record.sourcePassages[0].evidence.coordinateSpace},rowHighlightBounds:null,geometryAssessment:evidenceState('not-assessable','The whole removable sheet was pixel-reviewed; separate row-specific highlight bounds were not measured.'),sourceReviewStatus:'full sheet pixel-reviewed; each amount/special marker compared against the linked original typed row',excerptPublication:{status:'private source only; no full-page image published'}},
      provenance:{inputArtifact:{path:passageArtifactPath,sha256:passageHash,jsonPointer:jsonPointer(['records',passageRecords.indexOf(page239Record),'duplicateRowComparisons',index])},duplicateSourceArtifact:{path:'research/price-source-inventory.json',sha256:canonicalInventories?.sha256??null,jsonPointer:row.originalTypedSourceJsonPointer},sourceValueJsonPointer:'/printedValues'},
      reviewStatus:makeReviewStatus('worker pixel comparison recorded; independent review pending','duplicate occurrence of a typed hireling row in the supplied reference sheet','pending-independent-review'),
      quantity:null,conditions:'Duplicate source-sheet occurrence; not a new independent hireling-rate claim.',qualifiers:[],sourceRecord:{printedValues:clone(row.printedValues),duplicateOfSourceOccurrenceId:original.sourceOccurrenceId},
    });
    const printedValues=row.printedValues??[];
    const leaves=[];
    for (const [valueIndex,rawValue] of printedValues.entries()) {
      if (rawValue?.amount != null && currencyFrom(rawValue.currency)) {
        leaves.push({path:`/printedValues/${valueIndex}`,value:makeValue('exact',{currency:currencyFrom(rawValue.currency),amount:amountNumber(rawValue.amount),unit:rawValue.unit??null,sourceText:String(rawValue.amount),normalizationStatus:'duplicate-source-row-amount-preserved'}),isMonetary:true});
      } else {
        leaves.push({path:`/printedValues/${valueIndex}`,value:makeValue('unknown',{currency:currencyFrom(rawValue?.currency),unit:rawValue?.unit??null,sourceText:rawValue?.classification??'special',reference:'consult occupation description',reason:'The duplicate hireling row uses a “special” marker rather than a fixed amount; the linked source row retains that state.',normalizationStatus:'duplicate-special-reference'}),isMonetary:true});
      }
    }
    if (!leaves.length) leaves.push({path:'/printedValues',value:makeValue('unassessable',{reason:'The duplicate occurrence has no mapped typed row values.',normalizationStatus:'duplicate-row-unresolved'}),isMonetary:false});
    addValueClaims({claims,occurrence,leaves,sourcePath:'/printedValues',sourceCellPointer:null,fallbackValue:printedValues});
    const originals=claimByOccurrence.get(original.sourceOccurrenceId)??[];
    for (const duplicateClaimId of occurrence.valueClaimIds) {
      const dup=claims.find(candidate=>candidate.claimId===duplicateClaimId);
      const sourceValue=dup?.valueSemantics;
      const matched=originals.filter(claim=>claim.valueSemantics?.amount===sourceValue?.amount && claim.valueSemantics?.currency===sourceValue?.currency && claim.valueSemantics?.unit===sourceValue?.unit).map(claim=>claim.claimId);
      dup.duplicateOfClaimIds=matched;
    }
    original.duplicateSourceOccurrenceIds=[...(original.duplicateSourceOccurrenceIds??[]),id];
    occurrenceById.set(id,occurrence);
    occurrences.push(occurrence);
    duplicateOccurrenceIds.push(id);
  });
  duplicateRowsByReceipt.set(page239ReceiptId,duplicateOccurrenceIds);

  const receiptIds=[];
  const linkedClaimIdsByReceipt={};
  const directReceiptCounts={directTyped:0,linked:0,unresolved:0,nonPrice:0,duplicates:0};
  const mapExternalIds=(receipt,passageRecord)=>{
    const ids=[];
    const linkRows=receipt.linkedTypedSourceRecords??[];
    for(const row of linkRows){
      const key=row.sourceRowId??row.sourceRowOrClaimId??row.recordId;
      if(!key)continue;
      const occ=occurrenceBySourceRowId.get(key);
      if(!occ)throw new Error(`Price-discovery receipt ${receipt.receiptId} cannot resolve exact linked source row ${key}.`);
      if(row.object&&occ.object&&row.object!==occ.object&&row.objectOrSubject!==occ.object){
        const normalized=(row.object??row.objectOrSubject).toLowerCase().replace(/[^a-z0-9]+/g,'');
        const exact=occ.object.toLowerCase().replace(/[^a-z0-9]+/g,'');
        if(!normalized.includes(exact)&&!exact.includes(normalized)) throw new Error(`Receipt ${receipt.receiptId} row ${key} label does not match its indexed source object.`);
      }
      ids.push(occ.sourceOccurrenceId);
    }
    const link=receipt.sourceLinkage??{};
    if(link.descriptionRecordId){
      const occId=`ua-description:${link.descriptionRecordId}`;
      if(!occurrenceById.has(occId))throw new Error(`Receipt ${receipt.receiptId} cannot resolve description ${link.descriptionRecordId}.`);
      ids.push(occId);
    }
    if(link.sourceRowPointer){
      const occ=occurrenceBySourceRowId.get(link.sourceRowPointer);
      if(occ)ids.push(occ.sourceOccurrenceId);
    }
    for(const rowId of passageRecord?.relatedSourceRowIds??[]){
      const occ=occurrenceBySourceRowId.get(rowId);
      if(!occ)throw new Error(`Passage ${passageRecord.recordId} cannot resolve exact related source row ${rowId}.`);
      ids.push(occ.sourceOccurrenceId);
    }
    return [...new Set(ids)];
  };
  receipts.forEach((receipt,index)=>{
    const passageRecord=passageById.get(receipt.receiptId)??null;
    const relatedSourceOccurrenceIds=mapExternalIds(receipt,passageRecord);
    relatedSourceOccurrenceIds.push(...(duplicateRowsByReceipt.get(receipt.receiptId)??[]));
    const uniqueRelatedSourceOccurrenceIds=[...new Set(relatedSourceOccurrenceIds)];
    const valueRecords=passageRecord?.valueRecords??null;
    const discoverySource=receipt.source ?? receipt.sourcePages?.[0] ?? {};
    const source=passageRecord?.sourcePassages?.[0]?.source
      ? sourcePage(passageRecord.sourcePassages[0].source)
      : sourcePage(discoverySource,{book:receipt.book,sourcePdfSha256:discoverySource.sourcePdfSha256??discoverySource.sourceSha256});
    const sourceIdentity={
      receiptId:receipt.receiptId,bookKey:receipt.book??null,sourceObjectOrPassage:receipt.sourceObjectOrPassage??receipt.object??null,
      passageIdentity:receipt.sourcePassageIdentity??receipt.passageIdentity??null,claimType:receipt.claimType??null,
      discoveryStatus:receipt.receiptStatus??null,censusArtifact:receipt.sourceCensusArtifact??null,censusJsonPointer:receipt.sourceJsonPointer??null,
      linkedSourceOccurrenceIds:uniqueRelatedSourceOccurrenceIds,passageRecordId:passageRecord?.recordId??null,
      sourceBoundsStatus:discoverySource.boundsStatus??receipt.sourceLinkage?.sourceReviewStatus??null,
      unresolvedRemainder:receipt.unresolvedRemainder??null,
    };
    const segmentEvidence=passageRecord?.sourcePassages?.map(seg=>({passageId:seg.passageId,passageIdentity:seg.passageIdentity,source:seg.source,contextCropBoundsPdfPagePointsTopLeft:seg.evidence?.contextCropBoundsPdfPagePointsTopLeft??null,highlightRectanglesPdfPagePointsTopLeft:seg.evidence?.highlightRectanglesPdfPagePointsTopLeft??null,sourcePageHash:seg.evidence?.sourcePageHash??null,pixelReview:seg.evidence?.pixelReview??null}))??[];
    const reportedSourceBounds=discoverySource.sourcePageBounds??null;
    const evidence={
      contextCropBounds:segmentEvidence.length?segmentEvidence.map(seg=>seg.contextCropBoundsPdfPagePointsTopLeft):null,
      rowHighlightBounds:segmentEvidence.length?segmentEvidence.map(seg=>seg.highlightRectanglesPdfPagePointsTopLeft):null,
      reportedSourcePageBounds:reportedSourceBounds,
      sourcePassageEvidence:segmentEvidence.length?segmentEvidence:null,
      geometryAssessment:evidenceState('not-assessable',segmentEvidence.length?'Passage and focus bounds are recorded in original PDF points; independent transform/geometry review is pending.':reportedSourceBounds?'Source census bounds are provisional and not pixel-calibrated; no exact claim highlight bounds are recorded.':'No source crop or claim-specific highlight bounds are recorded.'),
      sourceReviewStatus:passageRecord?.sourceReviewStatus??receipt.discoveryReviewStatus??receipt.sourceLinkage?.sourceReviewStatus??null,
      excerptPublication:{status:'source-only; no full-page PDF or crop image published'},
    };
    let inputRef, valuePath;
    if(passageRecord){const passageIndex=passageArtifact.data.records.indexOf(passageRecord);inputRef={path:passageArtifactPath,sha256:passageHash,jsonPointer:jsonPointer(['records',passageIndex])};valuePath=`${inputRef.jsonPointer}/valueRecords`;}
    else {inputRef={path:sourceArtifactPath,sha256:sourceHash,jsonPointer:jsonPointer(['claimReceipts',index])};valuePath=`${inputRef.jsonPointer}/typedClaim`;}
    const occurrence=occurrenceBase({
      id:`price-discovery:${receipt.receiptId}`,kind:'bounded-price-discovery-census-receipt',
      object:receipt.sourceObjectOrPassage??receipt.object??receipt.receiptId,purpose:censusPurpose(receipt,receipt.typedClaim??receipt),source,
      identity:sourceIdentity,evidence,siteMapping:null,
      provenance:{inputArtifact:inputRef,sourceCensusArtifact:receipt.sourceCensusArtifact??null,sourceCensusJsonPointer:receipt.sourceJsonPointer??null,sourceCensusArtifactHash:artifact.data.inputArtifacts?.[receipt.book==='UA'?'uaCensus':receipt.book==='MM'||receipt.book==='MMII'?'monsterCensus':'phbDmgCensus']?.sha256??null,sourceValueJsonPointer:valuePath},
      reviewStatus:makeReviewStatus(receipt.discoveryReviewStatus??receipt.sourceLinkage?.sourceReviewStatus??null,passageRecord?.sourceReviewStatus??receipt.receiptStatus??null,'pending-independent-review'),
      conditions:receipt.typedClaim?.conditions??receipt.conditions??null,quantity:receipt.typedClaim?.unit??receipt.unit??null,
      qualifiers:[receipt.typedClaim?.notes,receipt.locatorAmountCue].filter(Boolean),
      sourceRecord:{claimType:receipt.claimType??null,classification:receipt.classification??null,typedClaim:clone(receipt.typedClaim??null),amountOrFormula:clone(receipt.amountOrFormula??null),currency:clone(receipt.currency??null),moneyCategory:clone(receipt.moneyCategory??null),receiptStatus:receipt.receiptStatus??null,sourcePassageIdentity:receipt.sourcePassageIdentity??receipt.passageIdentity??null,unresolvedRemainder:receipt.unresolvedRemainder??null},
    });
    occurrence.relatedSourceOccurrenceIds=uniqueRelatedSourceOccurrenceIds;
    occurrence.relatedSourceClaimIds=uniqueRelatedSourceOccurrenceIds.flatMap(id=>(occurrenceById.get(id)?.valueClaimIds??[]));
    occurrence.sourceIdentity.linkedSourceClaimIds=[...occurrence.relatedSourceClaimIds];
    occurrence.duplicateSourceOccurrenceIds=duplicateRowsByReceipt.get(receipt.receiptId)??[];

    let leaves=[];
    if(valueRecords?.length){
      valueRecords.forEach((rawValue,valueIndex)=>{
        const currency=currencyFrom(rawValue.currency);
        const isMonetary=rawValue.isPrice!==false&&!['reference','treasure-quantity','treasure-valuation','treasure-threshold','experience-point-time-rule'].includes(rawValue.kind);
        const kind=rawValue.kind==='reference'&&!isMonetary?'non-monetary-reference':rawValue.kind;
        const options={currency,amount:rawValue.amount,minimumAmount:rawValue.minimum??rawValue.minimumAmount,maximumAmount:rawValue.maximum??rawValue.maximumAmount,unit:rawValue.unit,condition:rawValue.condition??null,formula:rawValue.formula??rawValue.expression??undefined,expression:rawValue.expression??undefined,percentage:rawValue.percentage??undefined,minimumPercentage:rawValue.minimumPercentage??undefined,maximumPercentage:rawValue.maximumPercentage??undefined,alternatives:rawValue.alternatives,sourceText:rawValue.sourceTextSummary??undefined,reason:rawValue.reason??undefined,inclusive:rawValue.inclusive,derivation:rawValue.derivation??undefined,rawStructuredValue:clone(rawValue),normalizationStatus:rawValue.kind==='reference'?'explicit-non-price-reference':'source-description-value-record'};
        if(rawValue.kind==='range') options.minimumAmount=rawValue.minimum??rawValue.minimumAmount;
        if(rawValue.kind==='lower-bound') options.amount=rawValue.amount;
        if(rawValue.kind==='upper-bound') options.amount=rawValue.amount;
        const value=makeValue(kind,options);
        if(rawValue.isPrice===false)value.isPrice=false;
        const entry={path:`/valueRecords/${valueIndex}`,value,isMonetary};
        leaves.push(entry);
      });
    } else if(uniqueRelatedSourceOccurrenceIds.length){
      const sourcePointer=passageRecord?.duplicateRowComparisons?.length?'/duplicateRowComparisons':passageRecord?.relatedSourceRowIds?.length?'/relatedSourceRowIds':receipt.linkedTypedSourceRecords?.length?'/linkedTypedSourceRecords':receipt.sourceLinkage?'/sourceLinkage':'/sourceJsonPointer';
      leaves=[{path:sourcePointer,value:makeValue('non-monetary-reference',{reference:'exact linked source-row or passage claims',reason:'This receipt resolves through the explicitly linked structured source occurrence(s); its amounts remain in those original rows and this index does not duplicate them.',rawStructuredValue:uniqueRelatedSourceOccurrenceIds,normalizationStatus:'exact-census-to-source-row-link'}),isMonetary:false}];
    } else if(receipt.typedClaim || receipt.amountOrFormula !== undefined){
      leaves=discoveryClaimLeaves(receipt);
    } else {
      leaves=[{path:'/receipt',value:makeValue('unassessable',{reason:receipt.unresolvedRemainder??'No typed amount or exact source-row link is present; this bounded discovery receipt remains an explicit review item.',rawStructuredValue:clone(receipt),normalizationStatus:'bounded-receipt-unresolved'}),isMonetary:false}];
    }
    addValueClaims({claims,occurrence,leaves,sourcePath:valuePath,sourceCellPointer:null,adjacentReferences:receipt.typedClaim?.currency==='xp'?{xpValue:clone(receipt.typedClaim)}:null,fallbackValue:passageRecord?.valueRecords??receipt.typedClaim??receipt});
    if(passageRecord){
      const originalPointer=receipt.sourceJsonPointer??null;
      for(const claimId of occurrence.valueClaimIds){
        const claim=claims.find(item=>item.claimId===claimId);
        if(!claim)continue;
        claim.provenance.sourceCensusArtifact=receipt.sourceCensusArtifact??null;
        claim.provenance.sourceCensusJsonPointer=originalPointer;
        const valueIndex=Number(claimId.match(/#\/valueRecords\/(\d+)$/)?.[1]);
        const rawValue=passageRecord.valueRecords?.[valueIndex];
        const passageIndex=Number.isInteger(rawValue?.sourcePassageIndex)?rawValue.sourcePassageIndex:0;
        const passage=passageRecord.sourcePassages?.[passageIndex];
        if(passage){
          claim.source=sourcePage(passage.source);
          claim.sourceIdentity={...claim.sourceIdentity,sourcePassageId:passage.passageId,sourcePassageIdentity:passage.passageIdentity,sourcePassageIndex:passageIndex};
          claim.evidence={...claim.evidence,contextCropBounds:passage.evidence?.contextCropBoundsPdfPagePointsTopLeft??null,rowHighlightBounds:passage.evidence?.highlightRectanglesPdfPagePointsTopLeft??null,sourcePassageEvidence:[segmentEvidence[passageIndex]??null],geometryAssessment:evidenceState('not-assessable','Focused passage bounds are recorded in original PDF points; independent transform/geometry review is pending.')};
        }
        if(rawValue){
          const explicitRowIds=[...new Set([...(rawValue.relatedSourceRowIds??[]),...(rawValue.linksToSourceRows??[]).filter(rowId=>occurrenceBySourceRowId.has(rowId))])];
          const valueSourceOccurrences=explicitRowIds.map(rowId=>{
            const linked=occurrenceBySourceRowId.get(rowId);
            if(!linked)throw new Error(`Passage value ${rawValue.valueId??claimId} cannot resolve exact linked source row ${rowId}.`);
            return linked;
          });
          claim.relatedSourceOccurrenceIds=valueSourceOccurrences.map(linked=>linked.sourceOccurrenceId);
          claim.relatedSourceClaimIds=valueSourceOccurrences.flatMap(linked=>linked.valueClaimIds);
          claim.sourceIdentity={...claim.sourceIdentity,linkedSourceOccurrenceIds:claim.relatedSourceOccurrenceIds,linkedSourceClaimIds:claim.relatedSourceClaimIds};
        }
      }
    }
    receiptIds.push(occurrence.sourceOccurrenceId);
    linkedClaimIdsByReceipt[receipt.receiptId]=[...occurrence.relatedSourceClaimIds,...occurrence.valueClaimIds];
    directReceiptCounts[uniqueRelatedSourceOccurrenceIds.length?'linked':'directTyped']++;
    if(!uniqueRelatedSourceOccurrenceIds.length && !passageRecord && !(receipt.typedClaim||receipt.amountOrFormula!==undefined))directReceiptCounts.unresolved++;
    if(receipt.receiptStatus?.includes('duplicate'))directReceiptCounts.duplicates++;
    if(receipt.claimType?.includes('quantity')||receipt.claimType?.includes('threshold'))directReceiptCounts.nonPrice++;
    occurrenceById.set(occurrence.sourceOccurrenceId,occurrence);
    occurrences.push(occurrence);
  });
  for(const occurrence of occurrences){
    const receipt=occurrence.sourceIdentity?.receiptId;
    if(!receipt)continue;
    for(const claimId of occurrence.sourceIdentity?.linkedSourceClaimIds??[]){const claim=claims.find(candidate=>candidate.claimId===claimId);if(claim){claim.discoveryReceiptIds=[...(claim.discoveryReceiptIds??[]),receipt];}}
  }
  return {receiptCount:receiptIds.length,passageRecordCount:passageRecords.length,directReceiptCounts,receiptOccurrenceIds:receiptIds,linkedClaimIdsByReceipt};
}

function hashArtifactBytes(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

function currentValidationArtifactManifest() {
  const paths = new Set([
    'dist/data.json',
    'dist/books.js',
    'equipment.json',
    'research/equipment-source-row-bindings.json',
    'research/field-evidence-bindings.json',
    'citation-overrides.json',
    'tools/monetary-source-render-frames.mjs',
    monetarySourceRenderFrameRegistry.path,
  ]);
  const scan = directory => {
    if (!existsSync(directory)) return;
    for (const entry of readdirSync(directory, {withFileTypes: true})) {
      const path = `${directory}/${entry.name}`;
      if (entry.isDirectory()) scan(path);
      else if (entry.isFile() && entry.name.endsWith('.json')) paths.add(path);
    }
  };
  scan('dist/scans');
  return [...paths].filter(path => existsSync(resolve(root, path))).sort().map(path => ({
    path,
    sha256: hashArtifactBytes(readFileSync(resolve(root, path))),
  }));
}

function validateExpectedCounts(actual, expected) {
  const mismatches = Object.entries(expected).filter(([key, value]) => actual[key] !== value).map(([key, expectedValue]) => ({key, expected: expectedValue, actual: actual[key] ?? null}));
  if (mismatches.length) {
    const detail = mismatches.map(item => `${item.key}: expected ${item.expected}, found ${item.actual}`).join('; ');
    throw new Error(`Monetary-source input shape mismatch: ${detail}. Review the input schema before generating an index.`);
  }
}

export function buildMonetarySourceIndex(input, {expectedDenominators = CURRENT_DENOMINATORS} = {}) {
  const sourceRenderFrames = loadMonetarySourceRenderFrames();
  const canonicalArtifact = requireArtifact(input?.canonical, 'canonical');
  const equipmentArtifact = requireArtifact(input?.equipment, 'equipment');
  const bindingArtifact = requireArtifact(input?.equipmentBindings, 'equipmentBindings');
  const uaArtifact = requireArtifact(input?.uaSupplement, 'uaSupplement');
  const uaDescriptionArtifact = requireArtifact(input?.uaDescriptionSupplement, 'uaDescriptionSupplement');
  const phbDmgArtifact = requireArtifact(input?.phbDmgSupplement, 'phbDmgSupplement');
  const priceDiscoveryArtifact = requireArtifact(input?.priceDiscoverySupplement, 'priceDiscoverySupplement');
  const phbDmgPassageArtifact = requireArtifact(input?.phbDmgPricePassageSupplement, 'phbDmgPricePassageSupplement');
  const sourceInventories = canonicalArtifact.data.sourceInventories;
  if (!Array.isArray(sourceInventories)) throw new TypeError('canonical data must have sourceInventories array.');
  const allRows = sourceInventories.flatMap(inventory => inventory.sourceRows ?? []);
  const {items: equipment} = equipmentItemArray(equipmentArtifact);
  const uaRows = uaArtifact.data.rowRecords;
  if (!Array.isArray(uaRows)) throw new TypeError('UA supplement must have rowRecords array.');
  const uaDescriptionRecords = uaDescriptionArtifact.data.newSourceDescriptionRecords;
  if (!Array.isArray(uaDescriptionRecords)) throw new TypeError('UA description supplement must have newSourceDescriptionRecords array.');
  const typedPhbDmgRows = phbDmgArtifact.data.review?.sourceRowsOrClaims;
  const p123Rows = phbDmgArtifact.data.additionalReferenceSheetReview?.rowComparisons;
  if (!Array.isArray(typedPhbDmgRows) || !Array.isArray(p123Rows)) throw new TypeError('PHB/DMG companion must have typed rows and p.123 rowComparisons arrays.');
  const discoveryReceipts=priceDiscoveryArtifact.data.claimReceipts;
  const phbDmgPassageRecords=phbDmgPassageArtifact.data.records;
  if(!Array.isArray(discoveryReceipts)||!Array.isArray(phbDmgPassageRecords))throw new TypeError('Price-discovery supplement must have claimReceipts and PHB/DMG passage supplement must have records arrays.');
  const pricedEquipment = equipment.filter(item => item?.price != null);
  const actualDenominators = {
    canonicalSourceRows: allRows.length,
    currentEquipmentPriceClaims: pricedEquipment.length,
    uaSupplementRows: uaRows.length,
    uaDescriptionRecords: uaDescriptionRecords.length,
    phbDmgTypedRowsOrClaims: typedPhbDmgRows.length,
    phb123RepeatedEquipmentRows: p123Rows.length,
    priceDiscoveryCensusReceipts: discoveryReceipts.length,
    phbDmgPricePassageRecords: phbDmgPassageRecords.length,
  };
  if (expectedDenominators) validateExpectedCounts(actualDenominators, expectedDenominators);

  const rowBindingLookup = new Map();
  const equipmentBindings = bindingArtifact.data.bindings;
  if (!Array.isArray(equipmentBindings)) throw new TypeError('equipmentBindings data must have bindings array.');
  equipmentBindings.forEach(binding => {
    const key = `${binding.sourceInventoryFile}|${binding.sourceRecordIndex}`;
    const bucket = rowBindingLookup.get(key) ?? [];
    bucket.push(binding);
    rowBindingLookup.set(key, bucket);
  });
  const fieldEvidenceBySourceRowId = new Map();
  for (const binding of canonicalArtifact.data.fieldEvidenceBindings ?? []) {
    for (const sourceRowId of binding.sourceRowIds ?? []) {
      const bucket = fieldEvidenceBySourceRowId.get(sourceRowId) ?? [];
      bucket.push(binding);
      fieldEvidenceBySourceRowId.set(sourceRowId, bucket);
    }
  }

  const sourceOccurrences = [];
  const claims = [];
  const sourceRowLookup = new Map();
  const uaGroupById = new Map((uaArtifact.data.groupReviews ?? []).map(group => [group.groupId, group]));
  const uaActiveContextTargets = (uaArtifact.data.groupReviews ?? []).flatMap(group => (group.activeContextTargets ?? []).map(target => ({groupId: group.groupId, ...clone(target)})));
  const uaActiveContextTargetIds = new Set();
  for (const target of uaActiveContextTargets) {
    if (uaActiveContextTargetIds.has(target.targetId)) throw new Error(`UA active context target ID is duplicated across groups: ${target.targetId}`);
    uaActiveContextTargetIds.add(target.targetId);
  }
  const uaActiveContextRowLinks = [];
  const canonicalRows = appendCanonicalRows({sourceArtifact: canonicalArtifact, sourceRows: sourceOccurrences, claims, rowBindingLookup, fieldEvidenceBySourceRowId, rowLookup: sourceRowLookup});
  const equipmentResult = appendEquipmentClaims({equipmentArtifact, bindingArtifact, rowsByKey: sourceRowLookup, claims});

  for (const [index, row] of uaRows.entries()) {
    const id = `ua:${row.recordId}`;
    const groupId = String(row.recordId).match(/^(ua-other-\d{3})/)?.[1] ?? null;
    const group = uaGroupById.get(groupId) ?? (uaArtifact.data.groupReviews ?? []).find(candidate => candidate.sourceRows?.structuredRecordIds?.includes(row.recordId)) ?? null;
    const activeContextTargets = uaActiveContextTargetsForRow({group, row, uaSourcePdfSha256: uaArtifact.data.source?.sha256});
    const activeContextFocusContainment = assessUaPrimaryFocusContainment(row, activeContextTargets);
    if (group?.activeContextTargets?.length) {
      const rowSegmentId = row.sourceRowIdentity?.segmentId ?? row.evidence?.tableSegmentId ?? null;
      const applicableTargets = group.activeContextTargets.filter(target => Array.isArray(target.rowRecordIds)
        ? target.rowRecordIds.includes(row.recordId)
        : target.segmentId === rowSegmentId);
      if (activeContextTargets.length !== applicableTargets.length
        || applicableTargets.some((target, targetIndex) => activeContextTargets[targetIndex]?.targetId !== target.targetId)) {
        throw new Error(`UA row ${row.recordId} does not link every applicable active context target in declared order.`);
      }
      uaActiveContextRowLinks.push({recordId: row.recordId, groupId: group.groupId, segmentId: rowSegmentId, targetIds: activeContextTargets.map(target => target.targetId), primaryFocusContainment: activeContextFocusContainment});
    }
    const source = sourcePage({bookKey: uaArtifact.data.source?.book, printedPage: row.sourceRowIdentity?.printedPage, pdfPage: row.sourceRowIdentity?.pdfPage, sourceFileSha256: row.evidence?.sourcePdfSha256, sourceFile: uaArtifact.data.source?.fileName});
    const geometry = validateSourceGeometry(row);
    const occurrence = occurrenceBase({
      id,
      kind: 'ua-supplement-source-row',
      object: row.object,
      variant: row.variant ?? null,
      purpose: purposeFor(row.classification, row.classification),
      source,
      identity: {
        groupId: group?.groupId ?? null,
        table: row.sourceRowIdentity?.table ?? null,
        sourceRowId: row.recordId,
        rowLabel: row.sourceRowIdentity?.rowLabel ?? row.object,
        printedPage: row.sourceRowIdentity?.printedPage,
        pdfPage: row.sourceRowIdentity?.pdfPage,
        rowIndexWithinGroup: row.sourceRowIdentity?.rowIndexWithinGroup,
        groupContext: group?.sourceTableContext ?? null,
      },
      evidence: {
        tableCropBounds: clone(row.evidence?.tableCropBounds ?? null),
        rowHighlightBounds: clone(row.evidence?.rowHighlightBounds ?? null),
        activeContextTargets,
        activeContextTargetOrder: activeContextTargets.map(target => ({targetId: target.targetId, targetOrder: target.targetOrder, role: target.role, segmentId: target.segmentId ?? null})),
        activeContextFocusContainment,
        pageImageSha256: row.evidence?.pageImageSha256 ?? null,
        geometryAssessment: {...geometry, helper: 'tools/monetary-source-geometry.mjs', method: 'pdf-page-points'},
        excerptPublication: {status: 'source-only; no dedicated public row excerpt attached by this index'},
        sourceReviewStatus: clone(row.reviewStatus ?? null),
      },
      siteMapping: null,
      provenance: {inputArtifact: {path: uaArtifact.path, sha256: uaArtifact.sha256, jsonPointer: jsonPointer(['rowRecords', index])}, sourceValueJsonPointer: '/values'},
      reviewStatus: makeReviewStatus(row.reviewStatus ?? null, 'worker pixel transcription recorded; independent semantic and overlay review pending', 'pending-independent-review'),
      conditions: row.quantityCondition ?? null,
      quantity: row.quantityCondition ?? null,
      qualifiers: row.footnoteMarkers ?? [],
      sourceRecord: {classification: row.classification, values: clone(row.values)},
    });
    const moneyEntries = Object.entries(row.values ?? {}).filter(([key]) => /^gp/i.test(key));
    const adjacentReferences = Object.fromEntries(Object.entries(row.values ?? {}).filter(([key]) => /^xp/i.test(key)).map(([key, value]) => [key, clone(value)]));
    const leaves = [];
    for (const [key, value] of moneyEntries) {
      const path = `/values/${key}`;
      const normalized = value && typeof value === 'object' && typeof value.kind === 'string'
        ? makeValue(value.kind === 'unavailable' ? (isExplicitNotForSale(value.reason) ? 'not-for-sale' : 'unknown')
          : value.kind === 'description-pointer' ? 'unassessable'
            : value.kind === 'alternatives' ? 'conditional'
              : value.kind, {
          currency: currencyFrom(value.currency) ?? 'gp',
          amount: value.amount,
          minimumAmount: value.minimumAmount ?? value.minimum,
          maximumAmount: value.maximumAmount ?? value.maximum,
          alternatives: value.alternatives ?? value.values,
          denominator: value.denominator,
          reference: value.reference,
          formula: value.formula,
          unit: value.unit ?? row.quantityCondition,
          condition: value.condition ?? null,
          sourceText: value.sourceText ?? null,
          reason: value.reason ?? (value.kind === 'description-pointer'
            ? 'The printed value cell points to a description or another table; this index does not resolve the pointer.'
            : value.kind === 'alternatives' ? 'The source gives alternatives but this record does not map every amount to its condition; all printed alternatives are retained.' : undefined),
          normalizationStatus: 'typed-ua-source-cell-preserved',
          rawStructuredValue: ['exact', 'range', 'lower-bound', 'formula', 'conditional', 'rate'].includes(value.kind) ? undefined : value,
        })
        : normalizeCandidateOrReference(value, {currency: 'gp', purpose: row.classification, sourceText: typeof value === 'string' ? value : null, qualifiers: row.footnoteMarkers});
      leaves.push({path, value: normalized, isMonetary: true});
    }
    if (!leaves.length) leaves.push({path: '/values', value: makeValue('unknown', {reason: 'No GP cell is present in the row; XP references remain separate and are not counted as money.', normalizationStatus: 'explicit-no-gp-cell'}), isMonetary: false});
    addValueClaims({claims, occurrence, leaves, sourcePath: '/values', adjacentReferences, sourceCellPointer: null});
    occurrence.adjacentReferences = adjacentReferences;
    sourceOccurrences.push(occurrence);
  }

  const uaDescriptionResult = appendUaDescriptionRecords({artifact: uaDescriptionArtifact, uaArtifact, occurrences: sourceOccurrences, claims});

  const phbDmgResult = appendPhbDmgRows({artifact: phbDmgArtifact, occurrences: sourceOccurrences, claims});
  const siteBindingsBySourceRow = new Map();
  for (const binding of equipmentBindings) {
    const row = findSourceRowForBinding(binding, sourceRowLookup);
    if (row) siteBindingsBySourceRow.set(row.row.id, binding);
  }
  const p123Result = appendPhb123Rows({artifact: phbDmgArtifact, occurrences: sourceOccurrences, claims, baseRows: canonicalRows, siteBindings: siteBindingsBySourceRow});
  const p123Auxiliary = appendPhb123Auxiliary({artifact: phbDmgArtifact, occurrences: sourceOccurrences, claims});
  const priceDiscoveryResult=appendPriceDiscoveryReceipts({artifact:priceDiscoveryArtifact,passageArtifact:phbDmgPassageArtifact,occurrences:sourceOccurrences,claims});

  const idCounts = new Map();
  for (const occurrence of sourceOccurrences) idCounts.set(occurrence.sourceOccurrenceId, (idCounts.get(occurrence.sourceOccurrenceId) ?? 0) + 1);
  for (const claim of claims) idCounts.set(claim.claimId, (idCounts.get(claim.claimId) ?? 0) + 1);
  const duplicateIds = [...idCounts].filter(([, count]) => count > 1).map(([id]) => id);
  if (duplicateIds.length) throw new Error(`Monetary-source index has duplicate stable IDs: ${duplicateIds.slice(0, 10).join(', ')}`);

  const valueKindCounts = {};
  const purposeCounts = {};
  let monetaryAmountClaimCount = 0;
  let unknownClaimCount = 0;
  let unassessableClaimCount = 0;
  let nonMonetaryReferenceCount = 0;
  for (const claim of claims) {
    const kind = claim.valueSemantics?.kind ?? 'unknown';
    valueKindCounts[kind] = (valueKindCounts[kind] ?? 0) + 1;
    purposeCounts[claim.purpose] = (purposeCounts[claim.purpose] ?? 0) + 1;
    if (claim.monetaryAmount) monetaryAmountClaimCount++;
    if (kind === 'unknown' || kind === 'not-for-sale') unknownClaimCount++;
    if (kind === 'unassessable') unassessableClaimCount++;
    if (kind === 'non-monetary-reference') nonMonetaryReferenceCount++;
  }

  const geometryCounts = {
    ua: uaRows.reduce((counts, row) => {
      const status = validateSourceGeometry(row).status;
      counts[status] = (counts[status] ?? 0) + 1;
      return counts;
    }, {}),
    phbDmgCropLocal: phbDmgResult.geometryCounts,
    phb123CropLocal: p123Result.geometryCounts,
    canonicalDifferentCoordinateSpaces: canonicalRows.filter(input => input.occurrence.evidence.geometryAssessment.status === 'not-assessable').length,
  };

  const p123Extra = p123Auxiliary.startingMoneyRows + p123Auxiliary.currencyEquivalences;
  const uaTargetReferenceCounts = new Map(uaActiveContextTargets.map(target => [target.targetId, 0]));
  for (const link of uaActiveContextRowLinks) for (const targetId of link.targetIds) {
    if (!uaTargetReferenceCounts.has(targetId)) throw new Error(`UA active context row link refers to an undeclared target: ${targetId}`);
    uaTargetReferenceCounts.set(targetId, uaTargetReferenceCounts.get(targetId) + 1);
  }
  const uaUnlinkedContextTargetIds = [...uaTargetReferenceCounts].filter(([, count]) => count === 0).map(([targetId]) => targetId);
  const uaActiveContextCoverage = {
    status: uaActiveContextTargets.length === 0 ? 'no-active-context-targets-in-input'
      : uaUnlinkedContextTargetIds.length ? 'declared-active-context-targets-not-fully-linked'
        : 'all-declared-active-context-targets-consumed-in-source-rows',
    declaredTargetCount: uaActiveContextTargets.length,
    referencedTargetCount: uaActiveContextTargets.length - uaUnlinkedContextTargetIds.length,
    rowRecordsWithContextTargets: uaActiveContextRowLinks.length,
    activeContextRowLinkCount: uaActiveContextRowLinks.reduce((count, row) => count + row.targetIds.length, 0),
    primaryFocusContainment: {
      structuralOnly: true,
      sourcePixelOrSemanticPass: false,
      counts: uaActiveContextRowLinks.reduce((counts, row) => {
        const status = row.primaryFocusContainment?.status ?? 'not-assessable';
        counts[status] = (counts[status] ?? 0) + 1;
        return counts;
      }, {}),
      outsidePrimaryCropRecordIds: uaActiveContextRowLinks.filter(row => row.primaryFocusContainment?.status === 'outside-primary-crop').map(row => row.recordId),
      sourceFrameMismatchRecordIds: uaActiveContextRowLinks.filter(row => row.primaryFocusContainment?.status === 'source-frame-mismatch').map(row => row.recordId),
      notAssessableRecordIds: uaActiveContextRowLinks.filter(row => row.primaryFocusContainment?.status === 'not-assessable').map(row => row.recordId),
    },
    unlinkedTargetIds: uaUnlinkedContextTargetIds,
    targets: uaActiveContextTargets,
    rowLinks: uaActiveContextRowLinks,
  };
  const sourceGroupDenominators = {
    canonical: sourceInventories.map(inventory => ({
      groupId: inventory.id,
      sourceRowCount: (inventory.sourceRows ?? []).length,
      sourceFile: inventory.sourceFiles?.[0] ?? null,
    })),
    uaSupplement: (uaArtifact.data.groupReviews ?? []).map(group => ({
      groupId: group.groupId,
      sourceRowCount: group.sourceRows?.structuredRecordIds?.length ?? uaRows.filter(row => row.recordId?.startsWith(`${group.groupId}-`)).length,
      activeContextTargetCount: group.activeContextTargets?.length ?? 0,
      activeContextTargetIds: (group.activeContextTargets ?? []).map(target => target.targetId),
      rowRecordsWithActiveContextLinks: uaActiveContextRowLinks.filter(link => link.groupId === group.groupId).length,
    })),
    uaDescriptionSupplement: {sourceDescriptionRecords: uaDescriptionRecords.length, pointerResolutionLinks: uaDescriptionResult.linkCount},
    phbDmgSupplement: (phbDmgArtifact.data.review?.groups ?? []).map(group => ({
      groupId: group.recordId,
      sourceRowCount: typedPhbDmgRows.filter(row => row.groupId === group.recordId).length,
      sourceFirstDenominator: clone(group.sourceFirstDenominator ?? null),
    })),
    phb123RepeatedEquipmentRows: {groupId: 'phb123-equipment-purchase-comparison', sourceRowCount: p123Rows.length},
    priceDiscoveryCensus: {receiptCount: priceDiscoveryResult.receiptCount, scope: 'PHB/DMG 52, UA 65, MM/MMII 63 bounded page-census claims'},
  };
  const output = {
    schemaVersion: 1,
    artifactType: 'bounded-monetary-source-inventory',
    scope: 'Occurrence-preserving index of the supplied source-price inventories and item-field claims; it does not claim whole-book monetary completeness.',
    sourceRenderFrameRegistry: {
      ...monetarySourceRenderFrameRegistry,
      reviewedFrameCount: sourceRenderFrames.frames.length,
      dpiResolutionPolicy: 'Exact book/PDF/page/source-render hash/dimensions match; explicit declarations must agree; unknown secondary frames need their own DPI declarations.',
    },
    reviewPolicy: {
      sourceTranscription: 'Upstream transcription statuses are preserved as reported.',
      independentSemanticReview: 'Pending; this builder does not approve source interpretation or canonical mapping.',
      independentOverlayReview: 'Pending; geometry containment does not approve highlight alignment.',
      sourceExcerptPolicy: 'A source-only fact without a recorded public excerpt is marked explicitly on its evidence record.',
    },
    inputArtifacts: [canonicalArtifact, equipmentArtifact, bindingArtifact, uaArtifact, uaDescriptionArtifact, phbDmgArtifact, priceDiscoveryArtifact, phbDmgPassageArtifact].map(({path, sha256}) => ({path, sha256})),
    currentInputValidation: {
      method: 'validatePriceSourceInventory at CLI before output/check; pure builder does not certify currency or source recency',
      validationArtifacts: (input.validationArtifacts ?? []).map(({path, sha256}) => ({path, sha256})),
      validator: input.validationResult?.validator ?? null,
      status: input.validationResult?.status ?? 'not-run-by-pure-builder',
    },
    denominators: {
      ...actualDenominators,
      canonicalEquipmentSourceRowBindings: equipmentResult.bindingsCount,
      sourceOccurrences: sourceOccurrences.length,
      sourceValueClaims: claims.length,
      phb123AuxiliaryStartingMoneyAndCurrencyRows: p123Extra,
      phb123StartingMoneyRows: p123Auxiliary.startingMoneyRows,
      phb123CurrencyEquivalenceRows: p123Auxiliary.currencyEquivalences,
      boundedPriceDiscoveryCensusReceipts: priceDiscoveryResult.receiptCount,
      phbDmgPricePassageRecords: priceDiscoveryResult.passageRecordCount,
      phbDmgDuplicateReferenceRows: 43,
    },
    sourceGroupDenominators,
    uaDescriptionResolution: {
      boundedPointerLinks: uaDescriptionResult.linkCount,
      newDescriptionPassages: uaDescriptionResult.recordCount,
      tablePointerAmountsStillUnresolved: uaDescriptionResult.linkCount,
      xpValuesKeptSeparate: true,
      links: uaDescriptionResult.descriptionLinkSummary,
    },
    uaActiveContextCoverage,
    priceDiscoveryReceiptReconciliation: {
      boundedDenominator: 180,
      receiptOccurrences: priceDiscoveryResult.receiptCount,
      phbDmgNewPassageRecords: priceDiscoveryResult.passageRecordCount,
      directReceiptDispositionCounts: priceDiscoveryResult.directReceiptCounts,
      rowOrPassageLinks: priceDiscoveryResult.linkedClaimIdsByReceipt,
      wholeBookCoverage: 'not assessed; the 180 receipts cover only the named bounded page-census claims',
      independentReview: 'pending; the builder records links and worker transcription states but does not approve semantics or overlays',
    },
    counts: {
      monetaryAmountClaims: monetaryAmountClaimCount,
      monetaryClaimRecords: claims.filter(claim => claim.monetaryClaim).length,
      valueKindCounts,
      purposeCounts,
      unknownOrNotForSaleClaimRecords: unknownClaimCount,
      unassessableClaimRecords: unassessableClaimCount,
      nonMonetaryReferenceRecords: nonMonetaryReferenceCount,
      xpExcludedFromMonetaryAmountCount: true,
      uaXpAdjacentReferenceCellCount: uaRows.filter(row => Object.keys(row.values ?? {}).some(key => /^xp/i.test(key))).length,
    },
    geometryValidation: {
      ua: {helper: 'tools/monetary-source-geometry.mjs', coordinateSpace: 'original PDF page points', tolerancePoints: 0, counts: geometryCounts.ua},
      uaActiveContextFocusContainment: uaActiveContextCoverage.primaryFocusContainment,
      phbDmgCropLocal: {coordinateSpace: 'crop-local 150-dpi source-render pixels; half-open LTRB', counts: phbDmgResult.geometryCounts},
      phb123CropLocal: {coordinateSpace: 'crop-local source-render pixels; half-open LTRB', counts: p123Result.geometryCounts},
      canonicalDifferentCoordinateSpaces: {count: geometryCounts.canonicalDifferentCoordinateSpaces, status: 'not-assessable; recorded crop and highlight spaces are not directly comparable without a verified transform'},
    },
    shapeValidation: {
      expectedDenominators: clone(expectedDenominators),
      actualDenominators,
      equipmentBindingsWithoutCanonicalRow: equipmentResult.missingBindings,
      status: equipmentResult.missingBindings.length ? 'candidate-unmapped-equipment-claims-present' : 'denominators-match-and-equipment-bindings-resolve',
    },
    sourceOccurrences,
    claims,
  };
  return output;
}

function loadArtifact(path) {
  const bytes = readFileSync(resolve(root, path));
  return {path, sha256: hashArtifactBytes(bytes), data: JSON.parse(bytes.toString('utf8'))};
}

function parseArguments(argv) {
  const options = {mode: null, output: OUTPUT_PATH, inputs: {...DEFAULT_INPUTS}, allowHistorical: false};
  const pathFlags = {
    '--source-inventory': 'canonical',
    '--equipment': 'equipment',
    '--equipment-bindings': 'equipmentBindings',
    '--ua-supplement': 'uaSupplement',
    '--ua-description-supplement': 'uaDescriptionSupplement',
    '--phb-dmg-supplement': 'phbDmgSupplement',
    '--price-discovery-supplement': 'priceDiscoverySupplement',
    '--phb-dmg-price-passage-supplement': 'phbDmgPricePassageSupplement',
  };
  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    if (arg === '--output') {
      options.mode = 'output';
      options.output = argv[++index];
      if (!options.output) throw new Error('--output requires a path.');
    } else if (arg === '--check') {
      options.mode = 'check';
      if (argv[index + 1] && !argv[index + 1].startsWith('--')) options.output = argv[++index];
    } else if (arg === '--allow-historical') {
      options.allowHistorical = true;
    } else if (pathFlags[arg]) {
      const value = argv[++index];
      if (!value) throw new Error(`${arg} requires a path.`);
      options.inputs[pathFlags[arg]] = value;
    } else if (arg === '--help' || arg === '-h') {
      options.mode = 'help';
    } else {
      throw new Error(`Unknown argument ${arg}.`);
    }
  }
  return options;
}

export async function runMonetarySourceInventoryCli(argv = process.argv.slice(2)) {
  const options = parseArguments(argv);
  if (options.mode === 'help' || options.mode === null) {
    return {status: 'usage', text: 'Usage: node tools/monetary-source-inventory.mjs --output <path> [--source-inventory <path> --equipment <path> --equipment-bindings <path> --ua-supplement <path> --ua-description-supplement <path> --phb-dmg-supplement <path> --price-discovery-supplement <path> --phb-dmg-price-passage-supplement <path>] | --check [path] [--allow-historical]'};
  }
  if (options.allowHistorical) {
    const outputFile = resolve(root, options.output);
    const relativeToFixtures = resolve(root, 'tests/fixtures');
    const relativePath = outputFile.slice(relativeToFixtures.length).replaceAll('\\', '/');
    if (!outputFile.startsWith(`${relativeToFixtures}/`) || !relativePath || relativePath.includes('/../')) {
      throw new Error('--allow-historical is restricted to output/check paths under tests/fixtures; the public monetary index requires the pinned current canonical input.');
    }
  }
  const input = {
    canonical: loadArtifact(options.inputs.canonical),
    equipment: loadArtifact(options.inputs.equipment),
    equipmentBindings: loadArtifact(options.inputs.equipmentBindings),
    uaSupplement: loadArtifact(options.inputs.uaSupplement),
    uaDescriptionSupplement: loadArtifact(options.inputs.uaDescriptionSupplement),
    phbDmgSupplement: loadArtifact(options.inputs.phbDmgSupplement),
    priceDiscoverySupplement: loadArtifact(options.inputs.priceDiscoverySupplement),
    phbDmgPricePassageSupplement: loadArtifact(options.inputs.phbDmgPricePassageSupplement),
  };
  if (!options.allowHistorical) {
    const assembledArtifact = loadArtifact('dist/data.json');
    const {validatePriceSourceInventory} = await import('./price-source-inventory.mjs');
    validatePriceSourceInventory(input.canonical.data, {data: assembledArtifact.data});
    input.validationArtifacts = currentValidationArtifactManifest();
    input.validationResult = {validator: 'validatePriceSourceInventory', status: 'passed'};
  }
  const result = buildMonetarySourceIndex(input);
  const serialized = `${JSON.stringify(result, null, 2)}\n`;
  if (options.mode === 'check') {
    const outputFile = resolve(root, options.output);
    if (!existsSync(outputFile)) throw new Error(`Index output is missing: ${options.output}; generate it with --output after canonical inputs are final.`);
    const current = readFileSync(outputFile, 'utf8');
    if (current !== serialized) throw new Error(`Index output differs from the current inputs: ${options.output}. Regenerate with --output ${options.output}.`);
    return {status: 'ok', output: options.output, sourceOccurrences: result.sourceOccurrences.length, claims: result.claims.length};
  }
  const outputFile = resolve(root, options.output);
  writeFileSync(outputFile, serialized);
  return {status: 'written', output: options.output, sourceOccurrences: result.sourceOccurrences.length, claims: result.claims.length};
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const writeResult = result => {
    if (result.status === 'usage') process.stdout.write(`${result.text}\n`);
    else process.stdout.write(`${JSON.stringify(result)}\n`);
  };
  runMonetarySourceInventoryCli().then(writeResult).catch(error => {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  });
}
