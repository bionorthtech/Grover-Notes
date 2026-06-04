import { test, expect } from '@playwright/test'
import { executeCommand, openCommandPalette } from './helpers'

test.describe('Contribute modal', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      const openedUrls: string[] = []
      Object.defineProperty(window, '__groverOpenedUrls', {
        configurable: true,
        value: openedUrls,
      })
      window.open = ((url?: string | URL | undefined) => {
        openedUrls.push(String(url ?? ''))
        return null
      }) as typeof window.open

      const copiedBundles: string[] = []
      Object.defineProperty(window, '__groverCopiedBundles', {
        configurable: true,
        value: copiedBundles,
      })
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: {
          writeText: async (text: string) => {
            copiedBundles.push(text)
          },
        },
      })
    })

    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('[data-testid="sidebar-top-nav"]')).toBeVisible({ timeout: 10_000 })
  })

  test('Cmd+K opens Contribute, keyboard actions work, and Escape restores the opener @smoke', async ({ page }) => {
    await openCommandPalette(page)
    await executeCommand(page, 'Contribute')

    await expect(page.getByTestId('feedback-dialog')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Contribute to Grover' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Check out Refactoring' })).toBeFocused()

    await page.keyboard.press('Enter')
    await expect.poll(async () => page.evaluate(() => (window as typeof window & { __groverOpenedUrls: string[] }).__groverOpenedUrls)).toContain('https://refactoring.fm/')

    await page.keyboard.press('Tab')
    await expect(page.getByRole('button', { name: 'Open Product Board' })).toBeFocused()
    await page.keyboard.press('Enter')
    await expect.poll(async () => page.evaluate(() => (window as typeof window & { __groverOpenedUrls: string[] }).__groverOpenedUrls)).toContain('https://grover.canny.io/')

    await page.keyboard.press('Tab')
    await expect(page.getByRole('button', { name: 'Open Discussions' })).toBeFocused()
    await page.keyboard.press('Space')
    await expect.poll(async () => page.evaluate(() => (window as typeof window & { __groverOpenedUrls: string[] }).__groverOpenedUrls)).toContain('https://github.com/bionorthtech/grover-notes/discussions')

    await page.keyboard.press('Tab')
    await expect(page.getByRole('button', { name: 'Open Pull Requests' })).toBeFocused()
    await page.keyboard.press('Enter')
    await expect.poll(async () => page.evaluate(() => (window as typeof window & { __groverOpenedUrls: string[] }).__groverOpenedUrls)).toContain('https://github.com/bionorthtech/grover-notes/pulls')

    await page.keyboard.press('Tab')
    await expect(page.getByRole('button', { name: 'Open Contributing Guide' })).toBeFocused()
    await page.keyboard.press('Space')
    await expect.poll(async () => page.evaluate(() => (window as typeof window & { __groverOpenedUrls: string[] }).__groverOpenedUrls)).toContain('https://github.com/bionorthtech/grover-notes/blob/main/CONTRIBUTING.md')

    await page.keyboard.press('Tab')
    await expect(page.getByRole('button', { name: 'Open GitHub Issues' })).toBeFocused()
    await page.keyboard.press('Enter')
    await expect.poll(async () => page.evaluate(() => (window as typeof window & { __groverOpenedUrls: string[] }).__groverOpenedUrls)).toContain('https://github.com/bionorthtech/grover-notes/issues')

    await page.keyboard.press('Tab')
    await expect(page.getByRole('button', { name: 'Copy sanitized diagnostics' })).toBeFocused()
    await page.keyboard.press('Space')
    await expect.poll(async () => page.evaluate(() => (window as typeof window & { __groverCopiedBundles: string[] }).__groverCopiedBundles.length)).toBe(1)

    await page.keyboard.press('Escape')
    await expect(page.getByTestId('feedback-dialog')).not.toBeVisible()
    await expect(page.locator('input[placeholder="Type a command..."]')).toBeVisible()
    await expect(page.locator('input[placeholder="Type a command..."]')).toBeFocused()
  })
})
