import Link from "next/link";

export function Logo() {
  return (
    <Link href="/" className="group inline-flex items-center gap-2" aria-label="UniCycle home">
      <span className="relative inline-flex h-9 w-9 items-center justify-center rounded-xl bg-uva-orange text-white shadow-soft">
        <span className="absolute inset-0 rounded-xl border border-white/40 group-hover:animate-pulseRing" />
        U
      </span>
      <div className="leading-tight">
        <p className="font-display text-lg font-bold tracking-tight">UniCycle</p>
        <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">UVA Resale</p>
      </div>
    </Link>
  );
}
