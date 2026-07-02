import express from "express";
import { signUp, logIn } from "../controllers/auth.js";
import { authMiddleware } from "../middleware/auth.js";
import { verifySession } from "../controllers/auth.js";


const authRouter = express.Router();
authRouter.get("/verify", authMiddleware, verifySession);
authRouter.post("/signup", signUp);
authRouter.post("/login", logIn);
export default authRouter;
