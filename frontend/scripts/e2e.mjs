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

// Browser journeys intentionally exercise several roles in quick succession.
// Clear only the throwaway PGlite counters between scenarios, so normal API
// rate limiting stays enabled and unchanged for actual users and production.
async function resetDisposableRateLimits() {
  const client = new pg.Client({
    connectionString: 'postgresql://postgres:postgres@127.0.0.1:15440/postgres',
    connectionTimeoutMillis: 8000,
    query_timeout: 8000,
  });
  await client.connect();
  try {
    await client.query('DELETE FROM "RateLimit"');
    record('[e2e] reset request counters in disposable database before admin journey\n');
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
  await page.getByLabel('Model (vehicle name)').fill('Corolla');
  await page.getByLabel('Model year').fill('2018');
  await page.getByLabel('Registration').fill('CA123456');
  // Real car photos are compressed in-browser and persisted in the owned garage.
  const actualCarPng = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAIAAABLbSncAAAAFElEQVR4nGOcFvGCARtgwio6aCUAckkB5gXesI0AAAAASUVORK5CYII=',
    'base64',
  );
  await page.getByLabel('Choose vehicle photo').setInputFiles({
    name: 'my-actual-car.png', mimeType: 'image/png', buffer: actualCarPng,
  });
  await page.getByAltText('Preview of your car photograph').waitFor();
  await page.getByRole('button', { name: 'Save vehicle' }).click();
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  await page.getByLabel('Preferred date').fill(tomorrow);
  await page.getByLabel('What needs attention?').fill('Brake noise from the front wheels');
  await page.getByRole('button', { name: 'Send request' }).click();
  await page.getByRole('heading', { name: 'Request sent' }).waitFor();
  await page.getByRole('button', { name: 'View my bookings' }).click();
  await page.getByRole('button', { name: /View booking/ }).first().click();
  await page.getByText('Brake noise from the front wheels').waitFor();
  await page.getByRole('heading', { name: 'Your professional' }).waitFor();
  await page.getByRole('link', { name: 'mechanic@example.test' }).waitFor();
  await page.getByRole('button', { name: /View professional/ }).waitFor();
  await page.getByRole('button', { name: /View vehicle/ }).waitFor();
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
  await page.getByRole('heading', { name: 'Customer details' }).waitFor();
  await page.getByRole('heading', { name: 'Vehicle info' }).waitFor();
  await page.getByText('customer@example.test').waitFor();
  await page.getByRole('button', { name: 'Start work' }).click();
  await page.getByRole('button', { name: 'Add completed work' }).click();
  await page.locator('.var-check-item input[type="checkbox"]').first().check();
  await page.getByLabel('Work performed / additional technician notes').fill('Replaced the front brake pads and checked the braking system.');
  await page.getByLabel('Vehicle odometer at service (km)').fill('68000');
  await page.getByRole('button', { name: 'Save work report' }).click();
  if (await page.getByRole('button', { name: 'Review submitted work' }).count())
    throw new Error('Mechanic should only have Edit work report and Work is done.');
  await page.getByRole('button', { name: 'Edit work report' }).click();
  await page.getByText('View last saved work report').click();
  await page.getByText(/68.000 km/).waitFor();
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await page.getByRole('button', { name: 'Request VAR' }).click();
  await page.getByRole('button', { name: 'VAR pending' }).waitFor();
  await page.getByRole('button', { name: 'Work is done' }).click();
  await page.getByText('Awaiting payment').first().waitFor();
  await page.getByRole('button', { name: 'Sign out' }).click();

  await signIn(page, customerEmail);
  await page.reload();
  await page.goto(appUrl + '/#dashboard/bookings');
  await page.getByRole('combobox', { name: 'Filter job status' }).selectOption('All');
  await page.getByRole('searchbox', { name: 'Search' }).fill('');
  await page.locator('.sidebar .nav-item').filter({ hasText: 'My bookings' }).locator('.nav-attention-dot').waitFor();
  await page.locator('.booking-card .booking-attention-dot').first().waitFor();
  await page.goto(bookingUrl);
  await page.getByText('Brake noise from the front wheels').waitFor();
  await page.locator('.var-activity-section .var-attention-dot').waitFor();
  await page.locator('.var-customer-panel').first().locator('.var-attention-dot').waitFor();
  if (await page.getByRole('button', { name: /Review workshop work report/ }).count()) {
    throw new Error('The customer overview should not open work reports in a popup.');
  }
  const activity = page.locator('details.var-activity-section');
  await activity.locator('summary').click();
  await activity.locator('.var-attention-dot').waitFor({ state: 'detached' });
  await activity.getByText(/68.000 km/).waitFor();
  await activity.getByText('Replaced the front brake pads and checked the braking system.').waitFor();
  // A VAR request for a vehicle without earlier completed records must explain
  // the disabled grant action and allow the customer to notify the workshop.
  const varPanel = page.locator('details.var-customer-panel').first();
  await varPanel.locator('summary').click();
  await varPanel.locator('.var-attention-dot').waitFor({ state: 'detached' });
  await varPanel.getByText('This vehicle has no previous completed service records yet.').waitFor();
  await varPanel.getByRole('button', { name: 'Grant selected VAR access' }).isDisabled().then((disabled) => {
    if (!disabled) throw new Error('An empty VAR must not permit an access grant.');
  });
  await varPanel.getByRole('button', { name: 'Notify workshop: No history available' }).click();
  await page.getByText('Workshop notified that there is no earlier history to share.').waitFor();
  await page.goto(appUrl + '/#dashboard/notifications');
  await page.getByText(/No previous vehicle history|Workshop work report updated/).first().waitFor();
  if (await page.getByRole('button', { name: 'Find a professional' }).count())
    throw new Error('Notifications must not show a Find a professional CTA.');
  await page.locator('.inbox-list').waitFor();
  await page.locator('.inbox-detail-scroll').waitFor();
  await page.getByRole('button', { name: /Mark all as read/ }).first().waitFor();
  const notificationScroll = await page.evaluate(() => {
    const list = document.querySelector('.inbox-threads');
    const detail = document.querySelector('.inbox-detail-scroll');
    const outer = document.querySelector('.inbox');
    if (!list || !detail || !outer) return false;
    const listStyle = getComputedStyle(list), detailStyle = getComputedStyle(detail), outerStyle = getComputedStyle(outer);
    return listStyle.overflowY === 'auto' && detailStyle.overflowY === 'auto'
      && outerStyle.overflow === 'hidden' && outer.clientHeight > 300;
  });
  if (!notificationScroll) throw new Error('Notifications must scroll inside both fixed panels.');
  // My Garage vehicle details: work report is visible under its workshop and
  // opens an owner-facing VAR popup; booking history links back to the booking.
  await page.goto(bookingUrl);
  await page.getByRole('button', { name: /View vehicle/ }).click();
  await page.locator('.garage-detail-grid').waitFor();
  await page.getByRole('heading', { name: 'Vehicle Activity Record' }).waitFor();
  await page.getByRole('button', { name: 'Delete vehicle' }).waitFor();
  if (await page.getByRole('heading', { name: 'Archive vehicle' }).count()) {
    throw new Error('Vehicle deletion should be in the header, not its own card.');
  }
  const detailsGrid = await page.evaluate(() => {
    const cards = [...document.querySelectorAll('.garage-detail-grid .detail-card')];
    if (cards.length !== 2) return false;
    const left = cards[0].getBoundingClientRect(), right = cards[1].getBoundingClientRect();
    return Math.abs(left.top - right.top) < 4 && right.left > left.right - 3;
  });
  if (!detailsGrid) throw new Error('Vehicle facts and care reminders must be side by side on desktop.');
  await page.locator('.garage-var-entry').first().click();
  await page.getByRole('dialog', { name: 'Vehicle work report' }).waitFor();
  await page.getByText('Replaced the front brake pads and checked the braking system.').waitFor();
  await page.getByRole('button', { name: 'Close report' }).click();
  await page.getByRole('tab', { name: 'History' }).click();
  await page.getByRole('heading', { name: 'Booking history' }).waitFor();
  await page.locator('.garage-booking-entry').first().click();
  await page.getByText('Brake noise from the front wheels').waitFor();
  await page.goto(appUrl + '/#dashboard/garage');
  // Photos remain usable where no matching, licensed 3D model is available.
  // An unrelated concept car must never be identified as this customer's Polo.
  await page.locator('.showroom-photograph img').waitFor();
  await page.getByText('Uploaded photo (not verified as your actual vehicle)').waitFor();
  if (await page.locator('.vehicle-canvas-host canvas').count()) {
    throw new Error('A generic 3D car must not silently replace the owner photo.');
  }
  await page.waitForFunction(() => {
    const image = document.querySelector('.showroom-photograph img');
    const card = document.querySelector('.garage-card img');
    return image instanceof HTMLImageElement &&
      image.src.startsWith('data:image/jpeg;base64,') &&
      card instanceof HTMLImageElement &&
      card.src.startsWith('data:image/jpeg;base64,');
  });
  await page.reload();
  await page.locator('.showroom-photograph img').waitFor();
  await page.getByText('Uploaded photo (not verified as your actual vehicle)').waitFor();

  // A real 3D catalogue reference appears from identity fields WITHOUT photo upload.
  await page.getByRole('button', { name: 'Add vehicle' }).click();
  await page.getByLabel('Make').fill('Volkswagen');
  await page.getByLabel('Model (vehicle name)').fill('Polo Vivo');
  await page.getByLabel('Model year').fill('2021');
  await page.getByLabel('Variant').fill('1.6 Comfortline');
  await page.getByLabel('Registration').fill('CVR2021');
  await page.getByLabel('Body style').selectOption('hatchback');
  await page.getByRole('button', { name: 'Save vehicle' }).click();
  await page.locator('iframe.showroom-external-3d[src*="d0463d789e7c46039e979511ec8f5e92"]').waitFor();
  await page.getByText('Polo Mk5 3D reference — not your exact trim').first().waitFor();
  // The preview must not claim this is the exact owner vehicle.
  if (await page.locator('.showroom-photograph img').count()) {
    throw new Error('3D must appear automatically for a matching model without a photo.');
  }
  await page.getByRole('button', { name: 'Pause 3D' }).click();
  await page.getByRole('button', { name: 'Explore 3D' }).click();
  await page.locator('iframe.showroom-external-3d').waitFor();
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
  if (await businessName.inputValue() !== 'Updated Workshop') {
    throw new Error('The edited workshop name was not retained in the profile form.');
  }
  await page.getByRole('button', { name: 'Save profile' }).click();
  await page.getByText('Business profile saved').waitFor();
  const persistedWorkshop = await page.evaluate(async () => {
    const response = await fetch('http://127.0.0.1:3099/api/professional/me', { credentials: 'include' });
    return { status: response.status, body: await response.json() };
  });
  if (persistedWorkshop.status !== 200 || persistedWorkshop.body?.name !== 'Updated Workshop') {
    throw new Error('Workshop profile save did not persist: ' + JSON.stringify({
      status: persistedWorkshop.status, name: persistedWorkshop.body?.name, error: persistedWorkshop.body?.code,
    }));
  }
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

  await resetDisposableRateLimits();
  await signIn(page, 'admin@example.test');
  const bookingId = bookingUrl.split('/').pop();
  await page.goto(appUrl + '/#dashboard/jobs/' + encodeURIComponent(bookingId));
  await page.getByRole('heading', { name: 'Customer details' }).waitFor();
  await page.getByRole('heading', { name: 'Your professional' }).waitFor();
  await page.getByRole('tab', { name: 'Quotes & payments' }).click();
  await page.getByText('Repairs and charges').waitFor();
  if (await page.getByRole('button', { name: /Approve selected repairs|Send quotation/ }).count())
    throw new Error('Admin job quotation view must be read-only.');
  await page.getByRole('tab', { name: 'Messages' }).click();
  await page.getByText('Read-only conversation').waitFor();
  if (await page.getByRole('button', { name: 'Send', exact: true }).count())
    throw new Error('Admin must not send messages as a booking participant.');
  await page.goto(appUrl + '/#dashboard/customers');
  const customerRow = page.getByRole('row').filter({ hasText: 'Casey Customer' });
  await customerRow.getByRole('button', { name: /View details/ }).click();
  await page.getByRole('heading', { name: 'Casey Customer' }).waitFor();
  // The same customer now has both the booked Toyota and the photo-free Polo Vivo.
  // Keep the admin count aligned with the vehicle creation journey rather than
  // masking the new vehicle or altering production code.
  await page.getByText('Customer vehicles (2)').waitFor();
  await page.getByText('Customer booking history (1)').waitFor();
  await page.getByText('CA123456').first().waitFor();
  await page.getByText('CVR2021').first().waitFor();
  await page.getByText('Brake noise from the front wheels').waitFor();
  if (await page.locator('.admin-detail-tabs').count()) {
    throw new Error('Customer admin detail must have no Overview/Bookings tabs.');
  }
  // Disabling revokes customer sessions; account remains readable to the admin.
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Block customer' }).click();
  await page.getByText('Blocked', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Unblock customer' }).click();
  await page.getByText('Active', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Delete customer' }).click();
  await page.getByLabel('Confirm customer email').fill(customerEmail);
  const [deleteResponse] = await Promise.all([
    page.waitForResponse(response =>
      response.url().includes('/api/admin/customers/') &&
      response.request().method() === 'DELETE', { timeout: 15000 }),
    page.getByRole('button', { name: 'Permanently delete' }).click(),
  ]);
  const deleteBody = await deleteResponse.json();
  console.log('Guarded delete result:', deleteResponse.status(), JSON.stringify(deleteBody));
  if (deleteResponse.status() !== 409 || deleteBody.error?.code !== 'CUSTOMER_HAS_HISTORY')
    throw new Error('Customer deletion must refuse accounts with service history: ' +
      deleteResponse.status() + ' ' + JSON.stringify(deleteBody));
  await page.getByRole('alert').filter({ hasText: /linked vehicles, bookings or historical records/ }).waitFor();
  await page.getByRole('heading', { name: 'Casey Customer' }).waitFor();
  await page.goto(appUrl + '/#dashboard/applications');
  // All registered mechanics must be visible, including drafts not yet ready for approval.
  const freshDraft = page.getByRole('row').filter({ hasText: 'Incomplete Workshop' });
  const editedApproved = page.getByRole('row').filter({ hasText: 'Updated Workshop' });
  await freshDraft.getByRole('button', { name: 'View progress' }).waitFor();
  // Editing an approved business must NOT send it back to the applications queue.
  if (await editedApproved.count()) throw new Error('An approved workshop was sent back for review after a profile edit.');
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
  if (await editedApproved.count()) throw new Error('The previously approved workshop is no longer approved.');
  await page.getByRole('row').filter({ hasText: 'Pending Workshop' }).waitFor({ state: 'detached' });
  // The professional audit is a separate high-activity browser scenario.
  // Avoid carrying over counters from the customer and application review paths.
  await resetDisposableRateLimits();
  await page.goto(appUrl + '/#dashboard/professionals');
  await page.getByText('Updated Workshop', { exact: true }).waitFor();
  await page.getByText('Pending Workshop', { exact: true }).waitFor();
  await page.getByRole('row').filter({ hasText: 'Pending Workshop' }).getByRole('button', { name: 'View profile' }).click();
  await page.getByRole('heading', { name: 'Pending Workshop' }).waitFor();
  await page.getByRole('heading', { name: 'Verification documents' }).waitFor();
  await page.getByRole('link', { name: 'View IDENTITY' }).waitFor();
  await page.getByRole('heading', { name: 'Customer feedback and activity' }).waitFor();
  if (await page.getByRole('heading', { name: 'Business information' }).count()) {
    throw new Error('The professional profile banner already includes business details.');
  }
  const professionalCards = page.locator('.admin-professional-overview-grid > *');
  if (await professionalCards.count() !== 2) {
    throw new Error('Verification documents and customer feedback must be the only overview cards.');
  }
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.waitForFunction(() => {
    const cards = [...document.querySelectorAll('.admin-professional-overview-grid > *')];
    if (cards.length !== 2) return false;
    const left = cards[0].getBoundingClientRect();
    const right = cards[1].getBoundingClientRect();
    return Math.abs(left.top - right.top) < 3 && right.left > left.right - 3;
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForFunction(() => {
    const cards = [...document.querySelectorAll('.admin-professional-overview-grid > *')];
    if (cards.length !== 2) return false;
    const top = cards[0].getBoundingClientRect();
    const bottom = cards[1].getBoundingClientRect();
    return Math.abs(top.left - bottom.left) < 3 && bottom.top >= top.bottom - 3;
  });
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.getByText('Recorded gross revenue', { exact: true }).waitFor();
  await page.getByText('Active / Completed jobs', { exact: true }).waitFor();
  if (await page.getByRole('button', { name: 'View verification record' }).count()) {
    throw new Error('Professional overview must show documents directly.');
  }
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Block professional' }).click();
  await page.getByRole('region', { name: 'Professional account summary' }).getByText('Blocked', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Unblock professional' }).click();
  await page.getByRole('button', { name: 'Block professional' }).waitFor();
  await page.getByRole('button', { name: 'Delete professional' }).click();
  await page.getByLabel('Confirm business name').fill('Pending Workshop');
  const [deleteProfessionalResponse] = await Promise.all([
    page.waitForResponse(response => response.url().includes('/api/admin/professionals/') &&
      response.request().method() === 'DELETE'),
    page.getByRole('button', { name: 'Permanently delete' }).click(),
  ]);
  const deletedBody = await deleteProfessionalResponse.json();
  if (deleteProfessionalResponse.status() !== 409 ||
      deletedBody.error?.code !== 'PROFESSIONAL_HAS_HISTORY') {
    throw Error('Approved professional with verification documents must not be deleted: ' +
      JSON.stringify(deletedBody));
  }
  await page.getByRole('alert').filter({ hasText: /verification documents or service history/ }).waitFor();
  await page.locator('.admin-detail-tabs').getByRole('button', { name: 'Jobs', exact: true }).click();
  await page.getByRole('heading', { name: /Booking history/ }).waitFor();
  await page.locator('.admin-detail-tabs').getByRole('button', { name: 'Reviews', exact: true }).click();
  await page.getByRole('heading', { name: 'Customer reviews' }).waitFor();
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
