export function canReadProfile(input: {
  owner: boolean;
  blocked: boolean;
  friends: boolean;
  visibility: "PUBLIC" | "FRIENDS" | "PRIVATE";
}) {
  if (input.owner) return true;
  if (input.blocked) return false;
  return (
    input.visibility === "PUBLIC" ||
    (input.visibility === "FRIENDS" && input.friends)
  );
}

export function orderedPair(a: string, b: string) {
  if (a === b) throw new Error("A relationship requires two different users.");
  return a < b
    ? { userLowId: a, userHighId: b }
    : { userLowId: b, userHighId: a };
}
