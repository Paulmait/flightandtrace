// Playwright tests for legal pages
const { test, expect } = require('@playwright/test');

const BASE_URL = 'https://flightandtrace.com';

test.describe('Legal Pages', () => {
    
    test('Privacy Policy page loads correctly', async ({ page }) => {
        // Navigate to privacy policy
        await page.goto(`${BASE_URL}/legal/privacy.html`);
        
        // Check page title
        await expect(page).toHaveTitle('FlightTrace - Privacy Policy');
        
        // Check main heading
        const heading = await page.locator('h1');
        await expect(heading).toContainText('Privacy Policy');
        
        // Check effective date is present
        const content = await page.locator('body');
        await expect(content).toContainText('Effective Date: August 24, 2025');
        
        // Check key sections are present
        await expect(content).toContainText('Information We Collect');
        await expect(content).toContainText('How We Use Information');
        await expect(content).toContainText('Data Sharing');
        await expect(content).toContainText('Security');
        await expect(content).toContainText('Your Rights');
        
        // Check company info
        await expect(content).toContainText('Cien Rios LLC');
        await expect(content).toContainText('support@cienrios.com');
        
        // Check navigation is present
        const nav = await page.locator('.ft-nav');
        await expect(nav).toBeVisible();
        
        // Check footer links
        const footer = await page.locator('footer').first();
        if (await footer.isVisible()) {
            await expect(footer).toContainText('Terms of Service');
            await expect(footer).toContainText('Privacy Policy');
            await expect(footer).toContainText('Security Policy');
        }
    });
    
    test('Terms of Service page loads correctly', async ({ page }) => {
        // Navigate to terms page
        await page.goto(`${BASE_URL}/legal/terms.html`);
        
        // Check page title
        await expect(page).toHaveTitle('FlightTrace - Terms of Service');
        
        // Check main heading
        const heading = await page.locator('h1');
        await expect(heading).toContainText('Terms of Service');
        
        // Check effective date
        const content = await page.locator('body');
        await expect(content).toContainText('Effective Date: August 24, 2025');
        
        // Check key sections
        await expect(content).toContainText('Eligibility');
        await expect(content).toContainText('Services Provided');
        await expect(content).toContainText('Accounts');
        await expect(content).toContainText('Acceptable Use');
        await expect(content).toContainText('Payments & Subscriptions');
        await expect(content).toContainText('Intellectual Property');
        await expect(content).toContainText('Disclaimers');
        await expect(content).toContainText('Limitation of Liability');
        await expect(content).toContainText('Governing Law');
        
        // Check jurisdiction
        await expect(content).toContainText('State of Florida');
        
        // Check company info
        await expect(content).toContainText('Cien Rios LLC d/b/a FlightTrace');
        await expect(content).toContainText('17113 Miramar Parkway, Miramar FL 33027');
    });
    
    test('Security Policy page loads correctly', async ({ page }) => {
        // Navigate to security policy
        await page.goto(`${BASE_URL}/legal/security.html`);
        
        // Check page title
        await expect(page).toHaveTitle('FlightTrace - Security Policy');
        
        // Check main heading
        const heading = await page.locator('h1');
        await expect(heading).toContainText('Security Policy');
        
        // Check effective date
        const content = await page.locator('body');
        await expect(content).toContainText('Effective Date: August 24, 2025');
        
        // Check key sections
        await expect(content).toContainText('Infrastructure Security');
        await expect(content).toContainText('Application Security');
        await expect(content).toContainText('Data Protection');
        await expect(content).toContainText('Responsible Disclosure');
        await expect(content).toContainText('Incident Response');
        
        // Check security email
        await expect(content).toContainText('security@cienrios.com');
        
        // Check encryption mentions
        await expect(content).toContainText('HTTPS/TLS');
        await expect(content).toContainText('bcrypt or Argon2');
        
        // Check company info
        await expect(content).toContainText('Cien Rios LLC d/b/a FlightTrace');
    });
    
    test('Legal page links work from homepage', async ({ page }) => {
        // Start from homepage
        await page.goto(`${BASE_URL}/`);
        
        // Check footer exists
        const footer = await page.locator('footer');
        await expect(footer).toBeVisible();
        
        // Test Privacy Policy link
        const privacyLink = await page.locator('a[href="/legal/privacy.html"]');
        await expect(privacyLink).toBeVisible();
        await privacyLink.click();
        await expect(page).toHaveURL(/.*\/legal\/privacy\.html/);
        await expect(page.locator('h1')).toContainText('Privacy Policy');
        
        // Go back to homepage
        await page.goto(`${BASE_URL}/`);
        
        // Test Terms of Service link
        const termsLink = await page.locator('a[href="/legal/terms.html"]');
        await expect(termsLink).toBeVisible();
        await termsLink.click();
        await expect(page).toHaveURL(/.*\/legal\/terms\.html/);
        await expect(page.locator('h1')).toContainText('Terms of Service');
        
        // Go back to homepage
        await page.goto(`${BASE_URL}/`);
        
        // Test Security Policy link
        const securityLink = await page.locator('a[href="/legal/security.html"]');
        await expect(securityLink).toBeVisible();
        await securityLink.click();
        await expect(page).toHaveURL(/.*\/legal\/security\.html/);
        await expect(page.locator('h1')).toContainText('Security Policy');
    });
    
    test('Legal pages are mobile responsive', async ({ page }) => {
        // Set mobile viewport
        await page.setViewportSize({ width: 375, height: 667 });
        
        // Test each legal page
        const pages = [
            '/legal/privacy.html',
            '/legal/terms.html',
            '/legal/security.html'
        ];
        
        for (const pagePath of pages) {
            await page.goto(`${BASE_URL}${pagePath}`);
            
            // Check content is readable on mobile
            const container = await page.locator('.legal-container');
            await expect(container).toBeVisible();
            
            // Check padding is appropriate
            const padding = await container.evaluate(el => 
                window.getComputedStyle(el).padding
            );
            expect(padding).toBeTruthy();
            
            // Check text is not cut off
            const heading = await page.locator('h1');
            await expect(heading).toBeVisible();
            const headingBox = await heading.boundingBox();
            expect(headingBox.width).toBeLessThan(375);
            
            // Check navigation toggle is visible
            const mobileMenuBtn = await page.locator('.ft-nav-mobile-btn');
            await expect(mobileMenuBtn).toBeVisible();
        }
    });
    
    test('Back to Home links work', async ({ page }) => {
        const pages = [
            '/legal/privacy.html',
            '/legal/terms.html',
            '/legal/security.html'
        ];
        
        for (const pagePath of pages) {
            await page.goto(`${BASE_URL}${pagePath}`);
            
            // Find and click back link
            const backLink = await page.locator('.back-link');
            await expect(backLink).toContainText('Back to Home');
            await backLink.click();
            
            // Should navigate to homepage
            await expect(page).toHaveURL(/.*\/$/);
        }
    });
});

