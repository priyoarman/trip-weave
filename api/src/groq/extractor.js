import fs from "fs";
import path from "path";
import dotenv from "dotenv";
dotenv.config({ path: path.resolve(process.cwd(), ".env") });
import { fileURLToPath } from "url";
import { createGroq } from "@ai-sdk/groq";
import SYSTEM_PROMPT from "./systemPrompt.js";
import { resolveDestination } from "../utils/destinationResolver.js";
import Ajv from "ajv";
import addFormats from "ajv-formats";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const schemaPath = path.join(__dirname, "schema.json");
const schema = JSON.parse(fs.readFileSync(schemaPath, "utf8"));

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);
const validate = ajv.compile(schema);

const DEFAULT_MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-20b";
const MONTH_NAMES = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
];
const WEEKDAY_NAMES = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

function safeParseJsonMaybe(text) {
  if (!text || typeof text !== "string") return null;
  // Try direct JSON parse
  try {
    return JSON.parse(text);
  } catch (e) {
    // try to extract first JSON block in text
    const m = text.match(/\{[\s\S]*\}/);
    if (m) {
      try {
        return JSON.parse(m[0]);
      } catch (e2) {
        return null;
      }
    }
    return null;
  }
}

function normalizeIataCode(value) {
  if (value == null || value === "") return null;
  if (typeof value !== "string") return value;
  return value.trim().toUpperCase();
}

function normalizeCurrency(value) {
  if (value == null || value === "") return "DKK";
  if (typeof value !== "string") return value;
  const normalized = value.trim().toUpperCase();
  return /^[A-Z]{3}$/.test(normalized) ? normalized : value;
}

function normalizeTripType(value, returnDate) {
  if (returnDate) return "return";
  if (typeof value !== "string" || value.trim() === "") return "one_way";

  const normalized = value.trim().toLowerCase().replace(/[-\s]/g, "_");
  if (["return", "round_trip", "roundtrip"].includes(normalized))
    return "return";
  if (["one_way", "oneway", "single"].includes(normalized)) return "one_way";

  return value;
}

function normalizeCabinClass(value) {
  if (value == null || value === "") return "economy";
  if (typeof value !== "string") return value;

  const normalized = value.trim().toLowerCase().replace(/[-\s]/g, "_");
  const aliases = {
    premium: "premium_economy",
    premium_economy: "premium_economy",
    economy: "economy",
    business: "business",
    first: "first",
    first_class: "first",
  };

  return aliases[normalized] || value;
}

function normalizePassengers(value) {
  if (value == null || value === "") return 1;
  if (Number.isInteger(value)) return value;
  if (typeof value === "number" && Number.isFinite(value))
    return Math.round(value);
  if (typeof value !== "string") return value;

  const parsed = Number.parseInt(value.replace(/[^\d]/g, ""), 10);
  return Number.isFinite(parsed) ? parsed : value;
}

function normalizeMaxPriceDkk(value) {
  if (value == null || value === "") return null;
  if (Number.isInteger(value)) return value;
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.round(value);
  }
  if (typeof value !== "string") return value;

  const cleaned = value.trim().replace(/[^\d.,]/g, "");
  if (!cleaned) return null;

  const normalized = cleaned
    .replace(/\.(?=\d{3}(\D|$))/g, "")
    .replace(/,(?=\d{3}(\D|$))/g, "")
    .replace(",", ".");
  const parsed = Number(normalized);

  return Number.isFinite(parsed) ? Math.round(parsed) : value;
}

function normalizeVibeTags(value) {
  if (value == null || value === "") return [];

  const tags = Array.isArray(value) ? value : String(value).split(/[,\n]/);

  return tags
    .map((tag) => (typeof tag === "string" ? tag.trim() : String(tag).trim()))
    .filter(Boolean);
}

function normalizeBoolean(value) {
  if (value == null || value === "") return null;
  if (typeof value === "boolean") return value;
  if (typeof value !== "string") return value;

  const normalized = value.trim().toLowerCase();
  if (
    ["true", "yes", "y", "only", "direct", "nonstop", "non-stop"].includes(
      normalized,
    )
  ) {
    return true;
  }
  if (["false", "no", "n"].includes(normalized)) {
    return false;
  }
  return value;
}

function normalizePreferredAirlines(value) {
  if (value == null || value === "") return [];
  const airlines = Array.isArray(value) ? value : String(value).split(/[,\n]/);

  return airlines.map((airline) => String(airline).trim()).filter(Boolean);
}

function normalizeDepartureTime(value) {
  if (value == null || value === "") return null;
  if (typeof value !== "string") return value;

  const normalized = value.trim().toLowerCase();
  if (["morning", "afternoon", "evening", "night"].includes(normalized)) {
    return normalized;
  }

  return value;
}

