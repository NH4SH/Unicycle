import { NextResponse } from "next/server";

import { clearEmailVerificationTokensForUser, clearPasswordResetTokensForUser, consumePasswordResetToken } from "@/lib/auth-tokens";
import { getPasswordValidationMessage, hashPassword } from "@/lib/auth-passwords";
import { normalizeEmail } from "@/lib/domain";
import { prisma } from "@/lib/prisma";
import { resetPasswordSchema } from "@/lib/validators";

export async function POST(request: Request) {
  const payload = await request.json();
  const parsed = resetPasswordSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid reset payload.", errors: parsed.error.flatten() }, { status: 400 });
  }

  const normalizedEmail = normalizeEmail(parsed.data.email);

  const passwordMessage = getPasswordValidationMessage(parsed.data.password);
  if (passwordMessage) {
    return NextResponse.json({ message: passwordMessage }, { status: 400 });
  }

  const tokenResult = await consumePasswordResetToken(normalizedEmail, parsed.data.token);
  if (!tokenResult.ok) {
    return NextResponse.json(
      {
        message:
          tokenResult.reason === "expired"
            ? "That reset link expired. Request a fresh one and try again."
            : "That reset link is invalid. Request a fresh one and try again."
      },
      { status: 400 }
    );
  }

  try {
    const passwordHash = await hashPassword(parsed.data.password);

    await prisma.user.update({
      where: { id: tokenResult.userId },
      data: {
        passwordHash,
        emailVerified: new Date()
      }
    });

    await Promise.all([
      clearPasswordResetTokensForUser(tokenResult.userId),
      clearEmailVerificationTokensForUser(tokenResult.userId)
    ]);

    return NextResponse.json({
      message: "Your password is set. You can sign in now."
    });
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[auth/reset-password]", error);
    }

    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : "Could not update your password right now."
      },
      { status: 500 }
    );
  }
}
