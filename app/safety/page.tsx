import { AlertTriangle, CheckCircle2, MapPin, Shield } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

const rules = [
  {
    title: "UVA-only verification",
    body: "Only @virginia.edu and @mail.virginia.edu accounts can access listings and messages.",
    icon: Shield
  },
  {
    title: "Meet in public on Grounds",
    body: "Use high-traffic spots like Newcomb, The Corner, Rice Hall, JPJ, or Scott Stadium.",
    icon: MapPin
  },
  {
    title: "Trust your instincts",
    body: "If a meetup feels off, cancel and report the account. Your safety comes first.",
    icon: AlertTriangle
  }
];

const doList = [
  "Bring a friend for late pickups.",
  "Verify item condition before payment.",
  "Keep chats and offers inside UniCycle messages.",
  "Report scams, harassment, or unsafe behavior."
];

export default function SafetyPage() {
  return (
    <div className="container space-y-8 py-8">
      <div>
        <h1 className="font-display text-4xl font-black tracking-tight">Safety & Rules</h1>
        <p className="text-sm text-muted-foreground">Built for trust, speed, and real student meetups on Grounds.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {rules.map((rule) => (
          <Card key={rule.title} className="border-white bg-white">
            <CardContent className="space-y-3 p-5">
              <rule.icon className="h-5 w-5 text-electric" />
              <h2 className="font-display text-xl font-bold">{rule.title}</h2>
              <p className="text-sm text-muted-foreground">{rule.body}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-white bg-white">
        <CardContent className="space-y-3 p-6">
          <h2 className="font-display text-2xl font-bold">Meetup best practices</h2>
          <div className="space-y-2">
            {doList.map((item) => (
              <p key={item} className="inline-flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-uva-orange" />
                {item}
              </p>
            ))}
          </div>
          <p className="text-sm text-muted-foreground">
            For urgent safety concerns, contact University Police immediately and then submit a report in app.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
