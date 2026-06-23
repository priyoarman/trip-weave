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

## Tech Stack

- Node.js
- Express.js
- PostgresSql
- Nodemon

## Contributors

## Testing the extractor and AI search

Simple steps to test the extractor and the AI -> Duffel flow locally.

- Start the API server (development):

```bash
npm run dev
```

- Test the extractor endpoint (returns normalized JSON):

```bash
curl -s -X POST http://localhost:5050/api/groq/extract \
	-H "Content-Type: application/json" \
	-d '{"prompt":"Find a return flight from CPH to LHR departing 2026-07-15 returning 2026-07-22"}' | jq
```

- Test the AI flight search endpoint (uses extractor then Duffel/mock):

```bash
curl -s -X POST http://localhost:5050/api/flights/ai-search \
	-H "Content-Type: application/json" \
	-d '{"prompt":"Find a return flight from CPH to LHR departing 2026-07-15 returning 2026-07-22"}' | jq
```

- Notes:
  - If you want the extractor to call the Groq model, set `GROQ_API_KEY` in your environment.
  - The Duffel service falls back to mock data by default. Provide `DUFFEL_TOKEN` and set `USE_MOCK = false` inside `api/src/services/duffel.js` to test live Duffel responses.
  - The extractor validates `return_date` and will return errors like `invalid_return_date` or `return_before_departure_date` when applicable.
