import { textValue } from '../demo/links';

export const quoteCategories = ['labour', 'parts', 'other'] as const;
export type QuoteCategory = (typeof quoteCategories)[number] | '';

export type QuoteLine = {
  id: string;
  name: string;
  category: QuoteCategory;
  quantity: number | null;
  unitPriceCents: number | null;
  amount: number;
};

export type QuoteVersion = {
  version: number;
  submittedAt: string;
  items: QuoteLine[];
  notes: string;
  totalCents: number;
  clientSubmitId?: string;
  changeRequest?: string;
};

export type QuoteRow = {
  id: string;
  name: string;
  category: QuoteCategory;
  quantity: string;
  price: string;
};

const editableQuoteStatuses = ['Confirmed', 'Awaiting approval', 'Changes requested'];

export function quoteEditable(status: string) {
  return editableQuoteStatuses.includes(status);
}

export function normalizeCategory(value: unknown): QuoteCategory {
  const kind = textValue(value).toLowerCase();
  if (kind === 'labour' || kind === 'labor') return 'labour';
  if (kind === 'part' || kind === 'parts') return 'parts';
  if (kind === 'other') return 'other';
  return '';
}

export function categoryLabel(value: unknown) {
  const category = normalizeCategory(value);
  if (category === 'labour') return 'Labour';
  if (category === 'parts') return 'Parts';
  if (category === 'other') return 'Other';
  return '';
}

/** Line total in integer cents. Amount-only lines keep their stored total. */
export function lineAmountCents(item: any): number {
  if (!item || typeof item !== 'object') return NaN;
  const hasQty = item.quantity !== null && item.quantity !== undefined && item.quantity !== '';
  const hasUnit = item.unitPriceCents !== null && item.unitPriceCents !== undefined && item.unitPriceCents !== '';
  if (hasQty || hasUnit) {
    const qty = item.quantity;
    const unit = item.unitPriceCents;
    if (!Number.isInteger(qty) || qty <= 0 || !Number.isInteger(unit) || unit <= 0) return NaN;
    const product = qty * unit;
    return Number.isSafeInteger(product) ? product : NaN;
  }
  const amount = Number(item.amount);
  if (!Number.isFinite(amount) || amount <= 0) return NaN;
  const cents = Math.round(amount * 100);
  return Number.isSafeInteger(cents) && cents > 0 ? cents : NaN;
}

export function quoteTotalCents(items: any[]) {
  let sum = 0;
  for (const item of Array.isArray(items) ? items : []) {
    const cents = lineAmountCents(item);
    if (!Number.isFinite(cents)) return NaN;
    sum += cents;
  }
  return sum;
}

export function formatZar(cents: number) {
  if (!Number.isFinite(cents)) return 'Not recorded';
  const rounded = Math.round(cents);
  const sign = rounded < 0 ? '-' : '';
  const abs = Math.abs(rounded);
  const rands = Math.trunc(abs / 100);
  const rem = abs % 100;
  const whole = rands.toLocaleString('en-ZA');
  return rem ? `${sign}R${whole}.${String(rem).padStart(2, '0')}` : `${sign}R${whole}`;
}

export function parseRandToCents(value: string) {
  const text = value.trim();
  if (!/^\d+(\.\d{1,2})?$/.test(text)) return null;
  const [rands, fraction = ''] = text.split('.');
  const cents = Number(rands) * 100 + Number((fraction + '00').slice(0, 2));
  if (!Number.isSafeInteger(cents) || cents <= 0) return null;
  return cents;
}

function centsToInput(cents: number) {
  const rem = Math.abs(cents) % 100;
  const rands = Math.trunc(Math.abs(cents) / 100);
  return rem ? `${rands}.${String(rem).padStart(2, '0')}` : String(rands);
}

export function blankQuoteRow(): QuoteRow {
  return { id: crypto.randomUUID(), name: '', category: '', quantity: '', price: '' };
}

export function lineToRow(line: any): QuoteRow {
  const category = normalizeCategory(line?.category || line?.kind);
  const id = textValue(line?.id) || crypto.randomUUID();
  const name = typeof line?.name === 'string' ? line.name : '';
  const hasQty = Number.isInteger(line?.quantity) && line.quantity > 0;
  const hasUnit = Number.isInteger(line?.unitPriceCents) && line.unitPriceCents > 0;
  if (hasQty && hasUnit) {
    return {
      id,
      name,
      category,
      quantity: String(line.quantity),
      price: centsToInput(line.unitPriceCents),
    };
  }
  const cents = lineAmountCents({ amount: line?.amount });
  return { id, name, category, quantity: '', price: Number.isFinite(cents) ? centsToInput(cents) : '' };
}

