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
      aria-label={`Avatar di ${name}`}
    >
      {initials}
    </span>
  );
}
