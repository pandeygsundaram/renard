import express, { Express, Request, Response, NextFunction } from "express";
import cors from "cors";
import dotenv from "dotenv";
import routes from "./routes";

dotenv.config();

const app: Express = express();

/* ======================
   CORS CONFIG
====================== */

const allowedWebOrigins = new Set([
  "https://renard.live",
  "https://www.renard.live",
  "http://localhost:5173",
]);

function corsOrigin(origin: string | undefined, callback: Function) {
  // Allow server-to-server, curl, cron, CLI, etc.
  if (!origin) {
    return callback(null, true);
  }

  // Allow Chrome extensions
  if (origin.startsWith("chrome-extension://")) {
    return callback(null, origin);
  }

  // Allow known web origins
  if (allowedWebOrigins.has(origin)) {
    return callback(null, origin);
  }

  console.warn("[CORS] Blocked origin:", origin);
  return callback(null, false); // ❗ DO NOT throw
}

app.use(
  cors({
    origin: corsOrigin,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: false, // ✅ IMPORTANT (you don’t need cookies)
    maxAge: 86400,
  })
);

// MUST exist for preflight
app.options("*", cors());

/* ======================
   BODY PARSERS
====================== */

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* ======================
   ROUTES
====================== */

app.use("/api", routes);

/* ======================
   ERROR HANDLER
====================== */

app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  console.error("[Server Error]", err);

  res.status(500).json({
    error: "Internal server error",
    message: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
});

export default app;
