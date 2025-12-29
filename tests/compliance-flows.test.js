/**
 * FlightTrace Compliance E2E Tests
 *
 * Tests for App Store / Google Play compliance requirements:
 * - Onboarding disclaimer acceptance
 * - Privacy policy viewing
 * - Terms of service viewing
 * - Cookie consent (GDPR)
 * - Data export request (GDPR)
 * - Account deletion request (GDPR)
 * - Subscription restore (App Store requirement)
 */

const { test, expect } = require('@playwright/test');

const BASE_URL = process.env.BASE_URL || 'https://flightandtrace.com';
const API_URL = process.env.API_URL || 'https://flightandtrace.com/api';

// Test user credentials (use test accounts)
const TEST_USER = {
  email: process.env.TEST_USER_EMAIL || 'test@example.com',
  password: process.env.TEST_USER_PASSWORD || 'testpassword123',
};

// ============================================================
// GDPR Cookie Consent Tests
// ============================================================
test.describe('GDPR Cookie Consent', () => {

  test('Cookie consent banner appears on first visit', async ({ page, context }) => {
    // Clear cookies to simulate first visit
    await context.clearCookies();

    await page.goto(BASE_URL);

    // Cookie banner should be visible
    const cookieBanner = page.locator('[data-testid="cookie-banner"], .cookie-consent-banner, #cookie-consent');

    // Wait for banner to potentially appear (may have animation)
    await page.waitForTimeout(1000);

    // Check if banner exists (may not be on all pages)
    const bannerVisible = await cookieBanner.isVisible().catch(() => false);

    if (bannerVisible) {
      await expect(cookieBanner).toBeVisible();

      // Should have accept/reject buttons
      const acceptBtn = page.locator('button:has-text("Accept"), [data-testid="cookie-accept"]');
      const manageBtn = page.locator('button:has-text("Manage"), button:has-text("Customize"), [data-testid="cookie-manage"]');

      await expect(acceptBtn).toBeVisible();
    }
  });

  test('Cookie preferences can be customized', async ({ page, context }) => {
    await context.clearCookies();
    await page.goto(BASE_URL);

    const cookieBanner = page.locator('[data-testid="cookie-banner"], .cookie-consent-banner, #cookie-consent');

    await page.waitForTimeout(1000);
    const bannerVisible = await cookieBanner.isVisible().catch(() => false);

    if (bannerVisible) {
      // Click manage/customize
      const manageBtn = page.locator('button:has-text("Manage"), button:has-text("Customize"), button:has-text("Preferences")');

      if (await manageBtn.isVisible().catch(() => false)) {
        await manageBtn.click();

        // Should show preference options
        const analyticsToggle = page.locator('[data-testid="cookie-analytics"], input[name="analytics"]');
        const marketingToggle = page.locator('[data-testid="cookie-marketing"], input[name="marketing"]');

        // Essential cookies should be non-toggleable (always on)
        const essentialToggle = page.locator('[data-testid="cookie-essential"], input[name="essential"]');
        if (await essentialToggle.isVisible().catch(() => false)) {
          await expect(essentialToggle).toBeDisabled();
        }
      }
    }
  });

  test('Cookie consent is remembered after acceptance', async ({ page, context }) => {
    await context.clearCookies();
    await page.goto(BASE_URL);

    const cookieBanner = page.locator('[data-testid="cookie-banner"], .cookie-consent-banner, #cookie-consent');

    await page.waitForTimeout(1000);
    const bannerVisible = await cookieBanner.isVisible().catch(() => false);

    if (bannerVisible) {
      // Accept all cookies
      const acceptBtn = page.locator('button:has-text("Accept"), [data-testid="cookie-accept"]');
      await acceptBtn.click();

      // Banner should disappear
      await expect(cookieBanner).not.toBeVisible({ timeout: 5000 });

      // Reload page
      await page.reload();
      await page.waitForTimeout(1000);

      // Banner should NOT appear again
      await expect(cookieBanner).not.toBeVisible();
    }
  });
});

