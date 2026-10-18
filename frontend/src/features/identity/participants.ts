import { demoCustomerId } from '../admin/customerRecords';
import { professionalOptions, textValue } from '../demo/links';

/** Stable id for a mechanic account that is not yet linked to a listed workshop. */
export const unassignedMechanicId = 'pro-own';

export type ParticipantRole = 'customer' | 'mechanic' | 'admin';

export type Actor = {
  role: ParticipantRole;
  id: string;
};

export function customerIdOf(data: any) {
  return textValue(data?.settings?.id) || demoCustomerId;
}

/**
 * The signed-in mechanic is one professional, not every workshop in the demo.
 * A saved id is kept. Otherwise only a unique profile id or unique business name is used.
 */
export function activeMechanicProfessionalId(data: any) {
  const account = data?.mechanicAccount || data?.merchantAccount || {};
  const stored = textValue(account.professionalId);
  if (stored) return stored;
  const profileId = textValue(data?.profile?.id);
  if (profileId) return profileId;
  const name = textValue(data?.profile?.name);
  const unique = [
    ...new Set(
      professionalOptions(data)
        .filter((option) => option.name === name)
        .map((option) => option.id),
    ),
  ];
  if (unique.length === 1) return unique[0];
  return unassignedMechanicId;
}

/** Link a job to a workshop only when the saved decision or the provider name is unambiguous. */
export function jobProfessionalId(job: any, data: any) {
  if (!job || typeof job !== 'object') return '';
  const link = job.professionalLink;
  if (link === 'ambiguous' || link === 'unmatched') return '';
  const stored = textValue(job.professionalId);
  if (stored) return stored;
  if (link === 'resolved') return '';
  const provider = textValue(job.provider);
  const unique = [
    ...new Set(
      professionalOptions(data)
        .filter((option) => option.name === provider)
        .map((option) => option.id),
    ),
  ];
  return unique.length === 1 ? unique[0] : '';
}

export function mechanicOwnsJob(data: any, job: any) {
  const professionalId = jobProfessionalId(job, data);
  return !!professionalId && professionalId === activeMechanicProfessionalId(data);
}

export function customerOwnsJob(data: any, job: any, customerId = customerIdOf(data)) {
  const owner = textValue(job?.customerId) || demoCustomerId;
  return owner === customerId;
}

export function jobsForMechanic(jobs: any[], data: any) {
  return (Array.isArray(jobs) ? jobs : []).filter((job) => mechanicOwnsJob(data, job));
}

export function participantId(data: any, role: string) {
  if (role === 'customer') return customerIdOf(data);
  if (role === 'mechanic') return activeMechanicProfessionalId(data);
  if (role === 'admin') return 'admin';
  return '';
}
