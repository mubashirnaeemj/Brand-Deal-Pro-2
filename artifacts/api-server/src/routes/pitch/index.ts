import { Router, type IRouter } from "express";
import { z } from "zod";
import { anthropic } from "@workspace/integrations-anthropic-ai";

const router: IRouter = Router();

// ── Outbound pitch ─────────────────────────────────────────────────────────────

const PitchEmailInputSchema = z.object({
  brandName: z.string().min(1),
  creatorName: z.string().min(1),
  handle: z.string().min(1),
  platform: z.string().min(1),
  followers: z.string().min(1),
  engagementRate: z.string().min(1),
  niche: z.string().min(1),
  story: z.string().min(1),
  pastDeals: z.string().optional(),
  contentLink: z.string().optional(),
  contactName: z.string().optional(),
  contactEmail: z.string().optional(),
});

router.post("/pitch/generate", async (req, res) => {
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

export default router;
