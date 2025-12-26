/**
 * Swagger UI Integration
 * Serves OpenAPI documentation at /api-docs
 */

import swaggerUi from "swagger-ui-express";
import YAML from "yamljs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import type { Express } from "express";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Setup Swagger UI for Express app
 * @param app Express application
 */
export function setupSwagger(app: Express): void {
  try {
    // Load swagger.yaml
    const swaggerPath = join(__dirname, "..", "..", "swagger.yaml");
    const swaggerDocument = YAML.load(swaggerPath);

    // Swagger UI options
    const options = {
      customCss: ".swagger-ui .topbar { display: none }",
      customSiteTitle: "Code Cloud Agents API",
    };

    // Mount Swagger UI
    app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument, options));

    console.log("✅ Swagger UI available at /api-docs");
  } catch (error) {
    console.error("❌ Failed to setup Swagger UI:", error);
  }
}
