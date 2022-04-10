import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@calcom/prisma";

import { withMiddleware } from "@lib/helpers/withMiddleware";
import type { BookingReferenceResponse } from "@lib/types";
import {
  schemaBookingReferenceBodyParams,
  schemaBookingReferencePublic,
} from "@lib/validations/booking-reference";
import {
  schemaQueryIdParseInt,
  withValidQueryIdTransformParseInt,
} from "@lib/validations/shared/queryIdTransformParseInt";

/**
 * @swagger
 * /api/booking-references/{id}:
 *   get:
 *     summary: Get a daily event reference by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Numeric ID of the daily event reference to get
 *     tags:
 *     - booking-references
 *     responses:
 *       200:
 *         description: OK
 *       401:
 *        description: Authorization information is missing or invalid.
 *       404:
 *         description: BookingReference was not found
 *   patch:
 *     summary: Edit an existing daily event reference
 *     consumes:
 *       - application/json
 *     parameters:
 *      - in: body
 *        name: bookingReference
 *        description: The bookingReference to edit
 *        schema:
 *         type: object
 *         $ref: '#/components/schemas/BookingReference'
 *        required: true
 *      - in: path
 *        name: id
 *        schema:
 *          type: integer
 *        required: true
 *        description: Numeric ID of the daily event reference to edit
 *     tags:
 *     - booking-references
 *     responses:
 *       201:
 *         description: OK, bookingReference edited successfuly
 *         model: BookingReference
 *       400:
 *        description: Bad request. BookingReference body is invalid.
 *       401:
 *        description: Authorization information is missing or invalid.
 *   delete:
 *     summary: Remove an existing daily event reference
 *     parameters:
 *      - in: path
 *        name: id
 *        schema:
 *          type: integer
 *        required: true
 *        description: Numeric ID of the daily event reference to delete
 *     tags:
 *     - booking-references
 *     responses:
 *       201:
 *         description: OK, bookingReference removed successfuly
 *         model: BookingReference
 *       400:
 *        description: Bad request. BookingReference id is invalid.
 *       401:
 *        description: Authorization information is missing or invalid.
 */
export async function bookingReferenceById(
  req: NextApiRequest,
  res: NextApiResponse<BookingReferenceResponse>
) {
  const { method, query, body } = req;
  const safeQuery = schemaQueryIdParseInt.safeParse(query);
  const safeBody = schemaBookingReferenceBodyParams.safeParse(body);
  if (!safeQuery.success) throw new Error("Invalid request query", safeQuery.error);

  switch (method) {
    case "GET":
      await prisma.bookingReference
        .findUnique({ where: { id: safeQuery.data.id } })
        .then((data) => schemaBookingReferencePublic.parse(data))
        .then((data) => res.status(200).json({ data }))
        .catch((error: Error) =>
          res.status(404).json({ message: `BookingReference with id: ${safeQuery.data.id} not found`, error })
        );
      break;

    case "PATCH":
      if (!safeBody.success) throw new Error("Invalid request body");
      await prisma.bookingReference
        .update({
          where: { id: safeQuery.data.id },
          data: safeBody.data,
        })
        .then((bookingReference) => schemaBookingReferencePublic.parse(bookingReference))
        .then((data) => res.status(200).json({ data }))
        .catch((error: Error) =>
          res.status(404).json({ message: `BookingReference with id: ${safeQuery.data.id} not found`, error })
        );
      break;

    case "DELETE":
      await prisma.bookingReference
        .delete({ where: { id: safeQuery.data.id } })
        .then(() =>
          res.status(200).json({ message: `BookingReference with id: ${safeQuery.data.id} deleted` })
        )
        .catch((error: Error) =>
          res.status(404).json({ message: `BookingReference with id: ${safeQuery.data.id} not found`, error })
        );
      break;

    default:
      res.status(405).json({ message: "Method not allowed" });
      break;
  }
}

export default withMiddleware("HTTP_GET_DELETE_PATCH")(
  withValidQueryIdTransformParseInt(bookingReferenceById)
);
