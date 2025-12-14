import express, { Express, Request, Response, NextFunction } from "express";
import cors from "cors";
import dotenv from "dotenv";
import routes from "./routes";

dotenv.config();

const app: Express = express();

const allowedOrigins = ["https://renard.live", "https://www.renard.live"];

// Allow chrome-extension://<id>
const isChromeExtension = (origin?: string) =>
  origin?.startsWith("chrome-extension://");

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow non-browser requests (curl, server, cron, etc.)
      if (!origin) {
        return callback(null, true);
      }

      // Allow web app
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      // Allow Chrome extensions
      if (isChromeExtension(origin)) {
        return callback(null, true);
      }

      return callback(new Error(`CORS blocked for origin: ${origin}`), false);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", routes);

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error("Error:", err);
  res.status(500).json({
    error: "Internal server error",
    message: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
});

export default app;
