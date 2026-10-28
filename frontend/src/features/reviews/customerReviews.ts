import { appendNotification } from '../notifications/inbox';
import { photoFileError } from '../account/profilePhoto';

const demoCustomerId = 'cust-01';

function text(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

export function customerReviewsOf(data: any) {
  return Array.isArray(data?.customerReviews) ? data.customerReviews : [];
}

export function reviewsForProfessional(data: any, professionalId: string) {
  return customerReviewsOf(data).filter((review: any) => review?.professionalId === professionalId);
}

export function eligibleReviewBookings(data: any, customerId: string, professionalId: string) {
  return (data.jobs || []).filter((job: any) => {
    const owner = text(job?.customerId) || demoCustomerId;
    return (
      owner === customerId &&
      job.professionalId === professionalId &&
      job.status === 'Completed' &&
      job.paid === true
    );
  });
}

function photoListError(photos: string[]) {
  if (photos.length > 3) return 'Attach up to 3 photos.';
  for (const photo of photos) {
    if (typeof photo !== 'string' || !photo.startsWith('data:image/jpeg'))
      return 'Review photos must be prepared images.';
    if (photo.length > 120000) return 'One of the photos is too large for this browser preview.';
  }
  return '';
}

export function reviewPhotoError(file: { type?: string; size?: number } | null) {
  return photoFileError(file);
}

export function saveCustomerReview(
  data: any,
  input: {
    customerId: string;
    professionalId: string;
    bookingId: string;
    rating: number;
    text: string;
    photos?: string[];
    reviewId?: string;
    now?: string;
  },
) {
  const rating = Number(input.rating);
  const body = text(input.text);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw Error('Choose a rating from 1 to 5.');
  if (body.length < 8) throw Error('Add a short review of at least 8 characters.');
  if (body.length > 1000) throw Error('Keep the review under 1000 characters.');
  const photos = input.photos || [];
  const photoError = photoListError(photos);
  if (photoError) throw Error(photoError);
  const eligible = eligibleReviewBookings(data, input.customerId, input.professionalId);
  if (!eligible.some((job: any) => job.id === input.bookingId))
    throw Error('A review can only be added for your own completed booking with this professional.');
  const reviews = customerReviewsOf(data);
  const existingForBooking = reviews.find((review: any) => review.bookingId === input.bookingId);
  if (existingForBooking && existingForBooking.id !== input.reviewId)
    throw Error('This booking already has a review.');
  if (input.reviewId) {
    const own = reviews.find((review: any) => review.id === input.reviewId);
    if (!own) throw Error('Review not found.');
    if (own.customerId !== input.customerId) throw Error('You can only edit your own review.');
  }
  const now = input.now || new Date().toISOString();
  const next = {
    id: input.reviewId || `review-${input.bookingId}`,
    bookingId: input.bookingId,
    customerId: input.customerId,
    professionalId: input.professionalId,
    rating,
    text: body,
    photos,
    createdAt: existingForBooking?.createdAt || now,
    updatedAt: now,
  };
  const changed = !existingForBooking || existingForBooking.rating !== rating || existingForBooking.text !== body;
  const saved = {
    ...data,
    customerReviews: [next, ...reviews.filter((review: any) => review.id !== next.id && review.bookingId !== input.bookingId)],
  };
  if (!changed) return saved;
  return appendNotification(saved, {
    recipientRole: 'mechanic',
    recipientId: input.professionalId,
    type: 'review',
    title: existingForBooking ? 'Customer updated their review' : 'New customer review',
    message: `${rating}/5 stars for your completed booking. Open the job to see the feedback.`,
    bookingId: input.bookingId,
    panel: 'overview',
    createdAt: now,
    eventKey: `review:${input.bookingId}:${now}`,
  });
}

export function deleteCustomerReview(data: any, reviewId: string, customerId: string) {
  const reviews = customerReviewsOf(data);
  const review = reviews.find((item: any) => item.id === reviewId);
  if (!review) throw Error('Review not found.');
  if (review.customerId !== customerId) throw Error('You can only delete your own review.');
  return { ...data, customerReviews: reviews.filter((item: any) => item.id !== reviewId) };
}
