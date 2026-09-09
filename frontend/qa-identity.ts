/**
 * QA identities for end-to-end runs.
 *
 * These suites provision the accounts they need rather than logging into seeded ones. A
 * seeded account is a live credential that has to be created, stored, rotated and kept
 * working in every program -- and on 2026-08-27 one eight-character password turned out to
 * be shared by 161 accounts across 39 databases, after which every suite that had hardcoded
 * it was silently logging in as nobody. A suite that authenticates as nobody lands on the
 * login page and its assertions still pass.
 *
 * The cost of self-provisioning is litter, so addresses are namespaced rather than merely
 * unique:
 *
 *     qa-tester-<role>-<runId>-<n>@<domain>
 *
 * `qa-` marks the account as harness-made, `tester` keeps this program's cleanup off every
 * other program's rows, and <runId> groups one run so teardown is exact rather than
 * "anything that looks old". Matching on "@example.com" instead would be wrong: several
 * programs keep legitimate demo personas there.
 *
 * Cleanup is global-teardown.ts, run automatically when the run finishes.
 * Config comes from ~/.config/bialkowned/secrets/3_community/8_Tester/qa.env:
 *
 *     set -a; . ~/.config/bialkowned/secrets/3_community/8_Tester/qa.env; set +a
 */

const PROGRAM = process.env.E2E_PROGRAM || 'tester';
const DOMAIN = process.env.E2E_EMAIL_DOMAIN || 'example.com';
const RUN_ID =
  process.env.E2E_RUN_ID ||
  `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

let counter = 0;

/**
 * The password provisioned accounts are created with.
 *
 * Throws rather than defaulting. A default is exactly how the previous literal survived: the
 * suite kept running after the real value stopped working.
 */
export function qaPassword() {
  const value = process.env.E2E_PASSWORD;
  if (!value) {
    throw new Error(
      'E2E_PASSWORD is not set. Load the program qa.env before running:\n' +
        '  set -a; . ~/.config/bialkowned/secrets/3_community/8_Tester/qa.env; set +a'
    );
  }
  return value;
}

/** A fresh, namespaced address for one role in this run. */
export function qaEmail(role: string) {
  counter += 1;
  return `qa-${PROGRAM}-${role}-${RUN_ID}-${counter}@${DOMAIN}`;
}

/** True for any address this harness minted, in any run. */
export function isQaEmail(email: string) {
  return new RegExp(`^qa-${PROGRAM}-[a-z0-9]+-`, 'i').test(String(email || ''));
}

/**
 * The e-mail verification token this program just issued to a provisioned account.
 *
 * Registration on most of this fleet lands an account unverified, and login then refuses
 * it. The token is already in the database and this harness already connects to that
 * database to delete accounts when the run ends, so it reads what the app just wrote --
 * no test-only endpoint to gate and leave enabled in production, and no mocked code, which
 * would stop the suite exercising the real verification path.
 *
 * Refuses any address outside the harness namespace, so it cannot be aimed at a real user.
 *
 *   const email = qaEmail('user')
 *   await registerViaApi(email, qaPassword())
 *   const token = await qaVerifyToken(email)
 *   await verifyViaApi(token)
 */
export async function qaVerifyToken(email: string) {
  // Dynamic import rather than require(): this file is emitted as CommonJS for some
  // programs and true ESM for others, and require is undefined in the latter.
  const { execFile } = await import('node:child_process');
  const { promisify } = await import('node:util').then(m => m.default ?? m);
  const run = promisify(execFile);
  const db = process.env.E2E_DB;
  if (!db) throw new Error('E2E_DB is not set — qa.env must name the database to read from');
  const python =
    process.env.E2E_SWEEP_PYTHON ||
    `${process.env.FLEET_ROOT ?? process.env.HOME + '/Production'}/2_commercial/1_Bialkowned/bialkowned_erp/backend/venv/bin/python`;
  const { stdout } = await run(
    python,
    [`${process.env.FLEET_ROOT ?? process.env.HOME + '/Production'}/2_commercial/1_Bialkowned/bialkowned_erp/backend/core/standards/qa_verify_token.py`, '--db', db, '--email', email],
    { timeout: 30000 }
  );
  return stdout.trim();
}
