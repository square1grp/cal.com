import type { NextApiRequest } from "next";
import { z } from "zod";

import { getUserAvailability } from "@calcom/core/getUserAvailability";
import { HttpError } from "@calcom/lib/http-error";
import { defaultResponder } from "@calcom/lib/server";
import { availabilityUserSelect } from "@calcom/prisma";
import { stringOrNumber } from "@calcom/prisma/zod-utils";

const availabilitySchema = z
  .object({
    userId: stringOrNumber.optional(),
    teamId: stringOrNumber.optional(),
    username: z.string().optional(),
    dateFrom: z.string(),
    dateTo: z.string(),
    eventTypeId: stringOrNumber.optional(),
  })
  .refine(
    (data) => !!data.username || !!data.userId || !!data.teamId,
    "Either username or userId or teamId should be filled in."
  );

async function handler(req: NextApiRequest) {
  const { prisma, isAdmin } = req;
  const { username, userId, eventTypeId, dateTo, dateFrom, teamId } = availabilitySchema.parse(req.query);
  if (!teamId)
    return getUserAvailability({
      username,
      dateFrom,
      dateTo,
      eventTypeId,
      userId,
    });
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    select: { members: true },
  });
  if (!team) throw new HttpError({ statusCode: 404, message: "teamId not found" });
  if (!team.members) throw new HttpError({ statusCode: 404, message: "team has no members" });
  const allMemberIds = team.members.map((membership) => membership.userId);
  const members = await prisma.user.findMany({
    where: { id: { in: allMemberIds } },
    select: availabilityUserSelect,
  });
  if (!isAdmin) throw new HttpError({ statusCode: 403, message: "Forbidden" });
  const availabilities = members.map(async (user) => {
    return {
      userId: user.id,
      availability: await getUserAvailability(
        {
          userId: user.id,
          dateFrom,
          dateTo,
          eventTypeId,
        },
        { user }
      ),
    };
  });
  const settled = await Promise.all(availabilities);
  if (!settled)
    throw new HttpError({
      statusCode: 401,
      message: "We had an issue retrieving all your members availabilities",
    });
  return settled;
}

export default defaultResponder(handler);
