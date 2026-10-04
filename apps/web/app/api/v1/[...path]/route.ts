import { NextRequest, NextResponse } from "next/server";

const backend = process.env.API_INTERNAL_URL ?? "http://127.0.0.1:8000";

async function forward(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  const destination = new URL(`${backend}/api/v1/${path.map(encodeURIComponent).join("/")}`);
  destination.search = request.nextUrl.search;
  try {
    const response = await fetch(destination, {
      method: request.method,
      headers: { "Content-Type": request.headers.get("Content-Type") ?? "application/json" },
      body: request.method === "GET" ? undefined : await request.text(),
      cache: "no-store",
      signal: AbortSignal.timeout(20000),
    });
    return new NextResponse(await response.text(), {
      status: response.status,
      headers: { "Content-Type": response.headers.get("Content-Type") ?? "application/json" },
    });
  } catch {
    return NextResponse.json({ detail: "InvestiNator API unavailable" }, { status: 503 });
  }
}

export const GET = forward;
export const POST = forward;
