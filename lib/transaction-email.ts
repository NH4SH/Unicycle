import "server-only";

import { buildEmailUrl, sendPlatformEmail } from "@/lib/email-delivery";
import { SITE_NAME } from "@/lib/constants";
import { formatCurrencyFromCents } from "@/lib/utils";

type SellerSaleEmailInput = {
  sellerEmail: string;
  sellerName?: string | null;
  buyerName: string;
  listingTitle: string;
  listingImageUrl?: string | null;
  salePriceCents: number;
  href?: string;
};

export async function sendSellerSaleEmail(input: SellerSaleEmailInput) {
  const sellerName = input.sellerName?.trim() || "there";
  const saleUrl = input.href ? buildEmailUrl(input.href) : buildEmailUrl("/purchases", { tab: "sales" });
  const formattedPrice = formatCurrencyFromCents(input.salePriceCents, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  const previewUrl = saleUrl;
  const photoBlock = input.listingImageUrl
    ? `
        <div style="margin: 0 0 20px;">
          <img src="${input.listingImageUrl}" alt="${input.listingTitle}" style="width: 100%; max-width: 320px; border-radius: 18px; display: block;" />
        </div>
      `
    : "";

  return sendPlatformEmail({
    to: input.sellerEmail,
    subject: "Your item sold on HoosFinds",
    previewUrl,
    text: `Hi ${sellerName},

Your listing "${input.listingTitle}" sold on ${SITE_NAME}.

Buyer: ${input.buyerName}
Sale price: ${formattedPrice}

Open HoosFinds to review the sale and next steps:
${saleUrl}`,
    html: `
      <div style="background:#f6f1eb;padding:32px 16px;font-family:Arial,sans-serif;color:#111827;">
        <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:24px;padding:28px;border:1px solid rgba(17,24,39,0.08);">
          <p style="margin:0 0 8px;font-size:12px;letter-spacing:0.18em;text-transform:uppercase;color:#6b7280;">HoosFinds sale</p>
          <h1 style="margin:0 0 12px;font-size:28px;line-height:1.15;color:#111827;">Your item sold.</h1>
          <p style="margin:0 0 24px;font-size:16px;line-height:1.6;color:#4b5563;">
            ${input.buyerName} checked out <strong>${input.listingTitle}</strong> for <strong>${formattedPrice}</strong> on HoosFinds.
          </p>
          ${photoBlock}
          <div style="margin:0 0 24px;padding:18px 20px;border-radius:18px;background:#111827;color:#f9fafb;">
            <p style="margin:0 0 6px;font-size:12px;letter-spacing:0.18em;text-transform:uppercase;color:rgba(249,250,251,0.72);">Sale details</p>
            <p style="margin:0 0 8px;font-size:18px;font-weight:700;">${input.listingTitle}</p>
            <p style="margin:0;font-size:14px;line-height:1.6;color:rgba(249,250,251,0.82);">Buyer: ${input.buyerName}<br/>Sale price: ${formattedPrice}</p>
          </div>
          <a href="${saleUrl}" style="display:inline-block;border-radius:999px;background:#f97316;color:#ffffff;text-decoration:none;padding:14px 22px;font-weight:700;">View sale</a>
          <p style="margin:20px 0 0;font-size:13px;line-height:1.6;color:#6b7280;">Open HoosFinds to review the order and coordinate the next step.</p>
        </div>
      </div>
    `
  });
}
