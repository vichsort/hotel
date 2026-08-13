import type { CorsOptions } from "cors";
import { env } from "@/config/env.js";

const defaultDevOrigins = [
  "http://localhost:3000",
  "http://localhost:4200",
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:8080",
];

function getAllowedOrigins(): string[] {
  const rawOrigins = env.CORS_ALLOWED_ORIGINS;
  if (!rawOrigins || !rawOrigins.trim()) {
    return defaultDevOrigins;
  }
  // Remove aspas externas se fornecidas pelo Raw Editor do Railway
  const cleanRaw = rawOrigins.replace(/^["']|["']$/g, '');
  return cleanRaw
    .split(",")
    .map((origin) => origin.trim().replace(/\/+$/, ''))
    .filter(Boolean);
}

export const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = getAllowedOrigins();

    if (!origin) {
      return callback(null, true);
    }

    const cleanOrigin = origin.replace(/\/+$/, '');

    if (allowedOrigins.includes(cleanOrigin) || env.NODE_ENV === "development") {
      return callback(null, true);
    }

    return callback(new Error(`[CORS] Origem não permitida: ${origin}`));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
};
