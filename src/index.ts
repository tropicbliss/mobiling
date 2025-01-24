import { Hono } from 'hono'

const app = new Hono<{ Bindings: CloudflareBindings }>()

app.get('/', (c) => {
  return c.text('Hello Hono!')
})

interface Env { }

export default {
  fetch: app.fetch,
  async scheduled() {
    console.log("hi!")
  },
}