import { expect, it, vi } from "vitest";
import { initialFormState } from "./schemas";

vi.mock("next-auth", () => ({ AuthError: class AuthError extends Error {} }));

const signIn = vi.fn();
vi.mock("@/auth", () => ({ signIn, signOut: vi.fn() }));

const redirect = vi.fn((url: string) => {
  throw new Error(`REDIRECT:${url}`);
});
vi.mock("next/navigation", () => ({ redirect }));

const { loginAction } = await import("./actions");

function loginForm() {
  const form = new FormData();
  form.set("email", "user@example.test");
  form.set("password", "a-long-enough-password");
  return form;
}

it("surfaces an error instead of redirecting when signIn returns a callback URL with error=", async () => {
  signIn.mockResolvedValueOnce("/login?error=CredentialsSignin");
  const result = await loginAction(initialFormState, loginForm());
  expect(result).toEqual({
    status: "error",
    message: expect.stringContaining("Accesso non riuscito"),
  });
  expect(redirect).not.toHaveBeenCalled();
});

it("redirects to /home when signIn succeeds", async () => {
  signIn.mockResolvedValueOnce(undefined);
  await expect(loginAction(initialFormState, loginForm())).rejects.toThrow(
    "REDIRECT:/home",
  );
});
