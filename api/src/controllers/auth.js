import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import express from "express";
import prisma from "../db/code/prisma.js";
import { signupSchema, loginSchema } from "../schemas/auth-schemas.js";

export async function verifySession(req, res) {
 
  res.status(200).json({ valid: true, message: "Session is valid" });
}
/**
 * @openapi
 * /api/auth/signup:
 *   post:
 *     summary: Signup a new user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               email: { type: string }
 *               password: { type: string }
 *     responses:
 *       201: { description: "User created" }
 */
export async function signUp(req, res, next) {
  try {
    const signUpValidation = signupSchema.safeParse(req.body);
    if (!signUpValidation.success) {
      return res
        .status(400)
        .json({
          success: false,
          errors: signUpValidation.error.flatten().fieldErrors,
        });
    }

    const { name, email, password } = signUpValidation.data;

    const existingUser = await prisma.user.findFirst({
      where: { email: { equals: email } },
    });

    if (existingUser) {
      return res
        .status(409)
        .json({ success: false, message: "Email already exists" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const dkkCurrency = await prisma.currency.findUnique({
      where: { code: "DKK" },
    });

    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash: passwordHash,
        currencyId: dkkCurrency ? dkkCurrency.id : null,
      },
      include: { currency: true },
    });

    return res.status(201).json({
      success: true,
      message: "User account created successfully",
      user: {
        id: newUser.id.toString(), // Fixed BigInt
        name: newUser.name,
        email: newUser.email,
        currency: newUser.currency ? { code: newUser.currency.code } : null,
      },
    });
  } catch (error) {
    if (error.code === "P2002") {
      return res
        .status(409)
        .json({ success: false, message: "Email already exists" });
    }
    next(error);
  }
}
/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     summary: Login as existing user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email: { type: string }
 *               password: { type: string }
 *     responses:
 *       200: { description: "Login successful" }
 *       401: { description: "Invalid email or password" }
 */
export async function logIn(req, res, next) {
  try {
    const loginValidation = loginSchema.safeParse(req.body);
    if (!loginValidation.success) {
      return res.status(400).json({
        success: false,
        errors: loginValidation.error.flatten().fieldErrors,
      });
    }
    const { email, password } = loginValidation.data;
    const user = await prisma.user.findUnique({
      where: { email },
      include: { currency: true },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const token = jwt.sign(
      {
        userId: user.id.toString(),
        email: user.email,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "1h",
      },
    );

    return res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: user.id.toString(), // Fixed BigInt here as well
        name: user.name,
        email: user.email,
        currency: user.currency ? { code: user.currency.code } : null,
      },
    });
  } catch (error) {
    next(error);
  }
}
