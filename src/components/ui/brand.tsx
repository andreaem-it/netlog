import Link from "next/link";
import { Asterisk } from "lucide-react";
import { brand } from "@/config/brand";

export function Brand() {
  return (
    <Link
      href="/"
      className="brand"
      aria-label={`${brand.name}, pagina iniziale`}
    >
      <span className="brand-mark">
        <Asterisk size={27} strokeWidth={2.8} />
      </span>
      <span>
        {brand.shortName}
        <span className="brand-period">.</span>
      </span>
    </Link>
  );
}
