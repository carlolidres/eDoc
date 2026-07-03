import { expect, test } from '@playwright/test'

test('signs in and shows dashboard shell', async ({ page }) => {
  await page.goto('/#/login')
  await page.getByRole('textbox', { name: 'Email' }).fill('owner@example.com')
  await page.getByRole('textbox', { name: 'Password' }).fill('password')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page.getByRole('heading', { name: 'Document routing dashboard' })).toBeVisible()
  await expect(page.getByText('Awaiting my action')).toBeVisible()
})
