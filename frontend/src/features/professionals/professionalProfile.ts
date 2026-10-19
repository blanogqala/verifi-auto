import { directoryEntries } from '../admin/applicationRecords';
import { providers } from '../../data/professionals';
import { emptyLocation, formatPlace } from './geo';

export function safeWebsite(value: unknown) {
  if (typeof value !== 'string' || !value.trim()) return '';
  try {
    const url = new URL(value.trim());
    if (url.protocol !== 'https:') return '';
    return url.href;
  } catch {
    return '';
  }
}

function text(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

/** Public profile view. Missing and unlisted professionals stay explicit. */
export function resolveProfessional(id: string, data: any) {
  const provider = providers.find((item) => item.id === id);
  const ownId = text(data?.profile?.id) || 'pro-own';
  const own = ownId === id ? data?.profile : null;
  if (!provider && !own) return { state: 'missing' as const };
  const listed = directoryEntries(providers, data).find((item) => item.id === id);
  const name = text(own?.name) || provider?.name || '';
  const review = (Array.isArray(data?.reviews) ? data.reviews : []).find(
    (item: any) => item?.professionalId === id || item?.name === name,
  );
  const applicationStatus =
    own && data?.application?.status && data.application.status !== 'Draft'
      ? data.application.status
      : review?.status || listed?.applicationStatus || '';
  if (!listed) return { state: 'unavailable' as const, name, applicationStatus };
  const services = Array.isArray(listed.services) && listed.services.length
    ? listed.services
    : String(listed.special || provider?.special || '')
        .split('·')
        .map((item) => item.trim())
        .filter(Boolean);
  return {
    state: 'listed' as const,
    profile: {
      id,
      name: listed.name || name,
      individualName: text(listed.individualName),
      type: listed.type || provider?.type || '',
      area: listed.area || provider?.area || '',
      services,
      fee: listed.fee ?? provider?.fee,
      location: listed.location || provider?.location || emptyLocation(),
      place: formatPlace(listed.location || provider?.location, listed.area || provider?.area || ''),
      phone: text(listed.phone),
      email: text(listed.email),
      website: safeWebsite(listed.website),
      bio: text(listed.bio),
      photo: text(listed.photo),
      applicationStatus: text(listed.applicationStatus) || applicationStatus,
      sample: listed.own !== true,
    },
  };
}

export function verificationCopy(profile: { sample?: boolean; applicationStatus?: string }) {
  const status = profile.applicationStatus || '';
  if (status === 'Approved')
    return 'Demo application status: Approved. This is sample review data, not a live credential.';
  if (status === 'Suspended')
    return 'Demo application status: Suspended. This profile is not available to book.';
  if (status)
    return `Demo application status: ${status}. This is sample review data, not a live credential.`;
  return profile.sample
    ? 'Sample profile. Verification checks have not been recorded for this fictional professional.'
    : 'Verification checks have not been recorded.';
}
