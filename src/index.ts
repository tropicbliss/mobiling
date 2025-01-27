import { Hono } from 'hono'
import { describeRoute } from 'hono-openapi';
import { resolver, validator as vValidator } from 'hono-openapi/zod';
import { addDocs } from './openapi';
import { handleScheduledTask } from './scheduler';
import { z } from "zod"
import { auth, login, signup, updatePassword, updateProfile } from './auth';

const app = new Hono<{ Bindings: CloudflareBindings }>()

app.post("/login", describeRoute({
  description: 'Log in to the system',
  responses: {
    200: {
      description: 'Successful response',
      content: {
        'application/json': {
          schema: resolver(z.object({
            token: z.string(),
            userId: z.number(),
            email: z.string().email(),
            name: z.string()
          }))
        },
      },
    },
    401: {
      description: 'Failed to login',
      content: {
        'application/json': {
          schema: resolver(z.object({
            error: z.string()
          }))
        },
      },
    },
  },
}),
  vValidator('json', z.object({
    email: z.string().email(),
    password: z.string().min(1)
  })), async (c) => {
    const { email, password } = c.req.valid("json")
    const result = await login(c.env.DB, email, password)
    if (result.error) {
      return c.json({ error: result.data })
    }
    const { session, user } = result.data
    return c.json({
      token: session.id,
      userId: user.id,
      email: user.email,
      name: user.name
    })
  })

app.post("/signup", describeRoute({
  description: 'Sign up a user',
  responses: {
    200: {
      description: 'User successfully created',
      content: {
        'application/json': {
          schema: resolver(z.object({
            token: z.string(),
            userId: z.number(),
            email: z.string().email(),
            name: z.string()
          }))
        },
      },
    },
    400: {
      description: 'Failed to sign up',
      content: {
        'application/json': {
          schema: resolver(z.object({
            error: z.string()
          }))
        },
      },
    },
  },
}),
  vValidator('json', z.object({
    email: z.string().email(),
    name: z.string().min(1),
    password: z.string().min(1)
  })), async (c) => {
    const { email, name, password } = c.req.valid("json")
    const result = await signup(c.env.DB, email, name, password)
    if (result.error) {
      return c.json({ error: result.data })
    }
    const { session, user } = result.data
    return c.json({
      token: session.id,
      userId: user.id,
      email: user.email,
      name: user.name
    })
  })

app.use(auth)

app.post("/updatepassword", describeRoute({
  description: 'Update password',
  responses: {
    200: {
      description: 'Password successfully updated',
    },
    400: {
      description: 'Failed to update password',
      content: {
        'application/json': {
          schema: resolver(z.object({
            error: z.string()
          }))
        },
      },
    },
  },
}),
  vValidator('json', z.object({
    userId: z.number(),
    oldPassword: z.string().min(1),
    newPassword: z.string().min(1)
  })), async (c) => {
    const { userId, oldPassword, newPassword } = c.req.valid("json")
    const result = await updatePassword(c.env.DB, userId, oldPassword, newPassword)
    if (result.error) {
      return c.json({ error: result.data })
    }
  })

app.post(
  '/updateprofile',
  describeRoute({
    description: 'Update user profile data',
    responses: {
      200: {
        description: 'Successfully updated user profile',
      },
      400: {
        description: 'Failed to update user profile',
        content: {
          'application/json': {
            schema: resolver(z.object({
              error: z.string()
            }))
          },
        },
      },
    },
  }),
  vValidator('json', z.object({
    userId: z.number(),
    name: z.string().min(1).optional(),
    email: z.string().email().optional()
  })),
  async (c) => {
    const { userId, name, email } = c.req.valid('json');
    await updateProfile(c.env.DB, userId, name, email)
  }
);

export default {
  fetch: addDocs(app).fetch,
  scheduled: handleScheduledTask
}