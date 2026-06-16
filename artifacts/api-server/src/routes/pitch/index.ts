import { Router, type IRouter } from "express";
import { z } from "zod";
import { anthropic } from "@workspace/integrations-anthropic-ai";
import { aiRateLimiter } from "../../middleware/rateLimiter";

const router: IRouter = Router();

// ── Outbound pitch ─────────────────────────────────────────────────────────────

const MAX_SHORT = 200;
const MAX_LONG = 2000;

const PitchEmailInputSchema = z.object({
  brandName: z.string().min(1).max(MAX_SHORT),
  creatorName: z.string().min(1).max(MAX_SHORT),
  handle: z.string().min(1).max(MAX_SHORT),
  platform: z.string().min(1).max(MAX_SHORT),
  followers: z.string().min(1).max(MAX_SHORT),
  engagementRate: z.string().min(1).max(MAX_SHORT),
  niche: z.string().min(1).max(MAX_SHORT),
  story: z.string().min(1).max(MAX_LONG),
  pastDeals: z.string().max(MAX_LONG).optional(),
  contentLink: z.string().max(MAX_SHORT).optional(),
  contactName: z.string().max(MAX_SHORT).optional(),
  contactEmail: z.string().max(MAX_SHORT).optional(),
});

router.post("/pitch/generate", aiRateLimiter, async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const parsed = PitchEmailInputSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
    return;
  }

  const {
    brandName, creatorName, handle, platform, followers, engagementRate,
    niche, story, pastDeals, contentLink, contactName, contactEmail,
  } = parsed.data;

  const pastDealsLine = pastDeals?.trim() ? `Past brand partnerships: ${pastDeals}` : "No prior brand deals yet.";
  const contentLinkLine = contentLink?.trim() ? `Most relevant content: ${contentLink}` : "";
  const contactFirstName = contactName ? contactName.split(" ")[0] : null;
  const openerInstruction = contactFirstName
    ? `Opens with "Hi ${contactFirstName}," — address them by first name directly`
    : `Opens with a personalized greeting to the brand's partnerships team`;
  const toLine = contactName && contactEmail ? `Contact being addressed: ${contactName} <${contactEmail}>` : "";

  const prompt = `You are a creator outreach expert writing a pitch email on behalf of a content creator.

Creator details:
- Name: ${creatorName}
- Handle: @${handle}
- Primary platform: ${platform}
- Followers/subscribers: ${followers}
- Avg. engagement rate: ${engagementRate}%
- Content niche: ${niche}
${pastDealsLine}
${contentLinkLine}

Brand being pitched: ${brandName}
${toLine}

Their authentic connection/story: ${story}

Write a pitch email that:
1. ${openerInstruction}
2. Opens the body with something specific and real about ${brandName} — show genuine knowledge of the brand
3. Tells the creator's authentic story and connection to ${brandName}
4. Includes social proof (${followers} followers on ${platform}, ${engagementRate}% engagement rate${pastDeals ? `, past deals: ${pastDeals}` : ""})
5. Keeps it casual — no formal business language, write like a real person
6. Where the creator should include their best content link, write literally: [Insert link to your most relevant content]
7. If they have past brand deal examples to share, write literally: [Insert link to previous brand deal example if applicable]
8. Closes with EXACTLY this sentence: "What else do you need from me to consider this? Happy to send more — I want to make your job easy."
9. Does NOT mention rates, fees, or pricing anywhere
10. Is under 180 words total (not counting the subject line)
11. Starts with a subject line on the first line in the format: Subject: [subject here] — write a subject line that references something specific and real about ${brandName} or their recent creator campaigns. Do not use a generic format like "Creator Partnership Inquiry" or "[Name] x [Brand]."

Only output the subject line and email body. No preamble, no explanation, no sign-off instructions.`;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const controller = new AbortController();
  req.on("close", () => controller.abort());

  try {
    const stream = anthropic.messages.stream(
      {
        model: "claude-sonnet-4-6",
        max_tokens: 512,
        messages: [{ role: "user", content: prompt }],
      },
      { signal: controller.signal },
    );

    for await (const event of stream) {
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        res.write(`data: ${JSON.stringify({ content: event.delta.text })}\n\n`);
      }
    }

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err: unknown) {
    if (err instanceof Error && err.name === "AbortError") {
      res.end();
      return;
    }
    req.log.error({ err }, "Pitch generation failed");
    res.write(`data: ${JSON.stringify({ error: "Generation failed" })}\n\n`);
    res.end();
  }
});

// ── Inbound analysis + response ────────────────────────────────────────────────

