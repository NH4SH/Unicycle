import { NextResponse } from "next/server";

export async function POST(request: Request) {
  void request;

  // Legacy endpoint: HoosFinds now treats the Listing model as the only
  // seller-facing inventory. Separate Connect products are retired.
  return NextResponse.json(
    {
      message: "Connect storefront products are retired. Create inventory through the normal HoosFinds listing flow instead."
    },
    { status: 410 }
  );
}
