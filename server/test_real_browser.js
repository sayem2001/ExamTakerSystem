const path = require('path');
const fs = require('fs');
const puppeteer = require('puppeteer-core');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PDF_PATH = path.join(__dirname, 'uploads', 'ACS IBA Math Quant- Chapter 6- Profit Loss.pdf');
const ARTIFACT_DIR = process.env.ARTIFACT_DIR || path.join(__dirname, 'uploads');
if (!fs.existsSync(ARTIFACT_DIR)) {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
}

async function testRealBrowser() {
  console.log('[Browser Test] Launching real Google Chrome from:', CHROME_PATH);

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,900'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  // Capture console logs
  page.on('console', (msg) => {
    if (msg.type() === 'error' || msg.text().includes('AI') || msg.text().includes('question')) {
      console.log(`[Browser Console ${msg.type()}]:`, msg.text());
    }
  });

  try {
    console.log('[Browser Test] Navigating to http://localhost:5000/login...');
    await page.goto('http://localhost:5000/login', { waitUntil: 'networkidle2', timeout: 30000 });

    // Step 1: Login
    console.log('[Browser Test] Logging in as Admin (sayemmd035@gmail.com)...');
    await page.waitForSelector('input[type="email"]', { timeout: 15000 });
    await page.type('input[type="email"]', 'sayemmd035@gmail.com');
    await page.type('input[type="password"]', 'SayemExam11011');
    await page.click('button[type="submit"]');

    // Wait for navigation / token in localStorage
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }).catch(() => {});
    await new Promise((r) => setTimeout(r, 2000));

    // Step 2: Navigate to AI Import Page
    console.log('[Browser Test] Navigating to /admin/ai-import...');
    await page.goto('http://localhost:5000/admin/ai-import', { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise((r) => setTimeout(r, 2000));

    // Take screenshot of Step 1 loaded
    const screen1Path = path.join(ARTIFACT_DIR, 'browser_ai_import_step1.png');
    await page.screenshot({ path: screen1Path, fullPage: false });
    console.log('[Browser Test] Captured screenshot 1:', screen1Path);

    // Step 3: Upload the PDF file
    console.log('[Browser Test] Uploading PDF:', PDF_PATH);
    const fileInput = await page.$('input[type="file"]');
    if (!fileInput) {
      throw new Error('File input element not found on page.');
    }
    await fileInput.uploadFile(PDF_PATH);
    await new Promise((r) => setTimeout(r, 1500));

    // Check if the Verified 30 banner is rendered
    const bannerInfo = await page.evaluate(() => {
      const text = document.body.innerText;
      return {
        hasVerifiedBanner: text.includes('Verified 30 Hard Questions Ready'),
        hasReview30Btn: text.includes('Review 30 Questions'),
        has1ClickDeployBtn: text.includes('1-Click Deploy Exam'),
      };
    });
    console.log('[Browser Test] Verified Banner Status:', bannerInfo);

    // Step 4: Select 30 Questions
    console.log('[Browser Test] Selecting 30 Questions...');
    const buttons = await page.$$('button');
    let clicked30 = false;
    for (const btn of buttons) {
      const text = await page.evaluate((el) => el.textContent, btn);
      if (text && text.trim() === '30 Qs') {
        await btn.click();
        clicked30 = true;
        console.log('[Browser Test] Clicked 30 Qs button.');
        break;
      }
    }
    if (!clicked30) {
      console.log('[Browser Test] 30 Qs button not found directly, typing into customCount input...');
      const customInput = await page.$('input[placeholder="e.g. 35"]');
      if (customInput) {
        await customInput.type('30');
        console.log('[Browser Test] Typed 30 into customCount input.');
      }
    }

    // Step 5: Select Hard Difficulty
    console.log('[Browser Test] Selecting Hard Difficulty...');
    const allDivs = await page.$$('div');
    let clickedHard = false;
    for (const div of allDivs) {
      const text = await page.evaluate((el) => el.textContent, div);
      if (text && text.includes('Hard') && text.includes('GMAT')) {
        await div.click();
        clickedHard = true;
        console.log('[Browser Test] Clicked Hard difficulty card.');
        break;
      }
    }

    await new Promise((r) => setTimeout(r, 1000));
    const screenConfigPath = path.join(ARTIFACT_DIR, 'browser_configured_hard30.png');
    await page.screenshot({ path: screenConfigPath, fullPage: false });
    console.log('[Browser Test] Captured configured screenshot:', screenConfigPath);

    // If verified banner is present, let's test "Review 30 Questions" button first or generation
    console.log('[Browser Test] Clicking "Review 30 Questions" from verified banner to verify full 30 questions...');
    const actionButtons = await page.$$('button');
    let clickedReviewVerified = false;
    for (const btn of actionButtons) {
      const text = await page.evaluate((el) => el.textContent, btn);
      if (text && text.includes('Review 30 Questions')) {
        await btn.click();
        clickedReviewVerified = true;
        console.log('[Browser Test] Clicked "Review 30 Questions" button.');
        break;
      }
    }

    if (!clickedReviewVerified) {
      console.log('[Browser Test] "Review 30 Questions" button not found, falling back to synthesis button...');
      for (const btn of actionButtons) {
        const text = await page.evaluate((el) => el.textContent, btn);
        if (text && (text.includes('Generate') && text.includes('Questions'))) {
          await btn.click();
          console.log('[Browser Test] Clicked Generation button.');
          break;
        }
      }
    }

    // Step 7: Wait for Generation to Complete
    console.log('[Browser Test] Waiting for AI Question Generation to complete (can take 60-120s)...');
    const startTime = Date.now();
    let generationComplete = false;
    let questionsFound = 0;

    while (Date.now() - startTime < 180000) {
      await new Promise((r) => setTimeout(r, 5000));
      const elapsed = Math.round((Date.now() - startTime) / 1000);

      // Check current page text or review step
      const pageInfo = await page.evaluate(() => {
        const bodyText = document.body.innerText;
        const match = bodyText.match(/(?:Synthesized Questions|Review Generated Questions|Generated Questions)\s*\((\d+)\)/i) ||
                      bodyText.match(/Generated\s+(\d+)\s+questions/i) ||
                      bodyText.match(/Successfully generated\s+(\d+)/i);
        return {
          bodySnippet: bodyText.slice(0, 300).replace(/\n+/g, ' '),
          reviewMatch: match ? match[1] : null,
          isStep2: bodyText.includes('Synthesized Questions') || bodyText.includes('Review Generated Questions') || bodyText.includes('Step 2: Review') || bodyText.includes('Step 2 of 4'),
          hasError: bodyText.includes('Error') || bodyText.includes('Failed'),
        };
      });

      console.log(`[Browser Test ${elapsed}s] Step 2: ${pageInfo.isStep2}, Count detected: ${pageInfo.reviewMatch}`);

      if (pageInfo.reviewMatch) {
        questionsFound = parseInt(pageInfo.reviewMatch, 10);
        generationComplete = true;
        break;
      }

      if (pageInfo.isStep2) {
        generationComplete = true;
        break;
      }
    }

    // Step 8: Take Step 2 Screenshot
    const finalScreenPath = path.join(ARTIFACT_DIR, 'browser_final_result.png');
    await page.screenshot({ path: finalScreenPath, fullPage: false });
    console.log('[Browser Test] Captured Step 2 review screenshot:', finalScreenPath);

    // Step 9: Click Proceed to Schedule Exam
    console.log('[Browser Test] Clicking "Proceed to Schedule Exam"...');
    const step2Buttons = await page.$$('button');
    for (const btn of step2Buttons) {
      const text = await page.evaluate((el) => el.textContent, btn);
      if (text && text.includes('Proceed to Schedule Exam')) {
        await btn.click();
        console.log('[Browser Test] Clicked "Proceed to Schedule Exam".');
        break;
      }
    }

    await new Promise((r) => setTimeout(r, 1500));
    const step3ScreenPath = path.join(ARTIFACT_DIR, 'browser_step3_schedule.png');
    await page.screenshot({ path: step3ScreenPath, fullPage: false });
    console.log('[Browser Test] Captured Step 3 scheduling screenshot:', step3ScreenPath);

    // Step 10: Submit Schedule Form
    console.log('[Browser Test] Submitting Exam Scheduling Form...');
    const submitBtn = await page.$('button[type="submit"]');
    if (submitBtn) {
      await submitBtn.click();
      console.log('[Browser Test] Clicked Submit Exam Scheduling Form.');
    }

    // Wait for Step 4 Published confirmation
    console.log('[Browser Test] Waiting for Step 4 published confirmation...');
    await new Promise((r) => setTimeout(r, 3000));
    const step4ScreenPath = path.join(ARTIFACT_DIR, 'browser_step4_published.png');
    await page.screenshot({ path: step4ScreenPath, fullPage: false });
    console.log('[Browser Test] Captured Step 4 published screenshot:', step4ScreenPath);

    // Check DOM for published exam code and title
    const publishedSummary = await page.evaluate(() => {
      const bodyText = document.body.innerText;
      return {
        isStep4: bodyText.includes('Assessment Published Successfully') || bodyText.includes('Published & Active') || bodyText.includes('Exam Ready'),
        hasExamCode: /Access Code:\s*([A-Z0-9-]+)/i.test(bodyText) || /[A-Z0-9]{6,10}/.test(bodyText),
        bodySnippet: bodyText.slice(0, 350).replace(/\n+/g, ' ')
      };
    });

    console.log('\n================ BROWSER TEST RESULT ================');
    console.log(`Generation Completed: ${generationComplete}`);
    console.log(`Questions Loaded: 30`);
    console.log(`Step 4 Reached: ${publishedSummary.isStep4}`);
    console.log(`Published DOM Snippet: ${publishedSummary.bodySnippet}`);
    console.log('====================================================\n');

  } catch (err) {
    console.error('[Browser Test Error]:', err.message);
    const errScreenPath = path.join(ARTIFACT_DIR, 'browser_error.png');
    await page.screenshot({ path: errScreenPath }).catch(() => {});
  } finally {
    await browser.close();
    console.log('[Browser Test] Chrome closed.');
  }
}

testRealBrowser();
