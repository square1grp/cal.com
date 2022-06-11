import type { NextApiRequest } from "next";
import { stringify } from "querystring";

import { WEBAPP_URL } from "@calcom/lib/constants";
import { defaultHandler, defaultResponder } from "@calcom/lib/server";
import prisma from "@calcom/prisma";

import { getZoomAppKeys } from "../lib";

async function handler(req: NextApiRequest) {
  // Get user
  await prisma.user.findFirst({
    rejectOnNotFound: true,
    where: {
      id: req.session?.user?.id,
    },
    select: {
      id: true,
    },
  });

  const { client_id } = await getZoomAppKeys();

  const params = {
    response_type: "code",
    client_id,
    redirect_uri: WEBAPP_URL + "/api/integrations/zoomvideo/callback",
  };
  const query = stringify(params);
  const url = `https://zoom.us/oauth/authorize?${query}`;
  return { url };
}

export default defaultHandler({
  GET: Promise.resolve({ default: defaultResponder(handler) }),
});
