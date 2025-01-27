import { bearerAuth } from "hono/bearer-auth"
import { validateSessionToken } from "../auth"

export default bearerAuth({
    verifyToken: async (token, c) => {
        const { session, user } = await validateSessionToken(c.env.DB, token)
        if (session === null) {
            return false
        }
        c.set("user", user)
        c.set("session", session)
        return true
    }
})