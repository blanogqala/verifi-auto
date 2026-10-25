/**
 * Browser checks against the approved demo and a throwaway API.
 * The API process sets its own database URL before loading the app, so backend/.env is not used.
 */
import { spawn, spawnSync } from 'node:child_process';
import { createConnection } from 'node:net';
import { appendFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';
import { chromium } from 'playwright';

const root = dirname(fileURLToPath(import.meta.url));
const frontend = dirname(root);
const backend = join(frontend, '..', 'backend');
const pg = createRequire(join(backend, 'package.json'))('pg');
const demoUrl = process.env.DEMO_URL || 'http://127.0.0.1:5174';
const appUrl = 'http://127.0.0.1:5199';
const password = 'StrongExample9!';
const customerEmail = 'customer@example.test';
const otherEmail = 'other@example.test';

const logPath = join(frontend, 'e2e-output.txt');
writeFileSync(logPath, '');
function record(text) {
  process.stdout.write(text);
  try {
    appendFileSync(logPath, text);
  } catch {
    // The live log is the source of truth if the artifact file cannot be written.
  }
}

function launch(name, command, args, cwd) {
  record(`\n[e2e] starting ${name}\n`);
  const child = spawn(command, args, {
    cwd,
    shell: true,
    detached: process.platform !== 'win32',
    env: { ...process.env, FORCE_COLOR: '0', NO_COLOR: '1' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const chunks = [];
  const onData = (chunk) => {
    const text = chunk.toString();
    chunks.push(text);
    if (chunks.join('').length > 20000) chunks.shift();
    record(text);
  };
  child.stdout?.on('data', onData);
  child.stderr?.on('data', onData);
  child.on('error', (error) => record(`[e2e] ${name} failed to start: ${error.message}\n`));
  return { name, child, log: () => chunks.join('').slice(-12000) };
}

function stopTree(child) {
  if (!child?.pid) return;
  if (process.platform === 'win32') {
    spawnSync('taskkill', ['/pid', String(child.pid), '/t', '/f'], {
      shell: true,
      windowsHide: true,
      stdio: 'ignore',
    });
    return;
  }
  try {
    process.kill(-child.pid, 'SIGKILL');
  } catch {
    try {
      child.kill('SIGKILL');
    } catch {
      // Already gone.
    }
  }
}

async function waitForHttp(service, url, timeoutMs, accept) {
  const started = Date.now();
  let last = 'no response';
  while (Date.now() - started < timeoutMs) {
    if (service.child?.exitCode != null || service.child?.signalCode) {
      throw new Error(
        `${service.name} exited before it accepted HTTP requests (${url}) with code ${service.child.exitCode}.\n${service.log()}`,
      );
    }
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(2000) });
      if (accept(response.status)) {
        record(`[e2e] ${service.name} is ready (${url})\n`);
        return;
      }
      last = `HTTP ${response.status}`;
    } catch (error) {
      last = error?.name === 'TimeoutError' ? 'request timed out' : error?.message || String(error);
    }
    await new Promise((resolve) => setTimeout(resolve, 400));
  }
  throw new Error(
    `${service.name} did not become ready within ${timeoutMs}ms (${url}). Last result: ${last}.\n${service.log()}`,
  );
}

async function portOpen(port) {
  return new Promise((resolve) => {
    const socket = createConnection({ port, host: '127.0.0.1' });
    socket.once('connect', () => {
      socket.end();
      resolve(true);
    });
    socket.once('error', () => resolve(false));
  });
}

async function verifyLink(email) {
  const client = new pg.Client({
    connectionString: 'postgresql://postgres:postgres@127.0.0.1:15440/postgres',
    connectionTimeoutMillis: 8000,
    query_timeout: 8000,
  });
  await client.connect();
  try {
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const result = await client.query(
        'SELECT body FROM "MailOutbox" WHERE "to" = $1 ORDER BY "createdAt" DESC LIMIT 1',
        [email],
      );
      const body = result.rows[0]?.body || '';
      const match = body.match(/#verify\?token=([^\s]+)/);
      if (match) return decodeURIComponent(match[1]);
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    throw new Error(`No verification email for ${email}`);
  } finally {
    await client.end();
  }
}

async function signIn(page, email) {
  await page.goto(appUrl + '/#login');
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.getByRole('button', { name: 'Sign out' }).waitFor();
}

async function registerAndVerify(page, name, email) {
  await page.goto(appUrl + '/#register');
  await page.getByRole('button', { name: 'Customer' }).click();
  await page.getByLabel('Full name').fill(name);
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Create account' }).click();
  await page.getByText('Check your email to verify').waitFor();
  const token = await verifyLink(email);
  await page.goto(`${appUrl}/#verify?token=${encodeURIComponent(token)}`);
  await page.getByText('Email verified').waitFor();
  await signIn(page, email);
}

async function demo(browser) {
  console.log('Starting demo browser checks');
  const page = await browser.newPage();
  page.setDefaultTimeout(60000);
  page.setDefaultNavigationTimeout(60000);
  await page.goto(demoUrl + '/#home');
  await page.getByRole('heading', { name: 'Confidence in every kilometre.' }).waitFor();
  await page.goto(demoUrl + '/#find');
  await page.getByRole('heading', { name: 'Find a professional' }).waitFor();
  for (const role of [
    ['Customer', 'Enter customer preview', 'My Garage'],
    ['Mechanic', 'Enter mechanic preview', 'Appointments'],
    ['Platform admin', 'Enter platform admin preview', 'Applications'],
  ]) {
    await page.goto(demoUrl + '/#login');
    await page.getByRole('button', { name: role[0], exact: true }).click();
    await page.getByRole('button', { name: role[1] }).click();
    await page.getByRole('button', { name: 'Sign out' }).waitFor();
    await page.getByRole('link', { name: role[2] }).or(page.getByRole('button', { name: role[2] })).first().waitFor();
    await page.getByRole('button', { name: 'Sign out' }).click();
  }
  await page.goto(demoUrl + '/#login');
  await page.getByRole('button', { name: 'Customer', exact: true }).click();
  await page.getByRole('button', { name: 'Enter customer preview' }).click();
  await page.goto(demoUrl + '/#dashboard/garage');
  await page.getByRole('heading', { name: /Garage|Volkswagen|vehicle/i }).first().waitFor();
  await page.goto(demoUrl + '/#find');
  await page.getByRole('button', { name: 'Book assessment' }).first().click();
  await page.getByRole('heading', { name: /Book an assessment|Precision|On the Move|Sample/i }).first().waitFor();
  await page.close();
  console.log('Demo browser checks passed.');
}

async function connected(browser) {
  console.log('Starting connected browser checks');
  const page = await browser.newPage();
  page.setDefaultTimeout(60000);
  page.setDefaultNavigationTimeout(60000);
  await registerAndVerify(page, 'Casey Customer', customerEmail);
  // The connected directory contains one approved mechanic. On desktop, keep
  // the empty grid tracks instead of stretching the sole card full-width.
  await page.goto(appUrl + '/#dashboard/find');
  await page.getByRole('heading', { name: 'Approved Workshop' }).waitFor();
  const desktop = await page.evaluate(() => {
    const grid = document.querySelector('.directory-embedded .provider-grid');
    const card = grid?.querySelector('.provider-card');
    return {
      grid: grid?.getBoundingClientRect().width || 0,
      card: card?.getBoundingClientRect().width || 0,
    };
  });
  if (!(desktop.grid > 700 && desktop.card > 0 && desktop.card < desktop.grid * 0.75)) {
    throw new Error('A single professional should occupy one desktop grid column: ' + JSON.stringify(desktop));
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForFunction(() => {
    const grid = document.querySelector('.directory-embedded .provider-grid');
    const card = grid?.querySelector('.provider-card');
    if (!grid || !card) return false;
    return Math.abs(grid.getBoundingClientRect().width - card.getBoundingClientRect().width) < 3;
  });
  // The public directory must use the SAME one-card desktop columns as the
  // customer dashboard. The public footer must never be fixed or sticky.
  await page.setViewportSize({ width: 1280, height: 1400 });
  await page.goto(appUrl + '/#find');
  await page.getByRole('heading', { name: 'Approved Workshop' }).waitFor();
  const publicLayout = await page.evaluate(() => {
    const grid = document.querySelector('main.app-page .provider-grid');
    const card = grid?.querySelector('.provider-card');
    const footer = document.querySelector('footer.site-footer');
    return {
      gridWidth: grid?.getBoundingClientRect().width || 0,
      cardWidth: card?.getBoundingClientRect().width || 0,
      footerBottom: footer?.getBoundingClientRect().bottom || 0,
      footerPosition: footer ? getComputedStyle(footer).position : '',
      pageHeight: document.documentElement.scrollHeight,
      viewportHeight: innerHeight,
    };
  });
  if (!(publicLayout.gridWidth > 700 && publicLayout.cardWidth > 0 &&
      publicLayout.cardWidth < publicLayout.gridWidth * .75)) {
    throw new Error('Public directory must preserve desktop grid columns: ' + JSON.stringify(publicLayout));
  }
  if (publicLayout.footerPosition !== 'static' ||
      publicLayout.pageHeight > publicLayout.viewportHeight + 2 ||
      Math.abs(publicLayout.footerBottom - publicLayout.viewportHeight) > 2) {
    throw new Error('Public footer must finish a short page without hanging or sticking: ' + JSON.stringify(publicLayout));
  }
  // A customer must see contact fields from the approved professional API,
  // without falling back to demo profile details.
  await page.getByRole('button', { name: /View profile/ }).first().click();
  await page.getByRole('heading', { name: 'Approved Workshop' }).waitFor();
  await page.getByText('1 Test Street', { exact: true }).last().waitFor();
  await page.getByRole('link', { name: 'mechanic@example.test' }).waitFor();
  await page.getByRole('link', { name: '0712345678' }).waitFor();
  await page.getByRole('link', { name: /Visit website/ }).waitFor();
  const sections = await page.locator('.pro-information-section > h2').allTextContents();
  if (sections.join('|') !== 'About|Contact|Services') {
    throw new Error('Public professional profile sections are out of order: ' + sections.join('|'));
  }
  await page.goto(appUrl + '/#find');
  await page.getByRole('heading', { name: 'Approved Workshop' }).waitFor();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForFunction(() => {
    const grid = document.querySelector('main.app-page .provider-grid');
    const card = grid?.querySelector('.provider-card');
    return !!grid && !!card &&
      Math.abs(grid.getBoundingClientRect().width - card.getBoundingClientRect().width) < 3;
  });
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.getByRole('button', { name: 'Book assessment' }).click();
  await page.getByRole('button', { name: 'Add vehicle' }).click();
  await page.getByLabel('Make').fill('Toyota');
  await page.getByLabel('Model').fill('Corolla');
  await page.getByLabel('Year').fill('2018');
  await page.getByLabel('Registration').fill('CA123456');
  await page.getByRole('button', { name: 'Save vehicle' }).click();
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  await page.getByLabel('Preferred date').fill(tomorrow);
  await page.getByLabel('What needs attention?').fill('Brake noise from the front wheels');
  await page.getByRole('button', { name: 'Send request' }).click();
  await page.getByRole('heading', { name: 'Request sent' }).waitFor();
  await page.getByRole('button', { name: 'View my bookings' }).click();
  await page.getByRole('button', { name: /View booking/ }).first().click();
  await page.getByText('Brake noise from the front wheels').waitFor();
  const bookingUrl = page.url();
  await page.getByRole('button', { name: 'Sign out' }).click();

  await signIn(page, 'mechanic@example.test');
  await page.goto(appUrl + '/#dashboard/appointments/pending');
  // A new backend booking shows one orange dot on the sidebar and the exact card.
  await page.locator('.nav-item').filter({ hasText: 'Appointments' })
    .locator('.nav-attention-dot').waitFor();
  await page.locator('.appointment-card .booking-attention-dot').waitFor();
  await page.getByRole('button', { name: /Open appointment/ }).click();
  // The detail comes from the scoped booking API, not admin-only customer lists.
  await page.getByText('Casey Customer', { exact: true }).first().waitFor();
  await page.getByText('customer@example.test', { exact: true }).waitFor();
  await page.getByText('CA123456', { exact: true }).waitFor();
  // Reaching the actual request acknowledges it; the parent list alone does not.
  await page.locator('.nav-item').filter({ hasText: 'Appointments' })
    .locator('.nav-attention-dot').waitFor({ state: 'detached' });
  await page.getByRole('button', { name: 'Accept appointment' }).click();
  await page.getByRole('button', { name: 'Prepare quotation' }).waitFor();
  await page.getByRole('tab', { name: 'Quotes & payments' }).click();
  await page.getByLabel('Line 1 type').selectOption('parts');
  await page.locator('.quote-editor').getByLabel('Description').fill('Front brake pads');
  await page.getByLabel('Line 1 quantity').fill('1');
  await page.getByLabel('Line 1 price').fill('850');
  await page.locator('.quote-editor').getByLabel('Notes').fill('Replace the front brake pads.');
  await page.getByRole('button', { name: 'Send quotation' }).click();
  await page.getByText('Quotation sent for approval.').waitFor();
  await page.getByRole('button', { name: 'Sign out' }).click();

  await signIn(page, customerEmail);
  await page.goto(bookingUrl);
  await page.getByRole('tab', { name: 'Quotes & payments' }).click();
  await page.getByRole('button', { name: 'Review and approve' }).click();
  await page.getByRole('button', { name: 'Approve selected repairs' }).click();
  await page.getByText('Approved').first().waitFor();
  await page.getByRole('button', { name: 'Sign out' }).click();

  await signIn(page, 'mechanic@example.test');
  await page.goto(appUrl + '/#dashboard/jobs');
  await page.getByRole('button', { name: /Open job/ }).click();
  await page.getByRole('button', { name: 'Start work' }).click();
  await page.getByLabel('Completed work').waitFor();
  await page.getByLabel('Completed work').fill('Replaced the front brake pads.');
  await page.getByLabel('Mileage (km)').fill('68000');
  await page.getByRole('button', { name: 'Mark work finished' }).click();
  await page.getByText('Awaiting payment').waitFor();
  await page.getByRole('button', { name: 'Sign out' }).click();

  await signIn(page, customerEmail);
  await page.goto(appUrl + '/#dashboard/payments');
  await page.getByRole('button', { name: 'Review & pay' }).click();
  await page.getByRole('button', { name: 'Online card payments are unavailable' }).waitFor();
  await page.reload();
  await page.goto(bookingUrl);
  await page.getByText('Brake noise from the front wheels').waitFor();
  await page.getByRole('button', { name: 'Sign out' }).click();

  const other = await browser.newPage();
  other.setDefaultTimeout(60000);
  other.setDefaultNavigationTimeout(60000);
  await registerAndVerify(other, 'Other Customer', otherEmail);
  await other.goto(bookingUrl);
  await other.getByRole('heading', { name: 'Booking not found' }).waitFor();
  await other.close();

  await signIn(page, 'mechanic@example.test');
  await page.goto(appUrl + '/#dashboard/profile/business');
  const businessName = page.getByLabel('Business or trading name');
  await page.waitForFunction(() =>
    [...document.querySelectorAll('label')].some((label) => {
      const input = label.querySelector('input');
      return label.textContent?.includes('Business or trading name') && input instanceof HTMLInputElement && input.value === 'Approved Workshop';
    }),
  );
  // Photo uploads are stored on User.photo. Ensure the same saved image appears
  // on the business header, profile summary, sidebar and topbar after reload.
  const profilePng = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAIAAABLbSncAAAAFElEQVR4nGOcFvGCARtgwio6aCUAckkB5gXesI0AAAAASUVORK5CYII=',
    'base64',
  );
  await page.locator('.mechanic-summary input[type="file"]').setInputFiles({
    name: 'mechanic-workshop-logo.png',
    mimeType: 'image/png',
    buffer: profilePng,
  });
  await page.getByText('Profile photo saved.').waitFor();
  const profileImageSelectors = [
    '.sidebar .workspace-identity .mechanic-photo-avatar img',
    '.workspace-top .mechanic-photo-avatar img',
    '.merchant-summary .mechanic-photo-avatar img',
    '.settings-form .panel-title .mechanic-photo-avatar img',
  ];
  const imageReady = (selectors) =>
    selectors.every((selector) => {
      const image = document.querySelector(selector);
      return image instanceof HTMLImageElement &&
        image.src.startsWith('data:image/jpeg;base64,') &&
        getComputedStyle(image).objectFit === 'contain' &&
        image.complete && image.naturalWidth > 0;
    });
  for (const selector of profileImageSelectors) {
    await page.locator(selector).waitFor({ state: 'attached', timeout: 12000 });
    const result = await page.locator(selector).evaluate((img) => ({
      photo: img instanceof HTMLImageElement && img.src.startsWith('data:image/jpeg;base64,'),
      fit: getComputedStyle(img).objectFit,
      loaded: img instanceof HTMLImageElement && img.complete && img.naturalWidth > 0,
    }));
    if (!result.photo || result.fit !== 'contain' || !result.loaded)
      throw new Error('Mechanic avatar check failed for ' + selector + ': ' + JSON.stringify(result));
  }
  await page.reload();
  await page.getByLabel('Business or trading name').waitFor();
  await page.waitForFunction(imageReady, profileImageSelectors, { timeout: 20000 });
  await page.goto(appUrl + '/#find');
  await page.getByRole('heading', { name: 'Approved Workshop' }).waitFor();
  await page.waitForFunction(() => {
    const image = document.querySelector('main.app-page .provider-card .provider-art img');
    return image instanceof HTMLImageElement &&
      image.src.startsWith('data:image/jpeg;base64,') &&
      image.complete && image.naturalWidth > 0 &&
      getComputedStyle(image).objectFit === 'contain';
  });
  await page.goto(appUrl + '/#dashboard/profile/business');
  await page.getByLabel('Business or trading name').waitFor();
  await businessName.fill('Updated Workshop');
  // The mechanic form has one editable dropdown per field, not two inputs.
  const areaPicker = page.getByRole('combobox', { name: 'Service Areas' });
  const servicePicker = page.getByRole('combobox', { name: 'Services Offered' });
  await areaPicker.fill('Durbanville, Cape Town');
  await areaPicker.press('Enter');
  await page.getByRole('button', { name: 'Remove Durbanville, Cape Town' }).waitFor();
  await servicePicker.fill('Wheel balancing');
  await servicePicker.press('Enter');
  await page.getByRole('button', { name: 'Remove Wheel balancing' }).waitFor();
  await servicePicker.click();
  await page.getByRole('option', { name: 'Tyres', exact: true }).click();
  await page.getByRole('button', { name: 'Remove Tyres' }).waitFor();
  const layout = await page.evaluate(() => {
    const row = document.querySelector('.profile-offerings-row');
    const fields = row?.querySelectorAll('.tag-picker');
    if (!row || !fields || fields.length !== 2) return { ok: false };
    const first = fields[0].getBoundingClientRect();
    const second = fields[1].getBoundingClientRect();
    return { ok: Math.abs(first.y - second.y) < 3 && second.x > first.right - 3 };
  });
  if (!layout.ok) throw new Error('Service areas and offered services must share the desktop row.');
  await page.getByRole('button', { name: 'Save profile' }).click();
  await page.getByText('Business profile saved').waitFor();
  await page.reload();
  await page.waitForFunction(() =>
    [...document.querySelectorAll('label')].some((label) => {
      const input = label.querySelector('input');
      return label.textContent?.includes('Business or trading name') && input instanceof HTMLInputElement && input.value === 'Updated Workshop';
    }),
  );
  await page.getByRole('button', { name: 'Remove Durbanville, Cape Town' }).waitFor();
  await page.getByRole('button', { name: 'Remove Wheel balancing' }).waitFor();
  await page.getByRole('button', { name: 'Remove Tyres' }).waitFor();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForFunction(() => {
    const fields = [...document.querySelectorAll('.profile-offerings-row .tag-picker')];
    if (fields.length !== 2) return false;
    const a = fields[0].getBoundingClientRect();
    const b = fields[1].getBoundingClientRect();
    return Math.abs(a.x - b.x) < 3 && b.y > a.bottom;
  });
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.getByRole('tab', { name: 'Banking details' }).click();
  await page.getByText('Payout onboarding is not connected yet').waitFor();
  await page.getByRole('button', { name: 'Sign out' }).click();

  await signIn(page, 'admin@example.test');
  await page.goto(appUrl + '/#dashboard/applications');
  // All registered mechanics must be visible, including drafts not yet ready for approval.
  const freshDraft = page.getByRole('row').filter({ hasText: 'Incomplete Workshop' });
  const editedDraft = page.getByRole('row').filter({ hasText: 'Updated Workshop' });
  await freshDraft.getByRole('button', { name: 'View progress' }).waitFor();
  // Editing an approved business intentionally resets its application to DRAFT.
  await editedDraft.getByRole('button', { name: 'View progress' }).waitFor();
  await page.getByRole('row').filter({ hasText: 'Pending Workshop' })
    .getByRole('button', { name: 'View application' }).waitFor();
  await page.getByRole('button', { name: 'View application' }).click();
  await page.getByText('Business details', { exact: true }).waitFor();
  await page.getByText('Submitted documents', { exact: true }).waitFor();
  await page.getByText('Application decision', { exact: true }).waitFor();
  await page.getByRole('link', { name: 'View Identity evidence' }).waitFor();
  await page.getByRole('button', { name: 'Approve Identity evidence' }).click();
  await page.waitForFunction(() =>
    document.querySelector('[aria-label="Approve Identity evidence"]')?.hasAttribute('disabled') === true,
  );
  await page.getByRole('button', { name: 'Approve Qualifications / experience' }).click();
  await page.waitForFunction(() =>
    document.querySelector('[aria-label="Approve Qualifications / experience"]')?.hasAttribute('disabled') === true,
  );
  await page.getByLabel('Decision note').fill('Approved for the disposable test.');
  await page.getByRole('button', { name: 'Approve application' }).click();
  await page.getByText('Application updated.').waitFor();
  await page.goto(appUrl + '/#dashboard/applications');
  // Approval moves only that application to Professionals; the unsubmitted draft remains.
  await freshDraft.getByRole('button', { name: 'View progress' }).waitFor();
  await editedDraft.getByRole('button', { name: 'View progress' }).waitFor();
  await page.getByRole('row').filter({ hasText: 'Pending Workshop' }).waitFor({ state: 'detached' });
  await page.goto(appUrl + '/#dashboard/professionals');
  await page.getByText('Pending Workshop', { exact: true }).waitFor();
  await page.goto(appUrl + '/#professional/00000000-0000-4000-8000-000000000000');
  await page.getByRole('heading', { name: 'Professional not found' }).waitFor();
  await page.close();
  console.log('Connected browser checks passed.');
}

const services = [];
let browser;
let stage = 'starting servers';
const readyTimeoutMs = 90_000;
const suiteTimeoutMs = 12 * 60 * 1000;

function stopServices() {
  for (const service of services) stopTree(service.child);
}

async function stopBrowser() {
  if (!browser) return;
  const proc = typeof browser.process === 'function' ? browser.process() : null;
  await Promise.race([
    browser.close().catch(() => {}),
    new Promise((resolve) => setTimeout(resolve, 10_000)),
  ]);
  if (proc && proc.exitCode == null && !proc.killed) {
    try {
      proc.kill('SIGKILL');
    } catch {
      // Chromium already left.
    }
  }
  browser = undefined;
}

const hardStop = setTimeout(() => {
  record(`[e2e] timed out during ${stage}. Stopping spawned processes.\n`);
  stopServices();
  const proc = browser && typeof browser.process === 'function' ? browser.process() : null;
  if (proc && proc.exitCode == null) {
    try {
      proc.kill('SIGKILL');
    } catch {
      // Chromium already left.
    }
  }
  process.exit(1);
}, suiteTimeoutMs);

async function run() {
  const demoAlready = await portOpen(5174);
  const demoService = demoAlready
    ? { name: 'demo frontend', child: { exitCode: null }, log: () => 'Reused a server that was already listening.\n' }
    : launch(
        'demo frontend',
        'npm',
        ['run', 'dev', '--', '--mode', 'demo', '--port', '5174', '--strictPort', '--host', '127.0.0.1'],
        frontend,
      );
  if (!demoAlready) services.push(demoService);
  else record('[e2e] demo frontend is already listening on 5174\n');
  const api = launch('disposable API', 'node', ['--import', 'tsx', 'scripts/disposable-api.ts'], backend);
  const connectedApp = launch(
    'connected frontend',
    'npm',
    ['run', 'dev', '--', '--mode', 'e2e', '--port', '5199', '--strictPort', '--host', '127.0.0.1'],
    frontend,
  );
  services.push(api, connectedApp);
  await waitForHttp(demoService, 'http://127.0.0.1:5174/', readyTimeoutMs, (status) => status < 500);
  await waitForHttp(api, 'http://127.0.0.1:3099/health', readyTimeoutMs, (status) => status === 200);
  await waitForHttp(connectedApp, 'http://127.0.0.1:5199/', readyTimeoutMs, (status) => status < 500);

  stage = 'launching Chromium';
  record('[e2e] launching Chromium\n');
  browser = await chromium.launch({
    timeout: 60_000,
    ...(process.env.PLAYWRIGHT_CHANNEL
      ? { channel: process.env.PLAYWRIGHT_CHANNEL }
      : { args: ['--disable-dev-shm-usage', '--no-sandbox'] }),
  });
  stage = 'demo browser checks';
  await demo(browser);
  stage = 'connected browser checks';
  await connected(browser);
  record('[e2e] all browser checks passed\n');
}

let exitCode = 1;
try {
  await run();
  exitCode = 0;
} catch (error) {
  record(`[e2e] failed during ${stage}: ${error?.stack || error}\n`);
  exitCode = 1;
} finally {
  clearTimeout(hardStop);
  stage = 'stopping browser and servers';
  await stopBrowser();
  stopServices();
}
process.exit(exitCode);
