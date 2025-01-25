import { swaggerUI } from "@hono/swagger-ui";
import { Hono } from "hono";
import { openAPISpecs } from "hono-openapi";

export function addDocs(app: Hono<{
    Bindings: CloudflareBindings;
}>) {
    app.get(
        '/openapi',
        openAPISpecs(app, {
            documentation: {
                info: { title: 'Hono API', version: '1.0.0', description: 'Greeting API' },
                servers: [{ url: 'https://mobileapi.skibiditoilet.meme', description: 'Production Server' }],
            },
        })
    );
    app.get("/docs", swaggerUI({ url: "/openapi" }))
}