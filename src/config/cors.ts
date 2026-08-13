import type { CorsOptions } from "cors";
import { env } from "@/config/env.js";

const defaultDevOrigins = [
  "http://localhost:3000",
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:8080",
];

function getAllowedOrigins(): string[] {
  const rawOrigins = env.CORS_ALLOWED_ORIGINS;
  if (!rawOrigins || !rawOrigins.trim()) {
    return defaultDevOrigins;
  }
  return rawOrigins
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = getAllowedOrigins();

    if (!origin) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin) || env.NODE_ENV === "development") {
      return callback(null, true);
    }

    return callback(new Error(`[CORS] Origem não permitida: ${origin}`));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
};
