import { NextResponse } from "next/server";

const HEALTH_API_URL = process.env.HEALTH_API_URL || "http://127.0.0.1:8000/health";

/**
 * SSRF protection: Only allow localhost URLs
 */
function isAllowedUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      parsed.hostname === "localhost" ||
      parsed.hostname === "127.0.0.1" ||
      parsed.hostname === "::1"
    );
  } catch {
    return false;
  }
}

export async function GET() {
  try {
    // Validate API URL
    if (!isAllowedUrl(HEALTH_API_URL)) {
      return NextResponse.json(
        { status: "error", error: "Invalid API URL configuration" },
        { status: 500 }
      );
    }

    const response = await fetch(HEALTH_API_URL, {
      method: "GET",
      cache: "no-store",
    });

    if (!response.ok) {
      return NextResponse.json(
        { status: "error", error: "Backend not responding" },
        { status: 503 }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 503 }
    );
  }
}
