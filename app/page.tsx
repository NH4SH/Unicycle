import Link from "next/link";
import { ArrowRight, ShieldCheck, Sparkles, Zap } from "lucide-react";

import { ListingCard } from "@/components/cards/listing-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getAuthSession } from "@/lib/auth";
import { CATEGORY_OPTIONS } from "@/lib/constants";
import { getLandingDrops } from "@/lib/data";
import { prisma } from "@/lib/prisma";

export default async function HomePage() {
  const session = await getAuthSession();
  const { todaysDrops, hotOnGrounds } = await getLandingDrops(session?.user.id);

  const [waitlistCount, interviewsCount, partnersCount] = await Promise.all([
    prisma.waitlistEntry.count(),
    prisma.conversation.count(),
    prisma.user.count()
  ]);

  return (
    <div className="container space-y-14 py-10">
      <section className="relative overflow-hidden rounded-[2rem] border border-border/70 bg-white p-7 shadow-card md:p-12">
        <div className="absolute right-0 top-0 h-56 w-56 rounded-full bg-electric/20 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-52 w-52 rounded-full bg-uva-orange/20 blur-3xl" />
        <div className="relative grid gap-10 md:grid-cols-[1.1fr_0.9fr] md:items-end">
          <div className="space-y-6">
            <Badge variant="orange" className="w-fit">UVA-only beta</Badge>
            <div className="space-y-3">
              <h1 className="font-display text-4xl font-black tracking-tight md:text-6xl">
                UniCycle <span className="text-uva-orange">-</span> UVA&apos;s resale drops. Buy & sell on Grounds.
              </h1>
              <p className="max-w-xl text-base text-muted-foreground md:text-lg">
                A trusted campus marketplace with drop culture energy. Streetwear, textbooks, dorm gear, and game-day finds.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="/market">Browse Drops</Link>
              </Button>
              <Button asChild size="lg" variant="secondary">
                <Link href="/sell">List an Item</Link>
              </Button>
            </div>
            <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-3">
              <p className="rounded-full bg-secondary px-4 py-2">UVA-only beta</p>
              <p className="rounded-full bg-secondary px-4 py-2">Trusted by students</p>
              <p className="rounded-full bg-secondary px-4 py-2">Fast meetups</p>
            </div>
          </div>
          <Card className="drop-shimmer border-0 bg-gradient-to-br from-white/90 via-white to-electric/10">
            <CardContent className="space-y-4 p-6">
              <p className="font-display text-lg font-bold">Drop Culture on Grounds</p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-2xl bg-white p-3">
                  <p className="text-xs text-muted-foreground">Live Drops</p>
                  <p className="font-bold text-uva-blue">{todaysDrops.length} now</p>
                </div>
                <div className="rounded-2xl bg-white p-3">
                  <p className="text-xs text-muted-foreground">Hot picks</p>
                  <p className="font-bold text-uva-blue">{hotOnGrounds.length}</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Meet at Newcomb, The Corner, Rice Hall, or along the Alderman area between classes.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-end justify-between">
          <h2 className="font-display text-3xl font-bold tracking-tight">Today&apos;s Drops</h2>
          <Link href="/market" className="inline-flex items-center gap-1 text-sm font-semibold text-electric">
            See all <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="columns-2 gap-3 md:columns-4">
          {todaysDrops.map((listing) => (
            <div key={listing.id} className="mb-3 break-inside-avoid">
              <ListingCard listing={listing} />
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-end justify-between">
          <h2 className="font-display text-3xl font-bold tracking-tight">Hot on Grounds</h2>
          <Badge variant="orange">Top liked last 72h</Badge>
        </div>
        <div className="columns-2 gap-3 md:columns-4">
          {hotOnGrounds.map((listing) => (
            <div key={listing.id} className="mb-3 break-inside-avoid">
              <ListingCard listing={listing} sticker="🔥 Hot" />
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-3xl font-bold tracking-tight">Categories</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
          {CATEGORY_OPTIONS.map((category) => (
            <Link
              key={category.value}
              href={`/market?category=${category.value}`}
              className="rounded-3xl border border-border bg-white px-4 py-5 text-center font-semibold transition hover:-translate-y-0.5 hover:border-electric"
            >
              {category.label}
            </Link>
          ))}
        </div>
      </section>

      <section className="rounded-[2rem] border border-border bg-white p-7 md:p-10">
        <h3 className="font-display text-3xl font-bold">Building with students</h3>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <Card className="border-0 bg-secondary">
            <CardContent className="p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Waitlist count</p>
              <p className="mt-2 font-display text-3xl font-bold">{waitlistCount}</p>
            </CardContent>
          </Card>
          <Card className="border-0 bg-secondary">
            <CardContent className="p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground"># Interviews</p>
              <p className="mt-2 font-display text-3xl font-bold">{interviewsCount}</p>
            </CardContent>
          </Card>
          <Card className="border-0 bg-secondary">
            <CardContent className="p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Org partners</p>
              <p className="mt-2 font-display text-3xl font-bold">{Math.max(3, Math.floor(partnersCount / 2))}</p>
            </CardContent>
          </Card>
        </div>
      </section>

      <footer className="grid gap-4 rounded-[2rem] border border-border bg-white p-7 text-sm md:grid-cols-3">
        <div className="flex items-start gap-2">
          <ShieldCheck className="mt-0.5 h-4 w-4 text-electric" />
          <Link href="/safety" className="font-medium hover:text-electric">Safety</Link>
        </div>
        <div className="flex items-start gap-2">
          <Sparkles className="mt-0.5 h-4 w-4 text-uva-orange" />
          <p className="font-medium">FAQ: UVA-only verification + meetup basics</p>
        </div>
        <div className="flex items-start gap-2">
          <Zap className="mt-0.5 h-4 w-4 text-electric" />
          <p className="font-medium">Contact: hello@unicycle.grounds</p>
        </div>
      </footer>
    </div>
  );
}
