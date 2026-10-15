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

/** Fill mechanic defaults without replacing customer settings or other saved demo data. */
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
  return {
    ...base,
    mechanicAccount,
    mechanicBanking,
    jobs: Array.isArray(base.jobs) ? base.jobs.map(migrateJob) : base.jobs,
  };
}
