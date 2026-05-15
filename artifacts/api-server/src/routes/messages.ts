import { Router } from "express";
import { db } from "@workspace/db";
import { messageThreadsTable, messagesTable, profilesTable } from "@workspace/db";
import { eq, or, desc, and } from "drizzle-orm";
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
        .where(and(eq(messagesTable.threadId, t.id), eq(messagesTable.read, false)));
      const unreadCount = unreadMessages.filter((m) => true).length;

      return {
        ...t,
        otherUserId: otherId,
        otherUserName: profile?.displayName ?? null,
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

// GET /messages/threads/:threadId
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

    const messages = await db.select().from(messagesTable)
      .where(eq(messagesTable.threadId, threadId))
      .orderBy(desc(messagesTable.createdAt))
      .limit(50);

    // Mark messages as read
    await db.update(messagesTable)
      .set({ read: true })
      .where(and(eq(messagesTable.threadId, threadId), eq(messagesTable.read, false)));

    res.json({ messages: messages.map((m) => ({ ...m, createdAt: m.createdAt.toISOString() })) });
  } catch (err) {
    req.log.error({ err }, "getMessages error");
    res.status(500).json({ error: "Failed to load messages" });
  }
});

// POST /messages/send
router.post("/messages/send", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }

  const { recipientId, text } = req.body;
  if (!recipientId || !text?.trim()) { res.status(400).json({ error: "recipientId and text required" }); return; }

  const senderId = req.user.id;
  const user = req.user;

  try {
    // Find or create thread
    let thread = await db.select().from(messageThreadsTable)
      .where(or(
        and(eq(messageThreadsTable.participantA, senderId), eq(messageThreadsTable.participantB, recipientId)),
        and(eq(messageThreadsTable.participantA, recipientId), eq(messageThreadsTable.participantB, senderId)),
      )).then((r) => r[0]);

    if (!thread) {
      const [created] = await db.insert(messageThreadsTable).values({
        id: crypto.randomUUID(),
        participantA: senderId,
        participantB: recipientId,
        lastMessageText: text.trim(),
      }).returning();
      thread = created;
    }

    const [message] = await db.insert(messagesTable).values({
      id: crypto.randomUUID(),
      threadId: thread.id,
      senderId,
      senderName: [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email || "Artist",
      senderAvatarUrl: user.profileImageUrl ?? null,
      text: text.trim(),
    }).returning();

    await db.update(messageThreadsTable)
      .set({ lastMessageAt: new Date(), lastMessageText: text.trim() })
      .where(eq(messageThreadsTable.id, thread.id));

    // Real-time broadcast to recipient
    broadcast(recipientId, { type: "message", threadId: thread.id, senderId, recipientId });

    res.status(201).json({ ...message, createdAt: message.createdAt.toISOString() });
  } catch (err) {
    req.log.error({ err }, "sendMessage error");
    res.status(500).json({ error: "Failed to send message" });
  }
});

export default router;