// SEO and Meta tags test
test.describe('Legal Pages SEO', () => {
    
    test('Privacy Policy has proper meta tags', async ({ page }) => {
        await page.goto(`${BASE_URL}/legal/privacy.html`);
        
        // Check meta description
        const metaDescription = await page.locator('meta[name="description"]');
        await expect(metaDescription).toHaveAttribute('content', /Privacy Policy/i);
        
        // Check OG tags
        const ogTitle = await page.locator('meta[property="og:title"]');
        await expect(ogTitle).toHaveAttribute('content', /Privacy Policy/i);
        
        // Check canonical URL
        const canonical = await page.locator('link[rel="canonical"]');
        await expect(canonical).toHaveAttribute('href', /privacy/i);
    });
    
    test('Terms of Service has proper meta tags', async ({ page }) => {
        await page.goto(`${BASE_URL}/legal/terms.html`);
        
        // Check meta description
        const metaDescription = await page.locator('meta[name="description"]');
        await expect(metaDescription).toHaveAttribute('content', /Terms of Service/i);
        
        // Check OG tags
        const ogTitle = await page.locator('meta[property="og:title"]');
        await expect(ogTitle).toHaveAttribute('content', /Terms of Service/i);
        
        // Check canonical URL
        const canonical = await page.locator('link[rel="canonical"]');
        await expect(canonical).toHaveAttribute('href', /terms/i);
    });
    
    test('Security Policy has proper meta tags', async ({ page }) => {
        await page.goto(`${BASE_URL}/legal/security.html`);
        
        // Check meta description
        const metaDescription = await page.locator('meta[name="description"]');
        await expect(metaDescription).toHaveAttribute('content', /Security Policy/i);
        
        // Check OG tags
        const ogTitle = await page.locator('meta[property="og:title"]');
        await expect(ogTitle).toHaveAttribute('content', /Security Policy/i);
        
        // Check canonical URL
        const canonical = await page.locator('link[rel="canonical"]');
        await expect(canonical).toHaveAttribute('href', /security/i);
    });
});