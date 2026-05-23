import { Router } from "express";
import { db } from "@workspace/db";
import { messageThreadsTable, messagesTable, profilesTable } from "@workspace/db";
import { eq, or, desc, and, ne } from "drizzle-orm";
import crypto from "crypto";
import { broadcast } from "../lib/websocket";

const router = Router();

// GET /messages/threads
router.get("/messages/threads", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const userId = req.user.id;

  try {
    const threads = await db.select().from(messageThreadsTable)
      .where(or(eq(messageThreadsTable.participantA, userId), eq(messageThreadsTable.participantB, userId)))
      .orderBy(desc(messageThreadsTable.lastMessageAt));

    const enriched = await Promise.all(threads.map(async (t) => {
      const otherId = t.participantA === userId ? t.participantB : t.participantA;
      const [profile] = await db.select({ displayName: profilesTable.displayName, avatarUrl: profilesTable.avatarUrl })
        .from(profilesTable).where(eq(profilesTable.userId, otherId));

      const unreadMessages = await db.select({ id: messagesTable.id }).from(messagesTable)
        .where(and(eq(messagesTable.threadId, t.id), eq(messagesTable.read, false), ne(messagesTable.senderId, userId)));
      const unreadCount = unreadMessages.length;

      return {
        ...t,
        otherUserId: otherId,
        otherUserName: profile?.displayName ?? "Artist",
        otherUserAvatar: profile?.avatarUrl ?? null,
        unreadCount,
        lastMessageAt: t.lastMessageAt.toISOString(),
      };
    }));

    res.json({ threads: enriched });
  } catch (err) {
    req.log.error({ err }, "getThreads error");
    res.status(500).json({ error: "Failed to load threads" });
  }
});

// GET /messages/threads/:threadId — includes thread metadata + messages
router.get("/messages/threads/:threadId", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const { threadId } = req.params;
  const userId = req.user.id;

  try {
    const [thread] = await db.select().from(messageThreadsTable).where(eq(messageThreadsTable.id, threadId));
    if (!thread) { res.status(404).json({ error: "Thread not found" }); return; }
    if (thread.participantA !== userId && thread.participantB !== userId) {
      res.status(403).json({ error: "Forbidden" }); return;
    }

    const otherId = thread.participantA === userId ? thread.participantB : thread.participantA;
    const [otherProfile] = await db.select({
      displayName: profilesTable.displayName,
      avatarUrl: profilesTable.avatarUrl,
      handle: profilesTable.handle,
    }).from(profilesTable).where(eq(profilesTable.userId, otherId));

    const messages = await db.select().from(messagesTable)
      .where(eq(messagesTable.threadId, threadId))
      .orderBy(desc(messagesTable.createdAt))
      .limit(50);

    await db.update(messagesTable)
      .set({ read: true })
      .where(and(eq(messagesTable.threadId, threadId), eq(messagesTable.read, false), ne(messagesTable.senderId, userId)));

    res.json({
      thread: {
        ...thread,
        otherUserId: otherId,
        otherUserName: otherProfile?.displayName ?? "Artist",
        otherUserHandle: otherProfile?.handle ?? null,
        otherUserAvatar: otherProfile?.avatarUrl ?? null,
        lastMessageAt: thread.lastMessageAt.toISOString(),
      },
      messages: messages.map((m) => ({ ...m, createdAt: m.createdAt.toISOString() })),
    });
  } catch (err) {
    req.log.error({ err }, "getMessages error");
    res.status(500).json({ error: "Failed to load messages" });
  }
});

// GET /messages/thread-by-user/:userId — find existing thread between current user and another user
router.get("/messages/thread-by-user/:userId", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const { userId } = req.params;
  const me = req.user.id;

  try {
    const [thread] = await db.select().from(messageThreadsTable)
      .where(or(
        and(eq(messageThreadsTable.participantA, me), eq(messageThreadsTable.participantB, userId)),
        and(eq(messageThreadsTable.participantA, userId), eq(messageThreadsTable.participantB, me)),
      ));

    const [otherProfile] = await db.select({
      displayName: profilesTable.displayName,
      avatarUrl: profilesTable.avatarUrl,
      handle: profilesTable.handle,
    }).from(profilesTable).where(eq(profilesTable.userId, userId));

    res.json({
      threadId: thread?.id ?? null,
      otherUser: otherProfile
        ? { displayName: otherProfile.displayName, avatarUrl: otherProfile.avatarUrl, handle: otherProfile.handle }
        : null,
    });
  } catch (err) {
    req.log.error({ err }, "threadByUser error");
    res.status(500).json({ error: "Failed to look up thread" });
  }
});

