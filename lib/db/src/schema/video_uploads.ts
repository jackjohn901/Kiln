import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const videoUploadsTable = pgTable("video_uploads", {
  uploadId: text("upload_id").primaryKey(),
  userId: text("user_id").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
