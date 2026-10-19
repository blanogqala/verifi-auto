import type { RatingSummary } from '../../features/reviews/ratingSummary';

export function RatingLine({ summary }: { summary: RatingSummary }) {
  if (!summary.count || summary.average == null) {
    return <p className="rating-line">No reviews yet</p>;
  }
  const width = Math.max(0, Math.min(100, (summary.average / 5) * 100));
  return (
    <p className="rating-line">
      <span className="rating-stars" aria-hidden="true">
        <span className="rating-stars-base">★★★★★</span>
        <span className="rating-stars-fill" style={{ width: `${width}%` }}>
          ★★★★★
        </span>
      </span>
      <span aria-hidden="true">{summary.label}</span>
      <span className="visually-hidden">{summary.accessible}</span>
    </p>
  );
}
