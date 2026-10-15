import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import {
  initialData,
  roles,
  navItems,
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
} from '../src/demo';
import { Workspace } from '../src/layouts/WorkspaceLayout';
import { PublicHeader } from '../src/layouts/PublicHeader';
import { AuthPage as Auth } from '../src/pages/auth/AuthPage';
import { ProfessionalsPage } from '../src/pages/public/ProfessionalsPage';
let count = 0;
for (const role of roles) {
  for (const [tab] of navItems[role]) {
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
assert.equal(canVisit('admin', 'dashboard/find'), false);
assert.equal(canVisit('admin', 'dashboard/settings'), true);
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
assert.equal(canonicalPage('admin', 'dashboard/settings'), 'dashboard/settings');
assert.equal(canonicalPage(null, 'dashboard/settings'), 'dashboard/settings');
assert.deepEqual(
  navItems.customer.map(([id, label]) => `${id}:${label}`),
  [
    'overview:Overview',
    'find:Find a Professional',
    'bookings:My bookings',
    'garage:My Garage',
    'payments:Payments',
  ],
);
assert.deepEqual(
  navItems.mechanic.map(([id, label]) => `${id}:${label}`),
  [
    'overview:Overview',
    'appointments/pending:Appointments',
    'jobs:Jobs',
    'payments:Payments',
  ],
);
assert.deepEqual(
  navItems.admin.map(([id]) => id),
  ['overview', 'applications', 'professionals', 'jobs', 'reports', 'settings'],
);
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
assert.equal(pageTitle('admin', 'settings'), 'Platform settings');
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
  city: 'All locations',
  results: [sampleProfessional],
  service: 'All services',
  setCity: () => {},
  setModal: () => {},
  setService: () => {},
  setStep: () => {},
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
assert.ok(customerFind.includes('Good hands'));
assert.ok(customerFind.includes('FIND YOUR NEXT PROFESSIONAL'));
assert.ok(customerFind.includes('Precision Motorworks'));
assert.ok(customerFind.includes('Book assessment'));
assert.ok(customerFind.includes('View profile'));
assert.ok(customerFind.includes('Find a Professional'));
assert.ok(!customerFind.includes('Find a professional'));
assert.ok(!customerFind.includes('YOUR JOURNEY, SIMPLIFIED'));
const publicFind = renderToString(
  <ProfessionalsPage
    book={() => {}}
    city="All locations"
    results={[sampleProfessional]}
    service="All services"
    setCity={() => {}}
    setModal={() => {}}
    setService={() => {}}
    setStep={() => {}}
    setType={() => {}}
    type="Either"
  />,
);
assert.ok(publicFind.startsWith('<main'));
assert.ok(publicFind.includes('Good hands'));
assert.ok(publicFind.includes('Precision Motorworks'));
assert.ok(publicFind.includes('Book assessment'));
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
assert.ok(mechanicOverview.includes('KEEP GOOD WORK MOVING'));
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
assert.ok(mechanicVerification.includes('Your verification journey'));
assert.ok(mechanicVerification.includes('data-profile-target="profile/business"'));
assert.ok(mechanicVerification.includes('data-profile-target="profile/documents"'));
assert.ok(mechanicVerification.includes('Submit for demo review'));
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
assert.ok(mechanicJobs.includes('Edit quote'));
assert.ok(!mechanicJobs.includes('Accept'));
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
assert.ok(adminOverview.includes('Visit website'));
assert.ok(adminOverview.includes('Clarity at every step'));
assert.ok(adminOverview.includes('Demo workspace'));
assert.ok(adminOverview.includes('Sign out / switch preview'));
assert.ok(!adminOverview.includes('Open profile'));
assert.ok(!adminOverview.includes('merchant-notify'));
assert.ok(!adminOverview.includes('mechanic-notify'));
assert.ok(!adminOverview.includes('customer-notify'));
const adminSettings = screen('admin', 'settings');
assert.ok(adminSettings.includes('Platform settings'));
assert.ok(adminSettings.includes('Pilot configuration'));
assert.ok(!adminSettings.includes('Full name'));
assert.ok(!adminSettings.includes('Open profile'));
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
assert.ok(pendingHtml.includes('Accept'));
assert.ok(pendingHtml.includes('does not approve a repair quote'));
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
console.log(
  `${count} role/auth screens rendered; role route guards, application checklist, and complete quote-to-payment state flow passed.`,
);
