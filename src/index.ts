import { Hono } from 'hono'
import { describeRoute } from 'hono-openapi';
import { resolver, validator as vValidator } from 'hono-openapi/zod';
import { addDocs } from './openapi';
import { handleScheduledTask } from './scheduler';
import { z } from "zod"

const app = new Hono<{ Bindings: CloudflareBindings }>()

app.get(
  '/',
  describeRoute({
    description: 'Say hello to the user',
    responses: {
      200: {
        description: 'Successful response',
        content: {
          'text/plain': { schema: resolver(z.string()) },
        },
      },
    },
  }),
  vValidator('query', z.object({
    name: z.string().optional()
  })),
  (c) => {
    const query = c.req.valid('query');
    return c.text(`Hello ${query?.name ?? 'Hono'}!`);
  }
);

export default {
  fetch: addDocs(app).fetch,
  scheduled: handleScheduledTask
}