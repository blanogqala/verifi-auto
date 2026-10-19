export const legacyPricingModel = 'legacy-separate-fee';
export const inclusivePricingModel = 'quotation-inclusive';

export const chargeConfirmation = 'Charges are confirmed in your quotation before approval.';

function quoted(job: any) {
  return (
    (Array.isArray(job?.items) && job.items.length > 0) ||
    job?.paid === true ||
    job?.quoteApproved === true ||
    (Array.isArray(job?.quoteVersions) && job.quoteVersions.length > 0)
  );
}

/** Explicit model when stored. Older quoted records stay on the separate-fee record. */
export function pricingModelOf(job: any) {
  if (job?.pricingModel === inclusivePricingModel || job?.pricingModel === legacyPricingModel) return job.pricingModel;
  return quoted(job) ? legacyPricingModel : inclusivePricingModel;
}

export function assignPricingModel(job: any) {
  if (!job || typeof job !== 'object') return job;
  if (job.pricingModel === inclusivePricingModel || job.pricingModel === legacyPricingModel) return job;
  return { ...job, pricingModel: pricingModelOf(job) };
}

export function legacyAssessmentFee(job: any) {
  if (pricingModelOf(job) !== legacyPricingModel) return null;
  const fee = Number(job?.fee);
  if (!Number.isFinite(fee) || fee <= 0) return null;
  return fee;
}

export function pricingNote(job: any) {
  const fee = legacyAssessmentFee(job);
  if (fee != null && quoted(job)) {
    return `Earlier pricing record. Stored assessment fee R${fee.toLocaleString('en-ZA')} was not added to this quotation total.`;
  }
  return chargeConfirmation;
}
