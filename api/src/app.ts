import cors from "cors";
import express from "express";
import { env } from "./lib/env.js";
import { errorHandler, notFound } from "./middlewares/errorHandler.js";
import { router } from "./routes/index.js";

export const app = express();

app.use(cors({ origin: env.CORS_ORIGIN.split(",") }));
app.use(express.json());
app.use(router);
app.use(notFound);
app.use(errorHandler);

// Vercel entrypoint: zero-config Express picks up src/app.ts and uses this default export.
export default app;
