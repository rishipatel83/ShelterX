# ShelterX Backend Validation Report

## Automated checks

Commands executed on the production source:

```bash
npm run check
npm test
```

Result: **9/9 automated tests passed**.

Coverage includes:
- positive engineering input validation
- rejection of invalid latitude/longitude, geometry, thickness, occupants and budget
- acceptance of negative temperatures
- cost completeness semantics
- over-budget safety logic
- production conduction regression against every stored validated ANSYS conduction case

## ANSYS conduction regression

Validation source: `data/validation/ansys_conduction_cases.json`, derived from the project's validated `data/ansys/cases.csv`.

- validated cases: **11**
- maximum recorded total-heat error in the source validation set: **0.000136%**
- production JavaScript conduction service reproduces the stored physics labels within their 6-decimal CSV serialization precision
- the automated regression test verifies that the JavaScript implementation does not increase the recorded ANSYS error beyond floating-point/serialization slack

## Scope limitation

This validation supports the current production V1 steady-state wall + roof conduction model under the same boundary assumptions as the validation cases.

It does **not** validate wind, solar, occupant heat, infiltration or thermal mass. Those remain future V2 features.
