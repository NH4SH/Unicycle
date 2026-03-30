import Link from "next/link";

export function Logo() {
  return (
    <Link href="/" className="group inline-flex items-center gap-3" aria-label="HoosFinds home">
      <span className="surface-panel relative inline-flex touch-icon items-center justify-center overflow-hidden rounded-2xl border-border/70 bg-white text-[0.95rem] font-bold text-uva-blue">
        <span className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(229,114,0,0.18),transparent_60%)]" />
        <span className="absolute inset-0 rounded-2xl border border-white/50 group-hover:animate-pulseRing" />
        <span className="relative">HF</span>
      </span>
      <div className="leading-tight">
        <p className="font-display text-[1.02rem] font-extrabold tracking-tight">HoosFinds</p>
        <p className="text-[10px] uppercase tracking-[0.26em] text-muted-foreground">UVA fashion resale</p>
      </div>
    </Link>
  );
}