// POST /messages/threads/:threadId/read — mark all received messages in the thread as read
router.post("/messages/threads/:threadId/read", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const { threadId } = req.params;
  const userId = req.user.id;

  try {
    const [thread] = await db.select().from(messageThreadsTable).where(eq(messageThreadsTable.id, threadId));
    if (!thread) { res.status(404).json({ error: "Thread not found" }); return; }
    if (thread.participantA !== userId && thread.participantB !== userId) {
      res.status(403).json({ error: "Forbidden" }); return;
    }

    await db.update(messagesTable)
      .set({ read: true })
      .where(and(eq(messagesTable.threadId, threadId), eq(messagesTable.read, false), ne(messagesTable.senderId, userId)));

    res.status(204).end();
  } catch (err) {
    req.log.error({ err }, "markThreadRead error");
    res.status(500).json({ error: "Failed to mark thread as read" });
  }
});

// POST /messages/typing — broadcast a typing indicator to the other participant
router.post("/messages/typing", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const { threadId } = req.body as { threadId?: string };
  if (!threadId) { res.status(400).json({ error: "threadId required" }); return; }

  const userId = req.user.id;

  try {
    const [thread] = await db.select().from(messageThreadsTable).where(eq(messageThreadsTable.id, threadId));
    if (!thread) { res.status(404).json({ error: "Thread not found" }); return; }
    if (thread.participantA !== userId && thread.participantB !== userId) {
      res.status(403).json({ error: "Forbidden" }); return;
    }

    const recipientId = thread.participantA === userId ? thread.participantB : thread.participantA;
    broadcast(recipientId, { type: "typing", threadId, userId });
    res.status(204).end();
  } catch (err) {
    req.log.error({ err }, "typing indicator error");
    res.status(500).json({ error: "Failed to send typing indicator" });
  }
});

// POST /messages/send
router.post("/messages/send", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }

  const { recipientId, text, attachmentUrl } = req.body as { recipientId?: string; text?: string; attachmentUrl?: string };
  const trimmedText = text?.trim() ?? "";
  if (!recipientId || (!trimmedText && !attachmentUrl)) {
    res.status(400).json({ error: "recipientId and either text or attachmentUrl required" }); return;
  }

  // Validate attachmentUrl: must be a same-origin storage path — no external URLs,
  // no javascript:/data: schemes, no arbitrary hosts.
  if (attachmentUrl !== undefined && attachmentUrl !== null) {
    const isValidStoragePath = typeof attachmentUrl === "string" && /^\/api\/storage\/objects\/[a-zA-Z0-9_\-/.]+$/.test(attachmentUrl);
    if (!isValidStoragePath) {
      res.status(400).json({ error: "Invalid attachmentUrl: must be a storage object path" }); return;
    }
  }

  const senderId = req.user.id;
  const user = req.user;

  try {
    let thread = await db.select().from(messageThreadsTable)
      .where(or(
        and(eq(messageThreadsTable.participantA, senderId), eq(messageThreadsTable.participantB, recipientId)),
        and(eq(messageThreadsTable.participantA, recipientId), eq(messageThreadsTable.participantB, senderId)),
      )).then((r) => r[0]);

    const lastMsgPreview = trimmedText || "📎 Image";

    if (!thread) {
      const [created] = await db.insert(messageThreadsTable).values({
        id: crypto.randomUUID(),
        participantA: senderId,
        participantB: recipientId,
        lastMessageText: lastMsgPreview,
        lastMessageAttachmentUrl: attachmentUrl ?? null,
      }).returning();
      thread = created;
    }

    const [message] = await db.insert(messagesTable).values({
      id: crypto.randomUUID(),
      threadId: thread.id,
      senderId,
      senderName: [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email || "Artist",
      senderAvatarUrl: user.profileImageUrl ?? null,
      text: trimmedText,
      attachmentUrl: attachmentUrl ?? null,
    }).returning();

    await db.update(messageThreadsTable)
      .set({ lastMessageAt: new Date(), lastMessageText: lastMsgPreview, lastMessageAttachmentUrl: attachmentUrl ?? null })
      .where(eq(messageThreadsTable.id, thread.id));

    broadcast(recipientId, { type: "message", threadId: thread.id, senderId, recipientId });

    res.status(201).json({
      ...message,
      threadId: thread.id,
      createdAt: message.createdAt.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "sendMessage error");
    res.status(500).json({ error: "Failed to send message" });
  }
});

export default router;
