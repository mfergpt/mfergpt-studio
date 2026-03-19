const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  
  const errors = [];
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('[canvas]')) console.log('  PAGE:', text);
    if (text.includes('LAYER FAILED') || text.includes('BAD IMAGE')) errors.push(text);
  });

  await page.goto('http://192.168.50.206:8080/create');
  await page.waitForTimeout(3000);
  
  let failures = 0;
  
  for (let i = 0; i < 50; i++) {
    await page.click('button:has-text("random")');
    await page.waitForTimeout(1500);
    
    // Read canvas center pixel
    const pixel = await page.evaluate(() => {
      const canvas = document.querySelector('canvas');
      if (!canvas) return [0, 0, 0, 0];
      const ctx = canvas.getContext('2d');
      return Array.from(ctx.getImageData(500, 500, 1, 1).data);
    });
    
    // Read selected traits
    const traitCount = await page.evaluate(() => {
      const el = document.querySelector('[class*="text-xs"][class*="text-gray"]');
      return el ? el.textContent : '?';
    });
    
    const isBlank = pixel[3] === 0 || (pixel[0] > 240 && pixel[1] > 240 && pixel[2] > 240 && pixel[3] > 200);
    
    if (isBlank) {
      failures++;
      console.log(`FAIL #${i}: pixel=[${pixel}] traits=${traitCount}`);
      
      // Get more debug info
      const traits = await page.evaluate(() => {
        // Try to read the traits from React state - look at displayed values
        const tabs = document.querySelectorAll('button[class*="border-\\[#00ff41\\]"]');
        return Array.from(tabs).map(t => t.textContent?.trim()).filter(Boolean);
      });
      console.log(`  Selected traits: ${traits.join(', ')}`);
      
      await page.screenshot({ path: `/tmp/canvas_fail_${i}.png` });
    } else {
      console.log(`OK #${i}: pixel=[${pixel}]`);
    }
  }
  
  console.log(`\n=== RESULTS: ${failures} failures out of 50 ===`);
  if (errors.length) console.log('Canvas errors:', errors);
  
  await browser.close();
})();
