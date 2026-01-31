import { NextRequest, NextResponse } from "next/server";

const FEEDBACK_API_URL = process.env.FEEDBACK_API_URL || "http://127.0.0.1:8000/feedback";

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

export async function POST(request: NextRequest) {
  try {
    // Validate API URL
    if (!isAllowedUrl(FEEDBACK_API_URL)) {
      return NextResponse.json(
        { error: "Invalid API URL configuration" },
        { status: 500 }
      );
    }

    // Get form data
    const formData = await request.formData();
    const audioFile = formData.get("audio") as File;

    if (!audioFile) {
      return NextResponse.json(
        { error: "No audio file provided" },
        { status: 400 }
      );
    }

    // Create new form data for backend
    const backendFormData = new FormData();
    backendFormData.append("audio", audioFile);

    // Forward to backend
    const response = await fetch(FEEDBACK_API_URL, {
      method: "POST",
      body: backendFormData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `Backend error: ${errorText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Feedback API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
