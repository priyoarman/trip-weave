# Trip-Weave
Trip-Weave is an AI-powered travel planning and flight search application that allows users to search for flights using natural language. Instead of manually entering airport codes, dates, and passenger information, users can simply describe their travel plans in plain English.

The application uses an AI-powered extraction service (Groq) to convert user prompts into structured flight search parameters, which are then sent to the Duffel Flights API (or mock data during development). The project consists of a Node.js/Express backend, a lightweight frontend, PostgreSQL with Prisma ORM, and AI-assisted flight extraction.

## Features
- AI-powered flight search using natural language
- Flight parameter extraction with Groq LLM
- Flight search using the Duffel API
- Mock flight data fallback for offline development
- PostgreSQL database with Prisma ORM
- RESTful API architecture
- Frontend chat interface for flight search
- Automated extractor normalization tests
  
## Project Board

- Trello: https://trello.com/b/2veKRbtH/trip-weave
  
# Running the Project Locally

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
npm install -g concurrently
npm install -g http-server
npm install jsonwebtoken
npm install bcrypt
npm install request-ip

## Environment Variables

Create a `.env` file in the project root.

Example:

- PORT=5500
- DATABASE_URL=postgresql://postgres:postgres@localhost:5432/trip_weave
- GROQ_API_KEY=sk_your_actual_api_key_here
- GROQ_MODEL=openai/gpt-oss-20b
- JWT_SECRET=your_super_secret_key_here
- DUFFEL_API_URL="https://api.duffel.com"
- DUFFEL_TOKEN=your_duffel_secret_key_here
Add any additional environment variables required by the application.

If you need the Groq-specific setup details, see [api/src/groq/README.md](api/src/groq/README.md).

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

### Render Deployment

Deploy this repository as a Render **Web Service** using the Node runtime. Do not deploy the `app/` folder as a Static Site, because the frontend posts to the Express API route at `/api/flights/search-stream`.

Recommended settings:

- Build Command: `npm ci && npm run db:generate && npm run db:deploy`
- Start Command: `npm start`
- Health Check Path: `/api/health`

Do not use `npm run standalone` on Render. That command starts the local-only `http-server` frontend process, and Render may route traffic to that static server instead of Express, causing `POST /api/flights/search-stream` to return 404/405.

Required Render environment variables:

- `DATABASE_URL`
- `JWT_SECRET`
- `GROQ_API_KEY`
- `GROQ_MODEL`
- `DUFFEL_API_URL`
- `DUFFEL_TOKEN`
- `NODE_ENV=production`

After deploy, open `/api/health` on your Render URL. It should return JSON with `ok: true`. If it does not, Render is not running the Express backend from this repository.

### Frontend

npm run start: frontend

### Run both frontend and backend together:

npm run standalone

### Backend:

http://localhost:5500

### Frontend:

http://localhost:8080

# Deliverables
## Deployed API
## API Base URL(When running locally)

http://localhost:5500 (Replace the port if configured differently in `.env`).
## Postman Collection

# Key Technical Summary & Design Decisions

- Built with Node.js and Express.js following a RESTful API architecture.
- Uses Prisma ORM for database management and migrations.
- PostgreSQL is used as the primary relational database.
- Flight search is powered by Duffel API, with automatic fallback to mock data for development and testing.
- AI flight extraction uses Groq to convert natural-language travel requests into structured JSON.
- Extracted flight requests are validated before search execution to reduce invalid API requests.
- The backend is organised into modular services, routes, controllers, and database layers for maintainability.
- Authentication and user accounts are implemented and managed using JWT.
- Environment variables are used for all API keys and configuration.
- Automated tests verify AI extraction and JSON normalization independently of external APIs.
- Limited user conversations are stored for authenticated users.
  
# Tech Stack
- Node.js
- Express.js
- PostgreSQL
- Prisma ORM
- Groq API
- Duffel API
- Nodemon
- JavaScript

# Future Improvements
- Hotel and activity recommendations
- Flight price alerts
- Enhanced filtering and sorting
- Better UI/UX and responsive design
- Comprehensive API documentation using Swagger
- Increased automated test coverage

# Contributors

| Name | GitHub Profile |
|------|----------------|
| **Abikrithika** | [@abikrithika](https://github.com/abikrithika) |
| **Annamani** | [@annamani](https://github.com/annamani) |
| **Priyo Arman** | [@priyoarman](https://github.com/priyoarman) |
| **Ftshn84** | [@ftshn84](https://github.com/ftshn84) |

# Deployment Link
https://trip-weave-wbh3.onrender.com/
