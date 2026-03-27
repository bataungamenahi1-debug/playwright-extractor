// index.js
const express = require("express");
const { chromium } = require("playwright");

const app = express();

// GET / route
app.get("/", (req, res) => {
  res.send("Apex extractor running 😏🔥");
});

// GET /extract?url=VIDEO_URL
app.get("/extract", async (req, res) => {
  const url = req.query.url;
  if (!url) return res.json({ error: "No URL provided" });

  console.log("REQUEST START:", url);

  let browser;
  try {
    // Launch Chromium safely on Railway
    browser = await chromium.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--single-process"
      ]
    });

    console.log("Browser launched");

    const page = await browser.newPage();
    console.log("Page created");

    // Intercept responses to catch m3u8 URLs
    let m3u8Urls = [];
    page.on("response", (response) => {
      const u = response.url();
      if (u.includes(".m3u8")) m3u8Urls.push(u);
    });

    // Go to video page
    await page.goto(url, { waitUntil: "domcontentloaded" });
    console.log("Page loaded");

    // Try to play any video (helps JW Player trigger m3u8)
    const frames = page.frames();
    for (const f of frames) {
      try {
        await f.evaluate(() => {
          document.querySelector("video")?.play();
        });
      } catch (e) {}
    }

    // Wait a few seconds for responses
    await page.waitForTimeout(5000);

    // Take first 5 m3u8 URLs only (avoid memory issues)
    m3u8Urls = m3u8Urls.slice(0, 5);

    await browser.close();

    if (m3u8Urls.length === 0)
      return res.json({ error: "No m3u8 URLs found" });

    res.json({ m3u8: m3u8Urls });
  } catch (err) {
    console.error("ERROR:", err);
    if (browser) await browser.close();
    res.json({ error: err.message });
  }
});

// Listen on Railway port (or default 8080)
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
