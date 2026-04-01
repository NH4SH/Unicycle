import { NextResponse } from "next/server";

import { submitVerifiedSellerApplication } from "@/lib/verified-sellers";
import { verifiedSellerApplicationSchema } from "@/lib/validators";

export async function POST(request: Request) {
  const payload = await request.json();
  const parsed = verifiedSellerApplicationSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      {
        message: "Invalid verified shop application.",
        errors: parsed.error.flatten()
      },
      { status: 400 }
    );
  }

  try {
    const result = await submitVerifiedSellerApplication(parsed.data);

    if (result.kind === "already_approved") {
      return NextResponse.json(
        {
          message: "This shop is already approved on HoosFinds. Use forgot password if you need access."
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        message:
          result.kind === "resubmitted"
            ? "Your Verified Shop application is back with the HoosFinds team for review."
            : "Your Verified Shop application is in. We'll review it and reach out once it's ready."
      },
      { status: 201 }
    );
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[verified-seller-applications]", error);
    }

    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : "Could not submit your application right now."
      },
      { status: 500 }
    );
  }
}
