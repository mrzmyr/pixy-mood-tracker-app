import { LogsState } from './../hooks/useLogs';
import Ajv from "ajv"

const ajv = new Ajv();
ajv.addFormat('date', {
  validate: (dateTimeString: string) => /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(dateTimeString)
});

export function invertColor(hex, bw = true) {
  if (hex.indexOf('#') === 0) {
    hex = hex.slice(1);
  }
  // convert 3-digit hex to 6-digits.
  if (hex.length === 3) {
    hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  }
  if (hex.length !== 6) {
    throw new Error('Invalid HEX color.');
  }
  var r = parseInt(hex.slice(0, 2), 16),
  g = parseInt(hex.slice(2, 4), 16),
  b = parseInt(hex.slice(4, 6), 16);
  if (bw) {
    // https://stackoverflow.com/a/3943023/112731
    return (r * 0.299 + g * 0.587 + b * 0.114) > 186
    ? '#000000'
    : '#FFFFFF';
  }
  // invert color components
  r = (255 - r).toString(16);
  g = (255 - g).toString(16);
  b = (255 - b).toString(16);
  // pad each with zeros and return
  return "#" + padZero(r) + padZero(g) + padZero(b);
}

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
    }
  },
  additionalProperties: false,
}

const pixel_schema = {
  type: "array",
  items: {
    type: "object",
    properties: {
      date: {
        type: "string",
        format: "date"
      },
      mood: {
        type: "number",
        minimum: 1,
        maximum: 5,
      },
      emotions: {
        type: "array"
      },
      notes: {
        type: "string"
      }
    },
    additionalProperties: false,
  }
}

export function getJSONSchemaType(json: any): 'pixy' | 'pixel' | 'unknown' {
  const pixySchemaValidator = ajv.compile(pixy_schema);
  const pixelSchemaValidator = ajv.compile(pixel_schema);
  
  const isPixySchema = pixySchemaValidator(json);
  const isPixelSchema = pixelSchemaValidator(json)
  
  // if (!isPixySchema) console.log(pixySchemaValidator.errors)
  
  if (isPixySchema) {
    return 'pixy'
  } else if (isPixelSchema) {
    return 'pixel'
  } else {
    return 'unknown'
  }
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