const express = require('express');
const { chromium } = require('playwright');

const app = express();

app.get('/', (req, res) => {
  res.send('Apex extractor running 😏🔥');
});

app.get('/extract', async (req, res) => {
  const url = req.query.url;

  let foundUrls = new Set();

  try {
    const browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage'
      ]
    });

    const context = await browser.newContext({
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36',
      extraHTTPHeaders: {
        referer: 'https://aniwatchtv.to',
        origin: 'https://aniwatchtv.to'
      }
    });

    const page = await context.newPage();

    // 🔥 CAPTURE ALL NETWORK REQUESTS
    page.on('response', async (response) => {
      const url = response.url();

      if (
        url.includes('.m3u8') ||
        url.includes('.mpd') ||
        url.includes('.mp4')
      ) {
        console.log('FOUND:', url);
        foundUrls.add(url);
      }
    });

    // 🚀 OPEN PAGE
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 0 });

    // ⏳ WAIT INITIAL LOAD
    await page.waitForTimeout(3000);

    // 🔽 SCROLL (trigger lazy load)
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });

    // ▶️ TRY PLAY VIDEO (JW PLAYER / HTML5)
    try {
      await page.evaluate(() => {
        const video = document.querySelector('video');
        if (video) {
          video.muted = true;
          video.play().catch(() => {});
        }

        // JW Player fallback
        if (window.jwplayer) {
          try {
            window.jwplayer().play();
          } catch (e) {}
        }
      });
    } catch (e) {}

    // 🔥 HANDLE IFRAMES (VERY IMPORTANT)
    const frames = page.frames();

    for (const frame of frames) {
      try {
        await frame.evaluate(() => {
          const video = document.querySelector('video');
          if (video) {
            video.muted = true;
            video.play().catch(() => {});
          }

          if (window.jwplayer) {
            try {
              window.jwplayer().play();
            } catch (e) {}
          }
        });
      } catch (e) {}
    }

    // ⏳ WAIT FOR STREAM REQUESTS
    await page.waitForTimeout(8000);

    await browser.close();

    const results = Array.from(foundUrls);

    res.json({
      count: results.length,
      streams: results
    });

  } catch (error) {
    console.log('ERROR:', error);
    res.json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Server running on', PORT));
