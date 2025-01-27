import { Hono } from "hono";
import { describeRoute } from 'hono-openapi';
import { resolver, validator as vValidator } from 'hono-openapi/zod';
import { z } from "zod"
import { login, signup } from "../auth";

const app = new Hono<{ Bindings: CloudflareBindings }>().post("/login", describeRoute({
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
    }).post("/signup", describeRoute({
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

export default app