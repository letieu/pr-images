const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");

async function takeScreenshot(url) {
  // Extract PR ID from the URL
  const prIdMatch = url.match(/\/pull\/(\d+)\//);
  if (!prIdMatch) {
    console.error("Invalid PR URL. Could not extract PR ID.");
    return;
  }
  const prId = prIdMatch[1];
  const outputFolder = path.join("screenshots", prId);

  if (!fs.existsSync(outputFolder)) {
    fs.mkdirSync(outputFolder, { recursive: true });
  }

  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  page.setDefaultTimeout(60000); // Increased timeout

  const cookiesFilePath = path.join(__dirname, "input", "cookies.json");
  const cookies = JSON.parse(fs.readFileSync(cookiesFilePath, "utf8"));
  await page.setCookie(...cookies);

  try {
    // Navigate directly to the "Files changed" tab
    await page.goto(url, { waitUntil: "networkidle2" });

    // Wait for at least one file diff to load
    await page.waitForSelector(".file", { timeout: 60000 });

    // Capture screenshots of each file diff
    const fileDiffs = await page.$$(".file");
    for (let i = 0; i < fileDiffs.length; i++) {
      const fileDiff = fileDiffs[i];
      const fileName = `file-${i}`;
      const screenshotPath = path.join(outputFolder, `${fileName}.png`);
      await fileDiff.screenshot({ path: screenshotPath });
      console.log(`Screenshot saved: ${screenshotPath}`);
    }
  } catch (error) {
    console.error(`Error capturing screenshots: ${error.message}`);
  } finally {
    await browser.close();
  }
}

async function processPRs(prList) {
  for (const url of prList) {
    await takeScreenshot(url);
  }
}

const prPath = path.join(__dirname, "input", "pr.json");
const prList = JSON.parse(fs.readFileSync(prPath, "utf8"));

// Process each PR
processPRs(prList);
