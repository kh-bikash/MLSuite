import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log(`PAGE ERROR: ${msg.text()}`);
    } else if (msg.type() === 'warning') {
      console.log(`PAGE WARNING: ${msg.text()}`);
    }
  });

  page.on('pageerror', exception => {
    console.log(`UNCAUGHT EXCEPTION: ${exception}`);
  });

  await page.goto('http://localhost:5173/embeddings', { waitUntil: 'networkidle' });
  
  console.log('Current URL:', page.url());
  
  try {
    // Click Skip tour if it exists
    const skipBtn = page.locator('text=Skip tour').first();
    if (await skipBtn.isVisible({ timeout: 2000 })) {
      await skipBtn.click();
      console.log('Clicked Skip tour');
    }
    
    // Wait a bit for modal to disappear
    await page.waitForTimeout(500);

    // Click the button
    const btn = page.locator('text=New comparison').first();
    await btn.click({ timeout: 5000 });
    console.log('Clicked New comparison button');
    
    // Wait for URL to change
    await page.waitForURL('**/embeddings/new', { timeout: 5000 });
    console.log('Navigation successful, new URL:', page.url());
  } catch (err) {
    console.log('Click or navigation failed:', err.message);
  }
  
  await browser.close();
})();