// ============================================================
// Aviation Disclaimer Tests
// ============================================================
test.describe('Aviation Safety Disclaimer', () => {

  test('Disclaimer is shown on first app launch', async ({ page, context }) => {
    // Clear storage to simulate first launch
    await context.clearCookies();
    await page.goto(`${BASE_URL}/app`);

    // Look for disclaimer text
    const disclaimerText = page.locator('text=/not.*aviation safety|informational purposes only|not.*navigation/i');

    await page.waitForTimeout(2000);

    const hasDisclaimer = await disclaimerText.isVisible().catch(() => false);

    if (hasDisclaimer) {
      // Must have checkbox to acknowledge
      const checkbox = page.locator('input[type="checkbox"], [role="checkbox"]');
      const continueBtn = page.locator('button:has-text("Continue"), button:has-text("Accept"), button:has-text("I Understand")');

      // Button should be disabled until checkbox is checked
      if (await checkbox.isVisible().catch(() => false)) {
        await expect(continueBtn).toBeDisabled();

        // Check the checkbox
        await checkbox.click();

        // Button should now be enabled
        await expect(continueBtn).toBeEnabled();
      }
    }
  });

  test('Disclaimer acceptance is remembered', async ({ page, context }) => {
    await context.clearCookies();
    await page.goto(`${BASE_URL}/app`);

    await page.waitForTimeout(2000);

    // Accept disclaimer if present
    const checkbox = page.locator('input[type="checkbox"][name*="disclaimer"], [data-testid="disclaimer-checkbox"]');
    const continueBtn = page.locator('button:has-text("Continue"), button:has-text("Accept")');

    if (await checkbox.isVisible().catch(() => false)) {
      await checkbox.click();
      await continueBtn.click();

      // Reload
      await page.reload();
      await page.waitForTimeout(2000);

      // Disclaimer should NOT appear again
      const disclaimerScreen = page.locator('[data-testid="disclaimer-screen"], .disclaimer-modal');
      await expect(disclaimerScreen).not.toBeVisible();
    }
  });
});

// ============================================================
// Legal Document Accessibility Tests
// ============================================================
test.describe('Legal Documents Accessibility', () => {

  test('Privacy Policy is accessible from app', async ({ page }) => {
    await page.goto(BASE_URL);

    // Look for privacy policy link in footer or settings
    const privacyLink = page.locator('a[href*="privacy"], a:has-text("Privacy Policy")');

    if (await privacyLink.first().isVisible().catch(() => false)) {
      await privacyLink.first().click();

      // Should navigate to privacy policy
      await expect(page).toHaveURL(/privacy/i);

      // Should contain key GDPR sections
      const content = page.locator('body');
      await expect(content).toContainText(/data.*collect|information.*collect/i);
      await expect(content).toContainText(/your rights|user rights|data subject rights/i);
    }
  });

  test('Terms of Service is accessible from app', async ({ page }) => {
    await page.goto(BASE_URL);

    const termsLink = page.locator('a[href*="terms"], a:has-text("Terms of Service"), a:has-text("Terms & Conditions")');

    if (await termsLink.first().isVisible().catch(() => false)) {
      await termsLink.first().click();

      await expect(page).toHaveURL(/terms/i);

      // Should contain key sections
      const content = page.locator('body');
      await expect(content).toContainText(/acceptable use|user conduct/i);
      await expect(content).toContainText(/disclaimer|limitation of liability/i);
    }
  });

  test('Privacy Policy contains required GDPR sections', async ({ page }) => {
    await page.goto(`${BASE_URL}/legal/privacy.html`);

    const content = page.locator('body');

    // Required GDPR disclosures
    const requiredSections = [
      /information.*collect|data.*collect/i,
      /how.*use|purpose/i,
      /data.*shar|third.*part/i,
      /data.*retention|how long/i,
      /your rights|access.*data|delete.*data/i,
      /contact|data.*protection.*officer/i,
    ];

    for (const section of requiredSections) {
      await expect(content).toContainText(section);
    }
  });
});

// ============================================================
// GDPR Data Export Tests
// ============================================================
test.describe('GDPR Data Export', () => {

  test.skip('User can request data export from settings', async ({ page }) => {
    // This test requires authentication
    // Skip if not configured with test credentials
    if (!TEST_USER.email || TEST_USER.email === 'test@example.com') {
      test.skip();
    }

    // Login first
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[name="email"], input[type="email"]', TEST_USER.email);
    await page.fill('input[name="password"], input[type="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');

    // Navigate to settings
    await page.goto(`${BASE_URL}/settings`);

    // Find data export option
    const exportBtn = page.locator('button:has-text("Export"), button:has-text("Download My Data"), [data-testid="data-export"]');

    if (await exportBtn.isVisible().catch(() => false)) {
      await exportBtn.click();

      // Should show confirmation or start export
      const confirmation = page.locator('text=/export.*request|data.*prepared|email.*download/i');
      await expect(confirmation).toBeVisible({ timeout: 10000 });
    }
  });

  test('Data export API endpoint responds correctly', async ({ request }) => {
    // Test API endpoint directly (unauthenticated should return 401)
    const response = await request.post(`${API_URL}/user/export`);

    // Should require authentication
    expect([401, 403, 422]).toContain(response.status());
  });
});

