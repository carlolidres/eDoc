import { expect, test, type Page } from '@playwright/test'

const email = process.env.E2E_EMAIL ?? ''
const password = process.env.E2E_PASSWORD ?? ''
const assigneeId = process.env.E2E_ASSIGNEE_ID ?? ''
const certificateId = process.env.E2E_CERTIFICATE_ID ?? ''
const verificationCode = process.env.E2E_VERIFICATION_CODE ?? ''

test.describe.configure({ mode: 'serial' })

async function signIn(page: Page) {
  await page.goto('#/login')
  await page.getByRole('textbox', { name: 'Email' }).fill(email)
  await page.getByRole('textbox', { name: 'Password' }).fill(password)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page.getByRole('heading', { name: 'Document routing dashboard' })).toBeVisible({ timeout: 20000 })
}

test.beforeAll(() => {
  test.skip(!email || !password, 'E2E_EMAIL and E2E_PASSWORD are required')
})

test.beforeEach(async ({ page }) => {
  await signIn(page)
})

test('dashboard shell is visible after sign-in', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Document routing dashboard' })).toBeVisible()
})

test('inbox and documents pages load', async ({ page }) => {
  await page.goto('#/inbox')
  await expect(page.getByRole('heading', { name: 'My Inbox', level: 2 })).toBeVisible()
  await page.goto('#/documents')
  await expect(page.getByRole('heading', { name: 'All documents', level: 2 })).toBeVisible()
})

test('reports page shows audit activity', async ({ page }) => {
  await page.goto('#/reports')
  await expect(page.getByRole('heading', { name: 'Reports', level: 2 })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Export CSV' })).toBeVisible()
  await expect(page.getByText(/certificate/i).first()).toBeVisible({ timeout: 20000 })
})

test('signing workspace shows audit trail and certificate card', async ({ page }) => {
  test.skip(!assigneeId, 'E2E_ASSIGNEE_ID is required')
  await page.goto(`#/sign/${assigneeId}`)
  await expect(page.getByText('Audit trail')).toBeVisible({ timeout: 20000 })
  await expect(page.getByText('Completion certificate')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Verify certificate' })).toBeVisible()
})

test('public verify page confirms issued certificate', async ({ page }) => {
  test.skip(!certificateId || !verificationCode, 'E2E_CERTIFICATE_ID and E2E_VERIFICATION_CODE are required')
  await page.goto(`#/verify/${certificateId}`)
  await page.getByRole('textbox', { name: 'Verification code' }).fill(verificationCode)
  await page.getByRole('button', { name: 'Verify certificate' }).click()
  await expect(page.getByRole('heading', { name: 'Certificate verified' })).toBeVisible({ timeout: 20000 })
})
