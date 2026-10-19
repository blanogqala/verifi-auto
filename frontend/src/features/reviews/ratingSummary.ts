import { customerReviewsOf } from './customerReviews';

export type RatingSummary = {
  average: number | null;
  count: number;
  label: string;
  accessible: string;
};

function integerRating(value: unknown) {
  const rating = Number(value);
  return Number.isInteger(rating) && rating >= 1 && rating <= 5 ? rating : null;
}

/** Reviews that belong to a completed, paid booking for the same professional. */
export function eligibleCustomerReviews(data: any, professionalId: string) {
  if (!professionalId) return [];
  const jobs = Array.isArray(data?.jobs) ? data.jobs : [];
  const seen = new Set<string>();
  return customerReviewsOf(data).filter((review: any) => {
    if (!review || review.professionalId !== professionalId) return false;
    if (integerRating(review.rating) == null) return false;
    const id = typeof review.id === 'string' ? review.id : '';
    if (!id || seen.has(id)) return false;
    const job = jobs.find((item: any) => item?.id === review.bookingId);
    if (!job || job.professionalId !== professionalId) return false;
    if (job.status !== 'Completed' || job.paid !== true) return false;
    if (review.customerId && job.customerId && review.customerId !== job.customerId) return false;
    seen.add(id);
    return true;
  });
}

export function ratingSummary(data: any, professionalId: string): RatingSummary {
  const reviews = eligibleCustomerReviews(data, professionalId);
  if (!reviews.length) {
    return { average: null, count: 0, label: 'No reviews yet', accessible: 'No reviews yet' };
  }
  const total = reviews.reduce((sum: number, review: any) => sum + Number(review.rating), 0);
  const average = Math.round((total / reviews.length) * 10) / 10;
  const shown = average.toFixed(1);
  const noun = reviews.length === 1 ? 'review' : 'reviews';
  return {
    average,
    count: reviews.length,
    label: `${shown} / 5 · ${reviews.length} ${noun}`,
    accessible: `${shown} out of 5 from ${reviews.length} ${noun}`,
  };
}

export const emptyRating: RatingSummary = {
  average: null,
  count: 0,
  label: 'No reviews yet',
  accessible: 'No reviews yet',
};
