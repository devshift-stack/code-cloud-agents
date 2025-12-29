/**
 * Swagger API Documentation
 * Provides interactive API documentation using Swagger UI
 */

import { Router } from "express";
import swaggerUi from "swagger-ui-express";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { readFileSync } from "fs";
import * as yaml from "yaml";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Creates the Swagger documentation router
 * @returns Express router with Swagger UI
 */
export function createSwaggerRouter(): Router {
  const router = Router();

  // Load swagger.yaml
  const swaggerPath = join(__dirname, "../../swagger.yaml");
  const swaggerYaml = readFileSync(swaggerPath, "utf8");
  const swaggerDocument = yaml.parse(swaggerYaml);

  // Swagger UI options
  const swaggerUiOptions = {
    customCss: `
      .swagger-ui .topbar { display: none }
      .swagger-ui .info .title { color: #2563eb }
    `,
    customSiteTitle: "Code Cloud Agents API",
    customfavIcon: "/favicon.ico",
  };

  // Serve Swagger UI
  router.use("/", swaggerUi.serve);
  router.get("/", swaggerUi.setup(swaggerDocument, swaggerUiOptions));

  // Serve raw OpenAPI spec as JSON
  router.get("/openapi.json", (_req, res) => {
    res.json(swaggerDocument);
  });

  // Serve raw OpenAPI spec as YAML
  router.get("/openapi.yaml", (_req, res) => {
    res.type("text/yaml").send(swaggerYaml);
  });

  return router;
}
