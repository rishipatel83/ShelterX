# ShelterX Frontend API Contract — Production V1

The frontend should use the backend API as the source of truth for material conductivity, weather and thermal results. It must not calculate or invent thermal conductivity, weather temperature or final thermal loads locally.

## Authentication

### Signup
`POST /api/v1/auth/signup`

```json
{
  "username": "user name",
  "email": "user@example.com",
  "password": "minimum-8-character-password"
}
```

### Login
`POST /api/v1/auth/login`

```json
{
  "email": "user@example.com",
  "password": "password"
}
```

Save the returned token and send it on protected requests:

`Authorization: Bearer <token>`

## Material dropdown

Before the user runs a simulation, load:

`GET /api/v1/sih/materials`

Use `materialCode` as the stable value submitted to `/simulate`. Show `name`, `family`, and source/provenance where useful. Do not allow a free-text conductivity field in the production V1 UI.

## Simulation request

`POST /api/v1/sih/simulate`

Required request fields:

```json
{
  "location": "User-visible location name",
  "lat": 22.7,
  "lon": 75.8,
  "dimensions": {
    "length": 6,
    "width": 4,
    "height": 3
  },
  "targetTemp": 22,
  "materialCode": "ROCKWOOL_S60",
  "wallThickness_mm": 100,
  "insulationThickness_mm": 120
}
```

Optional current-V1 fields:

```json
{
  "orientation": "N",
  "occupants": 4,
  "budgetINR": 200000,
  "priority": "cost",
  "costSurfaceType": "walls"
}
```

`occupants` and `orientation` are preserved for future V2 but do not change the current conduction-only thermal result.

Allowed `costSurfaceType` values:
- `walls`
- `roof`
- `floor`
- `walls_and_roof`
- `full_envelope`

## Simulation response fields the frontend should use

Primary response structure:

```text
status
material
weather
result.thermal
result.cost
result.recommendation
```

For the current thermal display use:

```text
result.thermal.current.thermal.totalConductionW
result.thermal.current.thermal.heatingLoadW
result.thermal.current.thermal.coolingLoadW
result.thermal.current.thermal.averageConductionFluxWM2
result.thermal.forecast.peakHeatingLoadW
result.thermal.forecast.peakCoolingLoadW
result.thermal.forecast.hourly[]
```

The hourly array includes:

```text
time
outsideTempC
totalConductionW
heatingLoadW
coolingLoadW
```

Recommended UI chart:
- x-axis: `time`
- line 1: `outsideTempC`
- line 2 or secondary chart: `heatingLoadW` / `coolingLoadW`

## Weather-unavailable state

If Open-Meteo cannot provide the required current temperature, the API does not invent one. The response will contain:

```text
status = partial-insufficient-weather-data
result.thermal.status = insufficient-weather-data
```

The frontend should show a clear retry/message rather than displaying a fake thermal value.

## Cost display rule

Do not label `knownTotalINR` as a complete installed/project cost. Transport and installation are currently unknown unless later sourced.

Prefer wording such as:
- `Known material cost`
- `Known material + recorded tax`
- `Final installed cost incomplete`

A cost can be definitively marked over budget when known costs already exceed the budget. A below-budget known subtotal must not be presented as a guaranteed final within-budget project cost.

## Current production limitations to display accurately

Thermal model V1 currently includes wall and roof conduction only. Wind, solar, occupants, infiltration and thermal mass are future V2 features. Do not show them as active calculations in the production V1 frontend.
