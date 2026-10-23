import { api } from './api';
import { appointmentStamp, quoteLines } from './map';

const unavailable =
  'This action is not available from the server yet. Nothing was saved.';

function same(left: unknown, right: unknown) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function byId(rows: any[]) {
  return new Map((rows || []).map((row) => [row.id, row]));
}

function vehicleBody(vehicle: any) {
  return {
    make: vehicle.make,
    model: vehicle.model,
    year: Number(vehicle.year),
    variant: vehicle.variant || '',
    registration: vehicle.registration,
    mileage: Number(vehicle.mileage || 0),
    bodyStyle: vehicle.bodyStyle || '',
    paintColorName: vehicle.paintColorName || '',
    paintColor: vehicle.paintColor || '',
    licenceDiscExpiry: vehicle.licenceDiscExpiry || null,
    nextServiceDate: vehicle.nextServiceDate || null,
    nextServiceMileage:
      vehicle.nextServiceMileage === '' || vehicle.nextServiceMileage == null
        ? null
        : Number(vehicle.nextServiceMileage),
  };
}

async function bookingAction(job: any, action: string, extra: Record<string, unknown> = {}) {
  await api(`/bookings/${job.id}/actions`, 'POST', {
    action,
    version: job.version,
    ...extra,
  });
}

async function quoteAction(job: any, quote: any, action: string, extra: Record<string, unknown> = {}) {
  const quoteId = quote.serverQuoteId || quote.quoteId;
  await api(`/bookings/${job.id}/quotes/${quoteId}/actions`, 'POST', {
    action,
    version: quote.quoteVersion,
    ...extra,
  });
}

async function saveQuote(job: any, before: any, after: any, send: boolean) {
  const items = send ? after.items : after.quoteDraft?.items || after.items;
  const notes = send ? after.notes : after.quoteDraft?.notes || after.notes;
  const body = {
    notes,
    lines: quoteLines(items),
    send,
    clientRequestId: crypto.randomUUID(),
  };
  const quoteId = before?.serverQuoteId;
  if (quoteId) await api(`/bookings/${job.id}/quotes/${quoteId}`, 'PUT', { ...body, version: before.quoteVersion });
  else await api(`/bookings/${job.id}/quotes`, 'POST', body);
}

function selectedLineIds(quote: any) {
  const ids = (quote.items || [])
    .filter((item: any) => item.approved !== false)
    .map((item: any) => item.id)
    .filter((id: string) => typeof id === 'string' && id.includes('-'));
  if (!ids.length) throw Error('Select repairs from this quotation.');
  return ids;
}

async function syncQuote(job: any, before: any, after: any) {
  if (before?.paid !== true && after?.paid === true)
    throw Error('Online card payments are not available until a payment provider is connected.');
  if (!before?.serverQuoteId && !after?.items?.length && !after?.quoteDraft) return;
  const draftChanged = !same(before?.quoteDraft, after?.quoteDraft);
  const sentChanged = !same(before?.items, after?.items) || before?.notes !== after?.notes;
  if (after.status === 'Withdrawn' && before?.status !== 'Withdrawn') {
    await quoteAction(job, before, 'withdraw');
    return;
  }
  if (after.status === 'Approved' && before?.status !== 'Approved') {
    await quoteAction(job, before, 'approve', { selectedLineIds: selectedLineIds(after) });
    return;
  }
  if (after.status === 'Changes requested' && before?.status !== 'Changes requested') {
    await quoteAction(job, before, 'changes', {
      request: after.changeRequest || after.customerRequest || '',
    });
    return;
  }
  if (after.status === 'In progress' && before?.quoteId && before.quoteId !== 'primary' && before.status === 'Approved') {
    await quoteAction(job, before, 'start');
    return;
  }
  if (after.status === 'Awaiting approval' && (sentChanged || before?.status !== 'Awaiting approval')) {
    await saveQuote(job, before, after, true);
    return;
  }
  if (draftChanged) await saveQuote(job, before, after, false);
}

