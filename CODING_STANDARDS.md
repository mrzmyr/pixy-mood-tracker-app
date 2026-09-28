- Do not write unit tests for cli commands

## E2E Tests

**Naming conventions**

- lean towards using ASD-STE100
- simple wins over compliacted (e.g. `tag-delete-keeps-entries` can just be `tag-delete`)
- boolean-returning subflows use prefixes like `is`, `has`, `can`, `should`, `was`, `will`
- prefer test-id labels over text selectors
