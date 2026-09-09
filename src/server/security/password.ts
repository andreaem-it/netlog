import "server-only";
import { hash, verify } from "@node-rs/argon2";

export function hashPassword(password: string) {
  // 2 = Argon2id; the package exports an ambient const enum, incompatible with isolatedModules.
  return hash(password, {
    algorithm: 2,
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
  });
}

export async function verifyPassword(passwordHash: string, password: string) {
  try {
    return await verify(passwordHash, password);
  } catch {
    return false;
  }
}

// Unknown accounts take the same Argon2 verification path as known accounts.
let dummyHash: Promise<string> | undefined;
export function getDummyHash() {
  return (dummyHash ??= hashPassword("not-an-account-password-8c05c376"));
}
