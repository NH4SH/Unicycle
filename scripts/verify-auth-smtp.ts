import { loadEnvConfig } from "@next/env";
import nodemailer from "nodemailer";

loadEnvConfig(process.cwd());

async function main() {
  const {
    getAuthEmailConfigurationIssues,
    getAuthEmailProviderLabel,
    getAuthEmailTransportConfig,
    getRequiredAppUrl,
    getRequiredEmailFrom
  } = await import("../lib/auth-email-config");
  const { assertAuthRuntimeConfiguration, canPreviewAuthEmailsInDev } = await import("../lib/auth-runtime");

  try {
    assertAuthRuntimeConfiguration();

    const issues = getAuthEmailConfigurationIssues();
    if (issues.length > 0) {
      console.error("Auth email configuration is not ready:");
      for (const issue of issues) {
        console.error(`- ${issue}`);
      }

      if (canPreviewAuthEmailsInDev()) {
        console.error('- DEV_AUTH_BYPASS is enabled, so local auth can still use preview links. Disable it before testing real email delivery.');
      }

      process.exitCode = 1;
      return;
    }

    const transporter = nodemailer.createTransport(getAuthEmailTransportConfig());
    await transporter.verify();

    console.info(`SMTP verified successfully via ${getAuthEmailProviderLabel()}.`);
    console.info(`From: ${getRequiredEmailFrom()}`);
    console.info(`App URL: ${getRequiredAppUrl()}`);

    if (canPreviewAuthEmailsInDev()) {
      console.info("DEV_AUTH_BYPASS is still enabled locally. Disable it before end-to-end email QA.");
    }
  } catch (error) {
    console.error("SMTP verification failed.");
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}

void main();