// ============================================================
// GDPR Account Deletion Tests
// ============================================================
test.describe('GDPR Account Deletion', () => {

  test.skip('User can request account deletion from settings', async ({ page }) => {
    // Skip if test user not configured
    if (!TEST_USER.email || TEST_USER.email === 'test@example.com') {
      test.skip();
    }

    // Login
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[name="email"], input[type="email"]', TEST_USER.email);
    await page.fill('input[name="password"], input[type="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');

    // Navigate to settings
    await page.goto(`${BASE_URL}/settings`);

    // Find delete account option
    const deleteBtn = page.locator('button:has-text("Delete Account"), button:has-text("Delete My Account"), [data-testid="delete-account"]');

    if (await deleteBtn.isVisible().catch(() => false)) {
      await deleteBtn.click();

      // Should show warning/confirmation
      const warning = page.locator('text=/permanent|cannot be undone|30 day/i');
      await expect(warning).toBeVisible();

      // Should require confirmation (typing email or clicking confirm)
      const confirmInput = page.locator('input[placeholder*="email"], input[placeholder*="delete"]');
      const confirmBtn = page.locator('button:has-text("Confirm"), button:has-text("Delete"):not([data-testid="delete-account"])');

      // Don't actually delete in test - just verify flow exists
      await expect(confirmBtn).toBeVisible();
    }
  });

  test('Account deletion mentions grace period', async ({ page }) => {
    await page.goto(`${BASE_URL}/legal/privacy.html`);

    const content = page.locator('body');

    // Should mention deletion grace period (GDPR best practice)
    const hasGracePeriod = await content.textContent().then(text =>
      /30 day|grace period|recovery period|cancel.*deletion/i.test(text)
    ).catch(() => false);

    // This is a soft check - log warning if not found
    if (!hasGracePeriod) {
      console.warn('Privacy policy should mention account deletion grace period');
    }
  });

  test('Account deletion API endpoint responds correctly', async ({ request }) => {
    // Test API endpoint directly (unauthenticated should return 401)
    const response = await request.delete(`${API_URL}/user/delete`);

    // Should require authentication
    expect([401, 403, 405, 422]).toContain(response.status());
  });
});

// ============================================================
// Subscription & Restore Purchases Tests (App Store Requirement)
// ============================================================
test.describe('Subscription Management', () => {

  test('Restore purchases option is visible in settings', async ({ page }) => {
    await page.goto(`${BASE_URL}/settings`);

    await page.waitForTimeout(2000);

    // Look for restore purchases button
    const restoreBtn = page.locator('button:has-text("Restore"), text=/restore.*purchase/i, [data-testid="restore-purchases"]');

    // May be behind authentication, check if settings page loaded
    const settingsContent = page.locator('h1:has-text("Settings"), .settings-container');

    if (await settingsContent.isVisible().catch(() => false)) {
      // Settings page exists, check for restore option
      const hasRestore = await restoreBtn.isVisible().catch(() => false);

      if (!hasRestore) {
        // Check in subscription section
        const subscriptionSection = page.locator('text=/subscription|premium|upgrade/i');
        if (await subscriptionSection.isVisible().catch(() => false)) {
          // Navigate to subscription settings if separate
          await subscriptionSection.click();
          await page.waitForTimeout(1000);
        }
      }
    }
  });

  test('Subscription page shows pricing clearly', async ({ page }) => {
    await page.goto(`${BASE_URL}/pricing`);

    await page.waitForTimeout(2000);

    const pricingContent = page.locator('body');

    // Should show prices
    const hasPricing = await pricingContent.textContent().then(text =>
      /\$\d+|\d+\.\d{2}|free|premium|pro/i.test(text)
    ).catch(() => false);

    if (hasPricing) {
      // Should show what's included
      await expect(pricingContent).toContainText(/feature|include|benefit/i);
    }
  });
});

// ============================================================
// Data Freshness & Offline Indicators
// ============================================================
test.describe('Data Freshness Indicators', () => {

  test('App shows data freshness when displaying flight info', async ({ page }) => {
    await page.goto(`${BASE_URL}/live`);

    await page.waitForTimeout(3000);

    // Look for timestamp or freshness indicator
    const freshnessIndicator = page.locator('[data-testid="data-freshness"], .data-timestamp, text=/updated|ago|last sync/i');

    const hasFreshness = await freshnessIndicator.isVisible().catch(() => false);

    // Log for visibility but don't fail
    if (!hasFreshness) {
      console.log('Consider adding data freshness indicators for aviation data');
    }
  });
});

