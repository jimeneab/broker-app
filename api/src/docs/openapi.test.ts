import { describe, expect, it } from "vitest";
import { router } from "../routes/index.js";
import { openApiDocument } from "./openapi.js";

const UNDOCUMENTED = new Set(["/openapi.json", "/docs"]);

// Express 5 (router@2): route layers expose route.path; each handler layer in route.stack carries its method.
function routerOperations(): string[] {
  return router.stack.flatMap((layer) => {
    const route = layer.route;
    if (!route || UNDOCUMENTED.has(route.path)) return [];
    const path = route.path.replace(/:(\w+)/g, "{$1}");
    return [...new Set(route.stack.map((handler) => handler.method))].map((method) => `${method} ${path}`);
  });
}

function documentOperations(): string[] {
  return Object.entries(openApiDocument.paths).flatMap(([path, operations]) =>
    Object.keys(operations).map((method) => `${method} ${path}`),
  );
}

function collectRefs(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(collectRefs);
  if (value === null || typeof value !== "object") return [];
  return Object.entries(value).flatMap(([key, child]) =>
    key === "$ref" && typeof child === "string" ? [child] : collectRefs(child),
  );
}

describe("openApiDocument", () => {
  it("documents exactly the routes registered in the router", () => {
    const routes = routerOperations();
    expect(routes.length).toBeGreaterThan(0);
    expect(documentOperations().sort()).toEqual(routes.sort());
  });

  it("is OpenAPI 3.1 with a global bearer JWT scheme", () => {
    expect(openApiDocument.openapi).toMatch(/^3\.1/);
    expect(openApiDocument.security).toEqual([{ bearerAuth: [] }]);
    expect(openApiDocument.components.securitySchemes.bearerAuth).toMatchObject({
      type: "http",
      scheme: "bearer",
      bearerFormat: "JWT",
    });
  });

  it("leaves /health public and documents 401 on every other operation", () => {
    for (const [path, operations] of Object.entries(openApiDocument.paths)) {
      for (const [method, operation] of Object.entries(operations)) {
        if (path === "/health") {
          expect(operation.security, `${method} ${path}`).toEqual([]);
        } else {
          expect(operation.responses, `${method} ${path}`).toHaveProperty("401");
        }
      }
    }
  });

  it("declares every {param} of a path as an in: path parameter", () => {
    for (const [path, operations] of Object.entries(openApiDocument.paths)) {
      const pathParams = [...path.matchAll(/\{(\w+)\}/g)].map((match) => match[1]);
      for (const [method, operation] of Object.entries(operations)) {
        const declared = (operation.parameters ?? []).filter((p) => p.in === "path").map((p) => p.name);
        expect(declared.sort(), `${method} ${path}`).toEqual(pathParams.sort());
      }
    }
  });

  it("only uses $refs that point to existing components", () => {
    const refs = collectRefs(openApiDocument);
    expect(refs.length).toBeGreaterThan(0);
    for (const ref of refs) {
      const [, section, name] = ref.match(/^#\/components\/(schemas|responses)\/(\w+)$/) ?? [];
      expect(section, ref).toBeDefined();
      const components: Record<string, unknown> =
        section === "schemas" ? openApiDocument.components.schemas : openApiDocument.components.responses;
      expect(components, ref).toHaveProperty(name);
    }
  });

  it("gives each operation a unique operationId and a tag", () => {
    const operations = Object.values(openApiDocument.paths).flatMap((ops) => Object.values(ops));
    const ids = operations.map((operation) => operation.operationId);
    expect(new Set(ids).size).toBe(ids.length);
    for (const operation of operations) expect(operation.tags.length).toBeGreaterThan(0);
  });
});
