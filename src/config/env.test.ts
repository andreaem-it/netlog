import { afterEach, expect, it, vi } from "vitest";
import {
  ConfigurationError,
  getAppUrl,
  getMailEnv,
  getSecurityEnv,
} from "./env";
afterEach(() => vi.unstubAllEnvs());

it("does not require app URL or SMTP for authentication in production", () => {
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("AUTH_SECRET", "a".repeat(32));
  vi.stubEnv("TRUST_PROXY", "false");
  vi.stubEnv("APP_URL", "");
  vi.stubEnv("SMTP_URL", "");
  vi.stubEnv("MAIL_TRANSPORT", "file");
  expect(getSecurityEnv().AUTH_SECRET).toHaveLength(32);
  expect(() => getMailEnv()).toThrow(ConfigurationError);
});

it("reports configuration failures without exposing secret values", () => {
  vi.stubEnv("AUTH_SECRET", "secret-short");
  try {
    getSecurityEnv();
    throw new Error("Expected failure");
  } catch (error) {
    expect(error).toBeInstanceOf(ConfigurationError);
    expect(error).toMatchObject({ fields: ["AUTH_SECRET"] });
    expect(String(error)).not.toContain("secret-short");
    expect(String(error)).not.toContain("character");
  }
});

it("uses Vercel hostname for missing app URL and requires HTTPS in production", () => {
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("APP_URL", "");
  vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "");
  vi.stubEnv("VERCEL_URL", "test-app.vercel.app");
  expect(getAppUrl()).toBe("https://test-app.vercel.app");
  vi.stubEnv("APP_URL", "http://test-app.vercel.app");
  expect(() => getAppUrl()).toThrow(ConfigurationError);
});

it("does not permit HTTP URLs as email transports", () => {
  vi.stubEnv("MAIL_TRANSPORT", "smtp");
  vi.stubEnv("SMTP_URL", "https://example.test");
  expect(() => getMailEnv()).toThrow(ConfigurationError);
});
