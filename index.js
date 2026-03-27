const express = require('express');
const { chromium } = require('playwright');

const app = express();

app.get('/extract', async (req, res) => {
  const url = req.query.url;
  let m3u8 = [];

  try {
    const browser = await chromium.launch({
      args: ['--no-sandbox']
    });

    const page = await browser.newPage();

    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36'
    );

    await page.setExtraHTTPHeaders({
      referer: 'https://aniwatchtv.to'
    });

    page.on('response', r => {
      const u = r.url();
      if (u.includes('.m3u8')) {
        console.log('FOUND:', u);
        m3u8.push(u);
      }
    });

    await page.goto(url, { waitUntil: 'domcontentloaded' });

    // try play video
    await page.waitForTimeout(4000);
    await page.evaluate(() => {
      document.querySelector('video')?.play();
    });

    // wait for streams
    await page.waitForTimeout(8000);

    await browser.close();

    res.json({ m3u8 });

  } catch (e) {
    res.json({ error: e.message });
  }
});

app.listen(3000, () => console.log('Server running'));
