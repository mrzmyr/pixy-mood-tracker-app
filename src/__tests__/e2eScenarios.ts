/**
 * @jest-environment node
 */
import { checkCatalog, loadCatalog } from '../../e2e/scenarios'

describe('e2e/scenarios.yaml', () => {
  test('should be valid', () => {
    expect(checkCatalog(loadCatalog())).toEqual([])
  })

  test('should report schema violations', () => {
    const catalog = loadCatalog()
    catalog.scenarios[0].id = 'D1'
    delete catalog.scenarios[1].passWhen

    expect(checkCatalog(catalog)).toEqual([
      expect.stringMatching(/^scenarios\.0\.id: /),
      expect.stringMatching(/^scenarios\.1\.passWhen: /),
    ])
  })

  test('should report duplicate ids, missing flows and data-changing device runs', () => {
    const catalog = loadCatalog()
    catalog.scenarios[1].id = catalog.scenarios[0].id
    catalog.scenarios[2].status = 'implemented'
    catalog.scenarios[3].runsOn = ['physical-device']

    expect(checkCatalog(catalog)).toEqual([
      'DI-01: duplicate id',
      'DI-03: status is implemented but e2e/flows/data-integrity/di-03-delete-tag.yaml does not exist',
      'DI-04: changes data, so it must not run on a physical device with real entries',
    ])
  })
})
