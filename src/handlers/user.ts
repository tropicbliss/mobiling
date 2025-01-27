import { Hono } from "hono";
import { describeRoute } from "hono-openapi";
import { resolver, validator as vValidator } from 'hono-openapi/zod';
import { z } from "zod"
import { updatePassword, updateProfile } from "../auth";

const app = new Hono<{ Bindings: CloudflareBindings }>().post("/updatepassword", describeRoute({
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
    }).post(
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

export default app