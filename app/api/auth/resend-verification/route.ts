import { NextResponse } from "next/server";

import { sendVerificationEmail } from "@/lib/auth-email";
import { createEmailVerificationToken } from "@/lib/auth-tokens";
import { findUserByNormalizedEmail } from "@/lib/auth-users";
import { normalizeEmail } from "@/lib/domain";
import { resendVerificationSchema } from "@/lib/validators";

const genericMessage = "If there's an unverified HoosFinds account for that email, we sent a new verification link.";

export async function POST(request: Request) {
  const payload = await request.json();
  const parsed = resendVerificationSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid email address.", errors: parsed.error.flatten() }, { status: 400 });
  }

  const normalizedEmail = normalizeEmail(parsed.data.email);

  const user = await findUserByNormalizedEmail(normalizedEmail);
  if (!user || user.emailVerified) {
    return NextResponse.json({ message: genericMessage });
  }

  try {
    const { rawToken } = await createEmailVerificationToken(user.id, user.email);
    const emailResult = await sendVerificationEmail({
      email: user.email,
      name: user.name,
      token: rawToken
    });

    return NextResponse.json({
      message: genericMessage,
      previewUrl: emailResult.previewUrl
    });
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[auth/resend-verification]", error);
    }

    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : "Could not resend verification right now."
      },
      { status: 500 }
    );
  }
}
