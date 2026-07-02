import { expect, test } from '@playwright/test'

const baseURL = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173/'
const email = process.env.E2E_EMAIL ?? 'carlolidres@gmail.com'
const password = process.env.E2E_PASSWORD ?? ''

test.describe.configure({ mode: 'serial' })

test.beforeAll(() => {
  test.skip(!password, 'E2E_PASSWORD required')
})

async function signIn(page: import('@playwright/test').Page) {
  await page.goto(`${baseURL}#/login`)
  await page.getByRole('textbox', { name: 'Email' }).fill(email)
  await page.getByRole('textbox', { name: 'Password' }).fill(password)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page.getByRole('heading', { name: 'Document routing dashboard' })).toBeVisible({ timeout: 20000 })
}

test('sidebar has no demo signing workspace link', async ({ page }) => {
  await signIn(page)
  await expect(page.getByRole('link', { name: 'Signing Workspace' })).toHaveCount(0)
})

test('invalid assignment route does not surface graphql uuid error', async ({ page }) => {
  const errors: string[] = []
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text())
  })
  await signIn(page)
  await page.goto(`${baseURL}#/sign/demo-assignment`)
  await expect(page.getByText('Assignment unavailable')).toBeVisible({ timeout: 10000 })
  expect(errors.some((line) => line.includes('demo-assignment'))).toBeFalsy()
})
