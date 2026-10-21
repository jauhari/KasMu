import puppeteer from 'puppeteer-core';

async function run() {
  const edgePath = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
  const browser = await puppeteer.launch({
    executablePath: edgePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  
  // Emulate iPhone / Safari Mobile
  await page.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1');
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });

  const logs = [];
  page.on('console', msg => {
    console.log('[BROWSER CONSOLE]', msg.type(), msg.text());
    logs.push({ type: msg.type(), text: msg.text() });
  });
  page.on('pageerror', err => {
    console.error('[BROWSER ERROR]', err.message, err.stack);
  });
  page.on('requestfailed', req => {
    console.warn('[REQ FAILED]', req.url(), req.failure()?.errorText);
  });

  console.log("Navigating to https://kasmu.jauhari.net/login ...");
  await page.goto('https://kasmu.jauhari.net/login', { waitUntil: 'networkidle2' });

  // Check if React hydrated!
  const isHydrated = await page.evaluate(() => {
    // Check if event listeners are attached
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.trim() === '1');
    if (!btn) return "Button 1 not found";
    
    // Check React internal fiber
    const key = Object.keys(btn).find(k => k.startsWith('__reactFiber') || k.startsWith('__reactProps'));
    return {
      hasReactProps: !!key,
      reactKeys: Object.keys(btn).filter(k => k.startsWith('__react')),
      buttonText: btn.innerText
    };
  });
  console.log("Hydration check:", isHydrated);

  // Simulate a tap / touch on button 1
  console.log("Tapping button 1 with touch...");
  const btn1 = await page.evaluateHandle(() => {
    return Array.from(document.querySelectorAll('button')).find(b => b.innerText.trim() === '1');
  });
  await btn1.tap();

  await new Promise(r => setTimeout(r, 500));

  const afterTap = await page.evaluate(() => {
    const dots = document.querySelectorAll('.rounded-full');
    return {
      dotsCount: dots.length,
      dotsClasses: Array.from(dots).map(d => d.className),
      status: document.querySelector('.min-h-\\[20px\\]')?.innerText
    };
  });
  console.log("After tap 1:", afterTap);

  await browser.close();
}

run().catch(console.error);
