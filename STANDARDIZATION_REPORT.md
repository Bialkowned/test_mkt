# Standardization Report — 8_Tester

**Score:** 58/100 — **DRIFTED**  
**Path:** `Production/3_community/8_Tester`  
**PM2:** (none matched)

## L1 — Filesystem Skeleton
- **HIGH** — HUMAN_TEST_PLAN.md should be renamed to HUMAN_TESTING_PLAN.md
- **HIGH** — 6 loose .md report files at root (should move to docs/)
- **INFO** — Missing DEMO_PLAN.md (Sandy/demo will generate)

## L2 — Required Scaffolding
- **HIGH** — Missing .env.example

## L3 — Deployment Wiring
- **HIGH** — ecosystem cwd is outside program tree: /home/user1/Production/3_community/8_Tester/backend
- **HIGH** — ecosystem cwd is outside program tree: /home/user1/Production/3_community/8_Tester/frontend
- **INFO** — No PM2 process matched (not deployed, or named differently)
