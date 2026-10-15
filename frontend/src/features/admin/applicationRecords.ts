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

/** Public directory rule: only currently approved profiles are listed. */
export function directoryEntries(providers: any[], data: any) {
  const reviews = Array.isArray(data?.reviews) ? data.reviews : [];
  const listed = (Array.isArray(providers) ? providers : []).filter(
    (provider) => !reviews.some((item: any) => item?.name === provider?.name && item?.status !== 'Approved'),
  );
  if (data?.application?.status === 'Approved' && data?.profile) {
    listed.push({
      name: data.profile.name,
      type: data.profile.type,
      area: data.profile.city,
      special: (data.profile.services || []).join(' · '),
      fee: data.profile.fee,
    });
  }
  return listed;
}
