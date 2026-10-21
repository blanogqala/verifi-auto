/** The original quotation stays on the booking for backwards-compatible demo data. */
export const primaryQuoteId = 'primary';

export function bookingQuotations(job: any): any[] {
  if (job?.bookingId && job?.quoteId) return [job];
  const primary = { ...job, bookingId: job.id, quoteId: primaryQuoteId, quoteNumber: 1 };
  return [
    primary,
    ...(Array.isArray(job.additionalQuotes) ? job.additionalQuotes : []).map(
      (quote: any, index: number) => ({
        ...job,
        ...quote,
        id: `${job.id}:quote:${quote.quoteId}`,
        bookingId: job.id,
        quoteNumber: index + 2,
        additionalQuotes: undefined,
      }),
    ),
  ];
}

export function canAddQuotation(job: any) {
  return ['Approved', 'In progress'].includes(job.status) && job.quoteApproved === true;
}

export function newQuotation(job: any, quoteId: string) {
  return {
    ...job,
    id: `${job.id}:quote:${quoteId}`,
    bookingId: job.id,
    quoteId,
    quoteNumber: (job.additionalQuotes?.length || 0) + 2,
    status: 'Confirmed',
    items: [],
    notes: '',
    quoteVersion: 0,
    quoteVersions: [],
    quoteDraft: null,
    quoteApproved: false,
    approvedQuoteVersion: null,
    paid: false,
    paidAt: '',
    paymentReference: '',
    customerRequest: '',
    changeRequest: '',
    events: [],
    additionalQuotes: undefined,
  };
}

export function quoteCanEdit(quote: any) {
  return (
    !quote.paid &&
    (['Confirmed', 'Awaiting approval', 'Changes requested'].includes(quote.status) ||
      (quote.status === 'Approved' && !!quote.customerRequest))
  );
}

export function quoteCanPay(quote: any) {
  return (
    !quote.paid &&
    quote.quoteApproved &&
    ['Approved', 'In progress', 'Awaiting payment'].includes(quote.status)
  );
}

export function allApprovedQuotesPaid(job: any) {
  return bookingQuotations(job)
    .filter((quote) => quote.quoteApproved)
    .every((quote) => quote.paid);
}

/** Store only quote-owned fields; never copy customer/vehicle identity from a projected card. */
export function storedQuotation(quote: any) {
  const fields = [
    'quoteId',
    'status',
    'items',
    'notes',
    'quoteVersion',
    'quoteVersions',
    'quoteDraft',
    'quoteApproved',
    'approvedQuoteVersion',
    'paid',
    'paidAt',
    'paymentReference',
    'customerRequest',
    'changeRequest',
    'events',
  ];
  return Object.fromEntries(fields.map((key) => [key, quote[key]]));
}
