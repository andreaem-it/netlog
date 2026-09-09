export function Avatar({
  name,
  large = false,
}: {
  name: string;
  large?: boolean;
}) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
  return (
    <span
      className={`avatar${large ? " avatar-large" : ""}`}
      aria-label={`Avatar di ${name}`}
    >
      {initials}
    </span>
  );
}
