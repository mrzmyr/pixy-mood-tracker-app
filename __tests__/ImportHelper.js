import { convertPixeltoPixyJSON, getJSONSchemaType } from "../helpers/Import";
import { INITIAL_STATE } from "../hooks/useSettings";

describe('getJSONSchemaType', () => {
  test('pixy schema: valid', async () => {
    const json = {
      items: {
        '2022-01-23': {
          date: '2022-01-23',
          rating: 'extremely_good',
          message: 'test message',
        }
      },
      settings: {
        ...INITIAL_STATE
      }
    }
    
    expect(getJSONSchemaType(json)).toBe('pixy');
  });

  test('pixy schema: reject invalid date key', async () => {
    const json = {
      items: {
        '2020-23': {
          date: '2022-01-23',
          rating: 'extremely_good',
          message: 'test message',
        }
      }
    }
    
    expect(getJSONSchemaType(json)).toBe('unknown');
  });

  test('pixy schema: invalid date key', async () => {
    const json = {
      items: {
        '2020-23': {
          date: '2022-01-23',
          rating: 'extremely_good',
          message: 'test message',
        }
      }
    }
    
    expect(getJSONSchemaType(json)).toBe('unknown');
  });

  test('pixy schema: wrong rating', async () => {
    const json = {
      items: {
        '2022-01-03': {
          date: '2022-01-03',
          rating: 'really_good', // wrong rating
          message: 'test message 2',
        }
      }
    }
    
    expect(getJSONSchemaType(json)).toBe('unknown');
  });

  test('pixy schema: invalid json structure', async () => {
    const json = {
      '2022-01-03': {
        date: '2022-01-03', // wrong date format
        rating: 'extremely_good',
        message: 'test message 2',
      }
    }
    
    expect(getJSONSchemaType(json)).toBe('unknown');
  });

  test('pixy schema: empty json', async () => {
    const json = {}
    expect(getJSONSchemaType(json)).toBe('unknown');
  });
});

describe('convertPixeltoPixyJSON', () => {
  test('convert pixel to pixy json', async () => {
    const json = [
      {
        "mood" : 1,
        "emotions" : [
    
        ],
        "notes" : "",
        "date" : "2021-12-14"
      },
      {
        "mood" : 3,
        "emotions" : [
    
        ],
        "notes" : "",
        "date" : "2021-12-15"
      },
    ]
    expect(convertPixeltoPixyJSON(json)).toEqual({
      items: {
        '2021-12-14': {
          date: '2021-12-14',
          rating: 'extremely_bad',
          message: '',
          tags: [],
        },
        '2021-12-15': {
          date: '2021-12-15',
          rating: 'neutral',
          message: '',
          tags: [],
        },
      }
    })
  });
});