async function syncJob(before: any, after: any) {
  if (!before) {
    await api('/bookings', 'POST', {
      vehicleId: after.vehicleId,
      professionalId: after.professionalId,
      appointmentAt: appointmentStamp(after.date, after.time),
      description: after.description,
      clientRequestId: after.clientRequestId,
    });
    return;
  }
  if (before.paid !== true && after.paid === true)
    throw Error('Online card payments are not available until a payment provider is connected.');
  const appointmentChanged =
    before.date !== after.date ||
    before.time !== after.time ||
    before.description !== after.description ||
    before.vehicleId !== after.vehicleId;
  if (appointmentChanged && before.status === 'Requested' && after.status === 'Requested')
    throw Error('A booking cannot be edited after it has been sent. Create a new request instead.');
  if (before.status === 'Requested' && after.status === 'Confirmed') {
    await bookingAction(before, 'accept');
    return;
  }
  if (before.status === 'Requested' && after.status === 'Rejected') {
    await bookingAction(before, 'reject', { reason: after.rejectionReason });
    return;
  }
  if (before.status !== 'Cancelled' && after.status === 'Cancelled') {
    await bookingAction(before, 'cancel');
    return;
  }
  if (before.status === 'Approved' && after.status === 'In progress') {
    await bookingAction(before, 'start');
    return;
  }
  if (before.status === 'In progress' && ['Awaiting payment', 'Completed'].includes(after.status)) {
    await bookingAction(before, 'complete', { completionNotes: after.completionNotes });
    return;
  }
  await syncQuote(before, before, after);
  const previousQuotes = new Map((before.additionalQuotes || []).map((quote: any) => [quote.quoteId, quote]));
  for (const quote of after.additionalQuotes || []) {
    const prior = previousQuotes.get(quote.quoteId);
    if (!prior || !same(prior, quote)) await syncQuote(before, prior, { ...before, ...quote, id: before.id });
  }
}

async function syncVehicles(before: any[], after: any[]) {
  const previous = byId(before);
  const next = byId(after);
  for (const vehicle of after) {
    const prior = previous.get(vehicle.id);
    if (!prior) {
      await api('/vehicles', 'POST', vehicleBody(vehicle));
      continue;
    }
    if (vehicle.archived && !prior.archived) {
      await api('/vehicles/' + vehicle.id, 'DELETE');
      continue;
    }
    if (!same(vehicleBody(prior), vehicleBody(vehicle)))
      await api('/vehicles/' + vehicle.id, 'PATCH', { ...vehicleBody(vehicle), version: prior.version });
  }
  for (const vehicle of before) {
    if (!next.has(vehicle.id) && !vehicle.archived) await api('/vehicles/' + vehicle.id, 'DELETE');
  }
}

function profileBody(profile: any) {
  return {
    name: profile.name,
    type: profile.type,
    city: profile.city,
    address: profile.address || '',
    about: profile.bio || profile.about || '',
    services: profile.services || [],
    serviceAreas: Array.isArray(profile.serviceAreas) && profile.serviceAreas.length
      ? profile.serviceAreas : profile.city ? [profile.city] : [],
    phone: profile.phone,
    website: profile.website || '',
    latitude: profile.latitude ?? null,
    longitude: profile.longitude ?? null,
  };
}

