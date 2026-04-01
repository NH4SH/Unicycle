import { NextResponse } from "next/server";

import { sendPasswordResetEmail } from "@/lib/auth-email";
import { createPasswordResetToken } from "@/lib/auth-tokens";
import { findUserByNormalizedEmail } from "@/lib/auth-users";
import { isUvaEmail, normalizeUvaEmail } from "@/lib/domain";
import { forgotPasswordSchema } from "@/lib/validators";

const genericMessage = "If a HoosFinds account exists for that UVA email, we sent password reset instructions.";

export async function POST(request: Request) {
  const payload = await request.json();
  const parsed = forgotPasswordSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid email address.", errors: parsed.error.flatten() }, { status: 400 });
  }

  const normalizedEmail = normalizeUvaEmail(parsed.data.email);

  if (!isUvaEmail(normalizedEmail)) {
    return NextResponse.json(
      {
        message: "HoosFinds is UVA-only right now.",
        redirectTo: `/auth/uva-only?email=${encodeURIComponent(normalizedEmail)}`
      },
      { status: 403 }
    );
  }

  const user = await findUserByNormalizedEmail(normalizedEmail);
  if (!user) {
    return NextResponse.json({ message: genericMessage });
  }

  try {
    const { rawToken } = await createPasswordResetToken(user.id, user.email);
    const emailResult = await sendPasswordResetEmail({
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
      console.error("[auth/forgot-password]", error);
    }

    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : "Could not start password reset right now."
      },
      { status: 500 }
    );
  }
}