export function rowsFromJob(job: any) {
  const draft = job?.quoteDraft;
  if (draft && Array.isArray(draft.items) && draft.items.length) {
    return {
      rows: draft.items.map(lineToRow),
      notes: typeof draft.notes === 'string' ? draft.notes : '',
      source: 'draft' as const,
    };
  }
  if (Array.isArray(job?.items) && job.items.length) {
    return {
      rows: job.items.map(lineToRow),
      notes: typeof job.notes === 'string' ? job.notes : '',
      source: 'submitted' as const,
    };
  }
  return { rows: [blankQuoteRow()], notes: '', source: 'empty' as const };
}

export function rowsToLines(rows: QuoteRow[]): QuoteLine[] {
  if (!Array.isArray(rows) || !rows.length) throw Error('Add at least one quotation line.');
  return rows.map((row, index) => {
    const name = textValue(row?.name);
    if (!name) throw Error(`Enter a description for line ${index + 1}.`);
    const unitCents = parseRandToCents(String(row?.price ?? ''));
    if (unitCents == null) throw Error(`Enter a valid price for “${name}”.`);
    const quantityText = String(row?.quantity ?? '').trim();
    const category = normalizeCategory(row?.category);
    const id = textValue(row?.id) || crypto.randomUUID();
    if (!quantityText) {
      return {
        id,
        name,
        category,
        quantity: null,
        unitPriceCents: null,
        amount: unitCents / 100,
      };
    }
    if (!/^\d+$/.test(quantityText)) throw Error(`Enter a whole quantity for “${name}”.`);
    const quantity = Number(quantityText);
    if (!Number.isInteger(quantity) || quantity <= 0) throw Error(`Enter a whole quantity for “${name}”.`);
    const totalCents = quantity * unitCents;
    if (!Number.isSafeInteger(totalCents)) throw Error(`The total for “${name}” is too large.`);
    return {
      id,
      name,
      category,
      quantity,
      unitPriceCents: unitCents,
      amount: totalCents / 100,
    };
  });
}

export function assertQuoteNotes(notes: unknown) {
  const text = textValue(notes);
  if (text.length < 3) throw Error('Describe the proposed work.');
  return text;
}

function copyLine(line: QuoteLine): QuoteLine {
  return { ...line };
}

export function linesFromStored(items: any[]): QuoteLine[] {
  if (!Array.isArray(items) || !items.length) throw Error('Add at least one quotation line.');
  return items.map((item, index) => {
    const name = textValue(item?.name);
    if (!name) throw Error(`Enter a description for line ${index + 1}.`);
    const cents = lineAmountCents(item);
    if (!Number.isFinite(cents) || cents <= 0) throw Error(`Enter a valid price for “${name}”.`);
    const hasQty = Number.isInteger(item?.quantity) && item.quantity > 0;
    const hasUnit = Number.isInteger(item?.unitPriceCents) && item.unitPriceCents > 0;
    return {
      id: textValue(item?.id) || crypto.randomUUID(),
      name,
      category: normalizeCategory(item?.category || item?.kind),
      quantity: hasQty && hasUnit ? item.quantity : null,
      unitPriceCents: hasQty && hasUnit ? item.unitPriceCents : null,
      amount: cents / 100,
    };
  });
}

export function buildQuoteSubmission(job: any, extra: any = {}, now = new Date().toISOString()) {
  const clientSubmitId = textValue(extra.clientSubmitId);
  const versions: QuoteVersion[] = Array.isArray(job?.quoteVersions) ? job.quoteVersions : [];
  if (clientSubmitId && versions.some((version) => version.clientSubmitId === clientSubmitId)) {
    return { duplicate: true as const, patch: null, version: null };
  }
  const items = Array.isArray(extra.rows) ? rowsToLines(extra.rows) : linesFromStored(extra.items || []);
  const notes = assertQuoteNotes(extra.notes);
  const totalCents = quoteTotalCents(items);
  if (!Number.isFinite(totalCents) || totalCents <= 0) throw Error('Add valid quote line items.');
  const versionNumber = versions.reduce((max, version) => Math.max(max, Number(version.version) || 0), 0) + 1;
  const snapshot: QuoteVersion = {
    version: versionNumber,
    submittedAt: now,
    items: items.map(copyLine),
    notes,
    totalCents,
    ...(clientSubmitId ? { clientSubmitId } : {}),
  };
  return {
    duplicate: false as const,
    version: snapshot,
    patch: {
      items: items.map(copyLine),
      notes,
      quoteVersion: versionNumber,
      quoteVersions: [...versions.map((version) => ({ ...version, items: (version.items || []).map(copyLine) })), snapshot],
      quoteDraft: null,
      quoteApproved: false,
    },
  };
}