/** Translate a demo-shaped mutation into existing API calls. Refuses actions the server cannot perform. */
export async function persistDifference(before: any, after: any) {
  if (before?.settings?.email !== after?.settings?.email)
    throw Error('Email changes are not available yet. Your verified email stays as it is.');
  if (!same(before?.platform, after?.platform))
    throw Error('Platform settings are managed by the server environment.');
  if (!same(before?.mechanicBanking, after?.mechanicBanking))
    throw Error('Payout onboarding is not connected yet. Bank details were not saved.');
  if (!same(before?.reports, after?.reports) || !same(before?.disputes, after?.disputes))
    throw Error(unavailable);
  if (!same(before?.records, after?.records))
    throw Error('Service records are created when a job is completed. Unmatched history cannot be attached here.');
  const accountChanged =
    before?.settings?.name !== after?.settings?.name ||
    before?.settings?.phone !== after?.settings?.phone ||
    before?.settings?.emailUpdates !== after?.settings?.emailUpdates ||
    before?.settings?.photo !== after?.settings?.photo;
  if (accountChanged) {
    await api('/auth/profile', 'PATCH', {
      name: after.settings.name,
      phone: after.settings.phone || '',
      emailUpdates: Boolean(after.settings.emailUpdates),
      ...(before.settings.photo !== after.settings.photo ? { photo: after.settings.photo || '' } : {}),
    });
  }
  if (!same(profileBody(before.profile), profileBody(after.profile))) {
    await api('/professional/me', 'PATCH', {
      ...profileBody(after.profile),
      version: before.profile.version,
    });
  }
  if (before.application?.status !== after.application?.status && after.application?.status === 'Pending review')
    await api('/professional/me/submit', 'POST', {});
  if (before.adminAccount?.name !== after.adminAccount?.name && after.adminAccount?.name) {
    await api('/auth/profile', 'PATCH', {
      name: after.adminAccount.name,
      phone: after.settings?.phone || '',
      photo: after.settings?.photo || '',
    });
  }
  const previousDocuments = new Set((before.documents || []).map((doc: any) => doc.id));
  for (const doc of before.documents || []) {
    if (!(after.documents || []).some((item: any) => item.id === doc.id))
      await api('/documents/' + doc.id, 'DELETE');
  }
  if ((after.documents || []).some((doc: any) => !previousDocuments.has(doc.id)))
    throw Error('Choose the document again so it can be uploaded to the server.');
  await syncVehicles(before.vehicles || [], after.vehicles || []);
  const previousJobs = byId(before.jobs || []);
  for (const job of after.jobs || []) await syncJob(previousJobs.get(job.id), job);
  const previousMessages = new Set((before.messages || []).map((message: any) => message.id));
  for (const message of after.messages || []) {
    if (previousMessages.has(message.id)) continue;
    await api(`/bookings/${message.bookingId}/messages`, 'POST', {
      body: message.body,
      clientRequestId: message.clientMessageId || crypto.randomUUID(),
    });
  }
  const readIds = (after.notifications || [])
    .filter((note: any) => note.read && !(before.notifications || []).find((item: any) => item.id === note.id && item.read))
    .map((note: any) => note.id);
  if (readIds.length) await api('/notifications/read', 'POST', { ids: readIds });
  const previousGrants = new Map((before.historyAccess || []).map((grant: any) => [grant.bookingId, grant]));
  for (const grant of after.historyAccess || []) {
    const prior = previousGrants.get(grant.bookingId) as any;
    if (prior && prior.status === grant.status && same(prior.recordIds, grant.recordIds)) continue;
    await api(`/bookings/${grant.bookingId}/history-access`, 'PUT', {
      grant: grant.status === 'active',
      recordIds: grant.recordIds || [],
    });
  }
  const previousReviews = new Map((before.customerReviews || []).map((review: any) => [review.bookingId, review]));
  for (const review of after.customerReviews || []) {
    const prior = previousReviews.get(review.bookingId);
    if (prior && same(prior, review)) continue;
    if (Array.isArray(review.photos) && review.photos.length)
      throw Error('Review photos are not stored by the server. Submit the rating and written review without photos.');
    await api(`/bookings/${review.bookingId}/review`, 'PUT', {
      rating: review.rating,
      body: review.text || review.body || '',
    });
  }
  for (const review of before.customerReviews || []) {
    if (!(after.customerReviews || []).some((item: any) => item.bookingId === review.bookingId))
      await api(`/bookings/${review.bookingId}/review`, 'DELETE');
  }
  const previousApplications = byId(before.reviews || []);
  for (const application of after.reviews || []) {
    const prior = previousApplications.get(application.id);
    if (!prior || prior.status === application.status) continue;
    const status =
      application.status === 'Approved'
        ? 'APPROVED'
        : application.status === 'Changes requested'
          ? 'CHANGES_REQUESTED'
          : application.status === 'Suspended'
            ? 'SUSPENDED'
            : '';
    if (!status) throw Error('Applications can be approved, returned for changes, or suspended. Rejection is not available.');
    await api(`/admin/professionals/${application.id}/review`, 'POST', {
      status,
      note: application.note,
      version: prior.version,
    });
  }
}
