import { describe, expect, it } from "vitest";
import { canReadProfile, orderedPair } from "./policy";
describe("profile visibility", () => {
  it("allows owners to read private profiles", () => {
    expect(
      canReadProfile({
        owner: true,
        blocked: false,
        friends: false,
        visibility: "PRIVATE",
      }),
    ).toBe(true);
  });
  it.each(["PUBLIC", "FRIENDS", "PRIVATE"] as const)(
    "blocks take priority over %s and friendship",
    (visibility) => {
      expect(
        canReadProfile({
          owner: false,
          blocked: true,
          friends: true,
          visibility,
        }),
      ).toBe(false);
    },
  );
  it("requires friendship for restricted profiles", () => {
    expect(
      canReadProfile({
        owner: false,
        blocked: false,
        friends: false,
        visibility: "FRIENDS",
      }),
    ).toBe(false);
    expect(
      canReadProfile({
        owner: false,
        blocked: false,
        friends: true,
        visibility: "FRIENDS",
      }),
    ).toBe(true);
  });
  it("keeps a canonical pair regardless of direction", () => {
    expect(orderedPair("a", "b")).toEqual(orderedPair("b", "a"));
    expect(() => orderedPair("a", "a")).toThrow();
  });
});
