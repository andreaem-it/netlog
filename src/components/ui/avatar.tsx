// Soft-pastel/dark-text pairs in the same style as the original fixed
// avatar color, so a hash-picked palette still looks on-brand.
const PALETTE = [
  ["#f1dacd", "#813b27"],
  ["#dceee2", "#1f6b47"],
  ["#e1e7fb", "#31439c"],
  ["#fbe4ef", "#9c3168"],
  ["#eee4fb", "#5c319c"],
  ["#fbf0d4", "#8a6a11"],
  ["#d9f1f4", "#177684"],
  ["#f0e0d9", "#9c4d31"],
] as const;

function hashColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) | 0;
  }
  const [background, color] = PALETTE[Math.abs(hash) % PALETTE.length]!;
  return { background, color };
}

export function Avatar({
  name,
  src,
  large = false,
}: {
  name: string;
  src?: string | null;
  large?: boolean;
}) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
  if (src)
    return (
      // eslint-disable-next-line @next/next/no-img-element -- plain <img>: app doesn't use next/image elsewhere.
      <img
        src={src}
        alt={`Avatar di ${name}`}
        className={`avatar avatar-image${large ? " avatar-large" : ""}`}
      />
    );
  return (
    <span
      className={`avatar${large ? " avatar-large" : ""}`}
      style={hashColor(name)}
      aria-label={`Avatar di ${name}`}
    >
      {initials}
    </span>
  );
}
