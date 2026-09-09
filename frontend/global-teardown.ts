/**
 * Remove the accounts this run provisioned, as soon as it finishes.
 *
 * Self-provisioning suites leave accounts behind unless something collects them. Nothing did,
 * which is how the fleet reached 3,794 junk accounts and needed a manual purge. A run cleans
 * up after itself; the periodic sweep is a safety net for runs that crashed before reaching
 * here, not the mechanism.
 *
 * Deletion lives in backend/core/standards/qa_account_sweep.py rather than being reimplemented per
 * program: one matcher, one place. `--run` scopes it to this run, so a suite running
 * alongside another cannot take the other's accounts mid-test. `--db` matters more than it
 * looks -- an unscoped sweep walks every database on the box and takes ~55 seconds against
 * 0.8 scoped, and the first teardown written was killed by its own timeout.
 *
 * Never fatal: a cleanup failure must not turn a green run red.
 */

import { execFile } from 'child_process';
import { promisify } from 'util';
const execFileAsync = promisify(execFile);

const SWEEP = `${process.env.FLEET_ROOT ?? process.env.HOME + '/Production'}/2_commercial/1_Bialkowned/bialkowned_erp/backend/core/standards/qa_account_sweep.py`;
// The sweep needs pymongo. System python does not have it; every program venv does.
const PYTHON =
  process.env.E2E_SWEEP_PYTHON ||
  `${process.env.FLEET_ROOT ?? process.env.HOME + '/Production'}/2_commercial/1_Bialkowned/bialkowned_erp/backend/venv/bin/python`;

export default async () => {
  const runId = process.env.E2E_RUN_ID;
  if (!runId) {
    console.log('[teardown] E2E_RUN_ID not set — skipping cleanup (global-setup assigns it)');
    return;
  }
  const program = process.env.E2E_PROGRAM || 'tester';
  const args = [SWEEP, '--program', program, '--run', runId, '--apply'];
  if (process.env.E2E_DB) args.push('--db', process.env.E2E_DB);
  try {
    const { stdout } = await execFileAsync(PYTHON, args, { timeout: 180000 });
    const line = stdout.trim().split('\n').filter(Boolean).pop() || 'nothing to remove';
    console.log(`[teardown] ${line}`);
  } catch (err) {
    console.log(
      `[teardown] cleanup failed (${err.message.split('\n')[0]}). ` +
        `Accounts for run ${runId} remain; the periodic sweep will collect them.`
    );
  }
};
