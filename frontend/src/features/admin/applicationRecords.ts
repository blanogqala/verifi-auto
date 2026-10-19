import { areaCentreLocation, demoAreaById, demoAreaByLabel } from '../../data/demoAreas';
import { emptyLocation } from '../professionals/geo';

/** View helpers for the same application records. Approval never copies or deletes them. */

export function decideApplication(record: any, status: string, note: string) {
  return {
    ...record,
    status,
    note,
    previouslyApproved:
      status === 'Approved' || status === 'Suspended' || record?.previouslyApproved === true,
  };
}

export function rememberApproval(record: any) {
  if (!record || typeof record !== 'object') return record;
  const previouslyApproved =
    record.previouslyApproved === true ||
    record.status === 'Approved' ||
    record.status === 'Suspended';
  return { ...record, previouslyApproved };
}

export function isPendingApplication(record: any) {
  return record?.status === 'Pending review';
}

/** Approved profiles, plus profiles suspended after an earlier approval. */
export function isManagedProfessional(record: any) {
  if (!record) return false;
  if (record.status === 'Approved') return true;
  return record.status === 'Suspended' && record.previouslyApproved === true;
}

export function isReviewHistory(record: any) {
  return record?.status === 'Rejected' || record?.status === 'Changes requested';
}

export function contactLine(record: any) {
  const parts = [record?.phone, record?.email].filter(
    (value) => typeof value === 'string' && value.trim(),
  );
  return parts.length ? parts.join(' · ') : 'Not recorded';
}

/** One list for admin views. The mechanic application and sample reviews stay where they are stored. */
export function applicationRecords(data: any) {
  const profile = data?.profile || {};
  const application = data?.application;
  const own =
    application && application.status && application.status !== 'Draft'
      ? [
          {
            ...rememberApproval(application),
            id: 'my-application',
            name: profile.name || '',
            type: profile.type || '',
            city: profile.city || '',
            phone: typeof profile.phone === 'string' ? profile.phone : '',
            email: typeof data?.mechanicAccount?.email === 'string' ? data.mechanicAccount.email : '',
            date: application.submittedAt || '',
            own: true,
          },
        ]
      : [];
  const reviews = (Array.isArray(data?.reviews) ? data.reviews : []).map((item: any) => ({
    ...rememberApproval(item),
    own: item?.own === true,
    phone: typeof item?.phone === 'string' ? item.phone : '',
    email: typeof item?.email === 'string' ? item.email : '',
  }));
  return [...own, ...reviews];
}

function blocksDirectory(provider: any, reviews: any[]) {
  return reviews.some((item: any) => {
    const same = item?.professionalId
      ? item.professionalId === provider?.id
      : item?.name === provider?.name;
    return same && item?.status !== 'Approved';
  });
}

function ownLocation(profile: any) {
  if (profile?.location && typeof profile.location === 'object') return profile.location;
  const area = demoAreaById(typeof profile?.areaId === 'string' ? profile.areaId : '') || demoAreaByLabel(typeof profile?.city === 'string' ? profile.city : '');
  if (!area) return emptyLocation({ city: typeof profile?.city === 'string' ? profile.city : '', suburb: typeof profile?.city === 'string' ? profile.city : '' });
  const mobile = profile?.type === 'Mobile mechanic';
  const location = areaCentreLocation(area, mobile ? 'service-area' : 'area-centre');
  const radius = Number(profile?.serviceRadiusKm);
  if (mobile && Number.isFinite(radius) && radius > 0) location.serviceRadiusKm = radius;
  return location;
}

/** Public directory rule: only currently approved profiles are listed. */
export function directoryEntries(providers: any[], data: any) {
  const reviews = Array.isArray(data?.reviews) ? data.reviews : [];
  const listed = (Array.isArray(providers) ? providers : []).filter(
    (provider) => !blocksDirectory(provider, reviews),
  );
  if (data?.application?.status === 'Approved' && data?.profile) {
    const profile = data.profile;
    listed.push({
      id: typeof profile.id === 'string' && profile.id ? profile.id : 'pro-own',
      name: profile.name,
      individualName: profile.individualName || '',
      type: profile.type,
      area: profile.city,
      special: (profile.services || []).join(' · '),
      services: profile.services || [],
      fee: profile.fee,
      location: ownLocation(profile),
      sample: false,
      phone: typeof profile.phone === 'string' ? profile.phone : '',
      email: typeof data?.mechanicAccount?.email === 'string' ? data.mechanicAccount.email : '',
      website: typeof profile.website === 'string' ? profile.website : '',
      bio: typeof profile.bio === 'string' ? profile.bio : '',
      photo: typeof profile.photo === 'string' ? profile.photo : '',
      applicationStatus: 'Approved',
      own: true,
    });
  }
  return listed;
}
