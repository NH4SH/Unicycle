import { SellWizard } from "@/components/sell/sell-wizard";

export default function SellPage() {
  return (
    <div className="container space-y-6 py-8">
      <div>
        <h1 className="font-display text-4xl font-black tracking-tight">List an Item</h1>
        <p className="text-sm text-muted-foreground">Turn your extra campus stuff into someone else&apos;s next drop.</p>
      </div>
      <SellWizard />
    </div>
  );
}
