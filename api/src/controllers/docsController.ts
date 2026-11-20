import type { RequestHandler } from "express";
import { openApiDocument } from "../docs/openapi.js";
import { swaggerUiHtml } from "../docs/swaggerUi.js";

export const getOpenApi: RequestHandler = (_req, res) => {
  res.json(openApiDocument);
};

export const getDocs: RequestHandler = (_req, res) => {
  res.type("html").send(swaggerUiHtml);
};
