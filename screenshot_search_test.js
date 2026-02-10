const puppeteer = require('puppeteer-core');

(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/chromium',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900 });
  await page.goto('http://localhost:3000/collection', { waitUntil: 'networkidle2', timeout: 60000 });
  await new Promise(r => setTimeout(r, 8000));

  // Click on search input and type "jazz"
  await page.click('input[placeholder*="albums"]');
  await page.type('input[placeholder*="albums"]', 'jazz');

  // Wait for filter to apply
  await new Promise(r => setTimeout(r, 1500));

  await page.screenshot({ path: '/workspace/group/collection_search_jazz.png', fullPage: false });
  console.log('Search test screenshot saved');
  await browser.close();
})();
