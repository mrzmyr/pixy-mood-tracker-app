const dayjs = require('dayjs');
const fs = require('fs');
const _ = require('lodash');

const RATINGS = ['extremely_good', 'very_good', 'good', 'neutral', 'bad', 'very_bad']
const MESSAGES = [
  'I love it with mom',
  'I laughed a lot',
  'I with something would happen',
  'Leared something new',
  'Bold experience',
];

const generate = () => {
  
  const settings = {
    passcodeEnabled: null,
    passcode: null,
    webhookEnabled: false,
    webhookUrl: '',
    webhookHistory: [],
    scaleType: 'ColorBrew-RdYlGn',
    reminderEnabled: false,
    reminderTime: '18:00',
    trackBehaviour: true,
    tags: [{
      id: '1',
      title: `Happy 🥳`,
      color: 'orange',
    }, {
      id: '2',
      title: `Struggles ☔️`,
      color: 'purple',
    }, {
      id: '3',
      title: `Work 💼`,
      color: 'sky',
    }, {
      id: '4',
      title: `Exercise 🏃`,
      color: 'green',
    }, {
      id: '5',
      title: `Friends 🤗`,
      color: 'yellow',
    }],
  }

  const items = {}

  for(let i = 0; i < 356; i++) {
    const date = dayjs().subtract(i, 'day').format('YYYY-MM-DD');
    items[date] = {
      date,
      rating: _.sample(RATINGS),
      message: `${_.sample(MESSAGES)}`,
      tags: Math.random() > 0.5 ? _.sampleSize(settings.tags, _.random(0, settings.tags.length)) : [],
    }
  }

  const data = {
    settings,
    items,
  }

  fs.writeFileSync(`${__dirname}/data/sample-data.json`, JSON.stringify(data, null, 2));
}

generate()