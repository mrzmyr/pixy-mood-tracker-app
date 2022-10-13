import { LogsState } from './../hooks/useLogs';
import Ajv from "ajv"
import { TAG_COLOR_NAMES } from '../constants/Config';

const ajv = new Ajv({
  allErrors: true
});

ajv.addFormat('date', {
  validate: (dateTimeString: string) => /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(dateTimeString)
});

const pixy_schema = {
  type: "object",
  required: ["items"],
  properties: {
    version: {
      type: "string",
    },
    items: {
      type: "object",
      patternProperties: {
        "^[0-9]{4}-[0-9]{2}-[0-9]{2}$": { 
          type: "object",
          properties: {
            date: {
              type: "string",
              format: "date"
            },
            rating: {
              type: "string",
              enum: ['extremely_good', 'very_good', 'good', 'neutral', 'bad', 'very_bad', 'extremely_bad']
            },
            message: {
              type: "string"
            }
          }
        },
      },
      additionalProperties: false,
    },
    tags: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: {
            type: "string",
          },
          title: {
            type: "string",
          },
          color: {
            type: "string",
            enum: TAG_COLOR_NAMES
          },
        },
      },
    },
    settings: {
      type: "object",
      properties: {
        passcodeEnabled: {
          type: ["boolean", "null"],
        },
        passcode: {
          type: ["string", "null"],
        },
        scaleType: {
          type: "string",
          enum: ["ColorBrew-RdYlGn", "ColorBrew-PiYG"],
        },
        reminderEnabled: {
          type: ["boolean"],
        },
        reminderTime: {
          type: ["string"],
          pattern: "^[0-9]{2}:[0-9]{2}$",
        },
        trackBehaviour: {
          type: ["boolean", "null"],
        },
      },
    },
  },
  additionalProperties: false,
}

export function getJSONSchemaType(json: any): 'pixy' | 'unknown' {
  const pixySchemaValidator = ajv.compile(pixy_schema);

  const isValid = pixySchemaValidator(json);
  
  if(pixySchemaValidator.errors) console.log(pixySchemaValidator.errors)
  
  return isValid ? 'pixy' : 'unknown';
}

export function convertPixeltoPixyJSON(data): LogsState {
  const pixy = {
    items: {}
  }

  data.forEach(item => {
    const rating = {
      5: 'extremely_good',
      4: 'very_good',
      3: 'neutral',
      2: 'very_bad',
      1: 'extremely_bad',
    }[item.mood]
    
    pixy.items[item.date] = {
      date: item.date,
      rating,
      message: item.notes
    }
  })

  return pixy
}