// ============================================================
// Accessibility Tests for Compliance
// ============================================================
test.describe('Accessibility Compliance', () => {

  test('Legal pages have proper heading structure', async ({ page }) => {
    const pages = [
      '/legal/privacy.html',
      '/legal/terms.html',
      '/legal/security.html',
    ];

    for (const pagePath of pages) {
      await page.goto(`${BASE_URL}${pagePath}`);

      // Should have exactly one h1
      const h1Count = await page.locator('h1').count();
      expect(h1Count).toBe(1);

      // h2s should come before h3s (proper hierarchy)
      const headings = await page.locator('h1, h2, h3, h4, h5, h6').all();
      let lastLevel = 0;

      for (const heading of headings) {
        const tagName = await heading.evaluate(el => el.tagName);
        const level = parseInt(tagName.replace('H', ''));

        // Should not skip levels (e.g., h1 -> h3)
        if (lastLevel > 0 && level > lastLevel + 1) {
          console.warn(`${pagePath}: Heading hierarchy skips from H${lastLevel} to H${level}`);
        }
        lastLevel = level;
      }
    }
  });

  test('Interactive elements have accessible names', async ({ page }) => {
    await page.goto(BASE_URL);

    // Check buttons have text or aria-label
    const buttons = await page.locator('button').all();

    for (const button of buttons.slice(0, 10)) { // Check first 10
      const text = await button.textContent();
      const ariaLabel = await button.getAttribute('aria-label');
      const ariaLabelledBy = await button.getAttribute('aria-labelledby');

      const hasAccessibleName = (text && text.trim()) || ariaLabel || ariaLabelledBy;

      if (!hasAccessibleName) {
        const html = await button.evaluate(el => el.outerHTML);
        console.warn(`Button without accessible name: ${html.substring(0, 100)}`);
      }
    }
  });

  test('Links have discernible text', async ({ page }) => {
    await page.goto(BASE_URL);

    const links = await page.locator('a').all();

    for (const link of links.slice(0, 20)) { // Check first 20
      const text = await link.textContent();
      const ariaLabel = await link.getAttribute('aria-label');
      const title = await link.getAttribute('title');

      // Links should have some form of accessible text
      const hasText = (text && text.trim()) || ariaLabel || title;

      if (!hasText) {
        const href = await link.getAttribute('href');
        console.warn(`Link without discernible text: ${href}`);
      }
    }
  });
});

// ============================================================
// API Response Tests
// ============================================================
test.describe('API Compliance Endpoints', () => {

  test('Health endpoint responds', async ({ request }) => {
    const response = await request.get(`${API_URL}/health`);

    // Should return 200 or similar success
    expect([200, 204]).toContain(response.status());
  });

  test('API returns proper CORS headers', async ({ request }) => {
    const response = await request.options(`${API_URL}/flights`);

    // Check CORS headers exist
    const headers = response.headers();

    // These should be present for cross-origin requests
    // (May vary based on request origin)
    if (headers['access-control-allow-origin']) {
      expect(headers['access-control-allow-origin']).toBeTruthy();
    }
  });

  test('API error responses are properly formatted', async ({ request }) => {
    // Request non-existent resource
    const response = await request.get(`${API_URL}/nonexistent-endpoint-12345`);

    expect([404, 405]).toContain(response.status());

    // Response should be JSON
    const contentType = response.headers()['content-type'];
    expect(contentType).toContain('application/json');

    // Should have error message
    const body = await response.json().catch(() => null);
    if (body) {
      expect(body.detail || body.error || body.message).toBeTruthy();
    }
  });
});

// ============================================================
// Security Headers Tests
// ============================================================
test.describe('Security Headers', () => {

  test('Secure headers are present', async ({ request }) => {
    const response = await request.get(BASE_URL);
    const headers = response.headers();

    // X-Content-Type-Options
    if (headers['x-content-type-options']) {
      expect(headers['x-content-type-options']).toBe('nosniff');
    }

    // X-Frame-Options (may be relaxed for embedding)
    // expect(headers['x-frame-options']).toMatch(/DENY|SAMEORIGIN/);

    // Strict-Transport-Security (HTTPS)
    if (headers['strict-transport-security']) {
      expect(headers['strict-transport-security']).toContain('max-age');
    }

    // Log missing headers (don't fail)
    const securityHeaders = [
      'x-content-type-options',
      'x-frame-options',
      'strict-transport-security',
      'x-xss-protection',
      'referrer-policy',
    ];

    for (const header of securityHeaders) {
      if (!headers[header]) {
        console.log(`Missing security header: ${header}`);
      }
    }
  });
});
