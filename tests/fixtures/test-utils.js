/**
 * FlightTrace E2E Test Utilities
 *
 * Shared utilities for Playwright tests
 */

const BASE_URL = process.env.BASE_URL || 'https://flightandtrace.com';
const API_URL = process.env.API_URL || 'https://flightandtrace.com/api';

/**
 * Login to the application
 * @param {import('@playwright/test').Page} page
 * @param {string} email
 * @param {string} password
 */
async function login(page, email, password) {
  await page.goto(`${BASE_URL}/login`);

  await page.fill('input[name="email"], input[type="email"]', email);
  await page.fill('input[name="password"], input[type="password"]', password);
  await page.click('button[type="submit"]');

  // Wait for redirect or dashboard
  await page.waitForURL(/dashboard|home|live/i, { timeout: 10000 }).catch(() => {
    // May not redirect, check for success indicator
  });

  return page;
}

/**
 * Clear all storage (cookies, localStorage, sessionStorage)
 * @param {import('@playwright/test').BrowserContext} context
 * @param {import('@playwright/test').Page} page
 */
async function clearAllStorage(context, page) {
  await context.clearCookies();

  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  }).catch(() => {});
}

/**
 * Accept cookie consent if banner is present
 * @param {import('@playwright/test').Page} page
 */
async function acceptCookieConsent(page) {
  const acceptBtn = page.locator('button:has-text("Accept"), [data-testid="cookie-accept"]');

  await page.waitForTimeout(1000);

  if (await acceptBtn.isVisible().catch(() => false)) {
    await acceptBtn.click();
    await page.waitForTimeout(500);
  }
}

/**
 * Accept aviation disclaimer if shown
 * @param {import('@playwright/test').Page} page
 */
async function acceptDisclaimer(page) {
  const checkbox = page.locator('input[type="checkbox"][name*="disclaimer"], [data-testid="disclaimer-checkbox"]');
  const continueBtn = page.locator('button:has-text("Continue"), button:has-text("Accept"), button:has-text("I Understand")');

  await page.waitForTimeout(1000);

  if (await checkbox.isVisible().catch(() => false)) {
    await checkbox.click();
    await continueBtn.click();
    await page.waitForTimeout(500);
  }
}

/**
 * Navigate to settings page
 * @param {import('@playwright/test').Page} page
 */
async function goToSettings(page) {
  // Try direct navigation first
  await page.goto(`${BASE_URL}/settings`);

  // If not found, try menu navigation
  const settingsHeading = page.locator('h1:has-text("Settings")');

  if (!(await settingsHeading.isVisible().catch(() => false))) {
    // Try hamburger menu
    const menuBtn = page.locator('[data-testid="menu-button"], .hamburger-menu, button[aria-label="Menu"]');
    if (await menuBtn.isVisible().catch(() => false)) {
      await menuBtn.click();
      await page.waitForTimeout(500);

      const settingsLink = page.locator('a:has-text("Settings"), button:has-text("Settings")');
      if (await settingsLink.isVisible().catch(() => false)) {
        await settingsLink.click();
      }
    }
  }

  return page;
}

/**
 * Wait for API response
 * @param {import('@playwright/test').Page} page
 * @param {string} urlPattern
 * @param {number} timeout
 */
async function waitForApi(page, urlPattern, timeout = 10000) {
  return page.waitForResponse(
    response => response.url().includes(urlPattern),
    { timeout }
  );
}

/**
 * Check if element exists and is visible
 * @param {import('@playwright/test').Page} page
 * @param {string} selector
 */
async function isVisible(page, selector) {
  const element = page.locator(selector);
  return element.isVisible().catch(() => false);
}

/**
 * Take a screenshot with timestamp
 * @param {import('@playwright/test').Page} page
 * @param {string} name
 */
async function takeScreenshot(page, name) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  await page.screenshot({
    path: `test-results/screenshots/${name}-${timestamp}.png`,
    fullPage: true,
  });
}

/**
 * Mock API response
 * @param {import('@playwright/test').Page} page
 * @param {string} urlPattern
 * @param {object} response
 */
async function mockApiResponse(page, urlPattern, response) {
  await page.route(urlPattern, route => {
    route.fulfill({
      status: response.status || 200,
      contentType: 'application/json',
      body: JSON.stringify(response.body || {}),
    });
  });
}

/**
 * Generate random test email
 */
function generateTestEmail() {
  const timestamp = Date.now();
  return `test-${timestamp}@flighttrace-test.com`;
}

/**
 * Format date for display comparison
 * @param {Date} date
 */
function formatDate(date) {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

module.exports = {
  BASE_URL,
  API_URL,
  login,
  clearAllStorage,
  acceptCookieConsent,
  acceptDisclaimer,
  goToSettings,
  waitForApi,
  isVisible,
  takeScreenshot,
  mockApiResponse,
  generateTestEmail,
  formatDate,
};