function toDateOnlyString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function startOfToday(referenceDate = new Date()) {
  const today = new Date(referenceDate);
  today.setHours(0, 0, 0, 0);
  return today;
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function nextWeekday(referenceDate, weekdayIndex, { includeToday = false } = {}) {
  const today = startOfToday(referenceDate);
  let offset = (weekdayIndex - today.getDay() + 7) % 7;

  if (offset === 0 && !includeToday) {
    offset = 7;
  }

  return addDays(today, offset);
}

function saturdayForWeekend(referenceDate, modifier) {
  const upcomingSaturday = nextWeekday(referenceDate, 6, {
    includeToday: true,
  });

  if (modifier === "next") {
    return addDays(upcomingSaturday, 7);
  }

  return upcomingSaturday;
}

function hashText(value) {
  return Array.from(value).reduce(
    (hash, char) => (hash * 31 + char.charCodeAt(0)) >>> 0,
    0,
  );
}

function randomFutureDateInMonth(monthIndex, year, referenceDate, seedText) {
  const today = startOfToday(referenceDate);
  const firstOfMonth = new Date(year, monthIndex, 1);
  const lastOfMonth = new Date(year, monthIndex + 1, 0);
  const start = firstOfMonth < today ? today : firstOfMonth;

  if (start > lastOfMonth) return null;

  const daySpan = lastOfMonth.getDate() - start.getDate() + 1;
  const offset = hashText(seedText) % daySpan;

  return addDays(start, offset);
}

function parseNaturalTravelDates(text, referenceDate = new Date()) {
  if (typeof text !== "string" || text.trim() === "") {
    return { departure_date: null, return_date: null };
  }

  const normalized = text.toLowerCase();
  const today = startOfToday(referenceDate);

  if (/\btomorrow\b/.test(normalized)) {
    return {
      departure_date: toDateOnlyString(addDays(today, 1)),
      return_date: null,
    };
  }

  const weekendMatch = normalized.match(/\b(this|next)?\s*weekend\b/);
  if (weekendMatch) {
    return {
      departure_date: toDateOnlyString(
        saturdayForWeekend(today, weekendMatch[1] || "this"),
      ),
      return_date: null,
    };
  }

  const weekdayPattern = new RegExp(
    `\\b(this|next)?\\s*(${WEEKDAY_NAMES.join("|")})\\b`,
  );
  const weekdayMatch = normalized.match(weekdayPattern);
  if (weekdayMatch) {
    const modifier = weekdayMatch[1] || "";
    const weekdayIndex = WEEKDAY_NAMES.indexOf(weekdayMatch[2]);
    return {
      departure_date: toDateOnlyString(
        nextWeekday(today, weekdayIndex, { includeToday: modifier === "this" }),
      ),
      return_date: null,
    };
  }

  const monthPattern = new RegExp(
    `\\b(${MONTH_NAMES.join("|")})\\b(?:\\s+(20\\d{2}))?`,
  );
  const monthMatch = normalized.match(monthPattern);
  if (
    monthMatch &&
    !/\b\d{1,2}\s+(?:of\s+)?[a-z]+|[a-z]+\s+\d{1,2}\b/.test(normalized)
  ) {
    const monthIndex = MONTH_NAMES.indexOf(monthMatch[1]);
    let year = monthMatch[2] ? Number(monthMatch[2]) : today.getFullYear();

    if (!monthMatch[2] && monthIndex < today.getMonth()) {
      year += 1;
    }

    const date = randomFutureDateInMonth(monthIndex, year, today, normalized);
    return {
      departure_date: date ? toDateOnlyString(date) : null,
      return_date: null,
    };
  }

  return { departure_date: null, return_date: null };
}

function normalizeFilters(value) {
  const source =
    value && typeof value === "object" && !Array.isArray(value) ? value : {};

  return {
    direct_only: normalizeBoolean(source.direct_only),
    preferred_airlines: normalizePreferredAirlines(source.preferred_airlines),
    baggage_required: normalizeBoolean(source.baggage_required),
    departure_time: normalizeDepartureTime(source.departure_time),
  };
}

function normalizeTripQuery(raw) {
  const source = raw && typeof raw === "object" ? raw : {};

  return {
    origin_airport: normalizeIataCode(source.origin_airport) || null,
    destination_airport: normalizeIataCode(source.destination_airport) || null,
    destination_country: source.destination_country || null,
    destination_country_code: normalizeIataCode(source.destination_country_code) || null,
    destination_continent_code: normalizeIataCode(source.destination_continent_code) || null,
    destination_area: source.destination_area || null,

    departure_date: source.departure_date || null,
    
    trip_type: normalizeTripType(source.trip_type, source.return_date),
    return_date: source.return_date || null,
    max_price_dkk: source.max_price_dkk || null,
    vibe_tags: source.vibe_tags || [],
    // Flattened filter keys matching the new schema
    direct_only: normalizeBoolean(source.direct_only),
    preferred_airlines: normalizePreferredAirlines(source.preferred_airlines),
    baggage_required: normalizeBoolean(source.baggage_required),
    departure_time: normalizeDepartureTime(source.departure_time)
  };
}

function isRealDateString(value) {
  if (value == null) return true;
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function verifyTripQuery(query) {
  const errors = [];

  /*if (!query.origin_airport) {
    errors.push("missing_origin_airport");
  }
  if (!query.destination_airport) {
    errors.push("missing_destination_airport");
  }
  if (!query.departure_date) {
    errors.push("missing_departure_date");
  } else if (!isRealDateString(query.departure_date)) {
    errors.push("invalid_departure_date");
  }
  if (query.return_date && !isRealDateString(query.return_date)) {
    errors.push("invalid_return_date");
  }
  if (query.trip_type === "return" && !query.return_date) {
    errors.push("missing_return_date");
  }
  if (
    query.departure_date &&
    query.return_date &&
    isRealDateString(query.departure_date) &&
    isRealDateString(query.return_date) &&
    query.return_date < query.departure_date
  ) {
    errors.push("return_date_before_departure_date");
  }*/

  return errors;
}

async function extractTripQuery(userText, opts = {}) {
  const apiKey = process.env.GROQ_API_KEY;
  const groq = createGroq({ apiKey });
  const modelId = opts.modelId || DEFAULT_MODEL;
  const model = groq.languageModel(modelId);

  const referenceDate = opts.referenceDate || new Date();
  const currentDate = toDateOnlyString(startOfToday(referenceDate));
  const localDates = parseNaturalTravelDates(userText, referenceDate);
  const systemPrompt = SYSTEM_PROMPT.replace("{{CURRENT_DATE}}", currentDate);
  const prompt = [
    { role: "system", content: systemPrompt },
    { role: "user", content: [{ type: "text", text: userText }] },
  ];

  // AI SDK maps this to Groq/OpenAI Structured Outputs:
  // response_format: { type: "json_schema", json_schema: { ... } }
  const structuredOutputFormat = {
    type: "json",
    name: "trip_query_extraction",
    description: "Extract a flight search query from natural language.",
    schema,
  };

  let res;
  try {
    res = await model.doGenerate({
      prompt,
      responseFormat: structuredOutputFormat,
      // increase token budget so the model has more room to emit valid JSON
      maxOutputTokens: 1024,
    });
  } catch (err) {
    console.warn(
      "Groq structured generation failed; retrying without schema validation:",
      err?.message || err,
    );

    try {
      res = await model.doGenerate({
        prompt,
        maxOutputTokens: 1024,
      });
    } catch (retryErr) {
      console.error("Groq generation failed:", retryErr?.message || retryErr);
      return {
        ok: false,
        parsed: null,
        errors: ["failed_generation", retryErr?.message || String(retryErr)],
      };
    }
  }

  // Try to parse JSON from the returned content
  let parsed = null;
  if (Array.isArray(res.content) && res.content.length > 0) {
    // find first text part
    const textPart = res.content.find((c) => c.type === "text");
    if (textPart && textPart.text) {
      parsed = safeParseJsonMaybe(textPart.text);
    }
  }

  // fallback: try raw response body
  if (!parsed && res.response && res.response.body) {
    try {
      if (typeof res.response.body === "string") {
        parsed = safeParseJsonMaybe(res.response.body);
      } else if (typeof res.response.body === "object") {
        // sometimes provider puts parsed result here
        parsed = res.response.body;
      }
    } catch (e) {
      parsed = null;
    }
  }

  const result = {
    ok: false,
    parsed: null,
    errors: [],
  };

  if (!parsed) {
    result.errors.push("failed_to_parse_json_from_model_response");
    return result;
  }

  // --- PRE-NORMALIZATION FIX ---
  // Ensure vibe_tags is always treated as an array before validation.
  if (parsed.vibe_tags && typeof parsed.vibe_tags === "string") {
    parsed.vibe_tags = [parsed.vibe_tags];
  }
  // -----------------------------

  parsed = normalizeTripQuery(parsed);

  if (localDates.departure_date) {
    parsed.departure_date = localDates.departure_date;
  }

  if (localDates.return_date) {
    parsed.return_date = localDates.return_date;
  }

  parsed.trip_type = normalizeTripType(parsed.trip_type, parsed.return_date);
  parsed.vibe_tags = parsed.vibe_tags || [];
  parsed.max_price_dkk = parsed.max_price_dkk || null;
  parsed.return_date = parsed.return_date || null;
  parsed.departure_date = parsed.departure_date || null;

  parsed.direct_only = parsed.direct_only ?? null;
  parsed.preferred_airlines = parsed.preferred_airlines || [];
  parsed.baggage_required = parsed.baggage_required ?? null;
  parsed.departure_time = parsed.departure_time || null;

  const verificationErrors = verifyTripQuery(parsed);
  if (verificationErrors.length > 0) {
    result.errors.push(...verificationErrors);
    result.parsed = parsed;
    return result;
  }

  // Resolve country, area, and vibes to specific airport
  const resolved = resolveDestination(parsed);
  if (resolved && resolved.destination_airport) {
    parsed.destination_airport = resolved.destination_airport;
    parsed.explanation = resolved.explanation;
  } else {
    parsed.explanation = null;
  }

  result.ok = true;
  result.parsed = parsed;
  return result;
}

export {
  extractTripQuery,
  normalizeTripQuery,
  parseNaturalTravelDates,
  isRealDateString,
  verifyTripQuery,
};
//End of file
