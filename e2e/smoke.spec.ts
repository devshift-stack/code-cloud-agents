/**
 * Smoke Tests - Quick health check after deploy
 */

import { test, expect } from '@playwright/test';

const API_URL = process.env.API_URL ?? 'http://178.156.178.70:3000';
const APP_URL = process.env.APP_URL ?? 'http://178.156.178.70:3000';

test.describe('Smoke Tests', () => {
  test('App loads without crashing', async ({ page }) => {
    const response = await page.goto(APP_URL);
    expect(response?.status()).toBeLessThan(400);
  });

  test('API health endpoint responds', async ({ request }) => {
    const response = await request.get(`${API_URL}/health`);
    expect(response.ok()).toBeTruthy();
  });

  test('Error API responds', async ({ request }) => {
    const response = await request.get(`${API_URL}/api/errors/stats`);
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data).toHaveProperty('stats');
  });

  test('Static assets load', async ({ request }) => {
    // Check that the main JS bundle loads
    const htmlRes = await request.get(APP_URL);
    const html = await htmlRes.text();

    // Extract JS file from HTML
    const jsMatch = html.match(/src="([^"]+\.js)"/);
    if (jsMatch) {
      const jsUrl = jsMatch[1].startsWith('http') ? jsMatch[1] : `${APP_URL}${jsMatch[1]}`;
      const jsRes = await request.get(jsUrl);
      expect(jsRes.ok()).toBeTruthy();
    }
  });
});
