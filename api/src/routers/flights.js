import express from "express";
import { searchFlightsController } from "../controllers/duffel.js";
import {validate} from "../middleware/validate-data.js";
import {searchFlightsSchema} from "../schemas/flight-schemas.js";

const router = express.Router();
router.post("/search", validate(searchFlightsSchema), searchFlightsController,);
export default router;
