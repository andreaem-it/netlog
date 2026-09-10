import {
  afterAll,
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { randomBytes, randomUUID } from "node:crypto";
import { db } from "@/server/db/client";
import {
  authenticateAccount,
  registerAccount,
  resetPassword,
  tokenDigest,
} from "@/features/auth/service";
import {
  getOwnProfile,
  getProfile,
  searchProfiles,
} from "@/features/profiles/queries";
import { applyProfileMedia, updateOwnProfile } from "@/features/profiles/service";
import {
  blockUser,
  cancelFriendRequest,
  removeFriendship,
  respondToFriendRequest,
  sendFriendRequest,
  unblockUser,
} from "@/features/friends/service";
import {
  getRelationship,
  listBlockedUsers,
  listFriends,
  listPendingRequests,
} from "@/features/friends/queries";
import { orderedPair } from "@/features/profiles/policy";
import { validateSession } from "@/server/authorization/validate-session";
import { consumeRateLimit } from "@/server/security/rate-limit";

const password = "this is a long test password";
async function account(username: string) {
  return registerAccount(
    { username, email: `${username}@example.test`, name: username, password },
    randomUUID(),
  );
}
beforeEach(async () => {
  if (!new URL(process.env.DATABASE_URL!).pathname.endsWith("/social_test"))
    throw new Error("Tests require the isolated social_test database.");
  await db.user.deleteMany();
  await db.rateLimitBucket.deleteMany();
});
afterAll(() => db.$disconnect());
afterEach(() => vi.unstubAllEnvs());

describe("identity and authorization on PostgreSQL", () => {
  it("registers and logs in with missing mail and URL settings in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("APP_URL", "");
    vi.stubEnv("SMTP_URL", "");
    vi.stubEnv("MAIL_TRANSPORT", "file");
    const user = await account("giulia");
    expect(
      await authenticateAccount(
        { email: "giulia@example.test", password },
        "production-client",
      ),
    ).toMatchObject({ id: user.id });
  });
  it("registers atomically with a hashed password and rejects duplicates", async () => {
    const outcomes = await Promise.allSettled([
      account("giulia"),
      account("giulia"),
    ]);
    expect(outcomes.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(await db.user.count()).toBe(1);
    expect(await db.profile.count()).toBe(1);
    const user = await db.user.findFirstOrThrow();
    expect(user.passwordHash).toMatch(/^\$argon2id\$/);
    expect(user.passwordHash).not.toContain(password);
    expect(
      await authenticateAccount(
        { email: "GIULIA@example.test", password },
        "test-client",
      ),
    ).toMatchObject({ id: user.id });
    expect(
      await authenticateAccount(
        { email: "giulia@example.test", password: "wrong" },
        "test-client",
      ),
    ).toBeNull();
  });
  it("rejects unknown and suspended accounts and revoked sessions", async () => {
    const user = await account("giulia");
    expect(
      await authenticateAccount(
        { email: "missing@example.test", password },
        "test-client",
      ),
    ).toBeNull();
    expect(await validateSession(user.id, 0)).not.toBeNull();
    await db.user.update({
      where: { id: user.id },
      data: { status: "SUSPENDED" },
    });
    expect(
      await authenticateAccount(
        { email: "giulia@example.test", password },
        "test-client",
      ),
    ).toBeNull();
    expect(await validateSession(user.id, 0)).toBeNull();
  });
  it("consumes a reset once under concurrency and revokes all prior sessions", async () => {
    const user = await account("giulia");
    const token = randomBytes(32).toString("hex");
    await db.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: tokenDigest(token),
        expiresAt: new Date(Date.now() + 60000),
      },
    });
    const input = { token, password: "a different long password" };
    const outcomes = await Promise.allSettled([
      resetPassword(input, "client-a"),
      resetPassword(input, "client-b"),
    ]);
    expect(outcomes.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(await validateSession(user.id, 0)).toBeNull();
    expect(await validateSession(user.id, 1)).not.toBeNull();
    expect(
      await authenticateAccount(
        { email: "giulia@example.test", password },
        "client-a",
      ),
    ).toBeNull();
    expect(
      await authenticateAccount(
        { email: "giulia@example.test", password: input.password },
        "client-a",
      ),
    ).not.toBeNull();
  });
  it("rejects expired reset tokens without changing the account", async () => {
    const user = await account("giulia");
    const token = randomBytes(32).toString("hex");
    await db.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: tokenDigest(token),
        expiresAt: new Date(0),
      },
    });
    await expect(
      resetPassword({ token, password: "a different long password" }, "client"),
    ).rejects.toThrow();
    expect(await validateSession(user.id, 0)).not.toBeNull();
  });
  it("ignores injected target IDs when updating a profile", async () => {
    const a = await account("giulia");
    const b = await account("marco");
    await updateOwnProfile(a, {
      userId: b.id,
      name: "New name",
      bio: "My bio",
      city: "Roma",
      visibility: "PRIVATE",
    });
    expect(await db.user.findUnique({ where: { id: b.id } })).toMatchObject({
      name: "marco",
    });
    expect(await getProfile("giulia")).toBeNull();
    expect(await getProfile("giulia", a.id)).toMatchObject({
      name: "New name",
    });
  });
  it("applies friendship privacy and both block directions", async () => {
    const a = await account("giulia");
    const b = await account("marco");
    await db.profile.update({
      where: { userId: a.id },
      data: { visibility: "FRIENDS" },
    });
    expect(await getProfile("giulia", b.id)).toBeNull();
    await db.friendship.create({ data: orderedPair(a.id, b.id) });
    expect(await getProfile("giulia", b.id)).not.toBeNull();
    for (const block of [
      { blockerId: a.id, blockedId: b.id },
      { blockerId: b.id, blockedId: a.id },
    ]) {
      await db.block.create({ data: block });
      expect(await getProfile("giulia", b.id)).toBeNull();
      await db.block.deleteMany();
    }
    const dto = await getProfile("giulia", a.id);
    expect(dto).not.toHaveProperty("email");
    expect(dto).not.toHaveProperty("passwordHash");
    expect(dto).not.toHaveProperty("birthDate");
  });
  it("enforces canonical friendships and one pending request in either direction", async () => {
    const a = await account("giulia");
    const b = await account("marco");
    const pair = orderedPair(a.id, b.id);
    await db.friendship.create({ data: pair });
    await expect(
      db.friendship.create({
        data: { userLowId: pair.userHighId, userHighId: pair.userLowId },
      }),
    ).rejects.toThrow();
    await expect(db.friendship.create({ data: pair })).rejects.toThrow();
    await db.friendRequest.create({
      data: { senderId: a.id, recipientId: b.id },
    });
    await expect(
      db.friendRequest.create({ data: { senderId: b.id, recipientId: a.id } }),
    ).rejects.toThrow();
  });
  it("requires exactly the two participants and rejects outsider messages", async () => {
    const a = await account("giulia");
    const b = await account("marco");
    const c = await account("sofia");
    await expect(
      db.conversation.create({ data: orderedPair(a.id, b.id) }),
    ).rejects.toThrow();
    const conversation = await db.conversation.create({
      data: {
        ...orderedPair(a.id, b.id),
        participants: { create: [{ userId: a.id }, { userId: b.id }] },
      },
    });
    await expect(
      db.message.create({
        data: {
          conversationId: conversation.id,
          senderId: c.id,
          body: "Intrusion",
          clientId: randomUUID(),
        },
      }),
    ).rejects.toThrow();
    await expect(
      db.message.create({
        data: {
          conversationId: conversation.id,
          senderId: a.id,
          body: "Hello",
          clientId: randomUUID(),
        },
      }),
    ).resolves.toHaveProperty("id");
  });
  it("saves the birth date for the owner but never exposes it publicly", async () => {
    const a = await account("giulia");
    await updateOwnProfile(a, {
      name: "giulia",
      bio: "",
      city: "",
      birthDate: "2000-05-01",
      visibility: "PUBLIC",
    });
    const own = await getOwnProfile(a.id);
    expect(own?.birthDate).toEqual(new Date("2000-05-01T00:00:00.000Z"));
    const publicDto = await getProfile("giulia", a.id);
    expect(publicDto).not.toHaveProperty("birthDate");
  });
  it("searches discoverable public profiles and excludes blocked users", async () => {
    const a = await account("giulia");
    const b = await account("marco");
    const c = await account("marcofoo");
    await db.profile.update({
      where: { userId: c.id },
      data: { discoverable: false },
    });
    await db.block.create({ data: { blockerId: a.id, blockedId: b.id } });
    const results = await searchProfiles({ query: "marco", viewerId: a.id });
    expect(results.profiles).toEqual([]);
    const noViewer = await searchProfiles({ query: "marco" });
    expect(noViewer.profiles.map((p) => p.username)).toEqual(["marco"]);
  });
  it("swaps the avatar and reports the previous asset for cleanup", async () => {
    const a = await account("giulia");
    const media = {
      userId: a.id,
      kind: "avatar" as const,
      mimeType: "image/webp",
      size: 1000,
      width: 256,
      height: 256,
    };
    const first = await applyProfileMedia({ ...media, storageKey: "blob://one" });
    expect(first.previousAssetId).toBeNull();
    const profileAfterFirst = await db.profile.findUniqueOrThrow({
      where: { userId: a.id },
    });
    expect(profileAfterFirst.avatarId).toBe(first.assetId);
    const second = await applyProfileMedia({ ...media, storageKey: "blob://two" });
    expect(second.previousAssetId).toBe(first.assetId);
    const profileAfterSecond = await db.profile.findUniqueOrThrow({
      where: { userId: a.id },
    });
    expect(profileAfterSecond.avatarId).toBe(second.assetId);
    expect(profileAfterSecond.coverId).toBeNull();
  });
  it("accepts instantly when a reverse request is already pending", async () => {
    const a = await account("giulia");
    const b = await account("marco");
    await sendFriendRequest(a.id, "marco");
    await sendFriendRequest(b.id, "giulia");
    expect(await getRelationship(a.id, "marco")).toEqual({ kind: "friends" });
    expect(await db.friendRequest.count({ where: { status: "PENDING" } })).toBe(0);
  });
  it("never ends up with both a friendship and a duplicate pending request under concurrency", async () => {
    const a = await account("giulia");
    const b = await account("marco");
    const outcomes = await Promise.allSettled([
      sendFriendRequest(a.id, "marco"),
      sendFriendRequest(b.id, "giulia"),
    ]);
    expect(outcomes.some((r) => r.status === "fulfilled")).toBe(true);
    const friendships = await db.friendship.count();
    const pending = await db.friendRequest.count({ where: { status: "PENDING" } });
    // Either they're already friends, or exactly one pending request survives.
    expect(friendships + pending).toBe(1);
  });
  it("rejects duplicate pending requests and self/blocked targets", async () => {
    const a = await account("giulia");
    const b = await account("marco");
    await sendFriendRequest(a.id, "marco");
    await expect(sendFriendRequest(a.id, "marco")).rejects.toThrow();
    await expect(sendFriendRequest(a.id, "giulia")).rejects.toThrow();
    await db.block.create({ data: { blockerId: b.id, blockedId: a.id } });
    await expect(sendFriendRequest(a.id, "marco")).rejects.toThrow();
  });
  it("accepts, rejects and cancels friend requests", async () => {
    const a = await account("giulia");
    const b = await account("marco");
    const c = await account("sofia");
    await sendFriendRequest(a.id, "marco");
    let pending = await listPendingRequests(b.id);
    await respondToFriendRequest(b.id, pending.incoming[0]!.requestId, true);
    expect(await getRelationship(a.id, "marco")).toEqual({ kind: "friends" });
    expect((await listFriends(a.id)).friends).toHaveLength(1);

    await sendFriendRequest(a.id, "sofia");
    pending = await listPendingRequests(c.id);
    await respondToFriendRequest(c.id, pending.incoming[0]!.requestId, false);
    expect(await getRelationship(a.id, "sofia")).toEqual({ kind: "none" });

    await sendFriendRequest(c.id, "giulia");
    const outgoing = await listPendingRequests(c.id);
    await cancelFriendRequest(c.id, outgoing.outgoing[0]!.requestId);
    expect(await getRelationship(a.id, "sofia")).toEqual({ kind: "none" });
  });
  it("blocking removes the friendship and cancels pending requests both ways", async () => {
    const a = await account("giulia");
    const b = await account("marco");
    await account("sofia");
    await sendFriendRequest(a.id, "marco");
    const pending = await listPendingRequests(b.id);
    await respondToFriendRequest(b.id, pending.incoming[0]!.requestId, true);
    await sendFriendRequest(a.id, "sofia");

    await blockUser(a.id, "marco");
    expect(await db.friendship.count()).toBe(0);
    expect((await listBlockedUsers(a.id)).map((p) => p.username)).toEqual([
      "marco",
    ]);
    // The unrelated pending request to sofia is untouched by blocking marco.
    expect(await getRelationship(a.id, "sofia")).toEqual({
      kind: "pending_outgoing",
      requestId: expect.any(String),
    });

    await unblockUser(a.id, "marco");
    expect(await listBlockedUsers(a.id)).toEqual([]);
    expect(await getRelationship(a.id, "marco")).toEqual({ kind: "none" });
  });
  it("removes a friendship in either direction", async () => {
    const a = await account("giulia");
    const b = await account("marco");
    await sendFriendRequest(a.id, "marco");
    const pending = await listPendingRequests(b.id);
    await respondToFriendRequest(b.id, pending.incoming[0]!.requestId, true);
    await removeFriendship(b.id, "giulia");
    expect(await db.friendship.count()).toBe(0);
    expect(await getRelationship(a.id, "marco")).toEqual({ kind: "none" });
  });
  it("limits concurrent requests atomically", async () => {
    const results = await Promise.allSettled(
      Array.from({ length: 12 }, () =>
        consumeRateLimit("test", "same-client", 5, 900),
      ),
    );
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(5);
  });
});
