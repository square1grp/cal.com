import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@calcom/prisma";

import { withMiddleware } from "@lib/helpers/withMiddleware";
import type { UserResponse } from "@lib/types";
import { schemaUserBodyParams, schemaUserPublic, withValidUser } from "@lib/validations/user";

/**
 * @swagger
 * /api/users/new:
 *   post:
 *     summary: Creates a new user
 *   requestBody:
        description: Optional description in *Markdown*
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/User'
 *     tags:
 *     - users
 *     responses:
 *       201:
 *         description: OK, user created
 *         model: User
 *       400:
 *        description: Bad request. User body is invalid.
 *       401:
 *        description: Authorization information is missing or invalid.
 */
async function createUser(req: NextApiRequest, res: NextApiResponse<UserResponse>) {
  const safe = schemaUserBodyParams.safeParse(req.body);
  if (!safe.success) throw new Error("Invalid request body", safe.error);

  const user = await prisma.user.create({ data: safe.data });
  const data = schemaUserPublic.parse(user);

  if (data) res.status(201).json({ data, message: "User created successfully" });
  else
    (error: Error) =>
      res.status(400).json({
        message: "Could not create new user",
        error,
      });
}

export default withMiddleware("HTTP_POST")(withValidUser(createUser));
