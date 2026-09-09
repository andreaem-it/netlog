import { expect, it } from "vitest";
import { registerSchema, resetPasswordSchema, usernameSchema } from "./schemas";
it("normalizes identifiers without modifying passwords", () => {
  const data = registerSchema.parse({
    name: " Giulia Rossi ",
    username: " Giulia ",
    email: " GIULIA@EXAMPLE.COM ",
    password: " una frase molto lunga ",
  });
  expect(data).toEqual({
    name: "Giulia Rossi",
    username: "giulia",
    email: "giulia@example.com",
    password: " una frase molto lunga ",
  });
});
it.each(["admin", "x", "a/b", "a b", "1username", "a<script>"])(
  "rejects invalid username %s",
  (username) => {
    expect(usernameSchema.safeParse(username).success).toBe(false);
  },
);
it("rejects malformed reset tokens and short passwords", () => {
  expect(
    resetPasswordSchema.safeParse({ token: "a".repeat(64), password: "short" })
      .success,
  ).toBe(false);
  expect(
    resetPasswordSchema.safeParse({
      token: "not-a-token",
      password: "a sufficiently long phrase",
    }).success,
  ).toBe(false);
});