const InboundInputSchema = z.object({
  brandName: z.string().min(1),
  contactMethod: z.string().min(1),
  message: z.string().min(1),
  creatorName: z.string().optional(),
  handle: z.string().optional(),
  followers: z.string().optional(),
  engagementRate: z.string().optional(),
  platform: z.string().optional(),
  niche: z.string().optional(),
});

router.post("/pitch/inbound", async (req, res) => {
  const parsed = InboundInputSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
    return;
  }

  const { brandName, contactMethod, message, creatorName, handle, followers, engagementRate, platform, niche } = parsed.data;

  const profileSection = creatorName
    ? `\nCreator profile:\n- Name: ${creatorName}\n- Handle: @${handle}\n- Platform: ${platform}\n- Followers: ${followers}\n- Engagement: ${engagementRate}%\n- Niche: ${niche}`
    : "";

  const prompt = `You are a creator deal advisor. A brand has reached out to a content creator.

Brand: ${brandName}
How they contacted: ${contactMethod}
Their message:
"${message}"
${profileSection}

Analyze this message, then write a response. Output EXACTLY in this format — no text before the first line:
WHAT_ASKING: [one sentence — e.g. "Paid collaboration inquiry for Instagram Reel" or "Gifting offer with no compensation mentioned"]
BUDGET: [yes / no / vague]
RED_FLAGS: [None, or comma-separated list — e.g. "Requesting free content, Vague compensation language"]
---
[Write a warm, professional reply under 150 words that:
- Thanks them for reaching out and expresses genuine interest
- Does NOT mention rates or any number
- Asks one clear qualifying question about the deliverables and their timeline
- Ends with exactly this sentence: "Looking forward to hearing more about the opportunity!"]`;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  try {
    const stream = anthropic.messages.stream({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
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
    req.log.error({ err }, "Inbound analysis failed");
    res.write(`data: ${JSON.stringify({ error: "Generation failed" })}\n\n`);
    res.end();
  }
});

// ── Follow-up email ────────────────────────────────────────────────────────────

const FollowUpInputSchema = z.object({
  brandName: z.string().min(1),
  daysSince: z.number().int().positive(),
});

router.post("/pitch/followup", async (req, res) => {
  const parsed = FollowUpInputSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
    return;
  }

  const { brandName, daysSince } = parsed.data;

  const prompt = `Write a follow-up email under 80 words for a content creator following up on a pitch to ${brandName} sent ${daysSince} days ago with no reply yet.

Rules:
- Briefly and naturally reference that you reached out previously — do not summarize or repeat the original pitch
- Add one new piece of value: a recent post, a relevant metric, or a timely campaign angle
- Do NOT mention rates or pricing
- End with exactly this sentence: "Happy to send more if helpful — just let me know."
- Output only the email body, no subject line, no preamble or explanation`;

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
    req.log.error({ err }, "Follow-up generation failed");
    res.write(`data: ${JSON.stringify({ error: "Generation failed" })}\n\n`);
    res.end();
  }
});

// ── Analyze brand reply ────────────────────────────────────────────────────────

const AnalyzeReplySchema = z.object({
  message: z.string().min(1),
  brandName: z.string().optional(),
});

router.post("/pitch/analyze-reply", async (req, res) => {
  const parsed = AnalyzeReplySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
    return;
  }

  const { message, brandName } = parsed.data;

  const prompt = `You are a creator deal advisor. A brand has replied to a content creator's pitch.
${brandName ? `\nBrand: ${brandName}` : ""}
Their message:
"${message}"

Analyze this message and respond with ONLY valid JSON — no other text, no markdown fences:
{
  "category": "interested",
  "recommendation": "...",
  "offeredAmount": "$500"
}

Category must be exactly one of:
- "interested" — Brand expressed interest or wants more info, but has NOT made a specific dollar offer
- "offered_number" — Brand explicitly mentioned a specific dollar amount or budget
- "asked_call" — Brand's primary ask is a phone/video call or meeting before proceeding
- "declined" — Brand said no, passed, or politely declined

recommendation: One specific, practical next action in plain language. Under 80 words. Direct advice like a seasoned industry insider. No preamble.

Only include "offeredAmount" if category is "offered_number" — extract the exact dollar amount or range from their message. Otherwise omit the field entirely.`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 512,
      messages: [{ role: "user", content: prompt }],
    });

    const text = response.content[0].type === "text" ? response.content[0].text.trim() : "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in model response");

    const data = JSON.parse(jsonMatch[0]) as {
      category: string;
      recommendation: string;
      offeredAmount?: string;
    };

    res.json(data);
  } catch (err) {
    req.log.error({ err }, "Reply analysis failed");
    res.status(500).json({ error: "Analysis failed" });
  }
});

export default router;

