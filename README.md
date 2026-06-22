# trip-weave

## Prerequisites

Make sure you have the following installed:

- Node.js
- npm
- Git

Verify installation:

node -v
npm -v
git --version

## Installation

### 1. Clone the repository

git clone https://github.com/abikrithika/trip-weave.git
cd trip-weave

### 2. Install dependencies

npm install

### 3. Install Nodemon

npm install --save-dev nodemon

## Environment Variables

Create a `.env` file in the project root.

Example:

PORT=5000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/trip_weave
Add any additional environment variables required by the application.

## Package Scripts

Key scripts:

- `npm run dev`
- `npm start`
- `npm run test:extract:normalize`
- `npm run test:extract`

## Database Scripts

- `npm run db:create`: Ensures the PostgreSQL database exists before Prisma operations run.
- `npm run db:validate`: Validates Prisma schema and config (fails fast if schema or env is invalid).
- `npm run db:migrate`: Runs `prisma migrate dev` for local development.
- `npm run db:migrate -- --name <migration_name>`: Preferred migrate form so migration names are explicit and non-interactive.
- `npm run db:generate`: Regenerates Prisma Client from the current schema.
- `npm run db:seed`: Runs the seed runner (`api/src/db/code/seed.js`) and inserts seed data.
- `npm run db:deploy`: Runs `prisma migrate deploy` for non-development environments (applies existing migrations only).
- `npm run db:all`: Runs the full setup chain in order: create -> validate -> migrate -> generate -> seed.

Database files now live under `api/src/db/`, with code (Prisma schema, client, config, and seed runner) in `api/src/db/code/`, migrations in `api/src/db/migrations/`, and seed data in `api/src/db/seeds/`.

## Running the Project

### Development Mode (Nodemon)

npm run dev

Nodemon automatically restarts the server whenever changes are made.

### Production Mode

npm start

## API Base URL

When running locally:

http://localhost:5000 (Replace the port if configured differently in `.env`).

## Testing AI Flight JSON Extraction

The flight AI extractor lives in `api/src/groq/`. It turns a natural-language flight request into clean JSON for the backend.

### 1. Offline normalization test

This test does not call Groq and does not need an API key. It checks that messy AI-like data is cleaned into the expected shape.

```bash
npm run test:extract:normalize
```

Expected output:

```txt
AI flight JSON normalization tests passed.
```

### 2. Live Groq extraction test

Add these variables to `.env` first:

```env
GROQ_API_KEY=your_groq_key_here
GROQ_MODEL=openai/gpt-oss-20b
```

Then run:

```bash
npm run test:extract
```

The output should include:

```json
{
  "ok": true,
  "parsed": {
    "trip_type": "return",
    "origin_airport": "CPH",
    "destination_airport": "BCN",
    "departure_date": "2026-07-15",
    "return_date": "2026-07-22",
    "passengers": 2,
    "cabin_class": "economy",
    "currency": "DKK",
    "max_price_dkk": 2500,
    "vibe_tags": [],
    "filters": {
      "direct_only": true,
      "preferred_airlines": [],
      "baggage_required": true,
      "departure_time": null
    }
  },
  "errors": []
}
```

### 3. Test through the API

Start the backend:

```bash
npm run dev
```

Then send a request:

```bash
curl -X POST http://localhost:5050/api/groq/extract \
  -H "Content-Type: application/json" \
  -d '{"prompt":"Find direct return flights from Copenhagen to Barcelona for 2 passengers from 2026-07-15 to 2026-07-22 under 2500 DKK with baggage included."}'
```

The API response wraps the extracted JSON in a `data` field:

```json
{
  "success": true,
  "data": {
    "trip_type": "return",
    "origin_airport": "CPH",
    "destination_airport": "BCN",
    "departure_date": "2026-07-15",
    "return_date": "2026-07-22",
    "passengers": 2,
    "cabin_class": "economy",
    "currency": "DKK",
    "max_price_dkk": 2500,
    "vibe_tags": [],
    "filters": {
      "direct_only": true,
      "preferred_airlines": [],
      "baggage_required": true,
      "departure_time": null
    }
  },
  "errors": []
}
```

## Tech Stack

- Node.js
- Express.js
- PostgresSql
- Nodemon

## Contributors
