import { AlertTriangle, CheckCircle2, MapPin, Shield } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

const rules = [
  {
    title: "UVA-only verification",
    body: "Only @virginia.edu and @mail.virginia.edu accounts can browse listings, save finds, and message inside HoosFinds.",
    icon: Shield
  },
  {
    title: "Meet in visible spots",
    body: "Use public, high-traffic places like Newcomb, The Corner, Rice Hall, JPJ, or Scott Stadium whenever possible.",
    icon: MapPin
  },
  {
    title: "Trust your instincts",
    body: "If a meetup feels off, cancel it. Report the account and prioritize your own safety over making the sale.",
    icon: AlertTriangle
  }
];

const doList = [
  "Bring a friend for later meetups or unfamiliar handoffs.",
  "Check the item in person before you hand over payment.",
  "Keep negotiation and pickup details inside HoosFinds messages.",
  "Report scams, harassment, or unsafe behavior right away."
];

export default function SafetyPage() {
  return (
    <div className="container space-y-8 py-8 md:space-y-10 md:py-10">
      <div className="grid gap-4 border-b border-border/80 pb-6 md:grid-cols-[1fr_auto] md:items-end">
        <div className="space-y-2">
          <p className="editorial-eyebrow">Safety on HoosFinds</p>
          <h1 className="font-display text-4xl font-extrabold tracking-tight md:text-5xl">Grounds resale should feel local and safe.</h1>
          <p className="max-w-2xl text-sm leading-7 text-foreground/76 dark:text-white/82 md:text-base">
            HoosFinds is designed for real student meetups on Grounds. These guidelines keep that experience trustworthy without making it feel corporate or overbuilt.
          </p>
        </div>
        <div className="surface-pill px-4 py-2 text-xs uppercase tracking-[0.18em]">
          Meet in public
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {rules.map((rule) => (
          <Card key={rule.title} className="surface-panel-strong">
            <CardContent className="space-y-3 p-6">
              <rule.icon className="h-5 w-5 text-uva-orange" />
              <h2 className="font-display text-2xl font-bold tracking-tight">{rule.title}</h2>
              <p className="text-sm leading-7 text-foreground/76 dark:text-white/82">{rule.body}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="surface-panel-strong">
        <CardContent className="space-y-4 p-6">
          <div className="space-y-2">
            <p className="editorial-eyebrow">Meetup checklist</p>
            <h2 className="font-display text-3xl font-extrabold tracking-tight">Before you head to the handoff</h2>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {doList.map((item) => (
              <p key={item} className="inline-flex items-start gap-2 text-sm leading-6 text-foreground/76 dark:text-white/82">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-uva-orange" />
                {item}
              </p>
            ))}
          </div>
          <p className="text-sm leading-7 text-foreground/76 dark:text-white/82">
            For urgent safety concerns, contact University Police immediately and then submit a report inside HoosFinds when you can.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
