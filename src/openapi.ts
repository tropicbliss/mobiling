import { swaggerUI } from "@hono/swagger-ui";
import { Hono } from "hono";
import { openAPISpecs } from "hono-openapi";

export function addDocs(app: Hono<{
    Bindings: CloudflareBindings;
}>) {
    app.get(
        '/docs/openapi',
        openAPISpecs(app, {
            documentation: {
                info: { title: 'Mobile API' },
                servers: [{ url: 'https://mobileapi.skibiditoilet.meme', description: 'Production Server' }],
            },
        })
    );
    app.get("/docs", swaggerUI({ url: "/docs/openapi" }))
    return app
}