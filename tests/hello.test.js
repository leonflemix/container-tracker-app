const { test, expect } = require('@playwright/test');

test('homepage should load successfully', async ({ page }) => {
    await page.goto('http://localhost:3000');
    await expect(page).toHaveTitle(/Home/);
});