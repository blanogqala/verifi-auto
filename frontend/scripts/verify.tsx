import { liveDirectoryHits, mapDirectoryProfessional } from '../src/data-access/directory';
import { finishApplicationReview } from '../src/features/admin/reviewResult';
import { SettingsPage } from '../src/pages/shared/SettingsPage';
import { OverviewPage } from '../src/pages/shared/OverviewPage';
import { JobsPage } from '../src/pages/shared/JobsPage';
import { PaymentsPage } from '../src/pages/customer/PaymentsPage';
import { MechanicPaymentsPage } from '../src/pages/mechanic/MechanicPaymentsPage';
import { FinancePage } from '../src/pages/admin/FinancePage';
import { VehicleFields } from '../src/components/garage/VehicleFields';
import { bookingQuotations, newQuotation } from '../src/features/jobs/bookingQuotes';
import { BookingQuotations } from '../src/components/jobs/BookingQuotations';
import { QuoteSummary } from '../src/components/jobs/QuoteSummary';
import { demoDocumentHtml } from '../src/features/payments/demoDocuments';
import { quoteReviewToken } from '../src/features/jobs/quotations';
import { resolvePaintColour } from '../src/features/garage/paintColours';
import { calendarDateInput, calendarDateOrNull } from '../src/features/garage/vehicleDates';
import { adminJobRows, matchesAdminFilters, cityName, resolveDispute } from '../src/features/admin/filters';
import { accountMetrics, professionalJobs, appendAdminActivity } from '../src/features/admin/detailRecords';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import React from 'react';
import { renderToString } from 'react-dom/server';
import {
  initialData,
  roles,
  navItems,
  navLeaves,
  canSubmit,
  canVisit,
  canonicalPage,
  pageTitle,
  customerIdentityLabel,
  customerInitials,
  merchantIdentityLabel,
  normalizeDemoData,
  applyAccountDetails,
  transitionJob,
  quoteTotal,
  isAcceptedJob,
  isCancelledRequest,
  isPendingRequest,
  bankingRecord,
  photoFileError,
  decideApplication,
  directoryEntries,
  isPendingApplication,
  isManagedProfessional,
  isReviewHistory,
  applicationRecords,
  customerRecords,
  recordedCustomerPayments,
  awaitingCustomerPayments,
  paymentRecordTotal,
  phoneError,
  persistDemoState,
  createBooking,
  updateRequestedBooking,
  applyJobTransition,
  saveCustomerProfile,
  removeOrArchiveVehicle,
  grantHistoryAccess,
  revokeHistoryAccess,
  saveCustomerReview,
  deleteCustomerReview,
  catalogueModel,
  modelForVehicle,
  resolveVehicleAsset,
  createLoadGeneration,
  recolorBodyPaint,
  selectVehicleId,
  vehicleCardImage,
  vehicleCardLabel,
  commitUpdate,
  resolveHistoryVehicle,
  safeRouteId,
  detailId,
  bookingReference,
  saveVehicle,
  activeMechanicProfessionalId,
  jobsForMechanic,
  mechanicOwnsJob,
  saveQuoteDraft,
  sendMessage,
  unreadMessageCount,
  notificationsFor,
  unreadNotificationCount,
  notificationDestination,
  markNotificationsRead,
  formatZar,
  quoteTotalCents,
  customerOwnsJob,
} from '../src/demo';
import { withMechanicShowcase } from '../src/data/mechanicShowcase';
import { bookingProgress } from '../src/features/jobs/bookingProgress';
import { customerReturnAllowed, rememberReturn, resolveReturn } from '../src/features/navigation/returnPath';
import { providers } from '../src/data/professionals';
import { demoAreaById } from '../src/data/demoAreas';
import {
  defaultDiscovery,
  discoveryWithArea,
  discoveryWithBrowser,
  distanceDisclosure,
  geolocationMessage,
  searchDirectory,
  browseDirectory,
} from '../src/features/professionals/discovery';
import { haversineKm, mapsDirectionsUrl, validCoordinates } from '../src/features/professionals/geo';
import { ratingSummary } from '../src/features/reviews/ratingSummary';
import { categoryLabel, normalizeCategory } from '../src/features/jobs/quotations';
import { legacyAssessmentFee, pricingModelOf } from '../src/features/jobs/pricingModel';
import { Workspace } from '../src/layouts/WorkspaceLayout';
import { WorkspaceDialog } from '../src/components/dialogs/WorkspaceDialog';
import { PublicHeader } from '../src/layouts/PublicHeader';
import { AuthPage as Auth } from '../src/pages/auth/AuthPage';
import { ProfessionalsPage } from '../src/pages/public/ProfessionalsPage';
import { BookingDialog } from '../src/components/booking/BookingDialog';
let count = 0;
for (const role of roles) {
  for (const [tab] of navLeaves(role)) {
    const html = renderToString(
      <Workspace
        role={role}
        tab={tab}
        go={() => {}}
        logout={() => {}}
        data={structuredClone(initialData)}
        update={() => {}}
        notify={() => {}}
      />,
    );
    assert.ok(html.includes('workspace-body'), `${role}/${tab} renders`);
    count++;
  }
}
for (const mode of ['login', 'register', 'forgot']) {
  const html = renderToString(
    <Auth
      mode={mode}
      role={null}
      setRole={() => {}}
      onLogin={() => {}}
      go={() => {}}
      pending={null}
    />,
  );
  assert.ok(html.includes('auth-card'));
  assert.ok(html.includes('aria-label="Verifi Auto home"'));
  assert.ok(html.includes('/images/auth-workshop.webp'));
  assert.ok(html.includes('Back to home'));
  assert.ok(!html.includes('<footer'));
  assert.ok(!html.includes('site-header'));
  count++;
}
assert.equal(canVisit(null, 'dashboard/garage'), false);
assert.equal(canVisit(null, 'dashboard/profile'), false);
assert.equal(canVisit(null, 'find'), true);
assert.equal(canVisit('mechanic', 'dashboard/garage'), false);
assert.equal(canVisit('mechanic', 'dashboard/find'), false);
assert.equal(canVisit('customer', 'dashboard/applications'), false);
assert.equal(canVisit('customer', 'dashboard/jobs'), false);
assert.equal(canVisit('customer', 'dashboard/settings'), false);
assert.equal(canVisit('customer', 'dashboard/nope'), false);
assert.equal(canVisit('admin', 'dashboard/applications'), true);
assert.equal(canVisit('admin', 'dashboard/applications/history'), true);
assert.equal(canVisit('admin', 'dashboard/professionals'), true);
assert.equal(canVisit('admin', 'dashboard/customers'), true);
assert.equal(canVisit('admin', 'dashboard/finance'), true);
assert.equal(canVisit('admin', 'dashboard/reports'), true);
assert.equal(canVisit('admin', 'dashboard/reports/support'), true);
assert.equal(canVisit('admin', 'dashboard/reports/analytics'), true);
assert.equal(canVisit('admin', 'dashboard/profile/account'), true);
assert.equal(canVisit('admin', 'dashboard/profile/platform'), true);
assert.equal(canVisit('admin', 'dashboard/find'), false);
assert.equal(canVisit('admin', 'dashboard/settings'), false);
assert.equal(canVisit('admin', 'dashboard/profile'), false);
assert.equal(canVisit('customer', 'dashboard/finance'), false);
assert.equal(canVisit('customer', 'dashboard/customers'), false);
assert.equal(canVisit('customer', 'dashboard/professionals'), false);
assert.equal(canVisit('mechanic', 'dashboard/finance'), false);
assert.equal(canVisit('mechanic', 'dashboard/reports/support'), false);
assert.equal(canVisit('customer', 'dashboard/garage'), true);
assert.equal(canVisit('customer', 'dashboard/find'), true);
assert.equal(canVisit('customer', 'dashboard/profile'), true);
assert.equal(canVisit('customer', 'dashboard/notifications'), true);
assert.equal(canVisit('customer', 'dashboard/quotes'), true);
assert.equal(canVisit('mechanic', 'dashboard/profile'), false);
assert.equal(canVisit('mechanic', 'dashboard/settings'), false);
assert.equal(canVisit('mechanic', 'dashboard/documents'), false);
assert.equal(canVisit('mechanic', 'dashboard/application'), false);
assert.equal(canVisit('mechanic', 'dashboard/quotes'), true);
assert.equal(canVisit('mechanic', 'dashboard/notifications'), true);
assert.equal(canVisit('mechanic', 'dashboard/profile/account'), false);
assert.equal(canVisit('mechanic', 'dashboard/appointments'), false);
assert.equal(canVisit('mechanic', 'dashboard/appointments/pending'), true);
assert.equal(canVisit('mechanic', 'dashboard/appointments/rejected'), true);
assert.equal(canVisit('mechanic', 'dashboard/appointments/cancelled'), true);
assert.equal(canVisit('mechanic', 'dashboard/jobs'), true);
assert.equal(canVisit('mechanic', 'dashboard/payments'), true);
assert.equal(canVisit('customer', 'dashboard/payments'), true);
assert.equal(canVisit('mechanic', 'dashboard/profile/business'), true);
assert.equal(canVisit('mechanic', 'dashboard/profile/documents'), true);
assert.equal(canVisit('mechanic', 'dashboard/profile/banking'), true);
assert.equal(canVisit('mechanic', 'dashboard/profile/verification'), true);
assert.equal(canVisit('mechanic', 'dashboard/profile/nope'), false);
assert.equal(canVisit('mechanic', 'dashboard/profile/account/extra'), false);
assert.equal(canVisit('customer', 'dashboard/profile/account'), false);
assert.equal(canonicalPage('customer', 'dashboard/settings'), 'dashboard/profile');
assert.equal(canonicalPage('customer', 'dashboard/overview'), 'dashboard/overview');
assert.equal(canonicalPage('customer', 'dashboard/profile'), 'dashboard/profile');
assert.equal(canonicalPage('mechanic', 'dashboard/settings'), 'dashboard/profile/business');
assert.equal(canonicalPage('mechanic', 'dashboard/profile'), 'dashboard/profile/business');
assert.equal(canonicalPage('mechanic', 'dashboard/documents'), 'dashboard/profile/documents');
assert.equal(canonicalPage('mechanic', 'dashboard/application'), 'dashboard/profile/verification');
assert.equal(canonicalPage('mechanic', 'dashboard/profile/account'), 'dashboard/profile/business');
assert.equal(canonicalPage('mechanic', 'dashboard/appointments'), 'dashboard/appointments/pending');
assert.equal(canonicalPage('customer', 'dashboard/payments'), 'dashboard/payments');
assert.equal(canonicalPage('admin', 'dashboard/settings'), 'dashboard/profile/platform');
assert.equal(canonicalPage('admin', 'dashboard/profile'), 'dashboard/profile/account');
assert.equal(canonicalPage('admin', 'dashboard/reports'), 'dashboard/reports');
assert.equal(canonicalPage('admin', 'dashboard/reports/support'), 'dashboard/reports/support');
assert.equal(canonicalPage(null, 'dashboard/settings'), 'dashboard/settings');
assert.deepEqual(
  navLeaves('customer').map(([id, label]) => `${id}:${label}`),
  [
    'overview:Overview',
    'find:Find a Professional',
    'bookings:My bookings',
    'garage:My Garage',
    'payments:Payments',
  ],
);
assert.deepEqual(
  navLeaves('mechanic').map(([id, label]) => `${id}:${label}`),
  [
    'overview:Overview',
    'appointments/pending:Appointments',
    'jobs:Jobs',
    'payments:Payments',
  ],
);
assert.deepEqual(
  navItems.admin.map((entry) => (Array.isArray(entry) ? entry[0] : entry.id)),
  ['overview', 'applications', 'users', 'jobs', 'reports', 'finance'],
);
const usersNav = navItems.admin.find((entry) => !Array.isArray(entry) && entry.id === 'users');
assert.ok(usersNav && !Array.isArray(usersNav));
if (usersNav && !Array.isArray(usersNav)) {
  assert.deepEqual(
    usersNav.children.map(([id, label]) => `${id}:${label}`),
    ['professionals:Professionals', 'customers:Customers'],
  );
}
assert.equal(pageTitle('customer', 'profile'), 'Profile');
assert.equal(pageTitle('customer', 'notifications'), 'Notifications');
assert.equal(pageTitle('customer', 'quotes'), 'Quotes & approvals');
assert.equal(pageTitle('customer', 'find'), 'Find a Professional');
assert.equal(pageTitle('customer', 'settings'), 'Profile');
assert.equal(pageTitle('mechanic', 'profile'), 'Profile');
assert.equal(pageTitle('mechanic', 'profile/account'), 'Profile');
assert.equal(pageTitle('mechanic', 'profile/business'), 'Profile');
assert.equal(pageTitle('mechanic', 'settings'), 'Profile');
assert.equal(pageTitle('mechanic', 'documents'), 'Profile');
assert.equal(pageTitle('mechanic', 'application'), 'Profile');
assert.equal(pageTitle('mechanic', 'quotes'), 'Quotes & invoices');
assert.equal(pageTitle('mechanic', 'notifications'), 'Notifications');
assert.equal(pageTitle('mechanic', 'payments'), 'Payments');
assert.equal(pageTitle('mechanic', 'appointments/rejected'), 'Appointments');
assert.equal(pageTitle('mechanic', 'jobs'), 'Jobs');
assert.equal(pageTitle('mechanic', 'unknown'), 'Overview');
assert.equal(pageTitle('admin', 'settings'), 'Admin profile');
assert.equal(pageTitle('admin', 'profile/account'), 'Admin profile');
assert.equal(pageTitle('admin', 'profile/platform'), 'Admin profile');
assert.equal(pageTitle('admin', 'reports'), 'Analytics & support');
assert.equal(pageTitle('admin', 'reports/support'), 'Analytics & support');
assert.equal(pageTitle('admin', 'finance'), 'Finance');
assert.equal(pageTitle('admin', 'customers'), 'Customers');
assert.equal(pageTitle('admin', 'professionals'), 'Professionals');
assert.equal(pageTitle('admin', 'applications'), 'Applications');
assert.equal(pageTitle('customer', 'unknown'), 'Overview');
assert.equal(customerInitials('Alex Morgan'), 'AM');
assert.equal(customerInitials('Jordan Blake'), 'JB');
assert.equal(customerInitials('Mary Anne Smith'), 'MS');
assert.equal(customerInitials('Jordan'), 'JO');
assert.equal(customerInitials('   '), '?');
assert.equal(customerInitials(undefined), '?');
assert.equal(customerIdentityLabel('Sam Lee'), 'Sam Lee');
assert.equal(customerIdentityLabel('  '), 'Customer');
assert.equal(merchantIdentityLabel('Harbour Workshop'), 'Harbour Workshop');
assert.equal(merchantIdentityLabel('   '), 'Mechanic');
const sampleProfessional = {
  name: 'Precision Motorworks',
  type: 'Workshop',
  area: 'East London',
  special: 'Brakes',
  fee: 450,
};
const directory = {
  book: () => {},
  discovery: {
    mode: 'nearby' as const,
    radiusKm: 25 as const,
    areaId: '',
    origin: null,
    service: 'All services',
    type: 'Either',
  },
  results: [sampleProfessional],
  service: 'All services',
  setDiscovery: () => {},
  setService: () => {},
  setType: () => {},
  type: 'Either',
};
function screen(role: (typeof roles)[number], tab: string, data = initialData, extra: any = {}) {
  return renderToString(
    <Workspace
      role={role}
      tab={tab}
      go={() => {}}
      logout={() => {}}
      data={data}
      update={() => {}}
      notify={() => {}}
      directory={directory}
      {...extra}
    />,
  );
}
const customerOverview = screen('customer', 'overview');
for (const label of ['Overview', 'Find a Professional', 'My bookings', 'My Garage', 'Payments']) {
  assert.ok(customerOverview.includes(label), label);
}
assert.ok(customerOverview.indexOf('Overview') < customerOverview.indexOf('Find a Professional'));
assert.ok(
  customerOverview.indexOf('Find a Professional') < customerOverview.indexOf('My bookings'),
);
assert.ok(customerOverview.indexOf('My bookings') < customerOverview.indexOf('My Garage'));
assert.ok(customerOverview.indexOf('My Garage') < customerOverview.indexOf('Payments'));
assert.ok(customerOverview.includes('Alex Morgan'));
assert.ok(/>\s*AM\s*</.test(customerOverview));
assert.ok(!customerOverview.includes('Quotes &amp; approvals'));
assert.ok(!customerOverview.includes('Account settings'));
assert.ok(!customerOverview.includes('Visit website'));
assert.ok(!customerOverview.includes('Clarity at every step'));
assert.ok(!customerOverview.includes('Demo workspace'));
assert.ok(!customerOverview.includes('Sign out / switch preview'));
assert.ok(customerOverview.includes('Sign out'));
assert.ok(customerOverview.includes('Verifi Auto home'));
assert.ok(!customerOverview.includes('Edit quote'));
assert.ok(customerOverview.includes('Open profile'));
assert.ok(!customerOverview.includes('workspace-identity active'));
assert.ok(!customerOverview.includes('profile-link active'));
const renamed = structuredClone(initialData);
renamed.settings.name = 'Jordan Blake';
const renamedHtml = screen('customer', 'overview', renamed);
assert.ok(renamedHtml.includes('Jordan Blake'));
assert.ok(/>\s*JB\s*</.test(renamedHtml));
assert.ok(!/>\s*AM\s*</.test(renamedHtml));
const blank = structuredClone(initialData);
blank.settings.name = '   ';
const blankHtml = screen('customer', 'overview', blank);
assert.ok(/>\s*\?\s*</.test(blankHtml));
assert.ok(blankHtml.includes('>Customer<'));
assert.ok(!blankHtml.includes('Demo workspace'));
const customerProfile = screen('customer', 'profile', renamed);
assert.ok(customerProfile.includes('workspace-identity active'));
assert.ok(customerProfile.includes('profile-link active'));
assert.ok(customerProfile.includes('aria-label="Open profile"'));
assert.ok(customerProfile.includes('Full name'));
assert.ok(customerProfile.includes('Email address'));
assert.ok(customerProfile.includes('Email updates preference'));
assert.ok(customerProfile.includes('Save profile'));
assert.ok(customerProfile.includes('Profile'));
assert.ok(customerProfile.includes('stays in this browser'));
assert.ok(!customerProfile.includes('Display name'));
assert.ok(!customerProfile.includes('Business or trading name'));
assert.ok(!customerProfile.includes('Account holder name'));
assert.ok(!customerProfile.includes('profile-tablist'));
const legacySettings = screen('customer', 'settings', renamed);
assert.ok(legacySettings.includes('Full name'));
assert.ok(legacySettings.includes('Profile'));
assert.ok(!legacySettings.includes('Account settings'));
const customerNotes = screen('customer', 'notifications');
assert.ok(customerNotes.includes('customer-notify active'));
assert.ok(customerNotes.includes('Your updates'));
assert.ok(customerNotes.includes('aria-label="Notifications"'));
assert.ok(!customerNotes.includes('workspace-identity active'));
const customerQuotes = screen('customer', 'quotes');
assert.ok(customerQuotes.includes('Quotes &amp; approvals'));
assert.ok(customerQuotes.includes('Review itemised repair costs'));
assert.ok(customerQuotes.includes('Review &amp; approve'));
const customerFind = screen('customer', 'find');
assert.equal((customerFind.match(/<main[\s>]/g) || []).length, 1);
assert.ok(customerFind.includes('class="section app-page directory-embedded"'));
assert.ok(customerFind.includes('Find a professional'));
assert.equal((customerFind.match(/<h1[ >]/g) || []).length, 1);
assert.ok(customerFind.includes('Precision Motorworks'));
assert.ok(customerFind.includes('Book assessment'));
assert.ok(customerFind.includes('View profile'));
assert.ok(customerFind.includes('Find a Professional'));
assert.ok(!customerFind.includes('FIND YOUR NEXT PROFESSIONAL'));
assert.ok(!customerFind.includes('YOUR JOURNEY, SIMPLIFIED'));
const publicFind = renderToString(
  <ProfessionalsPage
    book={() => {}}
    discovery={directory.discovery}
    results={[sampleProfessional]}
    service="All services"
    setDiscovery={() => {}}
    setService={() => {}}
    setType={() => {}}
    type="Either"
  />,
);
assert.ok(publicFind.startsWith('<main'));
assert.ok(publicFind.includes('Find a professional'));
assert.ok(publicFind.includes('Precision Motorworks'));
assert.ok(publicFind.includes('Book assessment'));
assert.ok(publicFind.includes('No reviews yet'));
assert.ok(!publicFind.includes('Assessment from'));
assert.ok(!publicFind.includes('directory-embedded'));
const mechanicOverview = screen('mechanic', 'overview');
assert.ok(mechanicOverview.includes('Overview'));
assert.ok(mechanicOverview.includes('Appointments'));
assert.ok(mechanicOverview.includes('Jobs'));
assert.ok(mechanicOverview.includes('Payments'));
assert.ok(mechanicOverview.indexOf('Overview') < mechanicOverview.indexOf('Appointments'));
assert.ok(
  mechanicOverview.indexOf('Appointments') < mechanicOverview.search(/Jobs\s*<\/button>/),
);
assert.ok(!mechanicOverview.includes('Quotes &amp; invoices'));
assert.ok(!mechanicOverview.includes('Business profile'));
assert.ok(!mechanicOverview.includes('Verification status'));
assert.ok(!mechanicOverview.includes('Account settings'));
assert.ok(!mechanicOverview.includes('Visit website'));
assert.ok(!mechanicOverview.includes('Clarity at every step'));
assert.ok(!mechanicOverview.includes('Sign out / switch preview'));
assert.ok(!mechanicOverview.includes('Demo workspace'));
assert.ok(!/>\s*VA\s*</.test(mechanicOverview));
assert.ok(mechanicOverview.includes('Your automotive business'));
assert.ok(/>\s*YB\s*</.test(mechanicOverview));
assert.ok(mechanicOverview.includes('>Mechanic<'));
assert.ok(mechanicOverview.includes('Sign out'));
assert.ok(mechanicOverview.includes('Verifi Auto home'));
assert.ok(mechanicOverview.includes('Open profile'));
assert.ok(mechanicOverview.includes('profile-link'));
assert.ok(!mechanicOverview.includes('profile-link active'));
assert.ok(!mechanicOverview.includes('workspace-identity active'));
assert.ok(mechanicOverview.includes('mechanic-notify'));
assert.ok(!mechanicOverview.includes('mechanic-notify active'));
assert.ok(!mechanicOverview.includes('customer-notify'));
assert.ok(mechanicOverview.includes('No pending requests'));
assert.ok(!mechanicOverview.includes('KEEP GOOD WORK MOVING'));
assert.ok(mechanicOverview.includes('Welcome, '));
assert.ok(!mechanicOverview.includes('Edit quote'));
assert.ok(!mechanicOverview.includes('Review &amp; pay'));
assert.ok(!mechanicOverview.includes('Alex Morgan'));
const renamedMerchant = structuredClone(initialData);
renamedMerchant.profile.name = 'Harbour Workshop';
renamedMerchant.settings.name = 'Alex Morgan';
const renamedMerchantHtml = screen('mechanic', 'overview', renamedMerchant);
assert.ok(renamedMerchantHtml.includes('Harbour Workshop'));
assert.ok(/>\s*HW\s*</.test(renamedMerchantHtml));
assert.ok(!renamedMerchantHtml.includes('Alex Morgan'));
assert.ok(!/>\s*AM\s*</.test(renamedMerchantHtml));
const blankMerchant = structuredClone(initialData);
blankMerchant.profile.name = '   ';
const blankMerchantHtml = screen('mechanic', 'overview', blankMerchant);
assert.ok(blankMerchantHtml.includes('>Mechanic<'));
assert.ok(/>\s*\?\s*</.test(blankMerchantHtml));
const mechanicAccount = screen('mechanic', 'profile/business', renamedMerchant);
assert.ok(mechanicAccount.includes('Mechanic profile'));
assert.ok(mechanicAccount.includes('id="profile-tab-business"'));
assert.ok(mechanicAccount.includes('aria-selected="true"'));
assert.ok(mechanicAccount.includes('Email address'));
assert.ok(mechanicAccount.includes('sam@example.com'));
assert.ok(mechanicAccount.includes('A profile that tells your story'));
assert.ok(!mechanicAccount.includes('Account and contact'));
assert.ok(!mechanicAccount.includes('Account holder name'));
assert.ok(!mechanicAccount.includes('Save account details'));
assert.ok(!mechanicAccount.includes('Sam Okonkwo'));
assert.ok(mechanicAccount.includes('Harbour Workshop'));
assert.ok(mechanicAccount.includes('Add profile photo'));
assert.ok(mechanicAccount.includes('Banking details'));
assert.ok(mechanicAccount.includes('Verification status'));
assert.ok(mechanicAccount.includes('status-draft'));
assert.ok(mechanicAccount.includes('workspace-identity active'));
assert.ok(mechanicAccount.includes('profile-link active'));
assert.ok(mechanicAccount.includes('stays in this browser'));
assert.ok(!mechanicAccount.includes('KEEP GOOD WORK MOVING'));
assert.ok(!mechanicAccount.includes('Alex Morgan'));
assert.ok(!mechanicAccount.includes('Full name'));
assert.ok(!mechanicAccount.includes('Sign out / switch preview'));
assert.ok(!mechanicAccount.includes('Paid to your bank'));
assert.ok(!mechanicAccount.includes('Available to withdraw'));
const mechanicBusiness = screen('mechanic', 'profile');
assert.ok(
  mechanicBusiness.includes('id="profile-tab-business" type="button" role="tab" class="selected"'),
);
assert.ok(mechanicBusiness.includes('A profile that tells your story'));
assert.ok(mechanicBusiness.includes('Business or trading name'));
assert.ok(mechanicBusiness.includes('workspace-identity active'));
const mechanicDocuments = screen('mechanic', 'documents');
assert.ok(mechanicDocuments.includes('id="profile-tab-documents"'));
assert.ok(mechanicDocuments.includes('Supporting evidence'));
assert.ok(mechanicDocuments.includes('filenames and sizes'));
const mechanicVerification = screen('mechanic', 'application');
assert.ok(mechanicVerification.includes('id="profile-tab-verification"'));
assert.ok(mechanicVerification.includes('Verification status'));
assert.ok(mechanicVerification.includes('data-profile-target="profile/business"'));
assert.ok(mechanicVerification.includes('data-profile-target="profile/documents"'));
assert.ok(mechanicVerification.includes('Submit for review'));
assert.ok(!mechanicVerification.includes('Verified'));
const mechanicQuotes = screen('mechanic', 'quotes');
assert.ok(mechanicQuotes.includes('Quotes &amp; invoices'));
assert.ok(mechanicQuotes.includes('Edit quote'));
const mechanicNotes = screen('mechanic', 'notifications');
assert.ok(mechanicNotes.includes('mechanic-notify active'));
assert.ok(mechanicNotes.includes('Your updates'));
assert.ok(!mechanicNotes.includes('workspace-identity active'));
assert.ok(!mechanicNotes.includes('customer-notify'));
const mechanicLegacySettings = screen('mechanic', 'settings');
assert.ok(mechanicLegacySettings.includes('Email address'));
assert.ok(mechanicLegacySettings.includes('sam@example.com'));
assert.ok(!mechanicLegacySettings.includes('Account holder name'));
assert.ok(!mechanicLegacySettings.includes('Account and contact'));
assert.ok(mechanicLegacySettings.includes('Mechanic profile'));
assert.ok(!mechanicLegacySettings.includes('Display name'));
assert.ok(!mechanicLegacySettings.includes('Save settings'));
const mechanicBanking = screen('mechanic', 'profile/banking');
assert.ok(mechanicBanking.includes('id="profile-tab-banking"'));
assert.ok(mechanicBanking.includes('does not verify an account'));
assert.ok(mechanicBanking.includes('Account number'));
assert.ok(mechanicBanking.includes('Branch code'));
assert.ok(!mechanicBanking.includes('password'));
assert.ok(!mechanicBanking.includes('CVV'));
assert.ok(!mechanicBanking.includes('PIN'));
const mechanicJobs = screen('mechanic', 'jobs');
assert.ok(mechanicJobs.includes('VA-2026-1042'));
assert.ok(mechanicJobs.includes('Alex Morgan'));
assert.ok(mechanicJobs.includes('Open job'));
assert.ok(!mechanicJobs.includes('Edit quote'));
assert.ok(!mechanicJobs.includes('View quote'));
assert.ok(!mechanicJobs.includes('>Accept<'));
assert.ok(!mechanicJobs.includes('Review &amp; pay'));
const mechanicAppointments = screen('mechanic', 'appointments/pending');
assert.ok(mechanicAppointments.includes('No pending requests'));
assert.ok(mechanicAppointments.includes('Pending'));
assert.ok(mechanicAppointments.includes('Rejected'));
assert.ok(mechanicAppointments.includes('Cancelled'));
const mechanicPayments = screen('mechanic', 'payments');
assert.ok(mechanicPayments.includes('No demo payments yet'));
assert.ok(mechanicPayments.includes('does not confirm a bank payout'));
assert.ok(!mechanicPayments.includes('Review &amp; pay'));
assert.ok(!mechanicPayments.includes('Simulate payment'));
assert.ok(!mechanicPayments.includes('Paid to your bank'));
assert.ok(!mechanicPayments.includes('Available to withdraw'));
const adminOverview = screen('admin', 'overview');
assert.ok(!adminOverview.includes('Visit website'));
assert.ok(!adminOverview.includes('Clarity at every step'));
assert.ok(!adminOverview.includes('Demo workspace'));
assert.ok(!adminOverview.includes('Sign out / switch preview'));
assert.ok(adminOverview.includes('Sign out'));
assert.ok(adminOverview.includes('Open profile'));
assert.ok(adminOverview.includes('Naledi Khumalo'));
assert.ok(adminOverview.includes('Platform admin'));
assert.ok(/>\s*NK\s*</.test(adminOverview));
assert.ok(adminOverview.includes('workspace-crumb'));
assert.ok(!adminOverview.includes('profile-link active'));
assert.ok(!adminOverview.includes('workspace-identity active'));
assert.ok(adminOverview.includes('aria-controls="nav-users-items"'));
assert.ok(adminOverview.includes('aria-expanded="false"'));
const collapsedUsers = adminOverview.match(/<div[^>]*id="nav-users-items"[^>]*>/);
assert.ok(collapsedUsers);
assert.ok(collapsedUsers[0].includes('hidden'));
assert.ok(adminOverview.includes('tabindex="-1"'));
assert.ok(adminOverview.includes('Urban Auto Care'));
assert.ok(!adminOverview.includes('Driveway Diagnostics'));
assert.ok(!adminOverview.includes('merchant-notify'));
assert.ok(!adminOverview.includes('mechanic-notify'));
assert.ok(!adminOverview.includes('customer-notify'));
assert.ok(adminOverview.includes('admin-notify'));
for (const label of [
  'Overview',
  'Applications',
  'Users',
  'Professionals',
  'Customers',
  'Jobs &amp; activity',
  'Analytics &amp; support',
  'Finance',
]) {
  assert.ok(adminOverview.includes(label), label);
}
const adminOrder = [
  'Overview',
  'Applications',
  'aria-controls="nav-users-items"',
  'Professionals',
  'Customers',
  'Jobs &amp; activity',
  'Analytics &amp; support',
  'Finance',
  'Sign out',
];
let adminAt = -1;
for (const token of adminOrder) {
  const at = adminOverview.indexOf(token);
  assert.ok(at > adminAt, token);
  adminAt = at;
}
assert.ok(!adminOverview.includes('Platform settings'));
const adminSettings = screen('admin', 'settings');
assert.ok(adminSettings.includes('Platform settings'));
assert.ok(adminSettings.includes('Pilot configuration'));
assert.ok(adminSettings.includes('does not open public applications'));
assert.ok(!adminSettings.includes('Full name'));
assert.ok(adminSettings.includes('Open profile'));
assert.ok(adminSettings.includes('workspace-identity active'));
assert.ok(adminSettings.includes('profile-link active'));
assert.ok(adminSettings.includes('id="admin-tab-platform"'));
const adminProfile = screen('admin', 'profile/account');
assert.ok(adminProfile.includes('Full name'));
assert.ok(adminProfile.includes('admin@example.com'));
assert.ok(adminProfile.includes('separate from customer and mechanic'));
assert.ok(!adminProfile.includes('Pilot city'));
assert.ok(!adminProfile.includes('alex@example.com'));
assert.ok(!adminProfile.includes('sam@example.com'));
const stored = structuredClone(initialData);
delete (stored as any).mechanicAccount;
delete (stored as any).merchantAccount;
stored.settings.name = 'Alex Morgan';
stored.profile.name = 'Harbour Workshop';
(stored as any).jobs = [
  { id: 'old-job', status: 'Awaiting approval' },
  { id: 'old-cancel', status: 'Cancelled' },
];
const migrated = normalizeDemoData(stored);
assert.equal(migrated.settings.name, 'Alex Morgan');
assert.equal(migrated.profile.name, 'Harbour Workshop');
assert.equal(migrated.jobs.length, 2);
assert.equal(migrated.jobs[0].accepted, true);
assert.notEqual(migrated.jobs[1].accepted, true);
assert.equal(migrated.mechanicAccount.name, 'Sam Okonkwo');
assert.notEqual(migrated.mechanicAccount.name, migrated.settings.name);
const legacyAccount = structuredClone(initialData);
delete (legacyAccount as any).mechanicAccount;
(legacyAccount as any).merchantAccount = {
  name: 'Lindiwe Nkosi',
  email: 'lindiwe@example.com',
  emailUpdates: false,
};
const kept = normalizeDemoData(legacyAccount);
assert.equal(kept.mechanicAccount.name, 'Lindiwe Nkosi');
assert.equal(kept.mechanicAccount.emailUpdates, false);
assert.equal(kept.settings.name, 'Alex Morgan');
const merchantLogin = applyAccountDetails(initialData, 'mechanic', {
  name: 'Lindiwe Nkosi',
  email: 'lindiwe@example.com',
});
assert.equal(merchantLogin.mechanicAccount.name, 'Lindiwe Nkosi');
assert.equal(merchantLogin.settings.name, 'Alex Morgan');
const customerLogin = applyAccountDetails(initialData, 'customer', {
  name: 'Jordan Blake',
  email: 'jordan@example.com',
});
assert.equal(customerLogin.settings.name, 'Jordan Blake');
assert.equal(customerLogin.mechanicAccount.name, initialData.mechanicAccount.name);
assert.notEqual(customerLogin.settings.email, customerLogin.mechanicAccount.email);
assert.equal(canSubmit(initialData), false);
const submitted = {
  ...initialData,
  profile: { ...initialData.profile, phone: '0000000000', bio: 'Sample professional experience' },
  documents: [{ kind: 'Identity evidence' }, { kind: 'Qualifications / experience' }],
};
assert.equal(canSubmit(submitted), true);
let j = {
  ...initialData.jobs[0],
  status: 'Requested',
  items: [],
  quoteApproved: false,
  paid: false,
};
assert.throws(() => transitionJob(j, 'start'));
assert.throws(() => transitionJob(j, 'pay'));
assert.throws(() => transitionJob(j, 'quote', { items: [{ name: 'Labour', amount: 200 }] }));
j = transitionJob(j, 'confirm');
assert.throws(() => transitionJob(j, 'quote', { items: [{ name: '', amount: -2 }] }));
j = transitionJob(j, 'quote', {
  items: [
    { name: 'Parts', amount: 950 },
    { name: 'Labour', amount: 450 },
  ],
  notes: 'Replace front brake pads',
});
assert.equal(quoteTotal(j), 1400);
assert.throws(() => transitionJob(j, 'start'));
j = transitionJob(j, 'changes');
assert.equal(j.status, 'Changes requested');
j = transitionJob(j, 'quote', {
  items: [
    { name: 'Parts', amount: 900 },
    { name: 'Labour', amount: 450 },
  ],
});
j = transitionJob(j, 'approve');
j = transitionJob(j, 'start');
assert.throws(() => transitionJob(j, 'complete', { completionNotes: '' }));
j = transitionJob(j, 'complete', { completionNotes: 'Front brake pads replaced and tested' });
j = transitionJob(j, 'pay');
assert.equal(j.status, 'Completed');
assert.equal(j.paid, true);
assert.throws(() => transitionJob(j, 'pay'));
assert.throws(() => transitionJob(j, 'cancel'));
const request = {
  id: 'VA-REQ',
  status: 'Requested',
  vehicle: '2018 Demo Hatch',
  provider: 'Precision Motorworks',
  date: '2026-11-01',
  time: '10:00',
  fee: 450,
  items: [],
  notes: '',
  quoteApproved: false,
  paid: false,
  accepted: false,
  customerId: 'cust-01',
};
const acceptedSame = transitionJob(request, 'confirm');
assert.equal(acceptedSame.id, request.id);
assert.equal(acceptedSame.status, 'Confirmed');
assert.equal(acceptedSame.accepted, true);
assert.equal(acceptedSame.quoteApproved, false);
assert.equal(isPendingRequest(acceptedSame), false);
assert.equal(isAcceptedJob(acceptedSame), true);
assert.throws(() => transitionJob(acceptedSame, 'start'));
assert.throws(() => transitionJob(acceptedSame, 'reject', { reason: 'Too late' }));
const rejected = transitionJob(request, 'reject', { reason: 'Fully booked this week' });
assert.equal(rejected.id, request.id);
assert.equal(rejected.status, 'Rejected');
assert.equal(rejected.rejectionReason, 'Fully booked this week');
assert.equal(rejected.accepted, false);
const cancelledRequest = transitionJob(request, 'cancel');
assert.equal(cancelledRequest.status, 'Cancelled');
assert.equal(isCancelledRequest(cancelledRequest), true);
assert.equal(isAcceptedJob(cancelledRequest), false);
const cancelledJob = transitionJob(acceptedSame, 'cancel');
assert.equal(cancelledJob.accepted, true);
assert.equal(isCancelledRequest(cancelledJob), false);
assert.equal(isAcceptedJob(cancelledJob), true);
const pendingData = structuredClone(initialData);
pendingData.jobs = [request];
const pendingHtml = screen('mechanic', 'appointments/pending', pendingData);
assert.ok(pendingHtml.includes('VA-REQ'));
assert.ok(pendingHtml.includes('Open appointment'));
assert.ok(!/>\s*Accept\s*</.test(pendingHtml));
const pendingDetail = screen('mechanic', 'appointments/pending/VA-REQ', pendingData);
assert.ok(pendingDetail.includes('Accept'));
assert.ok(pendingDetail.includes('does not approve a repair quote'));
assert.ok(pendingDetail.includes('Back to Pending'));
const movedData = structuredClone(initialData);
movedData.jobs = [acceptedSame];
const movedJobs = screen('mechanic', 'jobs', movedData);
const movedRequests = screen('mechanic', 'appointments/pending', movedData);
assert.ok(movedJobs.includes('VA-REQ'));
assert.ok(movedJobs.includes('Confirmed'));
assert.ok(!movedRequests.includes('VA-REQ'));
const rejectedData = structuredClone(initialData);
rejectedData.jobs = [rejected];
const customerRejected = screen('customer', 'bookings', rejectedData);
const mechanicRejected = screen('mechanic', 'appointments/rejected', rejectedData);
assert.ok(customerRejected.includes('Fully booked this week'));
assert.ok(customerRejected.includes('Rejected'));
assert.ok(mechanicRejected.includes('Fully booked this week'));
const bank = bankingRecord({
  bankName: 'Sample Bank',
  accountHolder: 'Sam Okonkwo',
  accountNumber: '0012345678',
  accountType: 'Cheque',
  branchCode: '051001',
});
assert.equal(bank.record?.maskedAccount, '••••5678');
assert.equal(bank.record?.branchCode, '051001');
assert.equal(JSON.stringify(bank.record).includes('0012345678'), false);
assert.equal(bank.record?.configured, true);
assert.equal(photoFileError({ type: 'image/gif', size: 1000 }), 'Choose a JPG, PNG, or WebP image.');
assert.ok(photoFileError({ type: 'image/jpeg', size: 9 * 1024 * 1024 }));
assert.equal(photoFileError({ type: 'image/webp', size: 1000 }), '');
const payData = structuredClone(initialData);
payData.jobs = [
  { ...initialData.jobs[0], status: 'Awaiting payment', paid: false, quoteApproved: true },
  {
    ...initialData.jobs[0],
    id: 'VA-PAID',
    status: 'Completed',
    paid: true,
    quoteApproved: true,
  },
];
const payHtml = screen('mechanic', 'payments', payData);
assert.ok(payHtml.includes('View invoice'));
assert.ok(payHtml.includes('View receipt'));
assert.ok(payHtml.includes('Awaiting customer payment'));
assert.ok(payHtml.includes('Customer payment recorded'));
assert.ok(!payHtml.includes('Review &amp; pay'));
assert.ok(!payHtml.includes('Simulate payment'));
assert.ok(!payHtml.includes('Paid to your bank'));
const customerPay = screen('customer', 'payments', payData);
assert.ok(customerPay.includes('Review &amp; pay'));
assert.ok(!customerPay.includes('does not confirm a bank payout'));
assert.ok(customerOverview.includes('class="workspace-crumb"'));
assert.ok(mechanicOverview.includes('class="workspace-crumb"'));
assert.ok(!customerOverview.includes('aria-controls="nav-users-items"'));
assert.ok(!mechanicOverview.includes('aria-controls="nav-users-items"'));
const workspaceCss = readFileSync('src/styles/workspace.css', 'utf8');
const crumbStart = workspaceCss.indexOf('.workspace-crumb {');
assert.ok(crumbStart > -1);
assert.ok(workspaceCss.slice(crumbStart, crumbStart + 160).includes('display: flex'));
const mobileCss = workspaceCss.slice(workspaceCss.indexOf('@media (max-width: 750px)'));
const crumbHide = mobileCss.indexOf('.workspace-top .workspace-crumb');
assert.ok(crumbHide > -1);
assert.ok(mobileCss.slice(crumbHide, crumbHide + 80).includes('display: none'));
assert.equal(applicationRecords(initialData).filter(isPendingApplication).map((item) => item.id).join(), 'app-02');
assert.equal(applicationRecords(initialData).filter(isManagedProfessional).map((item) => item.id).join(), 'app-03');
assert.ok(!directoryEntries(providers, initialData).some((item) => item.name === 'Urban Auto Care'));
assert.ok(directoryEntries(providers, initialData).some((item) => item.name === 'Driveway Diagnostics'));
const approvedData = structuredClone(initialData);
approvedData.reviews = approvedData.reviews.map((item) =>
  item.id === 'app-02' ? decideApplication(item, 'Approved', 'Evidence complete') : item,
);
assert.equal(
  applicationRecords(approvedData).filter((item) => item.id === 'app-02').length,
  1,
);
assert.equal(isPendingApplication(approvedData.reviews.find((item) => item.id === 'app-02')), false);
assert.equal(isManagedProfessional(approvedData.reviews.find((item) => item.id === 'app-02')), true);
assert.ok(!screen('admin', 'applications', approvedData).includes('Urban Auto Care'));
assert.ok(screen('admin', 'professionals', approvedData).includes('Urban Auto Care'));
assert.ok(screen('admin', 'professionals', approvedData).includes('Driveway Diagnostics'));
assert.ok(directoryEntries(providers, approvedData).some((item) => item.name === 'Urban Auto Care'));
const reviewRejected = structuredClone(initialData);
reviewRejected.reviews = reviewRejected.reviews.map((item) =>
  item.id === 'app-02' ? decideApplication(item, 'Rejected', 'Missing workshop photos') : item,
);
assert.equal(reviewRejected.reviews.find((item) => item.id === 'app-02').previouslyApproved, false);
assert.equal(isReviewHistory(reviewRejected.reviews.find((item) => item.id === 'app-02')), true);
assert.ok(!screen('admin', 'applications', reviewRejected).includes('Urban Auto Care'));
assert.ok(screen('admin', 'applications/history', reviewRejected).includes('Missing workshop photos'));
assert.ok(!screen('admin', 'professionals', reviewRejected).includes('Urban Auto Care'));
const changesData = structuredClone(initialData);
changesData.reviews = changesData.reviews.map((item) =>
  item.id === 'app-02' ? decideApplication(item, 'Changes requested', 'Add experience evidence') : item,
);
assert.ok(screen('admin', 'applications/history', changesData).includes('Add experience evidence'));
assert.ok(!screen('admin', 'applications', changesData).includes('Urban Auto Care'));
const resubmitted = structuredClone(changesData);
resubmitted.reviews = resubmitted.reviews.map((item) =>
  item.id === 'app-02' ? { ...item, status: 'Pending review', note: '' } : item,
);
assert.ok(screen('admin', 'applications', resubmitted).includes('Urban Auto Care'));
assert.ok(!screen('admin', 'applications/history', resubmitted).includes('Urban Auto Care'));
const suspendedData = structuredClone(initialData);
suspendedData.reviews = suspendedData.reviews.map((item) =>
  item.id === 'app-03' ? decideApplication(item, 'Suspended', 'Sample suspension') : item,
);
assert.equal(suspendedData.reviews.find((item) => item.id === 'app-03').previouslyApproved, true);
assert.equal(suspendedData.reviews.find((item) => item.id === 'app-03').id, 'app-03');
assert.ok(screen('admin', 'professionals', suspendedData).includes('Driveway Diagnostics'));
assert.ok(screen('admin', 'professionals', suspendedData).includes('Suspended'));
assert.ok(!screen('admin', 'applications', suspendedData).includes('Driveway Diagnostics'));
assert.ok(!directoryEntries(providers, suspendedData).some((item) => item.name === 'Driveway Diagnostics'));
const queueHtml = screen('admin', 'applications');
assert.ok(queueHtml.includes('Urban Auto Care'));
assert.ok(!queueHtml.includes('Driveway Diagnostics'));
assert.ok(queueHtml.includes('aria-label="City"'));
assert.ok(queueHtml.includes('aria-label="Professional type"'));
assert.ok(queueHtml.includes('Review history'));
const historyHtml = screen('admin', 'applications/history');
assert.ok(historyHtml.includes('No review history yet.'));
const professionalsHtml = screen('admin', 'professionals');
assert.ok(professionalsHtml.includes('aria-expanded="true"'));
assert.ok(professionalsHtml.includes('nav-parent-active'));
const openUsers = professionalsHtml.match(/<div[^>]*id="nav-users-items"[^>]*>/);
assert.ok(openUsers);
assert.ok(!openUsers[0].includes('hidden'));
assert.ok(professionalsHtml.includes('View profile'));
assert.ok(professionalsHtml.includes('Not recorded'));
assert.ok(!professionalsHtml.includes('tabindex="-1"'));
const customersHtml = screen('admin', 'customers');
assert.ok(customersHtml.includes('aria-expanded="true"'));
assert.ok(customersHtml.includes('Alex Morgan'));
assert.ok(customersHtml.includes('alex@example.com'));
assert.ok(customersHtml.includes('Sample record'));
assert.ok(customersHtml.includes('View details'));
const noCustomers = structuredClone(initialData);
noCustomers.customers = [];
noCustomers.settings = { ...noCustomers.settings, name: ' ', email: ' ' };
assert.equal(customerRecords(noCustomers).length, 0);
assert.ok(screen('admin', 'customers', noCustomers).includes('No customer records.'));
assert.ok(!screen('admin', 'customers', noCustomers).includes('Precision Motorworks'));
const separated = structuredClone(initialData);
delete separated.adminAccount;
separated.settings.name = 'Alex Morgan';
separated.profile.name = 'Harbour Workshop';
const separatedData = normalizeDemoData(separated);
assert.equal(separatedData.adminAccount.name, 'Naledi Khumalo');
assert.equal(separatedData.adminAccount.email, 'admin@example.com');
assert.equal(separatedData.settings.name, 'Alex Morgan');
assert.notEqual(separatedData.adminAccount.name, separatedData.settings.name);
assert.notEqual(separatedData.adminAccount.email, separatedData.mechanicAccount.email);
assert.equal(separatedData.customers[0].id, 'cust-01');
assert.equal(separatedData.customers[0].name, 'Alex Morgan');
const renamedAdmin = structuredClone(initialData);
renamedAdmin.adminAccount = { name: 'Thabo Ndlovu', email: 'thabo@example.com' };
const renamedAdminHtml = screen('admin', 'overview', renamedAdmin);
assert.ok(renamedAdminHtml.includes('Thabo Ndlovu'));
assert.ok(/>\s*TN\s*</.test(renamedAdminHtml));
assert.ok(!renamedAdminHtml.includes('Alex Morgan'));
const blankAdmin = structuredClone(initialData);
blankAdmin.adminAccount = { name: '   ', email: 'admin@example.com' };
const blankAdminHtml = screen('admin', 'overview', blankAdmin);
assert.ok(blankAdminHtml.includes('>Admin<'));
assert.ok(/>\s*\?\s*</.test(blankAdminHtml));
const customerDetail = renderToString(
  <WorkspaceDialog
    dialog={{
      kind: 'customer',
      customer: customerRecords(initialData)[0],
      bookings: initialData.jobs,
    }}
    setDialog={() => {}}
  />,
);
assert.ok(customerDetail.includes('Alex Morgan'));
assert.ok(customerDetail.includes('VA-2026-1042'));
assert.ok(customerDetail.includes('read-only sample record'));
assert.ok(!customerDetail.includes('Simulate payment'));
const financeJobs = [
  {
    ...initialData.jobs[0],
    id: 'VA-AWAIT',
    status: 'Awaiting payment',
    paid: false,
    quoteApproved: true,
    customerId: 'cust-01',
    provider: 'Precision Motorworks',
  },
  {
    ...initialData.jobs[0],
    id: 'VA-PAID',
    status: 'Completed',
    paid: true,
    quoteApproved: true,
    paidAt: '2026-10-12',
    paymentReference: 'DEMO-100',
    customerId: 'cust-01',
    provider: 'On the Move Auto',
  },
  {
    ...initialData.jobs[0],
    id: 'VA-PAID',
    status: 'Completed',
    paid: true,
    quoteApproved: true,
    customerId: 'cust-01',
  },
];
assert.equal(recordedCustomerPayments(financeJobs).length, 1);
assert.equal(awaitingCustomerPayments(financeJobs).length, 1);
assert.equal(paymentRecordTotal(recordedCustomerPayments(financeJobs)), quoteTotal(financeJobs[1]));
assert.equal(paymentRecordTotal(awaitingCustomerPayments(financeJobs)), quoteTotal(financeJobs[0]));
const financeData = structuredClone(initialData);
financeData.jobs = financeJobs;
const financeHtml = screen('admin', 'finance', financeData);
assert.ok(financeHtml.includes('R' + paymentRecordTotal(recordedCustomerPayments(financeJobs)).toLocaleString()));
assert.ok(financeHtml.includes('R' + paymentRecordTotal(awaitingCustomerPayments(financeJobs)).toLocaleString()));
assert.ok(financeHtml.includes('Alex Morgan'));
assert.ok(financeHtml.includes('Precision Motorworks'));
assert.ok(financeHtml.includes('On the Move Auto'));
assert.ok(financeHtml.includes('2026-10-12'));
assert.ok(financeHtml.includes('DEMO-100'));
assert.ok(financeHtml.includes('does not confirm a bank payout'));
assert.equal((financeHtml.match(/VA-PAID/g) || []).length, 1);
assert.ok(!financeHtml.includes('Review &amp; pay'));
assert.ok(!financeHtml.includes('Simulate payment'));
assert.ok(!financeHtml.includes('commission'));
assert.ok(!financeHtml.includes('Paid to your bank'));
assert.ok(!financeHtml.includes('Available to withdraw'));
const analyticsHtml = screen('admin', 'reports');
assert.ok(analyticsHtml.includes('id="analytics-tab-analytics"'));
assert.ok(analyticsHtml.includes('Bookings by status'));
assert.ok(analyticsHtml.includes('Pending applications'));
assert.ok(analyticsHtml.includes('Current browser-demo records'));
const supportHtml = screen('admin', 'reports/support');
assert.ok(supportHtml.includes('Support cases'));
assert.ok(supportHtml.includes('Clarification requested on sample quote'));
assert.ok(supportHtml.includes('Review case'));
assert.ok(!supportHtml.includes('admin-notify active'));
assert.ok(screen('admin', 'notifications').includes('admin-notify active'));
assert.equal(migrated.jobs[0].customerId, 'cust-01');
const publicHeader = renderToString(
  <PublicHeader
    accountLabel="Alex Morgan"
    anchor={() => {}}
    go={() => {}}
    logout={() => {}}
    menu={true}
    page="home"
    role={null}
    setMenu={() => {}}
    setTheme={() => {}}
    theme="dark"
  />,
);
const headerTheme = publicHeader.indexOf('header-theme');
const menuButton = publicHeader.indexOf('mobile-menu');
const menuMarkup = publicHeader.slice(publicHeader.indexOf('id="site-menu"'), headerTheme);
assert.ok(headerTheme > -1 && menuButton > headerTheme);
assert.ok(publicHeader.includes('aria-label="Switch to light mode"'));
assert.ok(menuMarkup.includes('nav-theme'));
assert.ok(!menuMarkup.includes('header-theme'));
assert.ok(publicHeader.includes('aria-label="Close navigation"'));
assert.ok(customerProfile.includes('Cell phone number'));
assert.ok(customerProfile.includes('Change password'));
assert.ok(customerProfile.includes('Unavailable until secure authentication is connected'));
assert.ok(!customerProfile.includes('Explore another workspace'));
assert.ok(!customerProfile.includes('Find a professional'));
const garageHtml = screen('customer', 'garage');
assert.ok(garageHtml.includes('Add vehicle'));
assert.ok(garageHtml.includes('My Garage'));
assert.ok(garageHtml.includes('View details'));
assert.ok(garageHtml.includes('aria-label="Previous vehicle"'));
assert.ok(garageHtml.includes('aria-label="Next vehicle"'));
assert.ok(garageHtml.includes('Illustrative model — not an exact match'));
assert.ok(garageHtml.includes('Credits'));
assert.ok(garageHtml.includes('CC BY 4.0'));
assert.ok(garageHtml.includes('Volkswagen Polo'));
assert.ok(!garageHtml.includes('car-concept-thumb'));
assert.ok(!garageHtml.includes('Find a professional'));
assert.ok(!garageHtml.includes('360'));
assert.ok(!garageHtml.includes('Model details'));
assert.ok(!garageHtml.includes('Rotate left'));
assert.ok(!garageHtml.includes('Reset to original colour'));
assert.ok(!garageHtml.includes('Body colour'));
assert.ok(!garageHtml.includes('Manage everything you need'));
assert.equal(garageHtml.split('View details').length - 1, 1);
const bookingHtml = screen('customer', 'bookings/VA-2026-1042');
assert.ok(bookingHtml.includes('Front brake pads'));
assert.ok(bookingHtml.includes('No dated timeline was stored'));
assert.ok(bookingHtml.includes('Choose which service records this professional can see'));
assert.ok(bookingHtml.includes('Activity history'));
assert.equal(bookingHtml.includes('Next step'), false);
assert.equal(bookingHtml.split('progress-list').length - 1, 1);
assert.ok(bookingHtml.indexOf('detail-header') < bookingHtml.indexOf('progress-list'));
assert.ok(bookingHtml.indexOf('progress-list') < bookingHtml.indexOf('role="tablist"'));
assert.ok(bookingHtml.includes('role="tablist"'));
assert.ok(bookingHtml.includes('Quotes &amp; payments') || bookingHtml.includes('Quotes & payments'));
assert.ok(bookingHtml.includes('Review and approve'));
assert.ok(bookingHtml.includes('booking-detail-panel-quote'));
assert.ok(bookingHtml.includes('hidden'));
const bookingList = screen('customer', 'bookings');
assert.ok(bookingList.includes('booking-card-hit'));
assert.ok(bookingList.includes('2020 Volkswagen Polo'));
const vehicleHtml = screen('customer', 'garage/v1');
assert.ok(vehicleHtml.includes('Back to My Garage'));
assert.ok(vehicleHtml.includes('detail-header'));
assert.ok(!vehicleHtml.includes('vehicle-canvas-host'));
assert.ok(vehicleHtml.includes('Licence disc expiry'));
assert.ok(vehicleHtml.includes('vehicle-detail-tab-overview'));
assert.ok(vehicleHtml.includes('vehicle-detail-tab-history'));
assert.ok(vehicleHtml.includes('Archive vehicle') || vehicleHtml.includes('Remove vehicle'));
const baseCss = readFileSync(join(process.cwd(), 'src/styles/base.css'), 'utf8');
assert.equal(/^header \{/m.test(baseCss), false);
assert.ok(baseCss.includes('header.site-header'));
const customerCss = readFileSync(join(process.cwd(), 'src/styles/customer.css'), 'utf8');
assert.ok(customerCss.includes('font-size: 16px'));
assert.ok(/\.workspace-top \.workspace-mark \{\s*display:\s*none/.test(workspaceCss));
const cardsCss = readFileSync(join(process.cwd(), 'src/styles/cards.css'), 'utf8');
assert.ok(cardsCss.includes('--card-border-width: 2px'));
assert.ok(cardsCss.includes('linear-gradient'));
assert.equal(cardsCss.includes('--card-background: var(--tint)'), false);
const profileHtml = screen('customer', 'find/pro-precision-motorworks');
assert.ok(profileHtml.includes('Precision Motorworks'));
assert.ok(profileHtml.includes('No reviews yet'));
assert.ok(profileHtml.includes('Book assessment'));
assert.ok(screen('customer', 'find/missing-pro').includes('Professional not found'));
assert.ok(screen('customer', 'find/pro-urban-auto-care').includes('not available'));
assert.equal(canVisit('customer', 'dashboard/find/pro-precision-motorworks'), true);
assert.equal(canVisit('customer', 'dashboard/bookings/VA-2026-1042'), true);
assert.equal(canVisit('customer', 'dashboard/garage/v1'), true);
assert.equal(canVisit('customer', 'dashboard/garage/v1/edit'), false);
assert.equal(canVisit('mechanic', 'dashboard/find/pro-precision-motorworks'), false);
assert.equal(canVisit('mechanic', 'dashboard/bookings/VA-2026-1042'), false);
assert.equal(canVisit('admin', 'dashboard/garage/v1'), false);
assert.equal(canVisit('customer', 'dashboard/jobs/VA-1'), false);
assert.equal(catalogueModel(initialData.vehicles[0]), null);
const linked = normalizeDemoData(initialData);
assert.equal(linked.jobs[0].vehicleId, 'v1');
assert.equal(linked.jobs[0].professionalId, 'pro-precision-motorworks');
assert.equal(linked.records[0].vehicleId, 'v1');
assert.ok(!linked.jobs[0].events);
assert.ok(Array.isArray(linked.customerReviews));
assert.equal(linked.reviews[0].id, 'app-02');
assert.notEqual(linked.settings.email, linked.mechanicAccount.email);
const ambiguous: any = structuredClone(initialData);
ambiguous.vehicles = [
  { id: 'a', year: '2020', make: 'Volkswagen', model: 'Polo', registration: 'A', mileage: '1' },
  { id: 'b', year: '2020', make: 'Volkswagen', model: 'Polo', registration: 'B', mileage: '2' },
];
ambiguous.jobs = [
  { id: 'j-amb', vehicle: '2020 Volkswagen Polo', provider: 'Precision Motorworks', status: 'Requested' },
];
ambiguous.records = [{ id: 'r-amb', vehicle: '2020 Volkswagen Polo', provider: 'Unknown Shop', title: 'Check' }];
const ambiguousData = normalizeDemoData(ambiguous);
assert.ok(!ambiguousData.jobs[0].vehicleId);
assert.equal(ambiguousData.jobs[0].professionalId, 'pro-precision-motorworks');
assert.equal(ambiguousData.jobs[0].vehicle, '2020 Volkswagen Polo');
assert.ok(!ambiguousData.records[0].vehicleId);
assert.ok(!ambiguousData.records[0].professionalId);
const twin: any = structuredClone(initialData);
twin.application = { status: 'Approved', submittedAt: '', note: '', previouslyApproved: true };
twin.profile = { ...twin.profile, name: 'Precision Motorworks' };
twin.vehicles = [{ id: 'solo', year: '2019', make: 'Other', model: 'Car', registration: 'Z', mileage: '1' }];
twin.jobs = [
  { id: 'twin', provider: 'Precision Motorworks', vehicle: '2019 Other Car', status: 'Requested', customerId: 'cust-01' },
];
const twinData = normalizeDemoData(twin);
assert.equal(twinData.jobs[0].vehicleId, 'solo');
assert.ok(!twinData.jobs[0].professionalId);
const withPhone = saveCustomerProfile(initialData, {
  name: 'Alex Morgan',
  email: 'alex@example.com',
  phone: '+27 82 123 4567',
  emailUpdates: true,
  photo: 'data:image/jpeg,abc',
});
assert.equal(withPhone.settings.phone, '+27821234567');
assert.equal(withPhone.customers[0].phone, '+27821234567');
assert.equal(withPhone.settings.photo, 'data:image/jpeg,abc');
assert.equal(withPhone.profile.photo, undefined);
assert.ok(phoneError('123'));
assert.equal(phoneError('0821234567'), '');
const syncedPhone = normalizeDemoData({
  ...initialData,
  settings: { ...initialData.settings, phone: '0821234567' },
  customers: [{ ...initialData.customers[0], phone: '' }],
});
assert.equal(syncedPhone.customers[0].phone, '0821234567');
assert.equal(customerRecords(syncedPhone)[0].phone, '0821234567');
assert.equal(persistDemoState({ setItem() { throw new Error('quota'); } }, { ok: 1 }), false);
let storedDemo = '';
assert.equal(
  persistDemoState({ setItem(_key: string, value: string) { storedDemo = value; } }, { ok: 1 }),
  true,
);
assert.ok(storedDemo.includes('"ok":1'));
const created = createBooking(initialData, {
  professional: { id: 'pro-precision-motorworks', name: 'Precision Motorworks', fee: 450 },
  vehicle: initialData.vehicles[0],
  date: '2026-12-01',
  time: '09:00',
  description: 'Brakes squeal under light use',
  customerId: 'cust-01',
  clientRequestId: 'req-1',
  now: '2026-10-16T12:00:00.000Z',
});
assert.equal(created.duplicate, false);
assert.equal(created.job.vehicleId, 'v1');
assert.equal(created.job.professionalId, 'pro-precision-motorworks');
assert.equal(created.job.description, 'Brakes squeal under light use');
assert.equal(created.job.createdAt, '2026-10-16T12:00:00.000Z');
assert.equal(created.job.customerId, 'cust-01');
const duplicateBooking = createBooking(created.data, {
  professional: { id: 'pro-precision-motorworks', name: 'Precision Motorworks', fee: 450 },
  vehicle: initialData.vehicles[0],
  date: '2026-12-01',
  time: '09:00',
  description: 'Brakes squeal under light use',
  customerId: 'cust-01',
  clientRequestId: 'req-1',
});
assert.equal(duplicateBooking.duplicate, true);
assert.equal(duplicateBooking.data.jobs.filter((job: any) => job.clientRequestId === 'req-1').length, 1);
const edited = updateRequestedBooking(created.data, {
  bookingId: created.job.id,
  customerId: 'cust-01',
  vehicleId: 'v1',
  date: '2026-12-02',
  time: '11:00',
  description: 'Still squealing',
});
assert.equal(edited.jobs[0].description, 'Still squealing');
assert.equal(edited.jobs[0].status, 'Requested');
assert.throws(() =>
  updateRequestedBooking(
    { ...edited, jobs: [{ ...edited.jobs[0], status: 'Confirmed', accepted: true }] },
    {
      bookingId: created.job.id,
      customerId: 'cust-01',
      vehicleId: 'v1',
      date: '2026-12-02',
      time: '11:00',
      description: 'Still squealing',
    },
  ),
);
const appointmentForm = renderToString(
  <BookingDialog
    anchor={() => {}}
    customerId="cust-01"
    date=""
    description=""
    go={() => {}}
    modal={sampleProfessional}
    notify={() => {}}
    requestId="req-ui"
    setDate={() => {}}
    setDescription={() => {}}
    setModal={() => {}}
    setRequestId={() => {}}
    setStep={() => {}}
    setTime={() => {}}
    setVehicleId={() => {}}
    step={1}
    time="09:00"
    update={() => true}
    vehicleId=""
    vehicles={initialData.vehicles}
  />,
);
assert.ok(appointmentForm.includes('What needs attention?'));
assert.ok(appointmentForm.includes('DEMO 001'));
assert.ok(appointmentForm.includes('not confirmed availability'));
assert.ok(!appointmentForm.includes('Choose an appointment'));
const appSource = readFileSync('src/App.tsx', 'utf8');
assert.ok(appSource.includes('setStep(1)'));
assert.ok(appSource.includes('!showWorkspace && !showAuth'));
assert.ok(appSource.includes("!page.startsWith('dashboard/') && !showAuth"));
assert.ok(appSource.includes('<Auth'));
assert.ok(appSource.includes("key={page.split('?')[0]}"));
assert.ok(appSource.includes('setPending(p)'));
const payable = {
  ...initialData.jobs[0],
  status: 'Awaiting payment',
  quoteApproved: true,
  paid: false,
};
assert.throws(() => transitionJob({ ...payable, status: 'Awaiting approval', quoteApproved: false }, 'pay'));
const customerActor = { role: 'customer' as const, id: 'cust-01' };
const paidOnce = applyJobTransition({ ...initialData, jobs: [payable], records: [] }, payable, 'pay', {}, customerActor);
assert.equal(paidOnce.job.status, 'Completed');
assert.equal(paidOnce.job.paid, true);
assert.ok(paidOnce.job.paidAt);
assert.equal(paidOnce.job.paymentReference, `DEMO-${payable.id}`);
assert.equal(paidOnce.data.records.filter((record: any) => record.id === payable.id).length, 1);
assert.throws(() => applyJobTransition(paidOnce.data, paidOnce.job, 'pay', {}, customerActor));
assert.equal(recordedCustomerPayments(paidOnce.data.jobs).length, 1);
const archived = removeOrArchiveVehicle(initialData, 'v1');
assert.equal(archived.vehicles.find((vehicle: any) => vehicle.id === 'v1').archived, true);
assert.equal(archived.records.length, initialData.records.length);
const removed = removeOrArchiveVehicle(
  {
    ...initialData,
    vehicles: [
      ...initialData.vehicles,
      { id: 'v9', make: 'Test', model: 'Car', year: '2021', registration: 'ZZ', mileage: '1' },
    ],
  },
  'v9',
);
assert.ok(!removed.vehicles.some((vehicle: any) => vehicle.id === 'v9'));
const historyJob = {
  ...initialData.jobs[0],
  id: 'VA-H',
  status: 'Confirmed',
  accepted: true,
  professionalId: 'pro-precision-motorworks',
  vehicleId: 'v1',
  customerId: 'cust-01',
  quoteApproved: false,
  paid: false,
  items: [],
};
const historyData = {
  ...initialData,
  jobs: [historyJob],
  records: [{ ...initialData.records[0], vehicleId: 'v1' }],
  historyAccess: [],
};
assert.throws(() =>
  grantHistoryAccess(
    { ...historyData, jobs: [{ ...historyJob, status: 'Requested', accepted: false }] },
    { bookingId: 'VA-H', customerId: 'cust-01', recordIds: ['r1'] },
  ),
);
const granted = grantHistoryAccess(historyData, {
  bookingId: 'VA-H',
  customerId: 'cust-01',
  recordIds: ['r1'],
  now: '2026-10-16T12:00:00.000Z',
});
assert.equal(granted.historyAccess[0].status, 'active');
assert.equal(granted.historyAccess[0].professionalId, 'pro-precision-motorworks');
const revoked = revokeHistoryAccess(granted, granted.historyAccess[0].id, 'cust-01');
assert.equal(revoked.historyAccess[0].status, 'revoked');
assert.throws(() => revokeHistoryAccess(granted, granted.historyAccess[0].id, 'cust-02'));
const cancelledAccess = applyJobTransition(granted, historyJob, 'cancel', {}, customerActor);
assert.equal(cancelledAccess.data.historyAccess[0].status, 'revoked');
const payableHistory = {
  ...historyData,
  jobs: [{ ...historyJob, status: 'Awaiting payment', quoteApproved: true, items: [{ name: 'Labour', amount: 100 }] }],
};
const grantedPayment = grantHistoryAccess(payableHistory, {
  bookingId: 'VA-H',
  customerId: 'cust-01',
  recordIds: ['r1'],
});
const expiredAccess = applyJobTransition(grantedPayment, payableHistory.jobs[0], 'pay', {}, customerActor);
assert.equal(expiredAccess.data.historyAccess[0].status, 'expired');
assert.equal(expiredAccess.data.historyAccess[0].expiresAt, expiredAccess.job.paidAt);
const reviewData = {
  ...initialData,
  customerReviews: [],
  jobs: [
    {
      id: 'VA-R',
      customerId: 'cust-01',
      professionalId: 'pro-precision-motorworks',
      status: 'Completed',
      paid: true,
    },
  ],
};
const reviewed = saveCustomerReview(reviewData, {
  customerId: 'cust-01',
  professionalId: 'pro-precision-motorworks',
  bookingId: 'VA-R',
  rating: 5,
  text: 'Careful and clear work',
});
assert.equal(reviewed.customerReviews.length, 1);
assert.throws(() =>
  saveCustomerReview(reviewed, {
    customerId: 'cust-01',
    professionalId: 'pro-precision-motorworks',
    bookingId: 'VA-R',
    rating: 4,
    text: 'A second review is not allowed',
  }),
);
assert.throws(() => deleteCustomerReview(reviewed, reviewed.customerReviews[0].id, 'cust-02'));
assert.equal(deleteCustomerReview(reviewed, reviewed.customerReviews[0].id, 'cust-01').customerReviews.length, 0);
const customerPayGroups = screen('customer', 'payments', {
  ...initialData,
  jobs: [
    { ...initialData.jobs[0], id: 'VA-OLD', status: 'Completed', paid: true, quoteApproved: true },
    {
      ...initialData.jobs[0],
      id: 'VA-NEW',
      status: 'Completed',
      paid: true,
      quoteApproved: true,
      paidAt: '2026-10-02T09:00:00.000Z',
      paymentReference: 'DEMO-VA-NEW',
    },
  ],
} as any);
assert.ok(customerPayGroups.includes('Date not recorded'));
assert.ok(customerPayGroups.includes('2026-10-02'));
assert.ok(customerPayGroups.indexOf('2026-10-02') < customerPayGroups.indexOf('Date not recorded'));
assert.ok(!customerPayGroups.includes('Find a professional'));
assert.equal(linked.jobs[0].reference, 'VA-2026-1042');
assert.equal(bookingReference(linked.jobs[0]), 'VA-2026-1042');
const removedTwin = normalizeDemoData({
  ...ambiguousData,
  vehicles: ambiguousData.vehicles.filter((vehicle: any) => vehicle.id === 'a'),
});
assert.equal(removedTwin.jobs[0].vehicleLink, 'ambiguous');
assert.equal(removedTwin.jobs[0].vehicleId, '');
assert.equal(removedTwin.records[0].vehicleId, '');
const renamedTwin = normalizeDemoData({
  ...ambiguousData,
  vehicles: ambiguousData.vehicles.map((vehicle: any) =>
    vehicle.id === 'b' ? { ...vehicle, make: 'Audi', model: 'A3', registration: 'B' } : vehicle,
  ),
});
assert.equal(renamedTwin.jobs[0].vehicleId, '');
assert.equal(renamedTwin.jobs[0].vehicle, '2020 Volkswagen Polo');
const archivedTwin = removeOrArchiveVehicle(ambiguousData, 'a');
assert.equal(archivedTwin.vehicles.find((vehicle: any) => vehicle.id === 'a').archived, true);
assert.equal(archivedTwin.jobs.length, ambiguousData.jobs.length);
assert.equal(archivedTwin.records.length, ambiguousData.records.length);
assert.equal(archivedTwin.jobs[0].vehicleId, '');
const repeated = normalizeDemoData(normalizeDemoData(archivedTwin));
assert.equal(repeated.jobs[0].vehicleLink, 'ambiguous');
assert.equal(repeated.records[0].vehicleId, '');
assert.throws(() =>
  resolveHistoryVehicle(ambiguousData, { recordId: 'r-amb', vehicleId: 'a', confirmed: false }),
);
const manuallyLinked = resolveHistoryVehicle(ambiguousData, {
  recordId: 'r-amb',
  vehicleId: 'a',
  confirmed: true,
  now: '2026-10-16T00:00:00.000Z',
});
assert.equal(manuallyLinked.records[0].vehicleId, 'a');
assert.equal(manuallyLinked.records[0].vehicleLink, 'resolved');
assert.equal(manuallyLinked.records[0].linkResolution.registration, 'A');
assert.equal(manuallyLinked.records[0].linkResolution.previous, 'ambiguous');
assert.equal(normalizeDemoData(manuallyLinked).records[0].vehicleId, 'a');
assert.equal(normalizeDemoData(manuallyLinked).jobs[0].vehicleId, '');
const renamedLinked = saveVehicle(linked, { ...linked.vehicles[0], make: 'Changed' });
assert.equal(renamedLinked.jobs[0].vehicle, '2020 Volkswagen Polo');
assert.equal(normalizeDemoData(renamedLinked).jobs[0].vehicleId, 'v1');
const sameTime = '2026-10-16T12:00:00.000Z';
const bookingInput = {
  professional: { id: 'pro-precision-motorworks', name: 'Precision Motorworks', fee: 450 },
  vehicle: initialData.vehicles[0],
  date: '2026-12-01',
  time: '09:00',
  description: 'Brakes squeal under light use',
  customerId: 'cust-01',
};
const firstBooking = createBooking(initialData, { ...bookingInput, clientRequestId: 'same-time-a', now: sameTime });
const secondBooking = createBooking(firstBooking.data, {
  ...bookingInput,
  clientRequestId: 'same-time-b',
  now: sameTime,
});
assert.notEqual(firstBooking.job.id, secondBooking.job.id);
assert.notEqual(firstBooking.job.reference, secondBooking.job.reference);
assert.match(firstBooking.job.id, /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
assert.equal(
  createBooking(secondBooking.data, { ...bookingInput, clientRequestId: 'same-time-a', now: sameTime }).job.id,
  firstBooking.job.id,
);
assert.equal(bookingReference(firstBooking.job), firstBooking.job.reference);
const paidRecord = applyJobTransition(
  { ...initialData, jobs: [{ ...firstBooking.job, status: 'Awaiting payment', quoteApproved: true, items: [{ name: 'Labour', amount: 80 }] }], records: [] },
  { ...firstBooking.job, status: 'Awaiting payment', quoteApproved: true },
  'pay',
  {},
  customerActor,
);
assert.equal(paidRecord.data.records[0].id, firstBooking.job.id);
assert.equal(safeRouteId('%E0%A4%A'), null);
assert.equal(safeRouteId('a%2Fb'), null);
assert.equal(safeRouteId('pro-precision-motorworks'), 'pro-precision-motorworks');
assert.equal(detailId('bookings/%E0%A4%A', 'bookings'), null);
assert.equal(detailId('find/pro-precision-motorworks', 'find'), 'pro-precision-motorworks');
assert.doesNotThrow(() => screen('customer', 'bookings/%E0%A4%A'));
assert.ok(screen('customer', 'bookings/%E0%A4%A').includes('This link is not valid'));
assert.ok(screen('customer', 'bookings/a%2Fb').includes('This link is not valid'));
assert.ok(screen('customer', 'bookings/missing-booking').includes('Booking not found'));
assert.equal(canVisit('customer', 'dashboard/bookings/a/b'), false);
assert.equal(canVisit('mechanic', 'dashboard/garage/v1'), false);
const failureMessages: string[] = [];
let unchanged = initialData;
assert.equal(
  commitUpdate(
    () => false,
    (data) => ({ ...data, reviews: [] }),
    (message) => failureMessages.push(message),
    'Demo application approved',
  ),
  false,
);
assert.equal(failureMessages.length, 1);
assert.ok(!failureMessages[0].includes('approved'));
assert.equal(
  commitUpdate(
    (change) => {
      change(unchanged);
      return false;
    },
    (data) =>
      saveCustomerProfile(data, {
        name: 'Replacement Name',
        email: 'replacement@example.com',
        phone: '0821234567',
        emailUpdates: true,
      }),
    (message) => failureMessages.push(message),
    'Demo profile saved',
  ),
  false,
);
assert.equal(unchanged.settings.name, initialData.settings.name);
assert.equal(
  commitUpdate(
    () => {
      throw new Error('disk full');
    },
    (data) => data,
    (message) => failureMessages.push(message),
    'Request saved',
  ),
  false,
);
assert.ok(failureMessages.includes('disk full'));
assert.equal(
  commitUpdate(
    () => false,
    (data) =>
      createBooking(data, { ...bookingInput, clientRequestId: 'failed-save', now: sameTime }).data,
    (message) => failureMessages.push(message),
    'Request saved',
  ),
  false,
);
assert.ok(failureMessages.some((message) => message.startsWith('Could not save')));
assert.ok(!failureMessages.includes('Request saved'));
const ambiguousGarage = screen('customer', 'garage', ambiguousData);
assert.ok(ambiguousGarage.includes('History not linked to a vehicle'));
assert.ok(ambiguousGarage.includes('Check'));
assert.ok(!screen('customer', 'garage/a', ambiguousData).includes('Check'));
assert.equal(catalogueModel(initialData.vehicles[0]), null);
assert.equal(modelForVehicle(initialData.vehicles[0]).accuracy, 'illustrative');
assert.equal(modelForVehicle(initialData.vehicles[0]).asset.id, 'khronos-car-concept');
assert.equal(modelForVehicle(initialData.vehicles[0]).originalGeometry, false);
const poloHatch = resolveVehicleAsset({ make: 'Volkswagen', model: 'Polo', year: '2020', bodyStyle: 'hatchback' });
const poloLater = resolveVehicleAsset({ make: 'Volkswagen', model: 'Polo', year: '2022', bodyStyle: 'hatchback' });
const poloAmbiguous = resolveVehicleAsset({ make: 'Volkswagen', model: 'Polo', year: '2020' });
const conceptExact = resolveVehicleAsset({
  make: 'Demonstration',
  model: 'Concept Car',
  year: '2024',
  variant: 'show car',
});
const conceptApprox = resolveVehicleAsset({
  make: 'Demonstration',
  model: 'Concept Car',
  year: '2021',
  bodyStyle: 'concept coupe',
});
const missingModel = resolveVehicleAsset({ make: 'Toyota', model: 'Corolla', year: '2019', bodyStyle: 'sedan' });
assert.equal(poloHatch.status, 'illustrative');
assert.equal(poloHatch.entry.id, 'polo-2018-hatch');
assert.notEqual(poloHatch.accuracy, 'exact');
assert.equal(poloLater.entry.id, 'polo-2022-hatch');
assert.notEqual(poloLater.entry.id, poloHatch.entry.id);
const contradicted = resolveVehicleAsset({
  make: 'Volkswagen',
  model: 'Polo',
  year: '2020',
  bodyStyle: 'hatchback',
  variant: 'sedan',
});
assert.equal(contradicted.status, 'illustrative');
assert.equal(contradicted.entry, null);
assert.equal(contradicted.asset.id, 'khronos-car-concept');
assert.equal(poloAmbiguous.status, 'ambiguous');
assert.equal(poloAmbiguous.asset, null);
assert.equal(poloAmbiguous.choices.length, 2);
assert.equal(conceptExact.status, 'exact');
assert.equal(conceptExact.label, '');
assert.equal(catalogueModel({ make: 'Demonstration', model: 'Concept Car', year: '2024', variant: 'show car' })?.id, 'demo-concept-2024');
assert.equal(conceptApprox.status, 'approximate');
assert.ok(conceptApprox.label.includes('Approximate model'));
assert.equal(missingModel.entry, null);
assert.equal(missingModel.status, 'illustrative');
const paintSource = [
  { name: 'Paint 1 Carmine', color: '#aa0000' },
  { name: 'Glass', color: '#99ccff' },
  { name: 'Tiretread', color: '#111111' },
];
const paintedA = recolorBodyPaint(paintSource, '#112233');
const paintedB = recolorBodyPaint(paintSource, '#445566');
assert.equal(paintedA[0].color, '#112233');
assert.equal(paintedB[0].color, '#445566');
assert.equal(paintedA[1].color, '#99ccff');
assert.equal(paintedA[2].color, '#111111');
assert.equal(paintSource[0].color, '#aa0000');
const coloured = saveVehicle(initialData, { ...initialData.vehicles[0], paintColor: '#123456' });
assert.equal(coloured.vehicles[0].id, 'v1');
assert.equal(coloured.vehicles[0].paintColor, '#123456');
assert.equal(coloured.jobs[0].id, initialData.jobs[0].id);
const secondColour = saveVehicle(coloured, {
  id: 'v2',
  make: 'Toyota',
  model: 'Corolla',
  year: '2019',
  registration: 'ZZ 1',
  mileage: '10',
  paintColor: '#abcdef',
});
assert.equal(secondColour.vehicles.find((vehicle: any) => vehicle.id === 'v1').paintColor, '#123456');
assert.equal(secondColour.vehicles.find((vehicle: any) => vehicle.id === 'v2').paintColor, '#abcdef');
assert.equal(secondColour.jobs.length, coloured.jobs.length);
let unsavedColour = initialData;
assert.equal(
  commitUpdate(
    (change) => {
      change(unsavedColour);
      return false;
    },
    (data) => saveVehicle(data, { ...data.vehicles[0], paintColor: '#ffffff' }),
    () => {},
    'Saved',
  ),
  false,
);
assert.equal((unsavedColour.vehicles[0] as any).paintColor, undefined);
assert.equal(vehicleCardImage(poloHatch), '');
assert.equal(vehicleCardImage(conceptExact), '/models/car-concept-thumb.jpg');
assert.equal(vehicleCardLabel({ make: 'Volkswagen', model: 'Polo', registration: 'DEMO 001' }, [{ make: 'Volkswagen', model: 'Polo' }]), 'Volkswagen Polo');
assert.equal(
  vehicleCardLabel({ make: 'Volkswagen', model: 'Polo', registration: 'DEMO 001' }, [
    { make: 'Volkswagen', model: 'Polo' },
    { make: 'Volkswagen', model: 'Polo' },
  ]),
  'Volkswagen Polo, DEMO 001',
);
assert.equal(selectVehicleId([{ id: 'v1' }], 'v1', 1), 'v1');
assert.equal(selectVehicleId([{ id: 'v1' }, { id: 'v2' }], 'v1', 1), 'v2');
assert.equal(selectVehicleId([{ id: 'v1' }, { id: 'v2' }], 'v2', -1), 'v1');
assert.equal(selectVehicleId([{ id: 'v1' }, { id: 'v2' }], 'archived', 1), 'v2');
assert.equal(selectVehicleId([], 'v1', 1), '');
const loads = createLoadGeneration();
const olderLoad = loads.begin();
const newerLoad = loads.begin();
assert.equal(loads.isCurrent(olderLoad), false);
assert.equal(loads.isCurrent(newerLoad), true);
for (const status of ['Requested', 'Confirmed', 'Awaiting approval', 'Changes requested', 'Approved', 'In progress', 'Awaiting payment', 'Completed']) {
  const progress = bookingProgress({ status });
  assert.equal(progress.steps.some((step) => step.state === 'current' || status === 'Completed'), true);
  if (status !== 'Completed' && status !== 'Rejected' && status !== 'Cancelled') {
    assert.equal(progress.terminal, '');
  }
}
assert.equal(bookingProgress({ status: 'Completed' }).steps.every((step) => step.state === 'complete'), true);
assert.equal(bookingProgress({ status: 'Rejected', rejectionReason: 'Unavailable' }).terminal, 'rejected');
assert.equal(bookingProgress({ status: 'Rejected' }).steps.some((step) => step.state === 'complete'), false);
assert.equal(bookingProgress({ status: 'Cancelled', accepted: true }).steps[1].state, 'stopped');
assert.equal(bookingProgress({ status: 'Awaiting approval' }).steps[2].state, 'current');
assert.equal(bookingProgress({ status: 'Changes requested' }).steps[2].state, 'current');
const returns = rememberReturn({}, 'dashboard/garage/v1', 'dashboard/bookings/VA-2026-1042');
assert.equal(resolveReturn(returns, 'dashboard/garage/v1', 'dashboard/garage'), 'dashboard/bookings/VA-2026-1042');
assert.equal(resolveReturn({}, 'dashboard/bookings/VA-2026-1042', 'dashboard/bookings'), 'dashboard/bookings');
assert.equal(customerReturnAllowed('https://example.com'), false);
assert.equal(customerReturnAllowed('dashboard/jobs/VA-1'), false);
assert.equal(rememberReturn({}, 'dashboard/find/pro-precision-motorworks', 'dashboard/bookings/VA-2026-1042')['dashboard/find/pro-precision-motorworks'], 'dashboard/bookings/VA-2026-1042');
const mechanicActor = { role: 'mechanic' as const, id: 'pro-precision-motorworks' };
const otherMechanic = { role: 'mechanic' as const, id: 'pro-on-the-move-auto' };
assert.equal(activeMechanicProfessionalId(initialData), 'pro-precision-motorworks');
assert.equal(jobsForMechanic(initialData.jobs, initialData).length, 1);
assert.equal(mechanicOwnsJob({ ...initialData, mechanicAccount: { professionalId: 'pro-on-the-move-auto' } }, initialData.jobs[0]), false);
assert.equal(canVisit('mechanic', 'dashboard/jobs/VA-2026-1042'), true);
assert.equal(canVisit('mechanic', 'dashboard/jobs/VA-2026-1042/messages'), true);
assert.equal(canVisit('mechanic', 'dashboard/jobs/VA-2026-1042/quote'), true);
assert.equal(canVisit('customer', 'dashboard/jobs/VA-2026-1042'), false);
assert.equal(canVisit('mechanic', 'dashboard/appointments/pending/VA-2026-1042'), true);
assert.equal(canVisit('customer', 'dashboard/bookings/VA-2026-1042/messages'), true);
assert.equal(canVisit('customer', 'dashboard/bookings/a/b'), false);
assert.equal(pageTitle('mechanic', 'jobs/VA-2026-1042'), 'Job');
const missingJob = screen('mechanic', 'jobs/does-not-exist');
assert.ok(missingJob.includes('Job unavailable'));
const foreign = {
  ...initialData,
  jobs: [{ ...initialData.jobs[0], id: 'other-shop', provider: 'On the Move Auto', professionalId: 'pro-on-the-move-auto', professionalLink: 'resolved' }],
};
assert.ok(screen('mechanic', 'jobs/other-shop', foreign).includes('Job unavailable'));
assert.ok(!screen('mechanic', 'jobs', foreign).includes('other-shop'));
const requested = {
  ...initialData.jobs[0],
  id: 'req-1',
  status: 'Requested',
  accepted: false,
  items: [],
  quoteApproved: false,
  professionalId: 'pro-precision-motorworks',
  customerId: 'cust-01',
  description: 'Brake noise',
};
const requestData = { ...initialData, jobs: [requested] };
assert.ok(screen('mechanic', 'appointments/pending', requestData).includes('Open appointment'));
assert.ok(!screen('mechanic', 'jobs', requestData).includes('req-1'));
const accepted = applyJobTransition(requestData, requested, 'confirm', {}, mechanicActor);
assert.equal(accepted.job.status, 'Confirmed');
assert.equal(accepted.data.jobs.filter((job: any) => job.status === 'Requested').length, 0);
assert.ok(notificationsFor(accepted.data, 'customer', 'cust-01').some((note: any) => note.type === 'accepted' && note.bookingId === 'req-1'));
assert.throws(() => applyJobTransition(requestData, requested, 'confirm', {}, otherMechanic));
const rejectedRequest = applyJobTransition(requestData, requested, 'reject', { reason: 'Fully booked that morning' }, mechanicActor);
assert.equal(rejectedRequest.job.status, 'Rejected');
assert.equal(rejectedRequest.job.rejectionReason, 'Fully booked that morning');
assert.ok(notificationsFor(rejectedRequest.data, 'customer', 'cust-01').some((note: any) => note.message.includes('Fully booked')));
const legacyLine = { name: 'Front brake pads', amount: 950 };
const quantityLine = { id: 'line-1', name: 'Labour', category: 'labour', quantity: 2, unitPriceCents: 45000, amount: 900 };
assert.equal(quoteTotalCents([legacyLine, quantityLine]), 185000);
assert.equal(formatZar(quoteTotalCents([legacyLine])), 'R950');
assert.equal(quoteTotal({ items: [legacyLine, { name: 'Labour & brake inspection', amount: 450 }] }), 1400);
const draft = saveQuoteDraft(accepted.data, {
  bookingId: 'req-1',
  rows: [{ id: 'd1', name: 'Pads', category: 'parts', quantity: '', price: '950' }],
  notes: 'Replace the front pads.',
}, mechanicActor);
assert.equal(draft.jobs[0].status, 'Confirmed');
assert.equal(draft.jobs[0].items.length, 0);
assert.equal(draft.jobs[0].quoteDraft.items[0].amount, 950);
const quoted = applyJobTransition(draft, draft.jobs[0], 'quote', {
  clientSubmitId: 'submit-1',
  rows: [{ id: 'd1', name: 'Pads', category: 'parts', quantity: '2', price: '475' }],
  notes: 'Replace the front pads.',
}, mechanicActor);
assert.equal(quoted.job.status, 'Awaiting approval');
assert.equal(quoted.job.quoteVersion, 1);
assert.equal(quoteTotal(quoted.job), 950);
assert.equal(quoted.job.items[0].quantity, 2);
assert.equal(quoted.job.items[0].unitPriceCents, 47500);
const quotedAgain = applyJobTransition(quoted.data, quoted.job, 'quote', {
  clientSubmitId: 'submit-1',
  rows: [{ id: 'd1', name: 'Pads', category: 'parts', quantity: '2', price: '475' }],
  notes: 'Replace the front pads.',
}, mechanicActor);
assert.equal(quotedAgain.duplicate, true);
assert.equal(quotedAgain.job.quoteVersions.length, 1);
const changed = applyJobTransition(quoted.data, quoted.job, 'changes', { changeRequest: 'Please split labour.' }, customerActor);
assert.equal(changed.job.status, 'Changes requested');
assert.equal(changed.job.quoteVersions[0].changeRequest, 'Please split labour.');
const revised = applyJobTransition(changed.data, changed.job, 'quote', {
  clientSubmitId: 'submit-2',
  rows: [
    { id: 'd1', name: 'Pads', category: 'parts', quantity: '', price: '700' },
    { id: 'd2', name: 'Labour', category: 'labour', quantity: '', price: '250' },
  ],
  notes: 'Pads and labour are listed separately.',
}, mechanicActor);
assert.equal(revised.job.quoteVersion, 2);
assert.equal(revised.job.quoteApproved, false);
assert.equal(revised.job.quoteVersions.length, 2);
assert.equal(quoteTotal(revised.job), 950);
const approved = applyJobTransition(revised.data, revised.job, 'approve', {}, customerActor);
assert.equal(approved.job.status, 'Approved');
assert.equal(approved.job.approvedQuoteVersion, 2);
assert.throws(() => applyJobTransition(approved.data, approved.job, 'quote', {
  rows: [{ id: 'd1', name: 'Secret', category: '', quantity: '', price: '10' }],
  notes: 'Should not replace an approval.',
}, mechanicActor));
assert.throws(() => applyJobTransition(approved.data, approved.job, 'approve', {}, mechanicActor));
const started = applyJobTransition(approved.data, approved.job, 'start', {}, mechanicActor);
const finished = applyJobTransition(started.data, started.job, 'complete', { completionNotes: 'Pads replaced.', completedMileage: '69000' }, mechanicActor);
assert.equal(finished.job.status, 'Awaiting payment');
assert.throws(() => applyJobTransition(finished.data, finished.job, 'pay', {}, mechanicActor));
const paid = applyJobTransition(finished.data, finished.job, 'pay', {}, customerActor);
assert.equal(paid.job.status, 'Completed');
assert.ok(notificationsFor(paid.data, 'mechanic', 'pro-precision-motorworks').some((note: any) => note.type === 'payment'));
assert.ok(!notificationDestination(paid.data, 'customer', notificationsFor(paid.data, 'mechanic', 'pro-precision-motorworks')[0]));
const customerQuote = notificationsFor(quoted.data, 'customer', 'cust-01').find((note: any) => note.type === 'quote');
assert.equal(notificationDestination(quoted.data, 'customer', customerQuote), 'dashboard/bookings/req-1/quote');
assert.equal(notificationDestination(quoted.data, 'mechanic', customerQuote), null);
const firstMessage = sendMessage(accepted.data, {
  bookingId: 'req-1',
  role: 'customer',
  id: 'cust-01',
  name: 'Alex Morgan',
  body: 'It squeals at low speed.',
  clientMessageId: 'msg-1',
  now: '2026-10-18T08:00:00.000Z',
});
const sameMessage = sendMessage(firstMessage.data, {
  bookingId: 'req-1',
  role: 'customer',
  id: 'cust-01',
  name: 'Alex Morgan',
  body: 'It squeals at low speed.',
  clientMessageId: 'msg-1',
});
assert.equal(sameMessage.duplicate, true);
assert.equal(firstMessage.data.messages.length, 1);
assert.equal(unreadMessageCount(firstMessage.data, 'req-1', 'mechanic'), 1);
assert.equal(unreadMessageCount(firstMessage.data, 'req-1', 'customer'), 0);
assert.throws(() => sendMessage(firstMessage.data, {
  bookingId: 'req-1',
  role: 'mechanic',
  id: 'pro-on-the-move-auto',
  name: 'Other',
  body: 'Hello',
  clientMessageId: 'msg-2',
}));
const otherBooking = sendMessage({
  ...firstMessage.data,
  jobs: [...firstMessage.data.jobs, { ...requested, id: 'req-2', professionalId: 'pro-precision-motorworks' }],
}, {
  bookingId: 'req-2',
  role: 'mechanic',
  id: 'pro-precision-motorworks',
  name: 'Precision Motorworks',
  body: 'Different booking.',
  clientMessageId: 'msg-3',
  now: '2026-10-18T09:00:00.000Z',
});
assert.equal(otherBooking.data.messages.filter((message: any) => message.bookingId === 'req-1').length, 1);
const messageNote = notificationsFor(firstMessage.data, 'mechanic', 'pro-precision-motorworks').find((note: any) => note.type === 'message');
assert.equal(notificationDestination(firstMessage.data, 'mechanic', messageNote), 'dashboard/jobs/req-1/messages');
assert.ok(!String(notificationDestination(firstMessage.data, 'mechanic', messageNote)).includes('http'));
const marked = markNotificationsRead(firstMessage.data, { role: 'mechanic', id: 'pro-precision-motorworks', ids: 'all' });
assert.equal(unreadNotificationCount(marked, 'mechanic', 'pro-precision-motorworks'), 0);
assert.equal(unreadNotificationCount(marked, 'customer', 'cust-01'), unreadNotificationCount(firstMessage.data, 'customer', 'cust-01'));
assert.equal(customerOwnsJob(initialData, { customerId: 'cust-02' }, 'cust-01'), false);
const failed: string[] = [];
assert.equal(commitUpdate(() => false, (data) => saveQuoteDraft(data, {
  bookingId: 'req-1',
  rows: [{ id: 'd1', name: 'Pads', category: 'parts', quantity: '', price: '950' }],
  notes: 'Replace the front pads.',
}, mechanicActor), (message) => failed.push(message), ''), false);
assert.equal(accepted.data.jobs[0].items.length, 0);
assert.equal(failed.length, 1);
const showcaseGarage = normalizeDemoData(withMechanicShowcase(structuredClone(initialData)));
// Showcase upgrades preserve user changes and never grant vehicle access implicitly.
assert.deepEqual(showcaseGarage.historyAccess, initialData.historyAccess);
assert.deepEqual(withMechanicShowcase(showcaseGarage), withMechanicShowcase(withMechanicShowcase(showcaseGarage)));
const sampleJobs = jobsForMechanic(showcaseGarage.jobs, showcaseGarage);
for (const status of ['Requested', 'Rejected', 'Cancelled', 'Confirmed', 'Awaiting approval', 'Changes requested', 'Approved', 'In progress', 'Awaiting payment', 'Completed']) {
  assert.ok(sampleJobs.some((job: any) => job.status === status), `Missing mechanic showcase state: ${status}`);
}
const editedShowcase = structuredClone(showcaseGarage);
editedShowcase.jobs.find((job: any) => job.id === 'VA-2026-1101').status = 'Confirmed';
assert.equal(withMechanicShowcase(editedShowcase).jobs.find((job: any) => job.id === 'VA-2026-1101').status, 'Confirmed');
const alexPending = showcaseGarage.jobs.find((job: any) => job.id === 'VA-2026-1201');
assert.equal(alexPending.status, 'Requested');
assert.equal(alexPending.customerId, 'cust-01');
assert.equal(alexPending.vehicleId, 'v1');
assert.equal(alexPending.professionalId, 'pro-precision-motorworks');
const removedPending = { ...showcaseGarage, jobs: showcaseGarage.jobs.filter((job: any) => job.id !== 'VA-2026-1201') };
assert.equal(withMechanicShowcase(removedPending).jobs.some((job: any) => job.id === 'VA-2026-1201'), false);
const alexRequest = screen('mechanic', 'appointments/pending/VA-2026-1201', showcaseGarage);
assert.ok(alexRequest.includes('Accept appointment'));
assert.ok(alexRequest.includes('Request details'));
assert.ok(!alexRequest.includes('Rejection reason'));
assert.ok(!alexRequest.includes('Confirm rejection'));
assert.ok(screen('customer', 'bookings/VA-2026-1201', showcaseGarage).includes('front suspension'));
const isolatedDraft = saveQuoteDraft(showcaseGarage, {
  bookingId: 'VA-2026-1105',
  rows: [{ id: 'd1', name: 'Oil', category: 'parts', quantity: '', price: '680' }],
  notes: 'Private service draft.',
}, mechanicActor);
assert.equal(isolatedDraft.jobs.find((job: any) => job.id === 'VA-2026-1201').items.length, 0);
assert.equal(isolatedDraft.jobs.find((job: any) => job.id === 'VA-2026-1201').quoteDraft, undefined);
assert.equal(quoteTotal(sampleJobs.find((job: any) => job.id === 'VA-2026-1112')), 1130);
for (const route of ['appointments/pending', 'appointments/pending/VA-2026-1101', 'jobs', 'jobs/VA-2026-1112', 'jobs/VA-2026-1112/quote', 'jobs/VA-2026-1106/messages']) {
  const html = screen('mechanic', route, showcaseGarage);
  assert.ok(!html.includes('Job unavailable'), route);
  assert.ok(!html.includes('Request unavailable'), route);
  assert.ok(html.includes(route.includes('1101') ? 'Toyota Fortuner' : route.includes('1112') ? 'Volkswagen Polo' : route.includes('1106') ? 'BMW 320d' : 'Toyota'), route);
}

assert.ok(!screen('customer', 'garage', showcaseGarage).includes('History not linked to a vehicle'));
assert.ok(!screen('customer', 'garage', showcaseGarage).includes('Thandi Mbeki'));
assert.throws(() => sendMessage(paid.data, {
  bookingId: 'req-1',
  role: 'customer',
  id: 'cust-01',
  name: 'Alex Morgan',
  body: 'Thanks',
  clientMessageId: 'msg-closed',
}));

const capeTown = demoAreaById('cape-town');
const johannesburg = demoAreaById('johannesburg');
assert.ok(capeTown && johannesburg);
const capeDiscovery = discoveryWithArea({ ...defaultDiscovery, radiusKm: 25 }, 'cape-town');
const capeNames = searchDirectory(directoryEntries(providers, initialData), capeDiscovery, initialData).map((hit) => hit.name);
assert.ok(capeNames.includes('Precision Motorworks'));
assert.ok(capeNames.includes('Sample Bellville Service'));
assert.ok(capeNames.includes('On the Move Auto'));
assert.ok(!capeNames.includes('Sample Stellenbosch Works'));
assert.ok(!capeNames.includes('Sample Paarl Motors'));
assert.ok(!capeNames.includes('Driveway Diagnostics'));
assert.ok(!capeNames.includes('Urban Auto Care'));
assert.ok(!capeNames.includes('Sample Mowbray Workshop'));
const capeTen = searchDirectory(directoryEntries(providers, initialData), { ...capeDiscovery, radiusKm: 10 }, initialData).map((hit) => hit.name);
assert.ok(capeTen.includes('Precision Motorworks'));
assert.ok(capeTen.includes('On the Move Auto'));
assert.ok(!capeTen.includes('Sample Bellville Service'));
assert.ok(!capeTen.includes('Driveway Diagnostics'));
const capeFifty = searchDirectory(directoryEntries(providers, initialData), { ...capeDiscovery, radiusKm: 50 }, initialData).map((hit) => hit.name);
assert.ok(capeFifty.includes('Sample Stellenbosch Works'));
assert.ok(!capeFifty.includes('Sample Paarl Motors'));
assert.ok(!capeFifty.includes('Driveway Diagnostics'));
const ordered = searchDirectory(directoryEntries(providers, initialData), capeDiscovery, initialData);
const distances = ordered.map((hit) => hit.sortKm);
assert.deepEqual(distances, [...distances].sort((a, b) => a - b));
const mobile = ordered.find((hit) => hit.name === 'On the Move Auto');
assert.equal(mobile?.distanceLabel, 'Serves your area');
assert.equal(mobile?.directionsUrl, null);
const gardens = ordered.find((hit) => hit.name === 'Precision Motorworks');
assert.ok(gardens?.directionsUrl?.startsWith('https://www.google.com/maps/dir/?'));
assert.ok(gardens?.directionsUrl?.includes('travelmode=driving'));
assert.ok(gardens?.directionsUrl?.includes('destination='));
assert.equal(gardens?.directionsUrl?.includes('origin='), false);
assert.equal(searchDirectory(directoryEntries(providers, initialData), defaultDiscovery, initialData).length, 0);
const allAreas = searchDirectory(directoryEntries(providers, initialData), { ...defaultDiscovery, mode: 'all' }, initialData);
assert.ok(allAreas.some((hit) => hit.name === 'Driveway Diagnostics'));
assert.ok(allAreas.some((hit) => hit.name === 'Sample Mowbray Workshop' && hit.distanceLabel === 'Distance unavailable'));
assert.equal(distanceDisclosure(capeDiscovery.origin).includes('demo area centre'), true);
assert.equal(distanceDisclosure(capeDiscovery.origin).includes('road distance'), true);
assert.equal(geolocationMessage(1, true), 'Location permission was denied. Choose an area instead.');
assert.equal(geolocationMessage(3, true), 'The location request timed out. Choose an area instead.');
assert.equal(geolocationMessage(2, true), 'Your location is unavailable. Choose an area instead.');
assert.equal(geolocationMessage(null, false), 'This browser cannot share a location. Choose an area instead.');
const browserOrigin = discoveryWithBrowser(defaultDiscovery, capeTown!.latitude, capeTown!.longitude);
assert.equal(browserOrigin.origin?.kind, 'browser');
assert.equal(validCoordinates(0, 0), true);
assert.equal(validCoordinates(null, null), false);
assert.ok(haversineKm({ latitude: 0, longitude: 0 }, { latitude: capeTown!.latitude, longitude: capeTown!.longitude }) > 1000);
const zeroProfessional = {
  id: 'pro-zero',
  name: 'Zero Point Sample',
  type: 'Workshop',
  special: 'Servicing',
  location: { ...providers[0].location, latitude: 0, longitude: 0, precision: 'public-premises' },
};
const missingProfessional = {
  id: 'pro-missing-point',
  name: 'Missing Point Sample',
  type: 'Workshop',
  special: 'Servicing',
  location: { ...providers[0].location, latitude: null, longitude: null, precision: 'unknown' },
};
const zeroHits = searchDirectory([zeroProfessional, missingProfessional], capeDiscovery, initialData);
assert.equal(zeroHits.length, 0);
const zeroAll = searchDirectory([zeroProfessional], { ...capeDiscovery, mode: 'all' }, initialData);
assert.ok(zeroAll[0].sortKm > 1000);
assert.equal(zeroAll[0].distanceLabel.startsWith('Approximately'), true);
const encoded = mapsDirectionsUrl({ ...providers[0].location, latitude: -33.5, longitude: 18.5, placeId: 'sample place' });
assert.ok(encoded?.includes('destination=-33.5%2C18.5') || encoded?.includes('destination=-33.5,18.5'));
assert.ok(encoded?.includes('destination_place_id=sample+place') || encoded?.includes('destination_place_id=sample%20place'));
const johannesburgHits = searchDirectory(directoryEntries(providers, initialData), discoveryWithArea({ ...defaultDiscovery, radiusKm: 25 }, 'johannesburg'), initialData).map((hit) => hit.name);
assert.ok(johannesburgHits.includes('Driveway Diagnostics'));
assert.ok(!johannesburgHits.includes('Precision Motorworks'));
assert.equal(normalizeCategory('diagnostics'), 'assessment');
assert.equal(categoryLabel('assessment'), 'Assessment / diagnostics');
const legacyJob = initialData.jobs[0];
assert.equal(pricingModelOf(legacyJob), 'legacy-separate-fee');
assert.equal(quoteTotal(legacyJob), 1400);
assert.equal(legacyAssessmentFee(legacyJob), 450);
const inclusiveQuote = {
  pricingModel: 'quotation-inclusive',
  fee: 450,
  items: [
    { name: 'Initial assessment and diagnostic scan', category: 'assessment', amount: 350 },
    { name: 'Front brake pads', category: 'parts', amount: 950 },
    { name: 'Brake labour', category: 'labour', amount: 450 },
  ],
};
assert.equal(quoteTotal(inclusiveQuote), 1750);
assert.equal(legacyAssessmentFee(inclusiveQuote), null);
const rated = withMechanicShowcase(structuredClone(initialData));
const summary = ratingSummary(rated, 'pro-precision-motorworks');
assert.equal(summary.count, 2);
assert.equal(summary.average, 4.5);
assert.equal(summary.label, '4.5 / 5 · 2 reviews');
assert.equal(summary.accessible, '4.5 out of 5 from 2 reviews');
assert.equal(ratingSummary(initialData, 'pro-sample-sea-point').label, 'No reviews yet');
const demoQuote = rated.jobs.find((job: any) => job.id === 'VA-2026-1301');
assert.equal(quoteTotal(demoQuote), 1750);
assert.equal(demoQuote.items.filter((item: any) => item.category === 'assessment').length, 1);
assert.equal(quoteTotal(rated.jobs.find((job: any) => job.id === 'VA-2026-1110')), 900);
assert.equal(quoteTotal(rated.jobs.find((job: any) => job.id === 'VA-2026-1112')), 1130);

console.log(
  `${count} role/auth screens rendered; role route guards, application checklist, and complete quote-to-payment state flow passed.`,
);

// Ranked discovery supports professional filters without a radius cutoff.
const catalogue = directoryEntries(providers, initialData);
assert.equal(browseDirectory(catalogue, defaultDiscovery, initialData).length, catalogue.length);
const ranked = browseDirectory(catalogue, capeDiscovery, initialData);
assert.equal(ranked.length, catalogue.length);
for (let index = 1; index < ranked.length; index++) assert.ok(ranked[index - 1].sortKm <= ranked[index].sortKm);
for (const type of ['Workshop', 'Mobile mechanic']) {
  const matches = browseDirectory(catalogue, { ...capeDiscovery, type, radiusKm: 10 }, initialData);
  assert.ok(matches.length > 0);
  assert.ok(matches.every((hit) => hit.type === type));
  assert.equal(matches.length, catalogue.filter((item) => item.type === type).length);
}
assert.ok(browseDirectory(catalogue, { ...capeDiscovery, service: 'Brakes' }, initialData).every((hit) => hit.special.includes('Brakes')));

for (const html of [customerFind, publicFind]) {
  assert.ok(!html.includes('Search radius'));
  assert.ok(!html.includes('Increase radius'));
  assert.ok(!html.includes('Return to nearby search'));
  assert.ok(!html.includes('Browse all areas'));
}

// Admin full-page routes cannot be opened by other roles.
for (const path of ['applications/app-02', 'professionals/app-03', 'customers/cust-01', 'jobs/VA-2026-1042', 'reports/security', 'notifications']) {
  assert.equal(canVisit('admin', 'dashboard/' + path), true);
}
for (const role of ['customer', 'mechanic'] as const) {
  for (const path of ['applications/app-02', 'professionals/app-03', 'customers/cust-01', 'reports/security']) assert.equal(canVisit(role, 'dashboard/' + path), false);
}
assert.equal(canVisit('admin', 'dashboard/customers/%2F'), false);
assert.equal(canVisit('admin', 'dashboard/jobs/a/b'), false);
assert.ok(screen('admin', 'applications/app-02').includes('Business details'));
assert.ok(screen('admin', 'applications/app-02').includes('Urban Auto Care'));
assert.ok(!screen('admin', 'applications/app-02').includes('role="dialog"'));
assert.ok(screen('admin', 'professionals/app-03').includes('Platform activity'));
assert.ok(screen('admin', 'customers/cust-01').includes('Customer account'));
assert.ok(screen('admin', 'jobs/VA-2026-1042').includes('Job progress'));
assert.ok(screen('admin', 'jobs/missing').includes('Record not found'));
assert.ok(screen('admin', 'reports/security').includes('not a server security audit'));
const paidOnlyMetrics = accountMetrics([{ id: 'a', paid: true, status: 'Completed', items: [{ name: 'Work', amount: 100 }] }, { id: 'a', paid: true, status: 'Completed', items: [{ name: 'Work', amount: 100 }] }, { id: 'b', paid: false, status: 'Awaiting payment', items: [{ name: 'Work', amount: 900 }] }]);
assert.equal(paidOnlyMetrics.total, 2);
assert.equal(paidOnlyMetrics.completed, 1);
assert.equal(paidOnlyMetrics.paid, 100);
assert.deepEqual(professionalJobs(initialData, { name: 'Unknown professional' }), []);
const activityData = appendAdminActivity(initialData, { action: 'Signed in', actor: 'Demo Admin', role: 'admin' }, '2026-10-19T12:00:00Z');
assert.equal(activityData.adminActivity[0].source, 'browser-demo');
assert.ok(screen('admin', 'reports/security', activityData).includes('Demo Admin'));
assert.equal((initialData as any).adminActivity, undefined);
const cappedActivity = appendAdminActivity({ adminActivity: Array.from({ length: 500 }, (_, id) => ({ id })) }, { action: 'Signed out', actor: 'Demo', role: 'customer' });
assert.equal(cappedActivity.adminActivity.length, 500);

// Admin filters preserve unknown data and combine location/type without changing jobs.
assert.equal(cityName('Bellville'), 'Cape Town');
assert.equal(cityName(''), 'Not recorded');
assert.equal(matchesAdminFilters({ city: 'Cape Town', type: 'Workshop' }, 'Cape Town', 'Workshop'), true);
assert.equal(matchesAdminFilters({ city: 'Cape Town', type: 'Workshop' }, 'East London', 'Workshop'), false);
assert.equal(matchesAdminFilters({ city: 'Cape Town', type: 'Workshop' }, 'Cape Town', 'Mobile mechanic'), false);
assert.equal(matchesAdminFilters({}, 'Not recorded', 'Not recorded'), true);
const locationJobs = adminJobRows({ ...initialData, jobs: [{ id: 'filter-test', customerId: 'cust-01', professionalId: 'pro-precision-motorworks' }] });
assert.equal(locationJobs[0].city, cityName(initialData.settings.city));
assert.ok(screen('admin', 'jobs').includes('aria-label="Customer city"'));
assert.ok(screen('admin', 'jobs').includes('Disputes'));
assert.ok(screen('admin', 'jobs/disputes').includes('No disputes to show'));
assert.ok(!screen('admin', 'reports').includes('analytics-tab-support'));
assert.ok(!screen('admin', 'overview').includes('Bookings by customer city'));
assert.ok(screen('admin', 'overview').includes('Trust starts with a thorough review.'));
assert.ok(screen('admin', 'overview').includes('Application queue'));
assert.ok(screen('admin', 'reports').includes('admin-donut'));
assert.ok(screen('admin', 'reports').includes('chart-gridline'));
assert.ok(!screen('admin', 'reports').includes('Trust starts with a thorough review.'));
assert.ok(screen('admin', 'customers').includes('Total customers'));
assert.ok(screen('admin', 'professionals').includes('Recorded revenue'));
assert.equal(canVisit('admin', 'dashboard/jobs/disputes'), true);
assert.equal(canVisit('admin', 'dashboard/disputes/d-01'), true);
assert.equal(canVisit('customer', 'dashboard/disputes/d-01'), false);
const disputeData = { ...initialData, disputes: [{ id: 'd-01', bookingId: 'VA-2026-1042', title: 'Sample concern', status: 'Open' }] };
assert.ok(screen('admin', 'jobs/disputes', disputeData).includes('Sample concern'));
assert.ok(screen('admin', 'disputes/d-01', disputeData).includes('Resolution notes'));
assert.throws(() => resolveDispute(disputeData, 'd-01', '   ', 'Admin'));
assert.throws(() => resolveDispute(disputeData, 'missing', 'Outcome agreed', 'Admin'));
const resolvedDispute = resolveDispute(disputeData, 'd-01', 'Outcome agreed', 'Admin');
assert.equal(resolvedDispute.disputes[0].status, 'Resolved');
assert.equal(disputeData.disputes[0].status, 'Open');
assert.equal(resolvedDispute.jobs, disputeData.jobs);
assert.equal(resolveDispute(resolvedDispute, 'd-01', 'Repeat', 'Admin'), resolvedDispute);

// Typed colours and custom labels survive saving without the old opt-in checkbox.

assert.equal(resolvePaintColour(' Silver '), '#b8bcc2');
assert.equal(resolvePaintColour('#abc'), '#aabbcc');
assert.equal(resolvePaintColour('Pearl glacier'), '');
const namedPaint = saveVehicle(initialData, { ...initialData.vehicles[0], paintColor: '#b8bcc2', paintColorName: 'Silver' });
assert.equal(namedPaint.vehicles[0].paintColorName, 'Silver');
assert.equal(namedPaint.vehicles[0].paintColor, '#b8bcc2');
const clearedPaint = saveVehicle(namedPaint, { ...namedPaint.vehicles[0], paintColor: '', paintColorName: '' });
assert.equal(clearedPaint.vehicles[0].paintColor, '');
assert.equal(clearedPaint.vehicles[0].paintColorName, '');

// Partial approval charges only selected work and preserves deferred lines.
const partial = applyJobTransition(revised.data, revised.job, 'approve', {
  selectedLineIds: ['d1'], reviewToken: quoteReviewToken(revised.job), customerRequest: 'Please also price an oil change.',
}, customerActor);
assert.equal(quoteTotal(partial.job), 700);
assert.equal(partial.job.items[1].approved, false);
assert.equal(partial.job.quoteVersions[1].totalCents, 95000);
assert.ok(renderToString(<QuoteSummary job={partial.job} />).includes('Deferred'));
assert.throws(() => applyJobTransition(revised.data, revised.job, 'approve', { selectedLineIds: [] }, customerActor));
assert.throws(() => applyJobTransition(revised.data, revised.job, 'approve', { selectedLineIds: ['missing'] }, customerActor));
assert.throws(() => applyJobTransition(revised.data, revised.job, 'approve', { reviewToken: 'stale' }, customerActor));
const earlyPaid = applyJobTransition(partial.data, partial.job, 'pay', { reviewToken: quoteReviewToken(partial.job) }, customerActor);
assert.equal(earlyPaid.job.status, 'Approved');
assert.equal(earlyPaid.job.paid, true);
assert.equal(earlyPaid.data.records?.some((r: any) => r.id === earlyPaid.job.id) || false, false);
assert.throws(() => applyJobTransition(earlyPaid.data, earlyPaid.job, 'pay', {}, customerActor));
assert.throws(() => applyJobTransition(earlyPaid.data, earlyPaid.job, 'quote', { items: earlyPaid.job.items, notes: 'Changed work' }, mechanicActor));
const earlyStarted = applyJobTransition(earlyPaid.data, earlyPaid.job, 'start', {}, mechanicActor);
const earlyFinished = applyJobTransition(earlyStarted.data, earlyStarted.job, 'complete', { completionNotes: 'Selected repairs completed.' }, mechanicActor);
assert.equal(earlyFinished.job.status, 'Completed');
assert.equal(earlyFinished.data.records.filter((r: any) => r.id === earlyFinished.job.id).length, 1);
const requestedRevision = applyJobTransition(partial.data, partial.job, 'quote', {
  items: [{ id: 'd1', name: 'Pads', amount: 700 }, { id: 'oil', name: 'Oil change', amount: 300 }], notes: 'Pads and requested oil service.',
}, mechanicActor);
assert.equal(requestedRevision.job.status, 'Awaiting approval');
assert.equal(requestedRevision.job.quoteApproved, false);
assert.throws(() => applyJobTransition(requestedRevision.data, requestedRevision.job, 'pay', {}, customerActor));
assert.ok(!demoDocumentHtml(earlyPaid.job, 'invoice').includes('Labour'));

// Customers can correct an unpaid selection without losing deferred repairs.
const reselection = applyJobTransition(partial.data, partial.job, 'approve', {
  selectedLineIds: ['d1', 'd2'], reviewToken: quoteReviewToken(partial.job), customerRequest: partial.job.customerRequest,
}, customerActor);
assert.equal(quoteTotal(reselection.job), 950);
assert.equal(reselection.job.items[1].approved, true);
assert.equal(reselection.job.status, 'Approved');
assert.throws(() => applyJobTransition(reselection.data, reselection.job, 'pay', { reviewToken: quoteReviewToken(partial.job) }, customerActor));
assert.throws(() => applyJobTransition(earlyPaid.data, earlyPaid.job, 'approve', { selectedLineIds: ['d1', 'd2'] }, customerActor));
const selectionStarted = applyJobTransition(reselection.data, reselection.job, 'start', {}, mechanicActor);
assert.throws(() => applyJobTransition(selectionStarted.data, selectionStarted.job, 'approve', { selectedLineIds: ['d1'] }, customerActor));
const reopenChanges = applyJobTransition(reselection.data, reselection.job, 'changes', { changeRequest: 'Please clarify labour.' }, customerActor);
assert.equal(reopenChanges.job.quoteApproved, false);
assert.throws(() => applyJobTransition(reopenChanges.data, reopenChanges.job, 'pay', {}, customerActor));


// Extra quotations have independent approvals, revisions, payments and notification keys.
const firstPaidSnapshot = JSON.stringify(earlyStarted.job);
const supplementInput = newQuotation(earlyStarted.job, 'gearbox-quote');
const extraQuotePayload = { items: [{ id: 'gearbox', name: 'Gearbox repair', amount: 2500 }, { id: 'mount', name: 'Engine mount', amount: 600 }], notes: 'Additional gearbox work found during inspection.', clientSubmitId: 'extra-send-1' };
const withExtra = applyJobTransition(earlyStarted.data, supplementInput, 'quote', extraQuotePayload, mechanicActor);
assert.equal(withExtra.job.status, 'In progress');
assert.equal(withExtra.job.paid, true);
assert.deepEqual(withExtra.job.items, earlyStarted.job.items);
assert.equal(JSON.stringify(earlyStarted.job), firstPaidSnapshot);
let secondQuote = bookingQuotations(withExtra.job)[1];
assert.equal(secondQuote.paid, false);
assert.equal(secondQuote.quoteVersion, 1);
assert.equal(secondQuote.status, 'Awaiting approval');
assert.equal(applyJobTransition(withExtra.data, supplementInput, 'quote', extraQuotePayload, mechanicActor).duplicate, true);
assert.throws(() => applyJobTransition(withExtra.data, secondQuote, 'approve', {}, mechanicActor));
assert.throws(() => applyJobTransition(withExtra.data, secondQuote, 'approve', {}, { role: 'customer', id: 'another-customer' }));
assert.throws(() => applyJobTransition(withExtra.data, secondQuote, 'pay', {}, customerActor));
assert.throws(() => applyJobTransition(withExtra.data, withExtra.job, 'complete', { completionNotes: 'Done' }, mechanicActor));
assert.equal(withExtra.data.notifications.filter((note: any) => note.eventKey === `quote:${secondQuote.id}:v1`).length, 1);
assert.equal(withExtra.data.notifications.find((note: any) => note.eventKey === `quote:${secondQuote.id}:v1`).bookingId, withExtra.job.id);
const selectedExtra = applyJobTransition(withExtra.data, secondQuote, 'approve', { selectedLineIds: ['gearbox'], reviewToken: quoteReviewToken(secondQuote) }, customerActor);
secondQuote = bookingQuotations(selectedExtra.job)[1];
assert.equal(quoteTotal(secondQuote), 2500);
assert.equal(selectedExtra.job.status, 'In progress');
assert.equal(awaitingCustomerPayments([selectedExtra.job]).length, 1);
assert.equal(recordedCustomerPayments([selectedExtra.job]).length, 1);
const selectedExtraAgain = applyJobTransition(selectedExtra.data, secondQuote, 'approve', { selectedLineIds: ['gearbox', 'mount'], reviewToken: quoteReviewToken(secondQuote) }, customerActor);
assert.throws(() => applyJobTransition(selectedExtraAgain.data, secondQuote, 'pay', { reviewToken: quoteReviewToken(secondQuote) }, customerActor));
const extraStarted = applyJobTransition(selectedExtraAgain.data, bookingQuotations(selectedExtraAgain.job)[1], 'start-quote', {}, mechanicActor);
assert.throws(() => applyJobTransition(extraStarted.data, bookingQuotations(extraStarted.job)[1], 'approve', { selectedLineIds: ['gearbox'] }, customerActor));
const multiFinished = applyJobTransition(extraStarted.data, extraStarted.job, 'complete', { completionNotes: 'Approved brake and gearbox repairs completed.' }, mechanicActor);
assert.equal(multiFinished.job.status, 'Awaiting payment');
assert.equal(multiFinished.data.records?.some((record: any) => record.id === multiFinished.job.id) || false, false);
const outstandingExtra = bookingQuotations(multiFinished.job)[1];
const multiPaid = applyJobTransition(multiFinished.data, outstandingExtra, 'pay', { reviewToken: quoteReviewToken(outstandingExtra) }, customerActor);
assert.equal(multiPaid.job.status, 'Completed');
const paymentRows = recordedCustomerPayments([multiPaid.job, multiPaid.job]);
assert.equal(paymentRows.length, 2);
assert.equal(paymentRecordTotal(paymentRows), 3800);
assert.notEqual(paymentRows[0].paymentReference, paymentRows[1].paymentReference);
assert.equal(paymentRows[0].paidAt, earlyStarted.job.paidAt);
assert.equal(awaitingCustomerPayments([multiPaid.job]).length, 0);
assert.equal(multiPaid.data.records.filter((record: any) => record.id === multiPaid.job.id).length, 1);
assert.throws(() => applyJobTransition(multiPaid.data, outstandingExtra, 'pay', {}, customerActor));
assert.throws(() => applyJobTransition(multiPaid.data, newQuotation(multiPaid.job, 'late-quote'), 'quote', extraQuotePayload, mechanicActor));
assert.ok(demoDocumentHtml(paymentRows[1], 'invoice').includes('Quotation 2'));
assert.ok(!demoDocumentHtml(paymentRows[1], 'invoice').includes('Pads'));
const customerMultiHtml = renderToString(<BookingQuotations job={selectedExtra.job} setDialog={() => {}} />);
assert.ok(customerMultiHtml.includes('Quotation 1'));
assert.ok(customerMultiHtml.includes('Quotation 2'));
assert.ok(customerMultiHtml.includes('Edit repair selection'));
assert.ok(customerMultiHtml.includes('Review and pay'));
assert.ok(customerMultiHtml.includes('View invoice'));
const withdrawnExtra = applyJobTransition(withExtra.data, secondQuote, 'withdraw-quote', {}, mechanicActor);
assert.equal(bookingQuotations(withdrawnExtra.job)[1].status, 'Withdrawn');
assert.equal(applyJobTransition(withdrawnExtra.data, withdrawnExtra.job, 'complete', { completionNotes: 'Only the original repairs were needed.' }, mechanicActor).job.status, 'Completed');
const draftId = 'private-extra';
const privateDraft = saveQuoteDraft(earlyStarted.data, { bookingId: earlyStarted.job.id, quoteId: draftId, rows: [{ id: 'private', name: 'Private draft diagnosis', category: '', quantity: '', price: '500' }], notes: 'Unsent private notes' }, mechanicActor);
const draftBooking = privateDraft.jobs.find((job: any) => job.id === earlyStarted.job.id);
assert.equal(bookingQuotations(draftBooking)[1].quoteDraft.notes, 'Unsent private notes');
assert.ok(!renderToString(<BookingQuotations job={draftBooking} setDialog={() => {}} />).includes('Private draft diagnosis'));
console.log('Multiple quotation approval, payment, ownership, completion and rendering checks passed.');

const emptyLiveOverview = renderToString(
  <OverviewPage
    apps={[]}
    cardJobs={() => null}
    data={{ vehicles: [], records: [], reports: [] }}
    jobs={[]}
    live
    name="New Customer"
    role="customer"
    route={() => {}}
  />,
);
assert.equal((emptyLiveOverview.match(/class="ui-card metric"/g) || []).length, 4);
for (const text of ['Good care starts with clarity.', 'Active bookings', 'Quotes to review', 'Service records', 'Recent appointments', 'Make your next move.'])
  assert.ok(emptyLiveOverview.includes(text), text);
assert.equal((emptyLiveOverview.match(/<strong>0<\/strong>/g) || []).length, 4);
assert.ok(!emptyLiveOverview.includes('sample data'));
const emptyLiveBookings = renderToString(
  <JobsPage
    cardJobs={() => null}
    emptyTitle="No bookings match."
    filter="All"
    jobs={[]}
    query=""
    setFilter={() => {}}
    setQuery={() => {}}
  />,
);
assert.ok(emptyLiveBookings.includes('Filter job status'));
assert.ok(emptyLiveBookings.includes('No bookings match.'));
const emptyLivePayments = renderToString(<PaymentsPage live go={() => {}} jobs={[]} setDialog={() => {}} />);
for (const text of ['Awaiting payment', 'Recorded payments', 'Outstanding', 'History', 'No payments due yet.', 'No recorded payments yet.'])
  assert.ok(emptyLivePayments.includes(text), text);
console.log('Connected customer overview, booking and payment empty-state rendering passed.');

const connectedProfile = renderToString(<SettingsPage data={{settings:{name:'Real Customer',email:'real@example.test',phone:'0821234567'}}} connected={{save:async()=>{},changePassword:async()=>{}}}/>);
for (const text of ['customer-profile', 'dash-panel settings-form', 'avatar big', 'form-row', 'Upload photo', 'Email updates preference', 'Confirm new password', 'Show Current password', 'Show New password', 'Show Confirm new password']) assert.ok(connectedProfile.includes(text), text);
assert.ok(!connectedProfile.includes('Change password unavailable'));
assert.ok(!connectedProfile.includes('Use sample details'));
assert.ok(connectedProfile.includes('readOnly=""'));
console.log('Connected profile retains the shared demo layout with real-account wording.');
assert.ok(
  !readFileSync(join('src', 'App.tsx'), 'utf8').includes("classList.remove('scroll-lock')"),
  'Demo navigation must not unlock a modal owned by useModalBehaviour',
);
assert.equal(calendarDateInput('2026-12-31T00:00:00.000Z'), '2026-12-31');
assert.equal(calendarDateInput('2026-01-01'), '2026-01-01');
assert.equal(calendarDateInput(null), '');
assert.equal(calendarDateOrNull(''), null);
assert.equal(calendarDateInput('2026-12-31T23:00:00.000Z'), '2026-12-31');

// Connected screens must keep the shared presentation without fictional credentials or fees.
const mappedProfessional = mapDirectoryProfessional({id:'server-pro',name:'Real workshop',type:'Workshop',city:'Cape Town',services:['Brakes'],latitude:-33.9,longitude:18.4,rating:4.5,reviewCount:2,photo:''});
const [liveProfessional] = liveDirectoryHits([mappedProfessional], { ...defaultDiscovery, origin: null });
assert.equal(liveProfessional.distanceLabel, '');
assert.equal(liveProfessional.sample, false);
const liveDirectoryHtml = renderToString(<ProfessionalsPage live embedded results={[liveProfessional]} discovery={{...defaultDiscovery}} service="All services" type="Either" go={()=>{}} book={()=>{}}/>);
for (const value of ['directory-simple-filters','provider-card','Professional type','View profile','Book assessment','4.5/5']) assert.ok(liveDirectoryHtml.includes(value),value);
assert.ok(!liveDirectoryHtml.includes('SAMPLE PROFILE'));
assert.ok(!liveDirectoryHtml.includes('Sample professionals for this demo'));
const [nearest] = liveDirectoryHits([mappedProfessional], {
  ...defaultDiscovery,
  origin: { latitude: -33.9, longitude: 18.4, label: 'Test point', kind: 'browser', areaId: '' },
});
assert.equal(nearest.sortKm, 0);
assert.ok(nearest.distanceLabel.includes('0.0 km'));
const mechanicPaymentsHtml = renderToString(
  <MechanicPaymentsPage connected={{ awaiting: [], recorded: [] }} jobs={[]} setDialog={() => {}} />,
);
assert.ok(mechanicPaymentsHtml.includes('Awaiting customer payment'));
assert.ok(mechanicPaymentsHtml.includes('Payment records'));
assert.ok(!mechanicPaymentsHtml.includes('No demo payments yet'));
const adminFinanceHtml = renderToString(
  <FinancePage
    connected={{ awaiting: [], recorded: [] }}
    customers={[]}
    filter="All"
    jobs={[]}
    query=""
    setDialog={() => {}}
    setFilter={() => {}}
    setQuery={() => {}}
  />,
);
assert.ok(adminFinanceHtml.includes('Filter payments'));
assert.ok(adminFinanceHtml.includes('No payments yet'));
console.log('Connected directory, mechanic payment and admin finance presentation checks passed.');

// Backend forms must retain the original shared presentation instead of parallel layouts.
import { QuoteReview } from '../src/components/jobs/QuoteReview';
const connectedVehicleForm = renderToString(
  <>
    <VehicleFields />
    <button type="submit">Save vehicle</button>
  </>,
);
assert.ok(connectedVehicleForm.includes('paint-colour-preview'));
for (const label of [
  'Body style',
  'Variant',
  'Who recorded the licence date',
  'Next service mileage',
  'Save vehicle',
])
  assert.ok(connectedVehicleForm.includes(label), label);
assert.ok(!connectedVehicleForm.includes('DEMO 002'));
const serverQuoteReview = renderToString(
  <QuoteReview
    live
    job={{
      vehicle: 'VW Polo',
      provider: 'Workshop',
      items: [
        { id: 'part', name: 'Brake pads', quantity: 2, unitPriceCents: 50000, approved: true },
      ],
    }}
    onAction={() => {}}
  />,
);
assert.ok(serverQuoteReview.includes('quote-review-line selected'));
assert.ok(/R1\s000/.test(serverQuoteReview));
assert.ok(!serverQuoteReview.includes('Demo checkout'));
console.log('Shared connected vehicle fields and server-priced repair review passed.');

// These adapters must use the original profile/record surfaces without demo account data.
import { MerchantProfilePage } from '../src/pages/mechanic/MerchantProfilePage';
import { ProfessionalAdminDetailPage, CustomerAdminDetailPage } from '../src/pages/admin/AdminDetailPages';
const profileShell = renderToString(
  <MerchantProfilePage
    data={{
      profile: {
        name: 'Real Workshop',
        type: 'Workshop',
        services: ['Brakes'],
        phone: '0712345678',
        bio: 'Brake work',
        city: 'Cape Town',
      },
      documents: [],
      application: { status: 'Draft' },
      mechanicAccount: { email: 'mech@example.test' },
    }}
    profile={{
      name: 'Real Workshop',
      type: 'Workshop',
      services: ['Brakes'],
      phone: '0712345678',
      bio: 'Brake work',
      city: 'Cape Town',
    }}
    section="business"
    route={() => {}}
    connected={{
      save: async () => {},
      savePhoto: async () => {},
      remove: async () => {},
      submit: async () => {},
      canSubmit: false,
    }}
  />,
);
assert.equal((profileShell.match(/role="tab"/g) || []).length, 4);
assert.ok(profileShell.includes('profile-tablist folder-tabs'));
assert.ok(profileShell.includes('merchant-summary-copy'));
assert.ok(profileShell.includes('Save profile'));
assert.ok(profileShell.includes('Payout onboarding is not connected yet'));
assert.ok(!profileShell.includes('Save sample banking details'));
assert.ok(!profileShell.includes('photo stays in this browser'));
const connectedAdminRecord = { jobs: [], paid: 0, rating: { count: 0, average: 0 }, reviews: [] };
const professionalRecordHtml = renderToString(<ProfessionalAdminDetailPage record={{ id: 'real-pro', professionalId: 'real-pro', name: 'Real Workshop', services: [], status: 'Approved' }} data={{}} route={() => {}} connected={connectedAdminRecord} />);
assert.ok(professionalRecordHtml.includes('admin-detail-grid'));
assert.ok(professionalRecordHtml.includes('No reviews yet'));
assert.ok(!professionalRecordHtml.includes('Gross demo payments'));
const customerRecordHtml = renderToString(<CustomerAdminDetailPage customer={{ id: 'real-customer', name: 'Real Customer' }} data={{}} route={() => {}} connected={{ ...connectedAdminRecord, accountAction: <button>Disable account</button> }} />);
assert.ok(customerRecordHtml.includes('Disable account'));
assert.ok(!customerRecordHtml.includes('Read-only demo account'));
console.log('Connected mechanic profile and admin records retain shared demo surfaces without demo account data.');

import { VerificationPage } from '../src/pages/mechanic/VerificationPage';
const approvedVerificationHtml = renderToString(<VerificationPage data={{ application: {status: 'Approved'}, documents: [], profile: {services: []} }} connected={{canSubmit: false}} />);
assert.ok(!approvedVerificationHtml.includes('VA-DEMO-001'));
assert.ok(approvedVerificationHtml.includes('Your application is approved'));

let demoReviewClosed = false;
const demoReviewMessages: string[] = [];
finishApplicationReview(true, {
  live: false,
  status: 'Approved',
  notify: (message) => demoReviewMessages.push(message),
  close: () => {
    demoReviewClosed = true;
  },
});
assert.equal(demoReviewClosed, true);
assert.deepEqual(demoReviewMessages, ['Demo application approved']);

const failedReviewMessages: string[] = [];
let failedReviewClosed = false;
const failedReview = commitUpdate(
  () => Promise.reject(new Error('Application changed. Review it again.')),
  (data) => data,
  (message) => failedReviewMessages.push(message),
  'Demo application approved',
);
finishApplicationReview(failedReview, {
  live: true,
  status: 'Approved',
  notify: (message) => failedReviewMessages.push(message),
  close: () => {
    failedReviewClosed = true;
  },
});
const approvedReviewMessages: string[] = [];
let approvedReviewClosed = false;
const approvedReview = commitUpdate(
  () => Promise.resolve(true),
  (data) => data,
  (message) => approvedReviewMessages.push(message),
  '',
);
finishApplicationReview(approvedReview, {
  live: true,
  status: 'Approved',
  notify: (message) => approvedReviewMessages.push(message),
  close: () => {
    approvedReviewClosed = true;
  },
});
setTimeout(() => {
  assert.equal(failedReviewClosed, false);
  assert.ok(failedReviewMessages.includes('Application changed. Review it again.'));
  assert.ok(!failedReviewMessages.some((message) => message.includes('Demo application')));
  assert.equal(approvedReviewClosed, true);
  assert.deepEqual(approvedReviewMessages, ['Application updated.']);
  console.log('Application review waits for the server before closing.');
}, 0);

// Registered mechanics must remain visible to the admin before submission.
assert.equal(isPendingApplication({ status: 'Incomplete' }), true);
assert.equal(isPendingApplication({ status: 'Pending review' }), true);
assert.equal(isPendingApplication({ status: 'Approved' }), false);
