import { Star } from 'lucide-react';

export function ReviewStars({ rating, count, compact = false }: {
  rating: number | null | undefined; count?: number; compact?: boolean;
}) {
  const score = Number(rating);
  if (!Number.isFinite(score) || score < 1 || score > 5) return null;
  return (
    <span className={'review-rating-inline' + (compact ? ' is-compact' : '')}
      aria-label={score.toFixed(1) + ' out of 5 stars' + (count != null ? ' from ' + count + ' reviews' : '')}>
      <Star size={compact ? 14 : 17} fill="currentColor" aria-hidden="true"/>
      <strong>{score.toFixed(1)}</strong>
      <span className="review-rating-max" aria-hidden="true">/ 5</span>
      {count != null && <span className="review-rating-count">{count} {count === 1 ? 'review' : 'reviews'}</span>}
    </span>
  );
}

export function reviewForBooking(data: any, bookingId: string) {
  const job = (data?.jobs || []).find((item: any) => item.id === bookingId);
  if (!job || job.status !== 'Completed') return null;
  const review = (data?.customerReviews || []).find((item: any) =>
    item.bookingId === bookingId && item.professionalId === job.professionalId);
  return review || null;
}

export function reviewerName(data: any, review: any) {
  if (typeof review.customerName === 'string' && review.customerName.trim()) return review.customerName.trim();
  const job = (data?.jobs || []).find((item: any) => item.id === review.bookingId);
  if (job?.customerName) return job.customerName;
  const customer = (data?.customers || []).find((item: any) => item.id === review.customerId);
  if (customer?.name) return customer.name;
  if (data.settings?.id === review.customerId) return data.settings.name || 'Customer';
  return 'Customer';
}
