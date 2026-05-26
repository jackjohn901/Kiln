import { Router } from "express";
import OpenAI from "openai";
import { db, listingsTable } from "@workspace/db";
import { and, ilike, lte, gte, or, sql } from "drizzle-orm";

const router = Router();

const client = new OpenAI({
  baseURL: process.env["AI_INTEGRATIONS_OPENAI_BASE_URL"],
  apiKey: process.env["AI_INTEGRATIONS_OPENAI_API_KEY"],
});

interface ParsedFilters {
  keywords?: string[];
  maxPrice?: number;
  minPrice?: number;
  techniques?: string[];
  interpretation?: string;
}

router.post("/ai/search", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const { query } = req.body as { query?: string };

  if (!query || query.trim().length < 3) {
    res.status(400).json({ error: "query must be at least 3 characters" });
    return;
  }

  let filters: ParsedFilters = {};

  try {
    const parseResponse = await client.chat.completions.create({
      model: "gpt-5-nano",
      max_completion_tokens: 200,
      messages: [
        {
          role: "system",
          content: `You parse natural language search queries for a craft art marketplace. Extract structured filters. Return ONLY valid JSON with these optional fields:
{
  "keywords": ["word1", "word2"],
  "maxPrice": 150,
  "minPrice": 0,
  "techniques": ["ceramics", "pottery"],
  "interpretation": "brief plain-english summary of what the buyer is looking for"
}
No markdown, no code fences, just raw JSON.`,
        },
        {
          role: "user",
          content: query,
        },
      ],
    });

    try {
      const cleaned = (parseResponse.choices[0]?.message?.content ?? "{}")
        .replace(/^```(?:json)?\s*/m, "")
        .replace(/\s*```$/m, "")
        .trim();
      filters = JSON.parse(cleaned) as ParsedFilters;
    } catch {
      filters = { keywords: [query.trim()], interpretation: query };
    }
  } catch {
    filters = { keywords: [query.trim()], interpretation: query };
  }

  const keywords = filters.keywords?.filter(Boolean) ?? [query.trim()];

  const keywordConditions = keywords.map((k) => {
    const like = `%${k}%`;
    return or(
      ilike(listingsTable.title, like),
      ilike(listingsTable.description, like),
      ilike(listingsTable.medium, like),
      ilike(listingsTable.technique, like),
      ilike(listingsTable.tags, like),
    );
  });

  const conditions = [or(...keywordConditions)];

  if (typeof filters.maxPrice === "number") {
    conditions.push(
      lte(sql`(${listingsTable.price})::numeric`, filters.maxPrice),
    );
  }
  if (typeof filters.minPrice === "number" && filters.minPrice > 0) {
    conditions.push(
      gte(sql`(${listingsTable.price})::numeric`, filters.minPrice),
    );
  }

  try {
    const listings = await db
      .select()
      .from(listingsTable)
      .where(and(...conditions))
      .limit(12);

    res.json({
      listings,
      interpretation: filters.interpretation ?? query,
      filters: {
        keywords,
        maxPrice: filters.maxPrice,
        minPrice: filters.minPrice,
        techniques: filters.techniques,
      },
    });
  } catch (err) {
    req.log.error({ err }, "ai-search DB error");
    res.status(500).json({ error: "Search failed" });
  }
});

export default router;
