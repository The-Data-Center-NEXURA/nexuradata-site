import { describe, expect, it } from "vitest";
import { redactMessageContent, redactPII } from "../../functions/_lib/redaction.js";

describe("redactPII()", () => {
  it("returns an empty string for non-string input", () => {
    expect(redactPII(undefined)).toBe("");
    expect(redactPII(null)).toBe("");
    expect(redactPII(42)).toBe("");
  });

  it("masks email addresses", () => {
    expect(redactPII("écris-moi à olivier@nexuradata.com stp")).toBe(
      "écris-moi à [EMAIL] stp"
    );
    expect(redactPII("Two: a@b.co and c.d+tag@example.io")).toBe(
      "Two: [EMAIL] and [EMAIL]"
    );
  });

  it("masks North-American phone numbers in many shapes", () => {
    expect(redactPII("Call 514-555-0142")).toBe("Call [PHONE]");
    expect(redactPII("Tel: (438) 813 0592")).toBe("Tel: [PHONE]");
    expect(redactPII("+1 514.555.0142 or 4385550101")).toBe(
      "[PHONE] or [PHONE]"
    );
  });

  it("masks Canadian postal codes", () => {
    expect(redactPII("Adresse H2X 1Y4 Montréal")).toBe(
      "Adresse [POSTAL] Montréal"
    );
    expect(redactPII("code H2X1Y4")).toBe("code [POSTAL]");
  });

  it("masks card-like digit sequences", () => {
    expect(redactPII("carte 4242 4242 4242 4242 expirée")).toBe(
      "carte [CARD] expirée"
    );
    expect(redactPII("MC 5555-5555-5555-4444 fin")).toBe("MC [CARD] fin");
  });

  it("masks long opaque digit runs that look like account or case ids", () => {
    expect(redactPII("dossier 123456789012")).toBe("dossier [NUMBER]");
  });

  it("leaves short numbers (years, prices, counts) untouched", () => {
    const text = "En 2026, 5 disques à 149$ chacun";
    expect(redactPII(text)).toBe(text);
  });

  it("does not mangle text with no identifiers", () => {
    const text = "Mon SSD NVMe ne démarre plus depuis le redémarrage Windows.";
    expect(redactPII(text)).toBe(text);
  });

  it("redacts every identifier in a realistic intake message", () => {
    const input =
      "Bonjour, mon HDD Seagate ne monte plus. Joignable à marie@example.com ou 514-555-0142, code postal H2X 1Y4.";
    expect(redactPII(input)).toBe(
      "Bonjour, mon HDD Seagate ne monte plus. Joignable à [EMAIL] ou [PHONE], code postal [POSTAL]."
    );
  });
});

describe("redactMessageContent()", () => {
  it("redacts plain string content", () => {
    expect(redactMessageContent("contact: a@b.co")).toBe("contact: [EMAIL]");
  });

  it("redacts text parts inside an OpenAI parts array, leaving images intact", () => {
    const parts = [
      { type: "text", text: "voici mon courriel a@b.co" },
      { type: "image_url", image_url: { url: "data:image/png;base64,AAAA", detail: "low" } }
    ];
    const result = redactMessageContent(parts);
    expect(result).toEqual([
      { type: "text", text: "voici mon courriel [EMAIL]" },
      { type: "image_url", image_url: { url: "data:image/png;base64,AAAA", detail: "low" } }
    ]);
  });

  it("returns non-string non-array values untouched", () => {
    expect(redactMessageContent(undefined)).toBe(undefined);
    expect(redactMessageContent(null)).toBe(null);
  });
});
