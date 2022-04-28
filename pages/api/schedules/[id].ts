import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@calcom/prisma";

import { withMiddleware } from "@lib/helpers/withMiddleware";
import type { ScheduleResponse } from "@lib/types";
import { schemaScheduleBodyParams, schemaSchedulePublic } from "@lib/validations/schedule";
import {
  schemaQueryIdParseInt,
  withValidQueryIdTransformParseInt,
} from "@lib/validations/shared/queryIdTransformParseInt";

/**
 * @swagger
 * /schedules/{id}:
 *   get:
 *     summary: Find a schedule by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Numeric ID of the schedule to get
 *     tags:
 *     - schedules
 *     responses:
 *       200:
 *         description: OK
 *       401:
 *        description: Authorization information is missing or invalid.
 *       404:
 *         description: Schedule was not found
 *   patch:
 *     summary: Edit an existing schedule
 *     parameters:
 *      - in: path
 *        name: id
 *        schema:
 *          type: integer
 *        required: true
 *        description: Numeric ID of the schedule to edit
 *     tags:
 *     - schedules
 *     responses:
 *       201:
 *         description: OK, schedule edited successfuly
 *       400:
 *        description: Bad request. Schedule body is invalid.
 *       401:
 *        description: Authorization information is missing or invalid.
 *   delete:
 *     summary: Remove an existing schedule
 *     parameters:
 *      - in: path
 *        name: id
 *        schema:
 *          type: integer
 *        required: true
 *        description: Numeric ID of the schedule to delete
 *     tags:
 *     - schedules
 *     responses:
 *       201:
 *         description: OK, schedule removed successfuly
 *       400:
 *        description: Bad request. Schedule id is invalid.
 *       401:
 *        description: Authorization information is missing or invalid.
 */
export async function scheduleById(req: NextApiRequest, res: NextApiResponse<ScheduleResponse>) {
  const { method, query, body } = req;
  const safeQuery = schemaQueryIdParseInt.safeParse(query);
  const safeBody = schemaScheduleBodyParams.safeParse(body);
  if (!safeQuery.success) throw new Error("Invalid request query", safeQuery.error);
  const userId = req.userId;
  const userSchedules = await prisma.schedule.findMany({ where: { userId } });
  const userScheduleIds = userSchedules.map((schedule) => schedule.id);
  if (!userScheduleIds.includes(safeQuery.data.id)) res.status(401).json({ message: "Unauthorized" });
  else {
    switch (method) {
      case "GET":
        await prisma.schedule
          .findUnique({ where: { id: safeQuery.data.id } })
          .then((data) => schemaSchedulePublic.parse(data))
          .then((schedule) => res.status(200).json({ schedule }))
          .catch((error: Error) =>
            res.status(404).json({
              message: `Schedule with id: ${safeQuery.data.id} not found`,
              error,
            })
          );
        break;

      case "PATCH":
        if (!safeBody.success) {
          throw new Error("Invalid request body");
        }
        await prisma.schedule
          .update({ where: { id: safeQuery.data.id }, data: safeBody.data })
          .then((data) => schemaSchedulePublic.parse(data))
          .then((schedule) => res.status(200).json({ schedule }))
          .catch((error: Error) =>
            res.status(404).json({
              message: `Schedule with id: ${safeQuery.data.id} not found`,
              error,
            })
          );
        break;

      case "DELETE":
        // Look for user to check if schedule is user's default
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) throw new Error("User not found");
        if (user.defaultScheduleId === safeQuery.data.id) {
          // unset default
          await prisma.user.update({
            where: {
              id: userId,
            },
            data: {
              defaultScheduleId: undefined,
            },
          });
        }
        await prisma.schedule
          .delete({ where: { id: safeQuery.data.id } })
          .then(() =>
            res.status(200).json({
              message: `Schedule with id: ${safeQuery.data.id} deleted successfully`,
            })
          )
          .catch((error: Error) =>
            res.status(404).json({
              message: `Schedule with id: ${safeQuery.data.id} not found`,
              error,
            })
          );
        break;

      default:
        res.status(405).json({ message: "Method not allowed" });
        break;
    }
  }
}

export default withMiddleware("HTTP_GET_DELETE_PATCH")(withValidQueryIdTransformParseInt(scheduleById));
