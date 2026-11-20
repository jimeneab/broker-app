// Hand-written OpenAPI 3.1 document. Every endpoint added to routes/index.ts must be documented here
// (docs/openapi.test.ts fails otherwise).

type Json = string | number | boolean | null | Json[] | { [key: string]: Json };

interface Parameter {
  name: string;
  in: "path" | "query";
  required: boolean;
  description: string;
  schema: Json;
  example?: Json;
}

interface Operation {
  operationId: string;
  summary: string;
  tags: string[];
  security?: Json[];
  parameters?: Parameter[];
  requestBody?: Json;
  responses: Record<string, Json>;
}

interface OpenApiDocument {
  openapi: string;
  info: { title: string; version: string; description: string };
  security: Json[];
  tags: Json[];
  paths: Record<string, Record<string, Operation>>;
  components: {
    securitySchemes: Record<string, Json>;
    schemas: Record<string, Json>;
    responses: Record<string, Json>;
  };
}

const ref = (name: string): Json => ({ $ref: `#/components/schemas/${name}` });
const responseRef = (name: string): Json => ({ $ref: `#/components/responses/${name}` });
const nullableRef = (name: string): Json => ({ oneOf: [ref(name), { type: "null" }] });

function jsonResponse(description: string, schema: Json, example: Json): Json {
  return { description, content: { "application/json": { schema, example } } };
}

function errorResponse(description: string, code: string, message: string): Json {
  return jsonResponse(description, ref("Error"), { error: { code, message } });
}

const nullableNumber: Json = { type: ["number", "null"] };
const nullableString: Json = { type: ["string", "null"] };

const symbolParam: Parameter = {
  name: "symbol",
  in: "path",
  required: true,
  description: "Ticker del simbolo; se normaliza a mayusculas.",
  schema: { type: "string", pattern: "^[A-Za-z]{1,5}(\\.[A-Za-z])?$" },
  example: "AAPL",
};

const profileNotFound = errorResponse("No existe el perfil del usuario", "PROFILE_NOT_FOUND", "Profile not found");
const symbolNotFound = errorResponse("El simbolo no existe", "SYMBOL_NOT_FOUND", "Symbol not found");

const meExample: { [key: string]: Json } = {
  id: "5f0c2b4e-8a1d-4c3e-9b7a-1d2e3f4a5b6c",
  email: "ana@example.com",
  displayName: "Ana",
  riskScore: 15,
  riskProfile: "moderado",
  onboardedAt: "2026-11-18T14:00:00.000Z",
  createdAt: "2026-11-18T12:00:00.000Z",
};

