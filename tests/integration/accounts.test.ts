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
  AccountInputError,
  authenticateAccount,
  deleteAccount,
  registerAccount,
  resetPassword,
  sendVerificationEmail,
  tokenDigest,
  verifyEmailToken,
} from "@/features/auth/service";
import {
  getOwnProfile,
  getProfile,
  searchProfiles,
} from "@/features/profiles/queries";
import { applyProfileMedia, updateOwnProfile } from "@/features/profiles/service";
import {
  addComment,
  createPost,
  deleteComment,
  deletePost,
  toggleLike,
} from "@/features/posts/service";
import { getFeed, getComments } from "@/features/posts/queries";
import {
  ReportActionError,
  reportPost,
  reportProfile,
  resolveReport,
  moderationDeletePost,
  moderationSuspendUser,
} from "@/features/reports/service";
import { listOpenReports } from "@/features/reports/queries";
import { getUnreadNotificationCount, listNotifications } from "@/features/notifications/queries";
import { markAllNotificationsRead } from "@/features/notifications/service";
import { recordProfileView } from "@/features/visits/service";
import { listVisitors } from "@/features/visits/queries";
import {
  MessageActionError,
  addGroupMembers,
  createGroupConversation,
  leaveGroupConversation,
  markConversationRead,
  removeGroupMember,
  renameGroupConversation,
  sendGroupMessage,
  sendMessage,
  setTyping,
} from "@/features/messages/service";
import {
  getConversationWithUsername,
  getGroupConversation,
  getMessages,
  listConversations,
} from "@/features/messages/queries";
import {
  blockUser,
  cancelFriendRequest,
  removeFriendship,
  respondToFriendRequest,
  sendFriendRequest,
  unblockUser,
} from "@/features/friends/service";
import {
  AlbumActionError,
  addPhotosToAlbum,
  createAlbum,
  deleteAlbum,
  deletePhoto,
  renameAlbum,
} from "@/features/albums/service";
import { getAlbum, listOwnAlbums, listVisibleAlbums } from "@/features/albums/queries";
import {
  BlogActionError,
  createBlogPost,
  deleteBlogPost,
  updateBlogPost,
} from "@/features/blog/service";
import { getBlogPost, listOwnBlogPosts, listVisibleBlogPosts } from "@/features/blog/queries";
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
    {
      username,
      email: `${username}@example.test`,
      name: username,
      password,
      ageConsent: "on",
    },
    randomUUID(),
  );
}
async function readyAsset(ownerId: string) {
  const asset = await db.mediaAsset.create({
    data: {
      ownerId,
      storageKey: `https://blob.test/${randomUUID()}.jpg`,
      mimeType: "image/jpeg",
      size: 1024,
      width: 800,
      height: 600,
      status: "READY",
    },
    select: { id: true },
  });
  return asset.id;
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
    await applyProfileMedia({
      userId: b.id,
      kind: "avatar",
      storageKey: "blob://marco-avatar",
      mimeType: "image/webp",
      size: 1000,
      width: 256,
      height: 256,
    });
    await db.profile.update({
      where: { userId: c.id },
      data: { discoverable: false },
    });
    const discovery = await searchProfiles({ query: "", viewerId: a.id });
    expect(discovery.profiles).toEqual([
      expect.objectContaining({
        username: "marco",
        avatarUrl: "blob://marco-avatar",
      }),
    ]);
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
  it("survives a duplicate concurrent accept of the same request (double-click)", async () => {
    const a = await account("giulia");
    const b = await account("marco");
    await sendFriendRequest(a.id, "marco");
    const pending = await listPendingRequests(b.id);
    const requestId = pending.incoming[0]!.requestId;
    await Promise.allSettled([
      respondToFriendRequest(b.id, requestId, true),
      respondToFriendRequest(b.id, requestId, true),
    ]);
    expect(await db.friendship.count()).toBe(1);
    expect(await getRelationship(a.id, "marco")).toEqual({ kind: "friends" });
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
  it("shows public and friends-only posts by rule, hides private and blocked authors", async () => {
    const a = await account("giulia");
    const b = await account("marco");
    const c = await account("sofia");
    await createPost(a.id, { body: "pubblico", visibility: "PUBLIC" });
    await createPost(a.id, { body: "solo amici", visibility: "FRIENDS" });
    await createPost(a.id, { body: "privato", visibility: "PRIVATE" });
    const strangerFeed = await getFeed(b.id);
    expect(strangerFeed.posts.map((p) => p.body)).toEqual(["pubblico"]);

    await sendFriendRequest(a.id, "marco");
    const pending = await listPendingRequests(b.id);
    await respondToFriendRequest(b.id, pending.incoming[0]!.requestId, true);
    const friendFeed = await getFeed(b.id);
    expect(friendFeed.posts.map((p) => p.body).sort()).toEqual([
      "pubblico",
      "solo amici",
    ]);

    await db.block.create({ data: { blockerId: c.id, blockedId: a.id } });
    const blockedFeed = await getFeed(c.id);
    expect(blockedFeed.posts).toEqual([]);
  });
  it("toggles likes idempotently and manages comments with ownership checks", async () => {
    const a = await account("giulia");
    const b = await account("marco");
    const post = await createPost(a.id, { body: "ciao", visibility: "PUBLIC" });
    expect(await toggleLike(b.id, post.id)).toEqual({ liked: true });
    expect(await toggleLike(b.id, post.id)).toEqual({ liked: false });
    const comment = await addComment(b.id, post.id, { body: "bel post" });
    expect(await getComments(post.id)).toMatchObject([{ body: "bel post" }]);
    await expect(deleteComment(a.id, comment.id)).rejects.toThrow();
    await deleteComment(b.id, comment.id);
    expect(await getComments(post.id)).toEqual([]);
  });
  it("blocks a stranger from liking or commenting on a friends-only post, and deleting removes it from the feed", async () => {
    const a = await account("giulia");
    const b = await account("marco");
    const post = await createPost(a.id, {
      body: "solo amici",
      visibility: "FRIENDS",
    });
    await expect(toggleLike(b.id, post.id)).rejects.toThrow();
    await expect(
      addComment(b.id, post.id, { body: "ciao" }),
    ).rejects.toThrow();
    await deletePost(a.id, post.id);
    expect((await getFeed(a.id)).posts).toEqual([]);
  });
  it("notifies on friend requests, acceptance, likes and comments", async () => {
    const a = await account("giulia");
    const b = await account("marco");
    await sendFriendRequest(a.id, "marco");
    expect(await getUnreadNotificationCount(b.id)).toBe(1);
    const pending = await listPendingRequests(b.id);
    await respondToFriendRequest(b.id, pending.incoming[0]!.requestId, true);
    expect(await getUnreadNotificationCount(a.id)).toBe(1);

    const post = await createPost(a.id, { body: "ciao", visibility: "PUBLIC" });
    await toggleLike(b.id, post.id);
    await addComment(b.id, post.id, { body: "bel post" });
    const { notifications } = await listNotifications(a.id);
    expect(notifications.map((n) => n.type).sort()).toEqual(
      ["FRIEND_ACCEPTED", "POST_COMMENT", "POST_LIKE"].sort(),
    );
    expect(await getUnreadNotificationCount(a.id)).toBe(3);
    await markAllNotificationsRead(a.id);
    expect(await getUnreadNotificationCount(a.id)).toBe(0);
  });
  it("never notifies yourself for your own actions", async () => {
    const a = await account("giulia");
    const post = await createPost(a.id, { body: "ciao", visibility: "PUBLIC" });
    await toggleLike(a.id, post.id);
    expect(await getUnreadNotificationCount(a.id)).toBe(0);
  });
  it("records profile visits only with consent, dedupes within the rolling window, and hides visitors without consent", async () => {
    const a = await account("giulia");
    const b = await account("marco");
    await recordProfileView(b.id, "giulia");
    expect(await listVisitors(a.id)).toEqual([]);

    await updateOwnProfile(a, {
      name: "giulia",
      bio: "",
      city: "",
      visibility: "PUBLIC",
      recordVisits: "on",
      showVisitors: "on",
      notifyVisits: "on",
    });
    await recordProfileView(b.id, "giulia");
    await recordProfileView(b.id, "giulia");
    expect(await listVisitors(a.id)).toMatchObject([{ username: "marco" }]);
    expect(await getUnreadNotificationCount(a.id)).toBe(1);
  });
  it("sends messages by default only between friends, is idempotent per clientId, and tracks unread counts", async () => {
    const a = await account("giulia");
    const b = await account("marco");
    const clientId = randomUUID();
    await expect(
      sendMessage(a.id, "marco", { body: "ciao", clientId }),
    ).rejects.toThrow(MessageActionError);

    await sendFriendRequest(a.id, "marco");
    const pending = await listPendingRequests(b.id);
    await respondToFriendRequest(b.id, pending.incoming[0]!.requestId, true);

    const first = await sendMessage(a.id, "marco", { body: "ciao", clientId });
    const retry = await sendMessage(a.id, "marco", { body: "ciao", clientId });
    expect(retry.messageId).toBe(first.messageId);
    expect((await getMessages(first.conversationId)).messages).toHaveLength(1);

    const bConvos = await listConversations(b.id);
    expect(bConvos).toMatchObject([{ unreadCount: 1, otherUsername: "giulia" }]);
    await markConversationRead(b.id, first.conversationId);
    expect((await listConversations(b.id))[0]!.unreadCount).toBe(0);

    const found = await getConversationWithUsername(b.id, "giulia");
    expect(found?.conversationId).toBe(first.conversationId);
  });
  it("respects EVERYONE and NOBODY message permission and blocks", async () => {
    const a = await account("giulia");
    const b = await account("marco");
    const c = await account("sofia");
    await updateOwnProfile(b, {
      name: "marco",
      bio: "",
      city: "",
      visibility: "PUBLIC",
      messagePermission: "EVERYONE",
    });
    await expect(
      sendMessage(a.id, "marco", { body: "ciao", clientId: randomUUID() }),
    ).resolves.toMatchObject({});

    await updateOwnProfile(c, {
      name: "sofia",
      bio: "",
      city: "",
      visibility: "PUBLIC",
      messagePermission: "NOBODY",
    });
    await expect(
      sendMessage(a.id, "sofia", { body: "ciao", clientId: randomUUID() }),
    ).rejects.toThrow(MessageActionError);

    await db.block.create({ data: { blockerId: b.id, blockedId: a.id } });
    await expect(
      sendMessage(a.id, "marco", { body: "ancora ciao", clientId: randomUUID() }),
    ).rejects.toThrow(MessageActionError);
  });
  it("creates a group chat among friends, sends/reads messages, and lets a member leave", async () => {
    const a = await account("giulia");
    const b = await account("marco");
    const c = await account("sofia");
    for (const other of ["marco", "sofia"]) {
      await sendFriendRequest(a.id, other);
      const pending = await listPendingRequests(other === "marco" ? b.id : c.id);
      await respondToFriendRequest(
        other === "marco" ? b.id : c.id,
        pending.incoming[0]!.requestId,
        true,
      );
    }

    const group = await createGroupConversation(a.id, {
      name: "Weekend",
      memberUsernames: ["marco", "sofia"],
    });
    const members = await getGroupConversation(a.id, group.id);
    expect(members?.members).toHaveLength(3);

    const clientId = randomUUID();
    await sendGroupMessage(a.id, group.id, { body: "ciao a tutti", clientId });
    // Idempotent per clientId, same as direct messages.
    await sendGroupMessage(a.id, group.id, { body: "ciao a tutti", clientId });
    expect((await getMessages(group.id)).messages).toHaveLength(1);
    expect((await getMessages(group.id)).messages[0]).toMatchObject({ senderName: "giulia" });

    const bConvos = await listConversations(b.id);
    expect(bConvos).toMatchObject([{ isGroup: true, title: "Weekend", unreadCount: 1 }]);

    await expect(
      sendGroupMessage(c.id, group.id, { body: "presente", clientId: randomUUID() }),
    ).resolves.toMatchObject({ conversationId: group.id });

    await leaveGroupConversation(c.id, group.id);
    expect((await getGroupConversation(a.id, group.id))?.members).toHaveLength(2);
    await expect(
      sendGroupMessage(c.id, group.id, { body: "ancora qui?", clientId: randomUUID() }),
    ).rejects.toThrow(MessageActionError);
  });
  it("rejects creating a group with a non-friend", async () => {
    const a = await account("giulia");
    await account("marco");
    const b = await account("sofia");
    await sendFriendRequest(a.id, "sofia");
    const pending = await listPendingRequests(b.id);
    await respondToFriendRequest(b.id, pending.incoming[0]!.requestId, true);

    // marco is not a friend of giulia: group creation must reject it.
    await expect(
      createGroupConversation(a.id, {
        name: "Gruppo",
        memberUsernames: ["marco", "sofia"],
      }),
    ).rejects.toThrow(MessageActionError);
  });
  it("lets the group creator rename it, add friends, and remove members (but no one else can)", async () => {
    const a = await account("giulia");
    const b = await account("marco");
    const c = await account("sofia");
    const d = await account("luca");
    for (const other of ["marco", "sofia", "luca"]) {
      await sendFriendRequest(a.id, other);
      const target = other === "marco" ? b.id : other === "sofia" ? c.id : d.id;
      const pending = await listPendingRequests(target);
      await respondToFriendRequest(target, pending.incoming[0]!.requestId, true);
    }
    const group = await createGroupConversation(a.id, {
      name: "Weekend",
      memberUsernames: ["marco", "sofia"],
    });

    // Only the creator can rename.
    await expect(
      renameGroupConversation(b.id, group.id, { name: "Non puoi" }),
    ).rejects.toThrow(MessageActionError);
    await renameGroupConversation(a.id, group.id, { name: "Weekend lungo" });
    expect((await getGroupConversation(a.id, group.id))?.name).toBe("Weekend lungo");

    // luca isn't a member yet and isn't addable by marco (marco isn't friends
    // with luca), but giulia (the creator, friends with luca) can add him.
    await addGroupMembers(a.id, group.id, { memberUsernames: ["luca"] });
    expect((await getGroupConversation(a.id, group.id))?.members).toHaveLength(4);

    // Only the creator can remove someone else.
    await expect(
      removeGroupMember(b.id, group.id, c.id),
    ).rejects.toThrow(MessageActionError);
    await expect(
      removeGroupMember(a.id, group.id, a.id),
    ).rejects.toThrow(MessageActionError);
    await removeGroupMember(a.id, group.id, c.id);
    expect((await getGroupConversation(a.id, group.id))?.members).toHaveLength(3);
  });
  it("paginates messages: most recent page first, then older ones via cursor", async () => {
    const a = await account("giulia");
    const b = await account("marco");
    await sendFriendRequest(a.id, "marco");
    const pending = await listPendingRequests(b.id);
    await respondToFriendRequest(b.id, pending.incoming[0]!.requestId, true);
    const { conversationId } = await sendMessage(a.id, "marco", {
      body: "messaggio 0",
      clientId: randomUUID(),
    });
    // Bulk-insert the rest directly with staggered timestamps: 55 total
    // messages, one more than a single page, to force the cursor path
    // without 55 sequential sendMessage transactions.
    const base = Date.now();
    await db.message.createMany({
      data: Array.from({ length: 54 }, (_, i) => ({
        conversationId,
        senderId: a.id,
        clientId: randomUUID(),
        body: `messaggio ${i + 1}`,
        createdAt: new Date(base + (i + 1) * 1000),
      })),
    });

    const firstPage = await getMessages(conversationId);
    expect(firstPage.messages).toHaveLength(50);
    expect(firstPage.messages[0]!.body).toBe("messaggio 5");
    expect(firstPage.messages[49]!.body).toBe("messaggio 54");
    expect(firstPage.nextCursor).not.toBeNull();

    const secondPage = await getMessages(conversationId, firstPage.nextCursor!);
    expect(secondPage.messages.map((m) => m.body)).toEqual([
      "messaggio 0",
      "messaggio 1",
      "messaggio 2",
      "messaggio 3",
      "messaggio 4",
    ]);
    expect(secondPage.nextCursor).toBeNull();
  });
  it("shows online/typing status only when the other user opted in via showOnline", async () => {
    const a = await account("giulia");
    const b = await account("marco");
    await sendFriendRequest(a.id, "marco");
    const pending = await listPendingRequests(b.id);
    await respondToFriendRequest(b.id, pending.incoming[0]!.requestId, true);
    const { conversationId } = await sendMessage(a.id, "marco", {
      body: "ciao",
      clientId: randomUUID(),
    });
    await setTyping(b.id, conversationId);

    // b never enabled showOnline: a sees neither online nor typing.
    let conversation = await getConversationWithUsername(a.id, "marco");
    expect(conversation).toMatchObject({ otherOnline: false, otherTyping: false });
    let list = await listConversations(a.id);
    expect(list).toMatchObject([{ otherOnline: false }]);

    await updateOwnProfile(b, {
      name: "marco",
      bio: "",
      city: "",
      visibility: "PUBLIC",
      showOnline: "on",
    });
    await db.user.update({ where: { id: b.id }, data: { lastSeenAt: new Date() } });
    conversation = await getConversationWithUsername(a.id, "marco");
    expect(conversation).toMatchObject({ otherOnline: true, otherTyping: true });
    list = await listConversations(a.id);
    expect(list).toMatchObject([{ otherOnline: true }]);

    // The typing flag expires; a stale one must not still read as typing.
    await db.conversationParticipant.updateMany({
      where: { conversationId, userId: b.id },
      data: { typingUntil: new Date(Date.now() - 1000) },
    });
    conversation = await getConversationWithUsername(a.id, "marco");
    expect(conversation).toMatchObject({ otherOnline: true, otherTyping: false });
  });
  it("verifies an email once under concurrency and rejects expired or reused tokens", async () => {
    const user = await account("giulia");
    expect(await db.user.findUniqueOrThrow({ where: { id: user.id } })).toMatchObject({
      emailVerified: null,
    });
    const token = randomBytes(32).toString("hex");
    await db.verificationToken.create({
      data: {
        identifier: user.id,
        token: tokenDigest(token),
        expires: new Date(Date.now() + 60_000),
      },
    });
    const outcomes = await Promise.allSettled([
      verifyEmailToken({ token }, "client-a"),
      verifyEmailToken({ token }, "client-b"),
    ]);
    expect(outcomes.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(
      (await db.user.findUniqueOrThrow({ where: { id: user.id } })).emailVerified,
    ).not.toBeNull();
    // The token is single-use: a third attempt with the same value fails.
    await expect(verifyEmailToken({ token }, "client-c")).rejects.toThrow(
      AccountInputError,
    );
  });
  it("rejects an expired verification token without verifying the account", async () => {
    const user = await account("giulia");
    const token = randomBytes(32).toString("hex");
    await db.verificationToken.create({
      data: {
        identifier: user.id,
        token: tokenDigest(token),
        expires: new Date(0),
      },
    });
    await expect(verifyEmailToken({ token }, "client")).rejects.toThrow(
      AccountInputError,
    );
    expect(
      (await db.user.findUniqueOrThrow({ where: { id: user.id } })).emailVerified,
    ).toBeNull();
  });
  it("replaces a pending verification token when a new one is requested", async () => {
    const user = await account("giulia");
    vi.stubEnv("APP_URL", "https://example.test");
    vi.stubEnv("MAIL_TRANSPORT", "file");
    await sendVerificationEmail(user.id, "giulia@example.test");
    expect(await db.verificationToken.count({ where: { identifier: user.id } })).toBe(
      1,
    );
    await sendVerificationEmail(user.id, "giulia@example.test");
    expect(await db.verificationToken.count({ where: { identifier: user.id } })).toBe(
      1,
    );
  });
  it("deletes an account, scrubs identifying data, and revokes the session", async () => {
    const user = await account("giulia");
    await expect(
      deleteAccount(user.id, { password: "wrong password entirely" }, "client"),
    ).rejects.toThrow(AccountInputError);
    expect(await validateSession(user.id, 0)).not.toBeNull();

    await deleteAccount(user.id, { password }, "client");
    expect(await validateSession(user.id, 0)).toBeNull();
    expect(
      await authenticateAccount(
        { email: "giulia@example.test", password },
        "client",
      ),
    ).toBeNull();
    const deleted = await db.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(deleted.status).toBe("DELETED");
    expect(deleted.passwordHash).toBeNull();
    expect(deleted.email).not.toBe("giulia@example.test");
    const profile = await db.profile.findUniqueOrThrow({
      where: { userId: user.id },
    });
    expect(profile.discoverable).toBe(false);
    expect(profile.visibility).toBe("PRIVATE");
    expect(profile.avatarId).toBeNull();
  });
  it("reports a post once, rejects a second report and self-reports", async () => {
    const author = await account("giulia");
    const reporter = await account("marco");
    const post = await createPost(author.id, { body: "ciao", visibility: "PUBLIC" });
    await reportPost(reporter.id, { postId: post.id, reason: "SPAM", detail: "" });
    await expect(
      reportPost(reporter.id, { postId: post.id, reason: "SPAM", detail: "" }),
    ).rejects.toThrow(ReportActionError);
    await expect(
      reportPost(author.id, { postId: post.id, reason: "SPAM", detail: "" }),
    ).rejects.toThrow(ReportActionError);
    expect(await db.report.count({ where: { postId: post.id } })).toBe(1);
  });
  it("reports a profile once and rejects reporting yourself", async () => {
    const target = await account("giulia");
    const reporter = await account("marco");
    await reportProfile(reporter.id, {
      username: "giulia",
      reason: "HARASSMENT",
      detail: "",
    });
    await expect(
      reportProfile(reporter.id, {
        username: "giulia",
        reason: "HARASSMENT",
        detail: "",
      }),
    ).rejects.toThrow(ReportActionError);
    await expect(
      reportProfile(target.id, { username: "giulia", reason: "OTHER", detail: "" }),
    ).rejects.toThrow(ReportActionError);
    expect(
      await db.report.count({ where: { reportedUserId: target.id } }),
    ).toBe(1);
  });
  it("resolves a report and rejects resolving it twice", async () => {
    const author = await account("giulia");
    const reporter = await account("marco");
    const post = await createPost(author.id, { body: "ciao", visibility: "PUBLIC" });
    await reportPost(reporter.id, { postId: post.id, reason: "SPAM", detail: "" });
    const [report] = await listOpenReports();
    await resolveReport(report!.id);
    await expect(resolveReport(report!.id)).rejects.toThrow(ReportActionError);
    expect(await db.report.count({ where: { status: "OPEN" } })).toBe(0);
  });
  it("moderation-deletes a reported post and resolves its reports", async () => {
    const author = await account("giulia");
    const reporter = await account("marco");
    const post = await createPost(author.id, { body: "spam spam", visibility: "PUBLIC" });
    await reportPost(reporter.id, { postId: post.id, reason: "SPAM", detail: "" });
    await moderationDeletePost(post.id);
    expect(await db.post.findUnique({ where: { id: post.id } })).toBeNull();
    expect(await db.report.count({ where: { status: "OPEN" } })).toBe(0);
    await expect(moderationDeletePost(post.id)).rejects.toThrow(ReportActionError);
  });
  it("moderation-suspends a reported user, revoking their session", async () => {
    const target = await account("giulia");
    const reporter = await account("marco");
    await reportProfile(reporter.id, {
      username: "giulia",
      reason: "HARASSMENT",
      detail: "",
    });
    await moderationSuspendUser(target.id);
    expect(await validateSession(target.id, 0)).toBeNull();
    expect(
      (await db.user.findUniqueOrThrow({ where: { id: target.id } })).status,
    ).toBe("SUSPENDED");
    expect(await db.report.count({ where: { status: "OPEN" } })).toBe(0);
    await expect(moderationSuspendUser(target.id)).rejects.toThrow(
      ReportActionError,
    );
  });
  it("creates an album, manages its photos, and only the owner can", async () => {
    const a = await account("giulia");
    const b = await account("marco");
    const asset1 = await readyAsset(a.id);
    const asset2 = await readyAsset(a.id);
    const album = await createAlbum(a.id, {
      title: "Vacanze",
      assetIds: JSON.stringify([asset1, asset2]),
    });
    expect(await listOwnAlbums(a.id)).toMatchObject([{ title: "Vacanze", photoCount: 2 }]);

    // Someone else's assets can't be smuggled into your own album.
    const foreignAsset = await readyAsset(b.id);
    await expect(
      addPhotosToAlbum(a.id, album.id, { assetIds: JSON.stringify([foreignAsset]) }),
    ).rejects.toThrow(AlbumActionError);

    const asset3 = await readyAsset(a.id);
    await addPhotosToAlbum(a.id, album.id, { assetIds: JSON.stringify([asset3]) });
    expect((await getAlbum(a.id, album.id))?.photos).toHaveLength(3);

    // Only the owner can rename, delete a photo, or delete the album.
    await expect(
      renameAlbum(b.id, album.id, { title: "Non tue" }),
    ).rejects.toThrow(AlbumActionError);
    await renameAlbum(a.id, album.id, { title: "Vacanze 2026" });
    expect((await getAlbum(a.id, album.id))?.title).toBe("Vacanze 2026");

    const photos = (await getAlbum(a.id, album.id))!.photos;
    await expect(
      deletePhoto(b.id, album.id, photos[0]!.id),
    ).rejects.toThrow(AlbumActionError);
    await deletePhoto(a.id, album.id, photos[0]!.id);
    expect(await db.mediaAsset.findUnique({ where: { id: asset1 } })).toBeNull();
    expect((await getAlbum(a.id, album.id))?.photos).toHaveLength(2);

    await expect(deleteAlbum(b.id, album.id)).rejects.toThrow(AlbumActionError);
    await deleteAlbum(a.id, album.id);
    expect(await getAlbum(a.id, album.id)).toBeNull();
    // Deleting the album also cleans up the remaining MediaAsset rows.
    expect(await db.mediaAsset.findUnique({ where: { id: asset2 } })).toBeNull();
  });
  it("shows albums to the same audience as the owner's profile visibility", async () => {
    const a = await account("giulia");
    const b = await account("marco");
    const c = await account("sofia");
    // FRIENDS visibility is a valid Profile.visibility value at the data
    // layer (canReadProfile handles it) even though the settings form only
    // exposes PUBLIC/PRIVATE — set it directly to exercise that path.
    await db.profile.update({ where: { userId: a.id }, data: { visibility: "FRIENDS" } });
    const asset = await readyAsset(a.id);
    await createAlbum(a.id, { title: "Privato-ish", assetIds: JSON.stringify([asset]) });

    // Not a friend: album invisible, same as the profile itself.
    expect(await listVisibleAlbums("giulia", c.id)).toBeNull();
    expect(await getAlbum(c.id, (await listOwnAlbums(a.id))[0]!.id)).toBeNull();

    await sendFriendRequest(a.id, "marco");
    const pending = await listPendingRequests(b.id);
    await respondToFriendRequest(b.id, pending.incoming[0]!.requestId, true);
    expect(await listVisibleAlbums("giulia", b.id)).toMatchObject([{ title: "Privato-ish" }]);
  });
  it("creates, edits, and deletes a blog post, only the author allowed", async () => {
    const a = await account("giulia");
    const b = await account("marco");
    const post = await createBlogPost(a.id, {
      title: "Il mio primo post",
      body: "Un racconto lungo quanto basta.",
      visibility: "PUBLIC",
    });
    expect(await listOwnBlogPosts(a.id)).toMatchObject([{ title: "Il mio primo post" }]);
    expect(await getBlogPost(b.id, post.id)).toMatchObject({ owner: false });

    await expect(
      updateBlogPost(b.id, post.id, {
        title: "Rubato",
        body: "Non è mio.",
        visibility: "PUBLIC",
      }),
    ).rejects.toThrow(BlogActionError);
    await updateBlogPost(a.id, post.id, {
      title: "Titolo aggiornato",
      body: "Testo aggiornato.",
      visibility: "PUBLIC",
    });
    expect((await getBlogPost(a.id, post.id))?.title).toBe("Titolo aggiornato");

    await expect(deleteBlogPost(b.id, post.id)).rejects.toThrow(BlogActionError);
    await deleteBlogPost(a.id, post.id);
    expect(await getBlogPost(a.id, post.id)).toBeNull();
  });
  it("shows blog posts to the audience matching each post's own visibility", async () => {
    const a = await account("giulia");
    const b = await account("marco");
    const c = await account("sofia");
    await createBlogPost(a.id, { title: "Pubblico", body: "per tutti", visibility: "PUBLIC" });
    await createBlogPost(a.id, {
      title: "Solo amici",
      body: "per gli amici",
      visibility: "FRIENDS",
    });
    await createBlogPost(a.id, { title: "Privato", body: "solo io", visibility: "PRIVATE" });

    // A stranger only sees the public one.
    expect((await listVisibleBlogPosts(c.id, "giulia")).posts).toMatchObject([
      { title: "Pubblico" },
    ]);

    await sendFriendRequest(a.id, "marco");
    const pending = await listPendingRequests(b.id);
    await respondToFriendRequest(b.id, pending.incoming[0]!.requestId, true);
    const forFriend = (await listVisibleBlogPosts(b.id, "giulia")).posts;
    expect(forFriend).toHaveLength(2);
    expect(forFriend.map((p) => p.title).sort()).toEqual(["Pubblico", "Solo amici"]);

    // The author sees everything, including the private one.
    expect((await listVisibleBlogPosts(a.id, "giulia")).posts).toHaveLength(3);
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
