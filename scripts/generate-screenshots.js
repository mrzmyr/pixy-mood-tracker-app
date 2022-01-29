const dayjs = require('dayjs');
const puppeteer = require('puppeteer');
const fs = require('fs');

const iPhone_5_5_inch = {
  name: 'iPhone 5.5 inch',
  slug: '5_5_inch',
  userAgent:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 13_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.1 Mobile/15E148 Safari/604.1',
  viewport: {
    width: 438,
    height: 828 + 78/2,
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    isLandscape: false,
  },
}

const iPhone_6_5_inch = {
  name: 'iPhone 6.5 inch',
  slug: '6_5_inch',
  userAgent:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 13_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.1 Mobile/15E148 Safari/604.1',
  viewport: {
    width: 414,
    height: 896,
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    isLandscape: false,
  },
}

const DEBUG = process.env.DEBUG || false;

const WEBHOOK_URL = 'https://webhook.site/8beac0d4-b750-4e3e-9af5-c75df5229904';
const LANGUAGES = DEBUG ? ['en'] : [
  'ar', 'ca', 'zh', 'hr', 'cs', 'da', 'nl', 'en', 'fi', 'fr', 'de', 'el', 
  'he', 'hi', 'hu', 'id', 'it', 'ja', 'ko', 'ms', 'nn', 'pl', 'pt', 'ro', 
  'ru', 'sk', 'es', 'sv', 'th', 'tr', 'uk', 'vi'
];

const POSSIBLE_RATINGS = [
  'extremely_good',
  'very_good',
  'good',
  'neutral',
  'bad',
]

const generateLogs = () => {
  const result = {}

  for(let i = 0; i < 60; i++) {
    const date = dayjs().subtract(i, 'day').format('YYYY-MM-DD')
    result[date] = { 
      date, 
      rating: POSSIBLE_RATINGS[POSSIBLE_RATINGS.length * Math.random() | 0],
      message: ``
    }
  }
  
  return {
    items: result
  };
}

const addData = async (page, message) => {
  await page.click('[data-testid="settings"]')
  await page.click('[data-testid="webhook"]')
  await page.click('[data-testid="webhook-enabled"]')
  await page.waitForSelector('[data-testid="webhook-url"]', { visible: true })
  await page.type('[data-testid="webhook-url"]', WEBHOOK_URL)
  await page.click('[data-testid="webhook-back-button"]')
  await page.click('[data-testid="settings-back-button"]')
  
  const rating = 'very_good'
  const date = dayjs().format('YYYY-MM-DD');
  await page.click(`[data-testid="calendar-day-${date}"]`)
  await page.waitForSelector(`[data-testid="scale-button-${rating}"]`, { visible: true })
  await page.click(`[data-testid="scale-button-${rating}"]`);
  await page.type(`[data-testid="modal-message"]`, message);
  await page.click('[data-testid="modal-submit"]');
}

const makeScreenshots = async (page, prefix) => {  
  const date = dayjs().format('YYYY-MM-DD');

  await page.click('[data-testid="feedback"]');
  await page.screenshot({ path: `${__dirname}/screenshots/${prefix}-feedback.png` });
  await page.waitForSelector(`[data-testid="feedback-modal-issue"]`, { visible: true });
  await page.click('[data-testid="feedback-modal-cancel"]'); // I don't know why this need 2 calls, but it works
  
  // screenshot calendar
  await page.waitForSelector(`[data-testid="calendar-day-${date}"]`, { visible: true });
  await page.evaluate((date) => {
    document.querySelector(`[data-testid="calendar-day-${date}"]`).scrollIntoView({
      block: 'center',
    });
  }, date);
  await page.screenshot({ path: `${__dirname}/screenshots/${prefix}-calendar.png` });

  // screenshot modal
  await page.click(`[data-testid="calendar-day-${date}"]`)
  await page.waitForSelector(`[data-testid="modal-message"]`, { visible: true });
  await page.$eval('[data-testid="modal-message"]', e => e.blur());
  await page.screenshot({ path: `${__dirname}/screenshots/${prefix}-modal.png` });
  await page.click('[data-testid="modal-cancel"]');
  
  // screenshot settings
  await page.click('[data-testid="settings"]')
  await page.screenshot({ path: `${__dirname}/screenshots/${prefix}-settings.png` });

  // screenshot webhook
  await page.click('[data-testid="webhook"]')
  await page.screenshot({ path: `${__dirname}/screenshots/${prefix}-webhook.png` });

  // screenshot webhook entry
  await page.click('[data-testid="webhook-history-entry-0"]')
  await page.screenshot({ path: `${__dirname}/screenshots/${prefix}-webhook-entry.png` });

  await page.click('[data-testid="webhook-history-entry-back-button"]')
  await page.click('[data-testid="webhook-back-button"]')
  await page.click('[data-testid="settings-back-button"]')
}

const makeDeviceScreenshots = async (browser, device, languageKey, mode) => {
  const page = await browser.newPage();
  await page.emulate(device);
  await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: mode }]);
  await page.evaluateOnNewDocument((language) => {
    Object.defineProperty(navigator, "language", { get: () => language });
  }, languageKey);
  
  await page.goto('http://10.10.50.143:19006');
  
  prefix = `${device.slug}_${languageKey}_${mode}`;
  console.time(`-> ${prefix} - screenshots`);
  await makeScreenshots(page, prefix)
  await page.close()
  console.timeEnd(`-> ${prefix} - screenshots`);
}

const getExampleMessage = (languageKey) => {
  try {
    const locale = fs.readFileSync(`${__dirname}/../assets/locales/${languageKey}.json`);
    return JSON.parse(locale).log_modal_message_example;
  } catch (e) {
    console.log(e)
  }
}

;(async () => {
  const browser = await puppeteer.launch({
    headless: !DEBUG
  });

  console.time('total');
  
  for(const l in LANGUAGES) {
    const languageKey = LANGUAGES[l];
    
    console.log()
    console.log('LANGUAGE:', languageKey)
    console.time(`==> ${languageKey}`);

    const page = await browser.newPage();
    const logs = generateLogs()
    await page.evaluateOnNewDocument(logs => {
      localStorage.clear();
      localStorage.setItem('PIXEL_TRACKER_LOGS', JSON.stringify(logs));
    }, logs);
    await page.goto('http://10.10.50.143:19006');

    console.time(`-> ${languageKey} - add data`);
    await addData(page, getExampleMessage(languageKey));
    console.timeEnd(`-> ${languageKey} - add data`);

    await makeDeviceScreenshots(browser, iPhone_5_5_inch, languageKey, 'light');
    await makeDeviceScreenshots(browser, iPhone_5_5_inch, languageKey, 'dark');
    await makeDeviceScreenshots(browser, iPhone_6_5_inch, languageKey, 'light')
    await makeDeviceScreenshots(browser, iPhone_6_5_inch, languageKey, 'dark')

    await page.close()
    console.timeEnd(`==> ${languageKey}`);
    console.log()
  }

  console.timeEnd('total');

  await browser.close();
})();
