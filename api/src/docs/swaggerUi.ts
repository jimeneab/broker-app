// Pinned version + SRI: users paste their JWT on this page, so a tampered CDN file must not load.
const SWAGGER_UI = "https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.17.14";

export const swaggerUiHtml = `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Stock Insights API · Docs</title>
    <link
      rel="stylesheet"
      href="${SWAGGER_UI}/swagger-ui.css"
      integrity="sha384-wxLW6kwyHktdDGr6Pv1zgm/VGJh99lfUbzSn6HNHBENZlCN7W602k9VkGdxuFvPn"
      crossorigin="anonymous"
    />
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script
      src="${SWAGGER_UI}/swagger-ui-bundle.js"
      integrity="sha384-wmyclcVGX/WhUkdkATwhaK1X1JtiNrr2EoYJ+diV3vj4v6OC5yCeSu+yW13SYJep"
      crossorigin="anonymous"
    ></script>
    <script>
      window.ui = SwaggerUIBundle({ url: "/openapi.json", dom_id: "#swagger-ui" });
    </script>
  </body>
</html>
`;
