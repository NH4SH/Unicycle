import Image from "next/image";
import Link from "next/link";

export function Logo() {
  return (
    <Link href="/" className="group inline-flex items-center gap-3" aria-label="HoosFinds home">
      <span className="relative inline-flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden">
        <Image
          src="/brand/hoosfinds-logo.png"
          alt="HoosFinds logo"
          fill
          className="object-contain transition duration-300 group-hover:scale-[1.03]"
          sizes="44px"
          priority
        />
      </span>
      <div className="leading-tight">
        <p className="font-display text-[1.02rem] font-extrabold tracking-tight">HoosFinds</p>
        <p className="text-[10px] uppercase tracking-[0.26em] text-muted-foreground">UVA fashion resale</p>
      </div>
    </Link>
  );
}
