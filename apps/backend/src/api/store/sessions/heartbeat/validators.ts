import { z } from "zod"

export const SessionHeartbeatRequestSchema = z
  .object({
    session_id: z.string().uuid(),
    path: z.string().trim().min(1).max(512).optional(),
    referrer: z.string().trim().min(1).max(512).optional(),
  })
  .strict()

export type SessionHeartbeatRequest = z.infer<typeof SessionHeartbeatRequestSchema>
