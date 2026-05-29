import { describe, it, expect } from "vitest";
import { buildNewsletterValues } from "./newsletterValues";

describe("buildNewsletterValues", () => {
  it("always sets recipientCount to 0, ignoring any client-supplied count", () => {
    const values = buildNewsletterValues("artist-1", {
      subject: "Spring sale",
      body: "Come see my new work",
      audience: "all",
      // a malicious/confused client tries to inflate the reach metric
      recipientCount: 99999,
    } as unknown as { subject: string; body: string; audience?: string });
    expect(values.recipientCount).toBe(0);
  });

  it("trims subject and body and defaults audience to 'all'", () => {
    const values = buildNewsletterValues("artist-2", {
      subject: "  Hello  ",
      body: "  Body text  ",
    });
    expect(values.subject).toBe("Hello");
    expect(values.body).toBe("Body text");
    expect(values.audience).toBe("all");
  });

  it("preserves a provided audience", () => {
    const values = buildNewsletterValues("artist-3", {
      subject: "x",
      body: "y",
      audience: "patrons",
    });
    expect(values.audience).toBe("patrons");
    expect(values.status).toBe("sent");
    expect(values.artistId).toBe("artist-3");
  });
});
