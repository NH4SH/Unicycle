import { NextResponse } from "next/server";

export async function POST(request: Request) {
  void request;

  // Legacy endpoint: listing checkout is now the only active purchase path.
  return NextResponse.json(
    {
      message: "Connect storefront checkout is retired. Buyers should use the normal HoosFinds listing checkout instead."
    },
    { status: 410 }
  );
}
