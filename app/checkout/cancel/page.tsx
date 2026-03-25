import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type CheckoutCancelPageProps = {
  searchParams?: {
    listingId?: string;
  };
};

export default function CheckoutCancelPage({ searchParams }: CheckoutCancelPageProps) {
  const returnHref = searchParams?.listingId ? `/listing/${searchParams.listingId}` : "/market";

  return (
    <div className="container py-10">
      <Card className="mx-auto max-w-2xl border-white bg-white">
        <CardContent className="space-y-6 p-8">
          <Badge variant="blue" className="w-fit">Checkout cancelled</Badge>
          <div className="space-y-3">
            <h1 className="font-display text-4xl font-black tracking-tight">No charge was made.</h1>
            <p className="max-w-xl text-muted-foreground">
              Your Stripe checkout was canceled before payment completed. You can head back to the listing and try again anytime.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <Link href={returnHref}>Return to listing</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/market">Keep browsing</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
