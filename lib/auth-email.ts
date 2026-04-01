import "server-only";

import nodemailer from "nodemailer";

import {
  getAuthEmailConfigurationError,
  getAuthEmailProviderLabel,
  getAuthEmailTransportConfig,
  getRequiredAppUrl,
  getRequiredEmailFrom,
  isAuthEmailConfigured
} from "@/lib/auth-email-config.server";
import { canPreviewAuthEmailsInDev } from "@/lib/auth-runtime.server";

type SentAuthEmailResult = {
  previewUrl: string | null;
};

let authEmailTransport: nodemailer.Transporter | null = null;

function getTransport() {
  if (!authEmailTransport) {
    authEmailTransport = nodemailer.createTransport(getAuthEmailTransportConfig());
  }

  return authEmailTransport;
}

function buildAuthUrl(pathname: string, params: Record<string, string>) {
  const url = new URL(pathname, getRequiredAppUrl());

  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  return url.toString();
}

async function sendOrPreviewEmail({
  to,
  subject,
  html,
  text,
  previewUrl
}: {
  to: string;
  subject: string;
  html: string;
  text: string;
  previewUrl: string;
}) {
  if (!isAuthEmailConfigured()) {
    if (canPreviewAuthEmailsInDev()) {
      console.info(`[auth-email-preview] ${subject}: ${previewUrl}`);
      return {
        previewUrl
      } satisfies SentAuthEmailResult;
    }

    throw new Error(getAuthEmailConfigurationError());
  }

  const transport = getTransport();

  await transport.sendMail({
    from: getRequiredEmailFrom(),
    to,
    subject,
    text,
    html
  });

  return {
    previewUrl: null
  } satisfies SentAuthEmailResult;
}

export async function verifyAuthEmailTransport() {
  if (!isAuthEmailConfigured()) {
    throw new Error(getAuthEmailConfigurationError());
  }

  await getTransport().verify();

  return {
    provider: getAuthEmailProviderLabel(),
    from: getRequiredEmailFrom(),
    appUrl: getRequiredAppUrl()
  };
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
  const verificationUrl = buildAuthUrl("/verify-email", {
    email,
    token
  });
  const displayName = name?.trim() || "there";

  return sendOrPreviewEmail({
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
  const resetUrl = buildAuthUrl("/reset-password", {
    email,
    token
  });
  const displayName = name?.trim() || "there";

  return sendOrPreviewEmail({
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
