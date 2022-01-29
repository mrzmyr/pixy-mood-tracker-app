const sharp = require('sharp');
const fs = require('fs');

const path = __dirname + '/../assets/locales/';
const languageCodes = fs.readdirSync(path)
  .filter((file: any) => fs.lstatSync(path + file).isFile() && file.endsWith('.json'))
  .map((file: any) => file.split('.')[0]);

interface PreviewScreen {
  size: '5_5_inch' | '6_5_inch',
  template: number,
  languageCode: string,
  mode: 'light' | 'dark',
  screenName: 'calendar' | 'settings' | 'webhook' | 'webhook-entry' | 'modal'
  textLines: string[],
  filenamePrefix?: string,
}

const dimensionsScreenshot = {
  '5_5_inch': {
    top: 612,
    left: 186,
  },
  '6_5_inch': {
    width: 876 + 128,
    height: 1680 + 370,
  },
};

const distancesScreenshot = {
  '5_5_inch': {
    top: 610,
    left: 186,
  },
  '6_5_inch': {
    top: 571,
    left: 142,
  },
};

const distancesText = {
  '5_5_inch': {
    top: 80,
    left: 89
  },
  '6_5_inch': {
    top: 50,
    left: 89
  },
};

const getTranslation = (languageCode: string): any => {
  try {
    const locale = JSON.parse(fs.readFileSync(`${__dirname}/../assets/locales/${languageCode}.json`, 'utf8'))
    return locale;
  } catch (error) {
    console.error(error);
  }
}

const generateScreen = async ({
  size,
  template,
  languageCode,
  mode,
  screenName,
  textLines,
  filenamePrefix,
}: PreviewScreen) => {
  const filename = `${languageCode}-${size}-${filenamePrefix}-${template}_${mode}_${screenName}`;
  const tmpFilename = `${__dirname}/preview-generated/${filename}-tmp.png`;
  const outputFilename = `${__dirname}/preview-generated/${filename}.png`;

  const screenshotFilename = `${__dirname}/screenshots/${size}_${languageCode}_${mode}-${screenName}.png`;
  const screenshot = await sharp(screenshotFilename)
    .resize({
      ...dimensionsScreenshot[size],
      background: { r: 255, g: 255, b: 255, alpha: 0 },
      position: 'top',
    })
    .flatten({background: { r: 255, g: 255, b: 255, alpha: 0 }})
    .toBuffer();

  const compositionArray = [{
    input: screenshot, 
    ...distancesScreenshot[size],
  }]

  if(textLines.length > 0) {
    const isSmall = (textLines[0].length > 20 || (textLines[1] && textLines[1].length > 20));
    const fontSize = isSmall ? '72' : '100';
    const lineHeight = isSmall ? 90 : 120;
    
    const font = `
      <svg height="300" width="1110">
        <g font-family="'SF Pro'">
        <text 
          font-weight="bold"
          x="0" 
          y="150"
          font-size="${fontSize}"
          lengthAdjust="spacing"
          fill="#000"
          text-anchor="middle"
          alignment-baseline="central"
          letter-spacing="2"
        >
          ${textLines.map((line: string, index: number) => `<tspan class="text" x="555" dx="0" dy="${index * lineHeight}">${line}</tspan>`).join('\n')}
        </text>
        </g>
      </svg>`
    
    compositionArray.push({
      input: Buffer.from(font),
      ...distancesText[size],
    })
  }

  sharp(`${__dirname}/preview-templates/${size}_${template}_bg.png`)
    .composite([
      ...compositionArray,
      {
        input: `${__dirname}/preview-templates/${size}_front_${mode}.png`, 
      }
    ])
    .toFile(outputFilename, (error: any) => {
      if(error) console.log(error)
    })
}

const modes: PreviewScreen['mode'][] = ['dark', 'light']
const sizes: PreviewScreen['size'][] = ['5_5_inch', '6_5_inch']
const screenNames: PreviewScreen['screenName'][] = ['calendar', 'settings', 'webhook', 'webhook-entry']

languageCodes.forEach((languageCode: string) => {
  const text = getTranslation(languageCode);

  console.log('Generating previews for', languageCode);
  sizes.forEach((size) => {
    generateScreen({
      size,
      template: 1,
      languageCode,
      mode: 'light',
      screenName: 'calendar',
      textLines: text.previews_screen_1_title,
      filenamePrefix: `1`,
    })
    generateScreen({
      size,
      template: 2,
      languageCode,
      mode: 'light',
      screenName: 'modal',
      textLines: [],
      filenamePrefix: `2`,
    })
    generateScreen({
      size,
      template: 3,
      languageCode,
      mode: 'light',
      screenName: 'settings',
      textLines: text.previews_screen_2_title,
      filenamePrefix: `3`,
    })
    generateScreen({
      size,
      template: 1,
      languageCode,
      mode: 'dark',
      screenName: 'calendar',
      textLines: [text.previews_screen_3_title[1]],
      filenamePrefix: `4`,
    })
  });
});
