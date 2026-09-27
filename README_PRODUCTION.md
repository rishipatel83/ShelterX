# ShelterX Backend — Production V1

## Production thermal scope

The production API uses the steady-state **wall + roof conduction** equations that were regression-tested against the existing ANSYS conduction validation cases.

Included now:
- engineering input validation
- validated material conductivity loaded from MongoDB
- current Open-Meteo outdoor temperature
- current conduction heating/cooling load
- 24-hour conduction profile from hourly outdoor temperature
- dynamic MongoDB market-price/cost candidates
- authentication, CORS controls, rate limiting, readiness endpoint
- MongoDB persistence

Intentionally excluded from production V1:
- wind/exterior-convection V2
- solar V2
- occupant heat V2
- infiltration
- thermal mass
- ML thermal authority / residual correction

Those remain future Physics V2 work and must not be represented as validated production outputs yet.

## Required environment variables

Copy `.env.example` to `.env` for local development and supply real values through your deployment platform in production.

- `MONGO_URI` — MongoDB connection string
- `JWT_SECRET` — secret used to sign JWTs; minimum 32 characters in production
- `CORS_ORIGINS` — comma-separated frontend origins in production
- `PORT` — optional, defaults to 5000
- `TRUST_PROXY=1` — set only when the deployment platform is behind a trusted reverse proxy

Never commit `.env`.

## Local validation

```bash
npm ci
npm run check
npm test
```

Expected: all tests pass, including the ANSYS conduction regression test.

## Seed/import material and pricing data

```bash
npm run import:data
```

This imports the checked CSV material/property and pricing records into MongoDB.

## Run

```bash
npm start
```

Endpoints:
- `GET /api/v1/health` — process liveness
- `GET /api/v1/ready` — readiness + MongoDB status
- `POST /api/v1/auth/signup`
- `POST /api/v1/auth/login`
- `GET /api/v1/sih/materials` — authenticated validated material list
- `POST /api/v1/sih/simulate` — authenticated ShelterX simulation

## Deployment

A generic Dockerfile is included.

Build:

```bash
docker build -t shelterx-backend .
```

Run (example):

```bash
docker run --env-file .env -p 5000:5000 shelterx-backend
```

For cloud deployment, configure secrets as platform environment variables rather than uploading `.env`.
