
import { NextResponse } from "next/server";
import { getCurrentAppUser } from "@/lib/server/user-admin";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const auth = await getCurrentAppUser();

    if (!auth.user || !auth.profile || auth.responseStatus !== 200) {
      return NextResponse.json(
        { error: "Unauthorized" },
        {
          status: auth.responseStatus,
          headers: { "Cache-Control": "no-store" },
        }
      );
    }

    return NextResponse.json(
      {
        user: {
          id: auth.user.id,
          email: auth.user.email,
        },
        profile: {
          full_name: auth.profile.full_name,
          role: auth.profile.role,
          is_active: auth.profile.is_active,
        },
      },
      {
        headers: { "Cache-Control": "no-store" },
      }
    );
  } catch (error) {
    console.error("Get current user error:", error);

    return NextResponse.json(
      { error: "Failed to load user profile." },
      { status: 500 }
    );
  }
}
