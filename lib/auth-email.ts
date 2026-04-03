import "server-only";

import { buildEmailUrl, sendPlatformEmail, verifyPlatformEmailTransport } from "@/lib/email-delivery";

export async function verifyAuthEmailTransport() {
  return verifyPlatformEmailTransport();
}

export async function sendVerificationEmail({
  email,
  name,
  token
}: {
  email: string;
  name?: string | null;
  token: string;
}) {
  const verificationUrl = buildEmailUrl("/verify-email", {
    email,
    token
  });
  const displayName = name?.trim() || "there";

  return sendPlatformEmail({
    to: email,
    subject: "Verify your HoosFinds email",
    previewUrl: verificationUrl,
    text: `Hi ${displayName},\n\nVerify your UVA email to finish setting up HoosFinds:\n${verificationUrl}\n\nThis link expires in 24 hours.`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
        <p>Hi ${displayName},</p>
        <p>Verify your UVA email to finish setting up HoosFinds.</p>
        <p><a href="${verificationUrl}">Verify email</a></p>
        <p>This link expires in 24 hours.</p>
      </div>
    `
  });
}

export async function sendPasswordResetEmail({
  email,
  name,
  token
}: {
  email: string;
  name?: string | null;
  token: string;
}) {
  const resetUrl = buildEmailUrl("/reset-password", {
    email,
    token
  });
  const displayName = name?.trim() || "there";

  return sendPlatformEmail({
    to: email,
    subject: "Reset your HoosFinds password",
    previewUrl: resetUrl,
    text: `Hi ${displayName},\n\nReset your HoosFinds password here:\n${resetUrl}\n\nThis link expires in 60 minutes. If you didn't ask for this, you can ignore this email.`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
        <p>Hi ${displayName},</p>
        <p>Reset your HoosFinds password here.</p>
        <p><a href="${resetUrl}">Reset password</a></p>
        <p>This link expires in 60 minutes. If you didn&apos;t ask for this, you can ignore this email.</p>
      </div>
    `
  });
}

export async function sendVerifiedShopApprovalEmail({
  email,
  businessName,
  token
}: {
  email: string;
  businessName: string;
  token: string;
}) {
  const resetUrl = buildEmailUrl("/reset-password", {
    email,
    token
  });

  return sendPlatformEmail({
    to: email,
    subject: "Your HoosFinds Verified Shop is approved",
    previewUrl: resetUrl,
    text: `Hi ${businessName},\n\nYou're approved to sell on HoosFinds as a Verified Shop.\n\nSet your password here to finish access:\n${resetUrl}\n\nOnce you're in, you can manage listings, payouts, and sales from your Verified Shop portal.`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
        <p>Hi ${businessName},</p>
        <p>You're approved to sell on HoosFinds as a Verified Shop.</p>
        <p><a href="${resetUrl}">Set your password</a></p>
        <p>Once you're in, you can manage listings, payouts, and sales from your Verified Shop portal.</p>
      </div>
    `
  });
}
