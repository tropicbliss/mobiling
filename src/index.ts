import { Hono } from 'hono';
import authMiddleware from './handlers/authMiddleware';
import { addDocs } from './openapi';
import { handleScheduledTask } from './scheduler';
import auth from './handlers/auth';
import user from './handlers/user';

const app = new Hono<{ Bindings: CloudflareBindings }>()
app.route("/auth", auth)
app.use(authMiddleware)
app.route("/user", user)

export default {
  fetch: addDocs(app).fetch,
  scheduled: handleScheduledTask
}