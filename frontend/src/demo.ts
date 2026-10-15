// Public entry point for the browser-only demo domain. No server calls or real authentication.
export type { Role } from './types/roles';
export { roles, roleLabel, navItems } from './config/navigation';
export { initialData } from './data/fixtures';
export { normalizeDemoData } from './data/normalizeDemoData';
export { useDemoStore } from './hooks/useDemoStore';
export { quoteTotal, transitionJob } from './features/jobs/jobWorkflow';
export {
  isAcceptedJob,
  isCancelledRequest,
  isPendingRequest,
  isRejectedRequest,
} from './features/jobs/jobViews';
export { bankingRecord, maskAccountNumber } from './features/account/bankingDetails';
export { photoFileError } from './features/account/profilePhoto';
export { canSubmit } from './features/onboarding/applicationRules';
export { applyAccountDetails } from './features/account/accountDetails';
export {
  adminIdentityLabel,
  customerFullName,
  customerIdentityLabel,
  customerInitials,
  initialsFromName,
  merchantIdentityLabel,
} from './features/account/customerIdentity';
export {
  applicationRecords,
  contactLine,
  decideApplication,
  directoryEntries,
  isManagedProfessional,
  isPendingApplication,
  isReviewHistory,
  rememberApproval,
} from './features/admin/applicationRecords';
export {
  bookingsForCustomer,
  customerNameForJob,
  customerRecords,
  demoCustomerId,
} from './features/admin/customerRecords';
export {
  awaitingCustomerPayments,
  money,
  paymentRecordTotal,
  recordedCustomerPayments,
  uniqueJobs,
} from './features/admin/paymentRecords';
export {
  adminProfileSection,
  adminProfileSectionLabel,
  analyticsSection,
  appointmentSection,
  isNavGroup,
  merchantProfileSection,
  merchantProfileSectionLabel,
  navLeaves,
  pageTitle,
} from './config/navigation';
export { canVisit, canonicalPage } from './routes/access';
