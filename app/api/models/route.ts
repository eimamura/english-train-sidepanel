import { NextRequest, NextResponse } from "next/server";

const BACKEND_API_URL = process.env.FEEDBACK_API_URL?.replace("/feedback", "") || "http://127.0.0.1:8000";

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
    if (!isAllowedUrl(BACKEND_API_URL)) {
      return NextResponse.json(
        { error: "Invalid API URL configuration" },
        { status: 500 }
      );
    }

    const response = await fetch(`${BACKEND_API_URL}/models`, {
      method: "GET",
      cache: "no-store",
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to fetch models" },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Models API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!isAllowedUrl(BACKEND_API_URL)) {
      return NextResponse.json(
        { error: "Invalid API URL configuration" },
        { status: 500 }
      );
    }

    const body = await request.json();

    const response = await fetch(`${BACKEND_API_URL}/models/change`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        { error: errorData.detail || "Failed to change models" },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Change models API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
