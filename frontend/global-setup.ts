/**
 * Assign one run id before the workers fork.
 *
 * Global setup is the only thing that runs once, ahead of everything else, so it is where a
 * single E2E_RUN_ID can be established. qa-identity.ts prefers this over generating its own,
 * and global-teardown.ts uses it to delete exactly what this run created -- which is what
 * keeps a suite from collecting a concurrently-running suite's accounts.
 */

export default async () => {
  if (!process.env.E2E_RUN_ID) {
    process.env.E2E_RUN_ID =
      `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  }
  process.env.E2E_PROGRAM = process.env.E2E_PROGRAM || 'tester';
};
