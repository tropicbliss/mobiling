import { z } from "zod"

export const querySchema = z.object({
    name: z.string().optional()
})

export const responseSchema = z.string()