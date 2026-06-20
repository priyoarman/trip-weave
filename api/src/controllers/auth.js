import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import express from "express";
import prisma from "../db/code/prisma.js";
import { signupSchema, loginSchema } from "../schemas/auth-schemas.js";

export async function signUp(req, res, next) {
  try {
    const signUpValidation = signupSchema.safeParse(req.body);
    if (!signUpValidation.success) {
      return res.status(400).json({
        success: false,
        errors: signUpValidation.error.flatten().fieldErrors,
      });
    }
    const { email, password } = signUpValidation.data;
    const existingUser = await prisma.user.findFirst({
      where: {
        email: {
          equals: email,
        },
      },
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "Email already exists",
      });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    await prisma.user.create({
      data: {
        email,
        passwordHash: passwordHash,
      },
    });

    return res.status(201).json({
      success: true,
      message: "User account created successfully",
    });
  } catch (error) {
    next(error);
  }
}
