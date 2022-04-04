import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@calcom/prisma";

import { withMiddleware } from "@lib/helpers/withMiddleware";
import type { MembershipResponse } from "@lib/types";
import { schemaMembershipBodyParams, schemaMembershipPublic } from "@lib/validations/membership";
import { schemaQueryIdAsString, withValidQueryIdString } from "@lib/validations/shared/queryIdString";

/**
 * @swagger
 * /api/memberships/{userId}_{teamId}:
 *   get:
 *     summary: Get a membership by userID and teamID
 *     parameters:
 *      - in: path
 *        name: userId
 *        schema:
 *          type: integer
 *        required: true
 *        description: Numeric userId of the membership to get
 *      - in: path
 *        name: teamId
 *        schema:
 *          type: integer
 *        required: true
 *        description: Numeric teamId of the membership to get
 *     tags:
 *     - memberships
 *     responses:
 *       200:
 *         description: OK
 *       401:
 *        description: Authorization information is missing or invalid.
 *       404:
 *         description: Membership was not found
 *   patch:
 *     summary: Edit an existing membership
 *     consumes:
 *       - application/json
 *     parameters:
 *      - in: body
 *        name: membership
 *        description: The membership to edit
 *        schema:
 *         type: object
 *         $ref: '#/components/schemas/Membership'
 *        required: true
 *      - in: path
 *        name: userId
 *        schema:
 *          type: integer
 *        required: true
 *        description: Numeric userId of the membership to get
 *      - in: path
 *        name: teamId
 *        schema:
 *          type: integer
 *        required: true
 *        description: Numeric teamId of the membership to get
 *     tags:
 *     - memberships
 *     responses:
 *       201:
 *         description: OK, membership edited successfuly
 *         model: Membership
 *       400:
 *        description: Bad request. Membership body is invalid.
 *       401:
 *        description: Authorization information is missing or invalid.
 *   delete:
 *     summary: Remove an existing membership
 *     parameters:
 *      - in: path
 *        name: userId
 *        schema:
 *          type: integer
 *        required: true
 *        description: Numeric userId of the membership to get
 *      - in: path
 *        name: teamId
 *        schema:
 *          type: integer
 *        required: true
 *        description: Numeric teamId of the membership to get
 *     tags:
 *     - memberships
 *     responses:
 *       201:
 *         description: OK, membership removed successfuly
 *         model: Membership
 *       400:
 *        description: Bad request. Membership id is invalid.
 *       401:
 *        description: Authorization information is missing or invalid.
 */
export async function membershipById(req: NextApiRequest, res: NextApiResponse<MembershipResponse>) {
  const { method, query, body } = req;
  const safeQuery = await schemaQueryIdAsString.safeParse(query);
  const safeBody = await schemaMembershipBodyParams.safeParse(body);
  if (!safeQuery.success) throw new Error("Invalid request query", safeQuery.error);
  // This is how we set the userId and teamId in the query for managing compoundId.
  const [userId, teamId] = safeQuery.data.id.split("_");

  switch (method) {
    case "GET":
      await prisma.membership
        .findUnique({ where: { userId_teamId: { userId: parseInt(userId), teamId: parseInt(teamId) } } })
        .then((membership) => schemaMembershipPublic.parse(membership))
        .then((data) => res.status(200).json({ data }))
        .catch((error: Error) =>
          res.status(404).json({ message: `Membership with id: ${safeQuery.data.id} not found`, error })
        );
      break;

    case "PATCH":
      if (!safeBody.success) throw new Error("Invalid request body");
      await prisma.membership
        .update({
          where: { userId_teamId: { userId: parseInt(userId), teamId: parseInt(teamId) } },
          data: safeBody.data,
        })
        .then((membership) => schemaMembershipPublic.parse(membership))
        .then((data) => res.status(200).json({ data }))
        .catch((error: Error) =>
          res.status(404).json({ message: `Membership with id: ${safeQuery.data.id} not found`, error })
        );
      break;

    case "DELETE":
      await prisma.membership
        .delete({ where: { userId_teamId: { userId: parseInt(userId), teamId: parseInt(teamId) } } })
        .then(() =>
          res.status(200).json({ message: `Membership with id: ${safeQuery.data.id} deleted successfully` })
        )
        .catch((error: Error) =>
          res.status(404).json({ message: `Membership with id: ${safeQuery.data.id} not found`, error })
        );
      break;

    default:
      res.status(405).json({ message: "Method not allowed" });
      break;
  }
}

export default withMiddleware("HTTP_GET_DELETE_PATCH")(withValidQueryIdString(membershipById));
