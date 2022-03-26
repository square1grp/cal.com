import { withValidation } from "next-validations";
import { z } from "zod";

const schemaApiKey = z
  .object({
    expiresAt:  z.date().optional(), // default is 30 days
    note: z.string().min(1).optional(),
  })
  .strict(); // Adding strict so that we can disallow passing in extra fields
const withValidApiKey = withValidation({
  schema: schemaApiKey,
  type: "Zod",
  mode: "body",
});

export { schemaApiKey, withValidApiKey };