export const openApiDocument: OpenApiDocument = {
  openapi: "3.1.0",
  info: {
    title: "Stock Insights API",
    version: "1.0.0",
    description:
      "API de Stock Insights. Autenticacion con el JWT de Supabase (`Authorization: Bearer <access_token>`). " +
      "Todos los errores tienen la forma `{ error: { code, message } }`. Los datos de mercado (Finnhub y Twelve Data) " +
      "se cachean en Supabase para proteger los limites del plan gratuito.",
  },
  security: [{ bearerAuth: [] }],
  tags: [
    { name: "Health", description: "Estado del API" },
    { name: "Me", description: "Perfil del usuario autenticado" },
    { name: "Stocks", description: "Busqueda, ficha e historico de acciones" },
  ],
  paths: {
    "/health": {
      get: {
        operationId: "getHealth",
        summary: "Comprobar que el API esta en linea",
        tags: ["Health"],
        security: [],
        responses: {
          "200": jsonResponse(
            "El API responde",
            { type: "object", required: ["status"], properties: { status: { type: "string", const: "ok" } } },
            { status: "ok" },
          ),
        },
      },
    },
    "/me": {
      get: {
        operationId: "getMe",
        summary: "Obtener el perfil del usuario autenticado",
        tags: ["Me"],
        responses: {
          "200": jsonResponse("Perfil del usuario", ref("Me"), {
            ...meExample,
            riskScore: null,
            riskProfile: null,
            onboardedAt: null,
          }),
          "401": responseRef("Unauthorized"),
          "404": profileNotFound,
          "500": responseRef("InternalError"),
        },
      },
    },
    "/me/risk-profile": {
      put: {
        operationId: "putRiskProfile",
        summary: "Enviar las respuestas del cuestionario de perfil de riesgo",
        tags: ["Me"],
        requestBody: {
          required: true,
          content: { "application/json": { schema: ref("RiskProfileInput"), example: { answers: [3, 2, 3, 2, 3, 2] } } },
        },
        responses: {
          "200": jsonResponse("Perfil actualizado", ref("Me"), meExample),
          "400": {
            description: "Body invalido",
            content: {
              "application/json": {
                schema: ref("Error"),
                examples: {
                  invalidAnswers: {
                    value: {
                      error: {
                        code: "VALIDATION_ERROR",
                        message: "answers must be an array of 6 integers between 1 and 4",
                      },
                    },
                  },
                  malformedJson: { value: { error: { code: "VALIDATION_ERROR", message: "Malformed JSON body" } } },
                },
              },
            },
          },
          "401": responseRef("Unauthorized"),
          "404": profileNotFound,
          "500": responseRef("InternalError"),
        },
      },
    },
    "/stocks/search": {
      get: {
        operationId: "searchStocks",
        summary: "Buscar acciones y ETFs por nombre o ticker",
        tags: ["Stocks"],
        parameters: [
          {
            name: "q",
            in: "query",
            required: true,
            description: "Texto a buscar (1 a 50 caracteres tras quitar espacios).",
            schema: { type: "string", minLength: 1, maxLength: 50 },
            example: "apple",
          },
        ],
        responses: {
          "200": jsonResponse("Resultados de la busqueda", ref("StockSearchResponse"), {
            query: "apple",
            results: [
              { symbol: "AAPL", name: "APPLE INC", type: "stock" },
              { symbol: "APLE", name: "APPLE HOSPITALITY REIT INC", type: "stock" },
            ],
          }),
          "400": errorResponse("Parametro q invalido", "VALIDATION_ERROR", "q must be 1 to 50 characters"),
          "401": responseRef("Unauthorized"),
          "502": responseRef("ProviderError"),
          "503": responseRef("ProviderRateLimited"),
        },
      },
    },
    "/stocks/{symbol}": {
      get: {
        operationId: "getStock",
        summary: "Obtener la ficha de una accion (cotizacion, perfil y metricas)",
        tags: ["Stocks"],
        parameters: [symbolParam],
        responses: {
          "200": jsonResponse("Ficha de la accion", ref("StockDetail"), {
            symbol: "AAPL",
            quote: {
              symbol: "AAPL",
              price: 189.84,
              change: 2.31,
              changePercent: 1.23,
              high: 190.1,
              low: 186.9,
              open: 187.2,
              previousClose: 187.53,
              timestamp: 1795545600,
            },
            profile: {
              symbol: "AAPL",
              name: "Apple Inc",
              logoUrl: "https://static2.finnhub.io/file/publicdatany/finnhubimage/stock_logo/AAPL.png",
              industry: "Technology",
              country: "US",
              website: "https://www.apple.com/",
              exchange: "NASDAQ NMS - GLOBAL MARKET",
              currency: "USD",
              marketCapMillions: 2950000,
            },
            metrics: {
              peRatio: 29.4,
              beta: 1.24,
              week52High: 199.62,
              week52Low: 164.08,
              dividendYieldPercent: 0.51,
              marketCapMillions: 2950000,
            },
          }),
          "400": errorResponse("Simbolo invalido", "VALIDATION_ERROR", "Invalid symbol"),
          "401": responseRef("Unauthorized"),
          "404": symbolNotFound,
          "502": responseRef("ProviderError"),
          "503": responseRef("ProviderRateLimited"),
        },
      },
    },
    "/stocks/{symbol}/history": {
      get: {
        operationId: "getStockHistory",
        summary: "Obtener el historico de precios de una accion",
        tags: ["Stocks"],
        parameters: [
          symbolParam,
          {
            name: "range",
            in: "query",
            required: true,
            description: "Rango de la grafica. 1M, 6M y 1Y usan velas diarias; 5Y, semanales.",
            schema: { type: "string", enum: ["1M", "6M", "1Y", "5Y"] },
            example: "6M",
          },
        ],
        responses: {
          "200": jsonResponse("Historico de precios", ref("StockHistory"), {
            symbol: "AAPL",
            range: "6M",
            interval: "1day",
            candles: [{ date: "2026-05-19", open: 187.2, high: 190.1, low: 186.9, close: 189.84, volume: 51234000 }],
          }),
          "400": {
            description: "Simbolo o rango invalido",
            content: {
              "application/json": {
                schema: ref("Error"),
                examples: {
                  invalidSymbol: { value: { error: { code: "VALIDATION_ERROR", message: "Invalid symbol" } } },
                  invalidRange: {
                    value: { error: { code: "VALIDATION_ERROR", message: "range must be one of 1M, 6M, 1Y, 5Y" } },
                  },
                },
              },
            },
          },
          "401": responseRef("Unauthorized"),
          "404": symbolNotFound,
          "502": responseRef("ProviderError"),
          "503": responseRef("ProviderRateLimited"),
        },
      },
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "access_token de Supabase Auth (sin el prefijo Bearer).",
      },
    },
    schemas: {
      Error: {
        type: "object",
        required: ["error"],
        properties: {
          error: {
            type: "object",
            required: ["code", "message"],
            properties: { code: { type: "string" }, message: { type: "string" } },
          },
        },
      },
      Me: {
        type: "object",
        required: ["id", "email", "displayName", "riskScore", "riskProfile", "onboardedAt", "createdAt"],
        properties: {
          id: { type: "string", format: "uuid" },
          email: { type: "string", format: "email" },
          displayName: { type: "string" },
          riskScore: { type: ["integer", "null"], minimum: 6, maximum: 24 },
          riskProfile: { type: ["string", "null"], enum: ["conservador", "moderado", "agresivo", null] },
          onboardedAt: { type: ["string", "null"], format: "date-time" },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      RiskProfileInput: {
        type: "object",
        required: ["answers"],
        properties: {
          answers: {
            type: "array",
            minItems: 6,
            maxItems: 6,
            items: { type: "integer", minimum: 1, maximum: 4 },
            description: "answers[i] es la opcion elegida (1-4) en la pregunta i + 1.",
          },
        },
      },
      StockSearchResponse: {
        type: "object",
        required: ["query", "results"],
        properties: {
          query: { type: "string", description: "Consulta normalizada (trim y minusculas)." },
          results: {
            type: "array",
            maxItems: 10,
            items: {
              type: "object",
              required: ["symbol", "name", "type"],
              properties: {
                symbol: { type: "string" },
                name: { type: "string" },
                type: { type: "string", enum: ["stock", "etf"] },
              },
            },
          },
        },
      },
      Quote: {
        type: "object",
        required: ["symbol", "price", "change", "changePercent", "high", "low", "open", "previousClose", "timestamp"],
        properties: {
          symbol: { type: "string" },
          price: { type: "number" },
          change: nullableNumber,
          changePercent: { type: ["number", "null"], description: "En puntos porcentuales (1.23 = 1.23 %)." },
          high: { type: "number" },
          low: { type: "number" },
          open: { type: "number" },
          previousClose: { type: "number" },
          timestamp: { type: "integer", description: "Unix en segundos." },
        },
      },
      CompanyProfile: {
        type: "object",
        required: [
          "symbol",
          "name",
          "logoUrl",
          "industry",
          "country",
          "website",
          "exchange",
          "currency",
          "marketCapMillions",
        ],
        properties: {
          symbol: { type: "string" },
          name: { type: "string" },
          logoUrl: nullableString,
          industry: nullableString,
          country: nullableString,
          website: nullableString,
          exchange: nullableString,
          currency: nullableString,
          marketCapMillions: { type: ["number", "null"], description: "Millones de USD." },
        },
      },
      CompanyMetrics: {
        type: "object",
        required: ["peRatio", "beta", "week52High", "week52Low", "dividendYieldPercent", "marketCapMillions"],
        properties: {
          peRatio: nullableNumber,
          beta: nullableNumber,
          week52High: nullableNumber,
          week52Low: nullableNumber,
          dividendYieldPercent: { type: ["number", "null"], description: "En puntos porcentuales." },
          marketCapMillions: { type: ["number", "null"], description: "Millones de USD." },
        },
      },
      StockDetail: {
        type: "object",
        required: ["symbol", "quote", "profile", "metrics"],
        properties: {
          symbol: { type: "string" },
          quote: ref("Quote"),
          profile: nullableRef("CompanyProfile"),
          metrics: nullableRef("CompanyMetrics"),
        },
      },
      Candle: {
        type: "object",
        required: ["date", "open", "high", "low", "close", "volume"],
        properties: {
          date: { type: "string", format: "date", description: "YYYY-MM-DD" },
          open: { type: "number" },
          high: { type: "number" },
          low: { type: "number" },
          close: { type: "number" },
          volume: nullableNumber,
        },
      },
      StockHistory: {
        type: "object",
        required: ["symbol", "range", "interval", "candles"],
        properties: {
          symbol: { type: "string" },
          range: { type: "string", enum: ["1M", "6M", "1Y", "5Y"] },
          interval: { type: "string", enum: ["1day", "1week"] },
          candles: { type: "array", items: ref("Candle"), description: "En orden ascendente de fecha." },
        },
      },
    },
    responses: {
      ValidationError: errorResponse("Parametros o body invalidos", "VALIDATION_ERROR", "Invalid symbol"),
      Unauthorized: errorResponse("Falta el token o es invalido", "UNAUTHORIZED", "Missing bearer token"),
      ProviderError: errorResponse("Fallo el proveedor de datos de mercado", "PROVIDER_ERROR", "Market data provider error"),
      ProviderRateLimited: errorResponse(
        "Se alcanzo el limite del proveedor de datos de mercado",
        "PROVIDER_RATE_LIMITED",
        "Market data provider rate limit reached, try again in a minute",
      ),
      InternalError: errorResponse("Error inesperado", "INTERNAL_ERROR", "Unexpected error"),
    },
  },
};
