import { NextResponse } from "next/server";

import { getAuthSession } from "@/lib/auth";
import { reviewVerifiedSellerApplication } from "@/lib/verified-sellers";
import { verifiedSellerReviewSchema } from "@/lib/validators";

type RouteContext = {
  params: {
    id: string;
  };
};

export async function PATCH(request: Request, { params }: RouteContext) {
  const session = await getAuthSession();

  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const payload = await request.json();
  const parsed = verifiedSellerReviewSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      {
        message: "Invalid review action.",
        errors: parsed.error.flatten()
      },
      { status: 400 }
    );
  }

  try {
    const application = await reviewVerifiedSellerApplication({
      applicationId: params.id,
      reviewerId: session.user.id,
      action: parsed.data.action,
      internalNotes: parsed.data.internalNotes
    });

    return NextResponse.json({
      id: application.id,
      status: application.status
    });
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[admin/verified-sellers]", error);
    }

    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : "Could not update this application right now."
      },
      { status: 500 }
    );
  }
}
