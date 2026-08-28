import { test, expect } from '@playwright/test'
import { qaEmail, qaPassword } from '../qa-identity'

/**
 * Authenticating journey for 3_community/8_Tester.
 *
 * Contract discovered from the running program on 2026-08-28, not assumed:
 *   register  POST /api/auth/register   fields: email, password, first_name, last_name, role
 *   login     POST /api/auth/login   fields: email, password
 *
 * The account is provisioned by the test rather than seeded, so there is no standing
 * credential to rotate and teardown can delete exactly what this run created. The address is
 * namespaced qa-<program>-<role>-<runId>-N@, which is what makes that cleanup exact.
 *
 * This asserts a credential comes BACK. A login that 200s with no token is the failure this
 * fleet has actually shipped -- the suite carries on, every later assertion runs
 * unauthenticated against the login page, and the run passes.
 */
const API = process.env.E2E_API_URL || process.env.E2E_BASE_URL || 'https://tester.bialkowned.com'

test.describe('3_community/8_Tester — authentication', () => {
  test('an account can be provisioned and then signed in', async ({ request }) => {
    const email = qaEmail('user')
    const password = qaPassword()
    const handle = email.split('@')[0].slice(0, 30)

    const registered = await request.post(`${API}/api/auth/register`, {
      data: {
        email: email,
        password: password,
        first_name: 'QA',
        last_name: 'Probe',
        role: 'builder'
      },
    })
    // 409/400 is fine: it means the account already exists, which is still a usable account.
    expect([200, 201, 202, 400, 409],
           `register returned ${registered.status()}: ${await registered.text()}`)
      .toContain(registered.status())

    const signedIn = await request.post(`${API}/api/auth/login`, {
      data: {
        email: email,
        password: password
      },
    })
    expect(signedIn.ok(),
           `login failed ${signedIn.status()}: ${await signedIn.text()}`).toBeTruthy()

    const body = await signedIn.json()
    const token =
      body?.access_token ?? body?.token ?? body?.data?.access_token ??
      body?.data?.token ?? body?.accessToken ?? body?.data?.accessToken
    expect(token, 'signed in but no credential came back').toBeTruthy()
    expect(String(token).length).toBeGreaterThan(20)
  })
})
