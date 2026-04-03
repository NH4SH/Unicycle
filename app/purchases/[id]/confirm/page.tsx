import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { TransactionStatus } from "@prisma/client";

import { ConfirmReceiptForm } from "@/components/transactions/confirm-receipt-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getAuthSession } from "@/lib/auth";
import { getTransactionForConfirmation } from "@/lib/data";

type ConfirmReceiptPageProps = {
  params: {
    id: string;
  };
};

export default async function ConfirmReceiptPage({ params }: ConfirmReceiptPageProps) {
  const session = await getAuthSession();

  if (!session?.user.id) {
    redirect("/sign-in");
  }

  const transaction = await getTransactionForConfirmation(params.id, session.user.id);

  if (!transaction) {
    notFound();
  }

  if (transaction.status !== TransactionStatus.PENDING_CONFIRMATION) {
    return (
      <div className="container py-10">
        <Card className="mx-auto max-w-2xl surface-panel-strong">
          <CardContent className="space-y-4 p-8 text-center">
            <Badge variant="outline" className="mx-auto w-fit">Already handled</Badge>
            <h1 className="font-display text-4xl font-extrabold tracking-tight">This handoff is already finalized.</h1>
            <p className="text-sm leading-7 text-muted-foreground">
              There’s nothing left to confirm here. You can head back to your purchases to review the transaction history.
            </p>
            <Button asChild>
              <Link href="/purchases">Back to purchases</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (transaction.openIssue) {
    return (
      <div className="container py-10">
        <Card className="mx-auto max-w-2xl surface-panel-strong">
          <CardContent className="space-y-4 p-8 text-center">
            <Badge variant="outline" className="mx-auto w-fit">Issue reported</Badge>
            <h1 className="font-display text-4xl font-extrabold tracking-tight">This handoff has an open issue.</h1>
            <p className="text-sm leading-7 text-muted-foreground">
              Resolve the issue in messages or purchases before confirming that everything landed cleanly.
            </p>
            <Button asChild>
              <Link href="/purchases">Back to purchases</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <ConfirmReceiptForm transaction={transaction} />;
}
