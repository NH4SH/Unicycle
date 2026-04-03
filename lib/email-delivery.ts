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

export type SentEmailResult = {
  previewUrl: string | null;
};

let transport: nodemailer.Transporter | null = null;

function getTransport() {
  if (!transport) {
    transport = nodemailer.createTransport(getAuthEmailTransportConfig());
  }

  return transport;
}

export function buildEmailUrl(pathname: string, params: Record<string, string> = {}) {
  const url = new URL(pathname, getRequiredAppUrl());

  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  return url.toString();
}

export async function sendPlatformEmail({
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
      console.info(`[email-preview] ${subject}: ${previewUrl}`);
      return {
        previewUrl
      } satisfies SentEmailResult;
    }

    throw new Error(getAuthEmailConfigurationError());
  }

  await getTransport().sendMail({
    from: getRequiredEmailFrom(),
    to,
    subject,
    text,
    html
  });

  return {
    previewUrl: null
  } satisfies SentEmailResult;
}

export async function verifyPlatformEmailTransport() {
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
