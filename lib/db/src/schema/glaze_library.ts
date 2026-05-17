import { pgTable, text, integer, timestamp, varchar, jsonb } from "drizzle-orm/pg-core";

export const glazeRecipesTable = pgTable("glaze_recipes", {
  id: varchar("id", { length: 36 }).primaryKey(),
  authorId: varchar("author_id", { length: 255 }).notNull(),
  authorName: varchar("author_name", { length: 255 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  cone: varchar("cone", { length: 20 }),
  atmosphere: varchar("atmosphere", { length: 50 }),
  colorFamily: varchar("color_family", { length: 50 }),
  swatch: text("swatch"),
  ingredients: jsonb("ingredients").default([]),
  colorants: jsonb("colorants").default([]),
  notes: text("notes"),
  tags: text("tags").array().default([]),
  likeCount: integer("like_count").notNull().default(0),
  saveCount: integer("save_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const glazeRecipeLikesTable = pgTable("glaze_recipe_likes", {
  recipeId: varchar("recipe_id", { length: 36 }).notNull(),
  userId: varchar("user_id", { length: 255 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const glazeRecipeSavesTable = pgTable("glaze_recipe_saves", {
  recipeId: varchar("recipe_id", { length: 36 }).notNull(),
  userId: varchar("user_id", { length: 255 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type GlazeRecipe = typeof glazeRecipesTable.$inferSelect;
