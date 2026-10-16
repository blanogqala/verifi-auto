import { rememberApproval } from '../features/admin/applicationRecords';
import { demoCustomerId } from '../features/admin/customerRecords';
import { professionalOptions, withRecordLinks } from '../features/demo/links';
import { migrateJob } from '../features/jobs/jobViews';
import { initialData } from './fixtures';

function accountFrom(value: any, fallback: any) {
  if (!value || typeof value !== 'object') return { ...fallback };
  return {
    name: typeof value.name === 'string' ? value.name : fallback.name,
    email: typeof value.email === 'string' ? value.email : fallback.email,
    emailUpdates:
      typeof value.emailUpdates === 'boolean' ? value.emailUpdates : fallback.emailUpdates,
  };
}

function text(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeAdminAccount(value: any) {
  const fallback = initialData.adminAccount;
  if (!value || typeof value !== 'object') return { ...fallback };
  return {
    name: typeof value.name === 'string' ? value.name : fallback.name,
    email: typeof value.email === 'string' ? value.email : fallback.email,
  };
}

function normalizeCustomers(base: any) {
  const settings = base.settings && typeof base.settings === 'object' ? base.settings : {};
  const linkedId = text(settings.id) || demoCustomerId;
  const source = Array.isArray(base.customers) ? base.customers : [];
  const existing = source.find((item: any) => item && item.id === linkedId);
  const settingsName = text(settings.name);
  const existingName = text(existing?.name);
  const settingsEmail = text(settings.email);
  const existingEmail = text(existing?.email);
  const linked = {
    id: linkedId,
    name: settingsName || existingName || initialData.customers[0].name,
    email: settingsEmail || existingEmail || initialData.customers[0].email,
    city: text(settings.city) || text(existing?.city) || initialData.customers[0].city,
    phone: text(settings.phone) || text(existing?.phone),
    sample: true,
  };
  const others = source
    .filter((item: any) => item && typeof item.id === 'string' && item.id && item.id !== linkedId)
    .map((item: any) => ({
      id: item.id,
      name: text(item.name),
      email: text(item.email),
      city: text(item.city),
      phone: text(item.phone),
      sample: item.sample !== false,
    }))
    .filter((item: any) => item.name || item.email);
  return [linked, ...others];
}

function normalizeSettings(base: any, linkedId: string) {
  if (!base.settings || typeof base.settings !== 'object') {
    return { ...initialData.settings, id: linkedId };
  }
  return { ...base.settings, id: text(base.settings.id) || linkedId };
}

/** Fill missing demo defaults without replacing customer, mechanic, or admin identity. */
export function normalizeDemoData(saved: any) {
  const base = saved && typeof saved === 'object' ? saved : {};
  const fallback = initialData.mechanicAccount;
  const mechanicAccount = accountFrom(base.mechanicAccount || base.merchantAccount, fallback);
  const banking = base.mechanicBanking;
  const mechanicBanking =
    banking && typeof banking === 'object'
      ? {
          bankName: typeof banking.bankName === 'string' ? banking.bankName : '',
          accountHolder: typeof banking.accountHolder === 'string' ? banking.accountHolder : '',
          accountType: typeof banking.accountType === 'string' ? banking.accountType : 'Cheque',
          branchCode: typeof banking.branchCode === 'string' ? banking.branchCode : '',
          maskedAccount: typeof banking.maskedAccount === 'string' ? banking.maskedAccount : '',
          configured: banking.configured === true,
        }
      : { ...initialData.mechanicBanking };
  const adminAccount = normalizeAdminAccount(base.adminAccount);
  const customers = normalizeCustomers(base);
  const settings = normalizeSettings(base, customers[0].id);
  settings.phone = text(settings.phone) || text(customers[0].phone);
  customers[0] = { ...customers[0], phone: text(settings.phone) || text(customers[0].phone) };
  const vehicles = Array.isArray(base.vehicles) ? base.vehicles : [];
  const options = professionalOptions({ ...base, settings });
  return {
    ...base,
    settings,
    customers,
    customerReviews: Array.isArray(base.customerReviews) ? base.customerReviews : [],
    historyAccess: Array.isArray(base.historyAccess) ? base.historyAccess : [],
    adminAccount,
    mechanicAccount,
    mechanicBanking,
    application:
      base.application && typeof base.application === 'object'
        ? rememberApproval(base.application)
        : base.application,
    reviews: Array.isArray(base.reviews) ? base.reviews.map(rememberApproval) : base.reviews,
    jobs: Array.isArray(base.jobs)
      ? base.jobs.map((job: any) => {
          const next = migrateJob(job);
          if (!next || typeof next !== 'object') return next;
          const linked = withRecordLinks(
            typeof next.customerId === 'string' && next.customerId
              ? next
              : { ...next, customerId: demoCustomerId },
            vehicles,
            options,
          );
          return {
            ...linked,
            reference: text(linked.reference) || text(linked.id),
            description: typeof linked.description === 'string' ? linked.description : '',
          };
        })
      : base.jobs,
    records: Array.isArray(base.records)
      ? base.records.map((record: any) => withRecordLinks(record, vehicles, options))
      : base.records,
  };
}
