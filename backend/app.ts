import express, { Express, Request, Response, NextFunction } from "express";
import cors from "cors";
import dotenv from "dotenv";
import routes from "./routes";
import passport from "passport";
import "./config/passport";
import connectDB from "./config/mongoConn";
import paymentRoutes from "./routes/payments"; // Import payment routes separately

dotenv.config();

const app: Express = express();

const allowedOrigins = [
  "https://renard.live",
  "https://www.renard.live",
  "http://localhost:5173",
];

// Allow chrome-extension://<id>
const isChromeExtension = (origin?: string) =>
  origin?.startsWith("chrome-extension://");

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      if (isChromeExtension(origin)) {
        return callback(null, true);
      }

      return callback(new Error(`CORS blocked for origin: ${origin}`), false);
    },
    credentials: false,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  })
);

// CRITICAL: Register webhook route BEFORE express.json()
// This allows us to get the raw body for signature verification
app.use(
  "/api/payment/webhook",
  express.raw({ type: "application/json" }),
  paymentRoutes
);

// Now register standard JSON parsing for all other routes
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(passport.initialize());
connectDB();

// Register all other routes
app.use("/api", routes);

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error("Error:", err);
  res.status(500).json({
    error: "Internal server error",
    message: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
});

export default app;
