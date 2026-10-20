import { bookingReference } from '../../features/jobs/jobViews';
import { categoryLabel, formatZar, lineAmountCents, quoteTotalCents } from '../jobs/quotations';
import { pricingNote } from '../jobs/pricingModel';

function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Printable demo invoice or receipt. Amounts follow the stored quotation and are not rewritten. */
export function demoDocumentHtml(job: any, kind: 'invoice' | 'receipt') {
  const lines = (job.items || []).filter((item: any) => item.approved !== false)
    .map((item: any) => {
      const label = categoryLabel(item.category || item.kind);
      const name = label ? `${label}: ${item.name}` : item.name;
      return `<tr><td>${escapeHtml(name)}</td><td>${escapeHtml(formatZar(lineAmountCents(item)))}</td></tr>`;
    })
    .join('');
  const total = quoteTotalCents(job.items || []);
  const title = kind === 'receipt' ? 'Demo receipt' : 'Demo invoice';
  const stamp =
    job.paid
      ? `${escapeHtml(job.paymentReference || 'Reference not recorded')} · ${escapeHtml(job.paidAt || 'Date not recorded')}`
      : 'Payment has not been recorded';
  const reference = bookingReference(job);
  return `<!doctype html><html><head><meta charset="utf-8"><title>${title} ${escapeHtml(reference)}</title>
<style>body{font-family:Georgia,serif;margin:0;color:#221536}header{background:#9658e8;color:#fff;padding:20px 28px}main{padding:28px}table{width:100%;border-collapse:collapse}td{padding:8px 0;border-bottom:1px solid #ddd}button{margin-top:24px}</style></head>
<body><header><strong>${title}</strong><p>Demo document. Not issued by a bank and not proof of payment.</p></header>
<main><p>${escapeHtml(reference)}<br>${escapeHtml(job.provider)}<br>${escapeHtml(job.vehicle)}</p>
<table>${lines}</table><p><strong>Quotation total ${escapeHtml(formatZar(total))}</strong></p><p>${escapeHtml(pricingNote(job))}</p><p>${stamp}</p><button type="button" onclick="print()">Print</button></main></body></html>`;
}

export function openDemoDocument(html: string, filename: string) {
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const opened = window.open(url, '_blank', 'noopener,noreferrer');
  if (!opened) {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
  }
  window.setTimeout(() => URL.revokeObjectURL(url), 60000);
}
