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
  transitionJob,
  quoteTotal,
} from '../src/demo';
import { Workspace } from '../src/layouts/WorkspaceLayout';
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
assert.equal(canVisit('mechanic', 'dashboard/profile'), true);
assert.equal(canVisit('mechanic', 'dashboard/settings'), true);
assert.equal(canVisit('mechanic', 'dashboard/notifications'), true);
assert.equal(canonicalPage('customer', 'dashboard/settings'), 'dashboard/profile');
assert.equal(canonicalPage('customer', 'dashboard/overview'), 'dashboard/overview');
assert.equal(canonicalPage('mechanic', 'dashboard/settings'), 'dashboard/settings');
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
  navItems.mechanic.map(([id]) => id),
  [
    'overview',
    'jobs',
    'quotes',
    'profile',
    'documents',
    'application',
    'notifications',
    'settings',
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
assert.equal(pageTitle('mechanic', 'profile'), 'Business profile');
assert.equal(pageTitle('mechanic', 'settings'), 'Account settings');
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
assert.ok(mechanicOverview.includes('Visit website'));
assert.ok(mechanicOverview.includes('Clarity at every step'));
assert.ok(mechanicOverview.includes('Sign out / switch preview'));
assert.ok(mechanicOverview.includes('Demo workspace'));
assert.ok(mechanicOverview.includes('>VA<'));
assert.ok(!mechanicOverview.includes('profile-link'));
assert.ok(!mechanicOverview.includes('customer-notify'));
const mechanicProfile = screen('mechanic', 'profile');
assert.ok(mechanicProfile.includes('A profile that tells your story'));
assert.ok(mechanicProfile.includes('Business profile'));
assert.ok(!mechanicProfile.includes('Full name'));
const mechanicSettings = screen('mechanic', 'settings');
assert.ok(mechanicSettings.includes('Display name'));
assert.ok(mechanicSettings.includes('Save settings'));
assert.ok(mechanicSettings.includes('Account settings'));
assert.ok(!mechanicSettings.includes('Full name'));
const adminSettings = screen('admin', 'settings');
assert.ok(adminSettings.includes('Platform settings'));
assert.ok(adminSettings.includes('Pilot configuration'));
assert.ok(!adminSettings.includes('Full name'));
assert.ok(!adminSettings.includes('Open profile'));
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
console.log(
  `${count} role/auth screens rendered; role route guards, application checklist, and complete quote-to-payment state flow passed.`,
);
