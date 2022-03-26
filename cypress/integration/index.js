const dayjs = require("dayjs")

const POSSIBLE_RATINGS = [
  'extremely_good',
  'very_good',
  'good',
  'neutral',
  'bad',
  'very_bad',
  'extremely_bad',
]

const generateLogs = () => {
  const result = {}

  for(let i = 0; i < 60; i++) {
    const date = dayjs().subtract(i, 'day').format('YYYY-MM-DD')
    result[date] = { 
      date, 
      rating: POSSIBLE_RATINGS[i % 7],
      message: ``
    }
  }
  
  return {
    items: result
  };
}

// const logs = generateLogs()
// localStorage.clear();
// localStorage.setItem('PIXEL_TRACKER_LOGS', JSON.stringify(logs));

const today = dayjs().format('YYYY-MM-DD');

describe('Calendar should', () => {
  before(() => {
    cy.visit('http://localhost:19006')
  })

  beforeEach(() => {
    cy.viewport('iphone-x')
  })
  
  it('add entry', () => {
    cy.track({
      date: today,
      rating: POSSIBLE_RATINGS[1],
      message: 'yesterday was'
    })

    cy.get(`[data-testid="calendar-day-${today}"]`).should('have.attr', 'data-rating', POSSIBLE_RATINGS[1])
  })

  it('change entry', () => {

    cy.get(`[data-testid="calendar-day-${today}"]`).click()
    cy.get(`[data-testid="scale-button-${POSSIBLE_RATINGS[0]}"]`).click()
    cy.get(`[data-testid="modal-message"]`).type(' great', { force: true, delay: 0 })
    cy.get(`[data-testid="modal-submit"]`).click()

    cy.get(`[data-testid="calendar-day-${today}"]`).should('have.attr', 'data-rating', POSSIBLE_RATINGS[0])
    cy.get(`[data-testid="calendar-day-${today}"]`).click()
    cy.get(`[data-testid="scale-button-${POSSIBLE_RATINGS[0]}"]`).should('have.attr', 'data-selected', 'true')
    cy.get(`[data-testid="modal-message"]`).should('have.value', 'yesterday was great')
    cy.get(`[data-testid="modal-cancel"]`).click()
  })

  it('delete entry', () => {
    cy.get(`[data-testid="calendar-day-${today}"]`).click()
    cy.get(`[data-testid="modal-delete"]`).click()
    cy.get(`[data-testid="calendar-day-${today}"]`).should('have.attr', 'data-rating', 'none')
  })

  it('reset data', () => {
    cy.track({
      date: today,
      rating: POSSIBLE_RATINGS[3],
      message: 'yesterday was'
    })
    cy.get(`[data-testid="settings"]`).click()
    cy.get(`[data-testid="data"]`).click()
    cy.get(`[data-testid="reset-data"]`).click()
    cy.get(`[data-testid="data-back-button"]`).click()
    cy.get(`[data-testid="settings-back-button"]`).click()
    cy.get(`[data-testid="calendar-day-${today}"]`).should('have.attr', 'data-rating', 'none')
  })

})