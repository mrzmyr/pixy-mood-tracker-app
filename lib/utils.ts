import { LogsState } from './../hooks/useLogs';
import Ajv from "ajv"

const ajv = new Ajv();

ajv.addFormat('date', {
  validate: (dateTimeString: string) => /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(dateTimeString)
});

const pixy_schema = {
  type: "object",
  required: ["items"],
  properties: {
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
    settings: {
      type: "object",
      properties: {
        passcodeEnabled: {
          type: ["boolean", "null"],
        },
        passcode: {
          type: ["string", "null"],
        },
        webhookEnabled: {
          type: ["boolean"],
        },
        webhookUrl: {
          type: ["string"],
        },
        webhookHistory: {
          type: "array",
          items: {
            type: "object",
            properties: {
              url: {
                type: "string",
              },
              date: {
                type: "string",
              },
              body: {
                type: "string",
              },
              statusCode: {
                type: "number",
              },
              statusText: {
                type: "string",
              },
              isError: {
                type: "boolean",
              },
              errorMessage: {
                type: "string",
              },
            },
          },
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
                enum: ["slate","stone","red","orange","amber","yellow","lime","green","teal","sky","blue","indigo","purple","pink"]
              },
            },
          },
        },
      },
      additionalProperties: false,
    },
  },
  additionalProperties: false,
}

export function getJSONSchemaType(json: any): 'pixy' | 'unknown' {
  const pixySchemaValidator = ajv.compile(pixy_schema);
  
  return pixySchemaValidator(json) ? 'pixy' : 'unknown';
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