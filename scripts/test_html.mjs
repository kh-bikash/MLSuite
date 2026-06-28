import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  await page.goto('http://localhost:5173/embeddings', { waitUntil: 'networkidle' });
  
  const content = await page.innerHTML('body');
  console.log(content);
  
  await browser.close();
})();
