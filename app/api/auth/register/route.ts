import { NextResponse } from "next/server";

import { sendVerificationEmail } from "@/lib/auth-email";
import { getPasswordValidationMessage } from "@/lib/auth-passwords";
import { createEmailVerificationToken } from "@/lib/auth-tokens";
import { createPasswordUser, findUserByNormalizedEmail } from "@/lib/auth-users";
import { isUvaEmail, normalizeUvaEmail } from "@/lib/domain";
import { signUpSchema } from "@/lib/validators";

export async function POST(request: Request) {
  const payload = await request.json();
  const parsed = signUpSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid signup payload.", errors: parsed.error.flatten() }, { status: 400 });
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

  const passwordMessage = getPasswordValidationMessage(parsed.data.password);
  if (passwordMessage) {
    return NextResponse.json({ message: passwordMessage }, { status: 400 });
  }

  const existingUser = await findUserByNormalizedEmail(normalizedEmail);
  if (existingUser) {
    return NextResponse.json(
      {
        code: existingUser.passwordHash ? "ACCOUNT_EXISTS" : "PASSWORD_SETUP_REQUIRED",
        message: existingUser.passwordHash
          ? "We already have an account for that UVA email. Sign in or reset your password."
          : "We found an existing HoosFinds account for that UVA email. Use forgot password to create your password."
      },
      { status: 409 }
    );
  }

  try {
    const { hashPassword } = await import("@/lib/auth-passwords");
    const passwordHash = await hashPassword(parsed.data.password);
    const user = await createPasswordUser({
      email: normalizedEmail,
      name: parsed.data.name,
      passwordHash
    });

    const { rawToken } = await createEmailVerificationToken(user.id, user.email);
    const emailResult = await sendVerificationEmail({
      email: user.email,
      name: user.name,
      token: rawToken
    });

    return NextResponse.json(
      {
        message: "Check your UVA inbox to verify your email before signing in.",
        previewUrl: emailResult.previewUrl
      },
      { status: 201 }
    );
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[auth/register]", error);
    }

    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : "Could not create your account right now."
      },
      { status: 500 }
    );
  }
}
