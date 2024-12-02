import express from "express";
import { createOrLogin } from "../controllers/auth.controller.js";

const router = express.Router();

router.post("/create-or-login", createOrLogin);

export default router;
