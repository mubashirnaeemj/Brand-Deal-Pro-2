import { Router, type IRouter } from "express";
import { z } from "zod";
import { anthropic } from "@workspace/integrations-anthropic-ai";

const router: IRouter = Router();

// ── Negotiation advice ────────────────────────────────────────────────────────

const NegotiatorInputSchema = z.object({
  brandName: z.string().min(1),
  followerCount: z.string().min(1),
  brandResponse: z.string().min(1),
  contactSeniority: z.string().optional(),
  noResponse: z.boolean().optional(),
});

router.post("/negotiator/advise", async (req, res) => {
  const parsed = NegotiatorInputSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
    return;
  }

  const { brandName, followerCount, brandResponse, contactSeniority, noResponse } = parsed.data;

  const seniorityLine = contactSeniority && contactSeniority !== "Unknown"
    ? `Contact seniority: ${contactSeniority}`
    : "";

  const prompt = noResponse
    ? `You are a seasoned creator deal advisor. A content creator has pitched a brand and has not received a response yet.

Brand pitched: ${brandName}
Creator follower count: ${followerCount}
${seniorityLine}
Timing / situation: ${brandResponse}

The creator has not received a response yet. Give advice on whether and how to follow up. Standard guidance: one follow-up email only, sent 5–7 days after the first, then stop. Write a short suggested follow-up message they can adapt — keep it under 60 words, warm but not desperate, and end with a single clear question. Remind them that brand deals are a long game — no reply does not mean no interest. Brands are busy and inboxes are noisy. Persistence beyond one follow-up hurts more than it helps.

Be direct and practical. Write like a seasoned industry insider talking to a creator friend. Use short paragraphs.`
    : `You are a seasoned creator deal advisor. A content creator needs tactical negotiation advice.

Brand: ${brandName}
Creator follower count: ${followerCount}
${seniorityLine}
Brand's response / situation: ${brandResponse}

Factor in the seniority and decision-making authority of the contact when giving negotiation advice. An Account Manager at an agency has limited budget authority and likely needs internal approval before committing to a rate — so push them to escalate or loop in their supervisor rather than accepting their first number. A Director or in-house Brand Manager has more direct control over budget and can often approve on the spot, so anchor higher and negotiate more assertively.

Give tactical advice in under 200 words covering:
1. How to respond to what the brand said (specific language suggestions)
2. What rate to anchor to and why (be direct about numbers)
3. Key contract terms to push for — especially usage rights, exclusivity duration, and whitelisting
4. What NOT to do in this situation

Be direct, specific, and practical. Write like a seasoned industry insider talking to a creator friend — no fluff, no corporate speak. Use short paragraphs.`;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  try {
    const stream = anthropic.messages.stream({
      model: "claude-sonnet-4-6",
      max_tokens: 8192,
      messages: [{ role: "user", content: prompt }],
    });

    for await (const event of stream) {
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        res.write(`data: ${JSON.stringify({ content: event.delta.text })}\n\n`);
      }
    }

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err) {
    req.log.error({ err }, "Negotiator advice generation failed");
    res.write(`data: ${JSON.stringify({ error: "Generation failed" })}\n\n`);
    res.end();
  }
});

// ── Counter-offer generator ───────────────────────────────────────────────────

const CounterOfferSchema = z.object({
  brandName: z.string().min(1),
  theirOffer: z.string().min(1),
  myCounter: z.string().min(1),
  tone: z.enum(["Firm", "Flexible", "Relationship-first"]),
  usageRights: z.boolean(),
  exclusivity: z.boolean(),
  whitelisting: z.boolean(),
});

router.post("/negotiator/counter", async (req, res) => {
  const parsed = CounterOfferSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
    return;
  }

  const { brandName, theirOffer, myCounter, tone, usageRights, exclusivity, whitelisting } = parsed.data;

  const termsContext = [
    usageRights  && "Usage rights have not been defined yet",
    exclusivity  && "Exclusivity terms have not been defined yet",
    whitelisting && "Whitelisting rights have not been addressed",
  ].filter(Boolean).join("; ");

  const toneGuide = {
    "Firm":               "Assert the counter clearly. No hedging. Brief justification only.",
    "Flexible":           "Express openness to finding a middle ground while anchoring to the counter.",
    "Relationship-first": "Lead with enthusiasm for the partnership. Frame the counter as helping both sides build something sustainable.",
  }[tone];

  const prompt = `You are a creator deal advisor writing a counter-offer response on behalf of a content creator.

Brand: ${brandName}
Their initial offer: ${theirOffer}
Creator's counter: ${myCounter}
Tone: ${tone} — ${toneGuide}
${termsContext ? `Open deal terms to address: ${termsContext}` : ""}

Write a counter-offer response under 120 words that:
1. Is professional and non-confrontational
2. Anchors to the creator's counter (${myCounter}) with brief justification — reference the value they bring
3. ${termsContext ? "Flags the open deal terms as needing resolution before moving forward" : "Keeps the conversation moving forward"}
4. Does NOT give in immediately — hold the number
5. Ends with an invitation to continue the conversation

Output only the email body, no subject line, no preamble or explanation.`;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  try {
    const stream = anthropic.messages.stream({
      model: "claude-sonnet-4-6",
      max_tokens: 512,
      messages: [{ role: "user", content: prompt }],
    });

    for await (const event of stream) {
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        res.write(`data: ${JSON.stringify({ content: event.delta.text })}\n\n`);
      }
    }

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err) {
    req.log.error({ err }, "Counter-offer generation failed");
    res.write(`data: ${JSON.stringify({ error: "Generation failed" })}\n\n`);
    res.end();
  }
});

export default router;
