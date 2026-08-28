import { test, expect } from '@playwright/test'

/**
 * Smoke journey for 3_community/8_Tester.
 *
 * These assertions are chosen for how this fleet actually fails, not for what is easy to
 * assert. A white screen serves HTTP 200 with a valid index.html, so status alone proves
 * nothing; the frontend and backend are separate pm2 processes, so the page can render
 * perfectly while every API call behind it 500s.
 */
test.describe('3_community/8_Tester — smoke', () => {
  test('the application renders, without errors, and its API is alive', async ({ page }) => {
    const pageErrors: Error[] = []
    const serverErrors: string[] = []
    page.on('pageerror', (e) => pageErrors.push(e))
    page.on('response', (r) => {
      if (r.status() >= 500) serverErrors.push(`${r.status()} ${r.url()}`)
    })

    const res = await page.goto('/', { waitUntil: 'domcontentloaded' })
    expect(res, 'no response from the base URL').not.toBeNull()
    expect(res!.status(), 'base URL did not return a success status').toBeLessThan(400)

    // The real check. Every SPA here serves a near-empty shell until its JS runs, so this
    // waits for the app to put something on the page rather than trusting the status code.
    await expect
      .poll(async () => (await page.locator('body').innerText()).trim().length,
            { message: 'the page never rendered any text — white screen', timeout: 20000 })
      .toBeGreaterThan(20)

    await expect(page).toHaveTitle(/.+/)

    expect(pageErrors.map((e) => e.message),
           'uncaught exception while the app booted').toEqual([])
    expect(serverErrors, 'a request returned 5xx while the page loaded').toEqual([])
  })
})
