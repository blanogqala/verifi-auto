/**
 * Browser checks against the approved demo and a throwaway API.
 * The API process sets its own database URL before loading the app, so backend/.env is not used.
 */
import { spawn } from 'node:child_process';
import { createConnection } from 'node:net';
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

function start(command, args, cwd, ready) {
  const child = spawn(command, args, { cwd, shell: true, stdio: ['ignore', 'pipe', 'pipe'] });
  let output = '';
  const wait = new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(output || `${command} did not become ready`)), 60000);
    const onData = (chunk) => {
      output += chunk.toString();
      if (output.includes(ready)) {
        clearTimeout(timer);
        resolve(undefined);
      }
    };
    child.stdout.on('data', onData);
    child.stderr.on('data', onData);
    child.on('exit', (code) => {
      clearTimeout(timer);
      reject(new Error(`${command} exited ${code}\n${output}`));
    });
  });
  return { child, wait };
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
  const client = new pg.Client({ connectionString: 'postgresql://postgres:postgres@127.0.0.1:15440/postgres' });
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
  const page = await browser.newPage();
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
  const page = await browser.newPage();
  await registerAndVerify(page, 'Casey Customer', customerEmail);
  await page.goto(appUrl + '/#find');
  await page.getByRole('heading', { name: 'Approved Workshop' }).waitFor();
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
  await page.getByRole('button', { name: /Open appointment/ }).click();
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
  await registerAndVerify(other, 'Other Customer', otherEmail);
  await other.goto(bookingUrl);
  await other.getByRole('heading', { name: 'Booking not found' }).waitFor();
  await other.close();
  await page.close();
  console.log('Connected browser checks passed.');
}

const demoAlready = await portOpen(5174);
const demoServer = demoAlready
  ? null
  : start('npm', ['run', 'dev', '--', '--mode', 'demo', '--port', '5174', '--strictPort', '--host', '127.0.0.1'], frontend, 'Local:');
const api = start('node', ['--import', 'tsx', 'scripts/disposable-api.ts'], backend, 'DISPOSABLE_API_READY');
const vite = start(
  'npm',
  ['run', 'dev', '--', '--mode', 'e2e', '--port', '5199', '--strictPort', '--host', '127.0.0.1'],
  frontend,
  'Local:',
);
const children = [api, vite, demoServer].filter(Boolean);
try {
  await Promise.all(children.map((item) => item.wait));
  const browser = await chromium.launch(
    process.env.PLAYWRIGHT_CHANNEL ? { channel: process.env.PLAYWRIGHT_CHANNEL } : {},
  );
  try {
    await demo(browser);
    await connected(browser);
  } finally {
    await browser.close();
  }
} finally {
  for (const item of children) {
    if (process.platform === 'win32') {
      spawn('taskkill', ['/pid', String(item.child.pid), '/t', '/f'], { shell: true });
    } else item.child.kill('SIGTERM');
  }
}
