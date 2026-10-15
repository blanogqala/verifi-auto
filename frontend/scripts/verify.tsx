import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import {
  initialData,
  roles,
  navItems,
  canSubmit,
  canVisit,
  transitionJob,
  quoteTotal,
} from '../src/demo';
import { Workspace } from '../src/layouts/WorkspaceLayout';
import { AuthPage as Auth } from '../src/pages/auth/AuthPage';
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
assert.equal(canVisit('mechanic', 'dashboard/garage'), false);
assert.equal(canVisit('customer', 'dashboard/applications'), false);
assert.equal(canVisit('admin', 'dashboard/applications'), true);
assert.equal(canVisit('customer', 'dashboard/garage'), true);
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
