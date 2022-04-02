import { NextRequest, NextResponse } from "next/server";

// Not much useful yet as prisma.client can't be used in the middlewares (client is not available)
// For now we just throw early if no apiKey is passed,
// but we could also check if the apiKey is valid if we had prisma here.

export default async function requireApiKeyAsQueryParams({ nextUrl }: NextRequest) {
  const response = NextResponse.next();
  const apiKey = nextUrl.searchParams.get("apiKey");

  if (apiKey) return response;
  // if no apiKey is passed, we throw early a 401 unauthorized asking for a valid apiKey
  else
    new NextResponse(
      JSON.stringify({
        message:
          "You need to pass an apiKey as query param: https://api.cal.com/resource?apiKey=<your-api-key>",
      }),
      { status: 401, statusText: "Unauthorized" }
    );
}
