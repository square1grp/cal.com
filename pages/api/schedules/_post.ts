import type { Prisma } from "@prisma/client";
import type { NextApiRequest } from "next";

import { DEFAULT_SCHEDULE, getAvailabilityFromSchedule } from "@calcom/lib/availability";
import { HttpError } from "@calcom/lib/http-error";
import { defaultResponder } from "@calcom/lib/server";

import { schemaCreateScheduleBodyParams, schemaSchedulePublic } from "@lib/validations/schedule";

/**
 * @swagger
 * /schedules:
 *   post:
 *     operationId: addSchedule
 *     summary: Creates a new schedule
 *     tags:
 *     - schedules
 *     responses:
 *       201:
 *         description: OK, schedule created
 *       400:
 *        description: Bad request. Schedule body is invalid.
 *       401:
 *        description: Authorization information is missing or invalid.
 */
async function postHandler(req: NextApiRequest) {
  const { userId, isAdmin, prisma } = req;
  const body = schemaCreateScheduleBodyParams.parse(req.body);
  let args: Prisma.ScheduleCreateArgs = { data: { ...body, userId } };

  /* If ADMIN we create the schedule for selected user */
  if (isAdmin && body.userId) args = { data: { ...body, userId: body.userId } };

  if (!isAdmin && body.userId)
    throw new HttpError({ statusCode: 403, message: "ADMIN required for `userId`" });

  // We create default availabilities for the schedule
  args.data.availability = {
    createMany: {
      data: getAvailabilityFromSchedule(DEFAULT_SCHEDULE).map((schedule) => ({
        days: schedule.days,
        startTime: schedule.startTime,
        endTime: schedule.endTime,
      })),
    },
  };
  // We include the recently created availability
  args.include = { availability: true };

  const data = await prisma.schedule.create(args);

  return {
    schedule: schemaSchedulePublic.parse(data),
    message: "Schedule created successfully",
  };
}

export default defaultResponder(postHandler);
