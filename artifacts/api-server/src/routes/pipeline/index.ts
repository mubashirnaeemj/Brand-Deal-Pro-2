import { Router, type IRouter } from "express";
import { z } from "zod";
import { anthropic } from "@workspace/integrations-anthropic-ai";

const router: IRouter = Router();

const MAX = 300;

// ── Sent-stage follow-up message ───────────────────────────────────────────────

const FollowupSchema = z.object({
  brandName:        z.string().min(1).max(MAX),
  contactFirstName: z.string().min(1).max(MAX),
  daysSince:        z.number().int().min(1),
  pitchDate:        z.string().max(MAX),
  niche:            z.string().max(MAX),
  option:           z.enum(["nudge", "new", "angle"]),
});

router.post("/pipeline/followup", async (req, res) => {
  const parsed = FollowupSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid input" }); return; }

  const { brandName, contactFirstName, daysSince, pitchDate, niche, option } = parsed.data;

  const prompts: Record<typeof option, string> = {
    nudge: `Write a brief, warm follow-up nudge for a ${niche} creator following up with ${contactFirstName} at ${brandName}. Original pitch sent ${pitchDate} (${daysSince} days ago). Under 55 words. Naturally reference the earlier outreach. Add one small, specific new detail — a recent metric or timely angle — without over-explaining. Warm but not desperate. Do NOT mention rates or pricing. Output only the email body, no subject line, no preamble.`,

    new: `Write a follow-up email that adds something new for a ${niche} creator following up with ${contactFirstName} at ${brandName}. Original pitch sent ${pitchDate} (${daysSince} days ago). Under 80 words. Casually reference the original outreach, then introduce one genuinely new piece of value — a recent piece of content, a relevant metric, or a timely campaign angle specific to ${brandName}. Do NOT mention rates or pricing. Output only the email body, no subject line, no preamble.`,

    angle: `Write a follow-up email that tries a completely different framing for a ${niche} creator following up with ${contactFirstName} at ${brandName}. Original pitch sent ${pitchDate} (${daysSince} days ago). Under 80 words. Do not summarize the original pitch. Come at it from a fresh angle — a different use case, a different audience segment they might care about, or a completely different format idea. Do NOT mention rates or pricing. Output only the email body, no subject line, no preamble.`,
  };

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const controller = new AbortController();
  req.on("close", () => controller.abort());

  try {
    const stream = anthropic.messages.stream(
      { model: "claude-sonnet-4-6", max_tokens: 512, messages: [{ role: "user", content: prompts[option] }] },
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
    if (err instanceof Error && err.name === "AbortError") { res.end(); return; }
    req.log.error({ err }, "Pipeline followup failed");
    res.write(`data: ${JSON.stringify({ error: "Generation failed" })}\n\n`);
    res.end();
  }
});

// ── Replied-stage response ────────────────────────────────────────────────────

const RepliedSchema = z.object({
  brandName:        z.string().min(1).max(MAX),
  contactFirstName: z.string().min(1).max(MAX),
  brandMessage:     z.string().min(1).max(3000),
  option:           z.string().min(1).max(MAX),
  niche:            z.string().max(MAX),
});

router.post("/pipeline/replied", async (req, res) => {
  const parsed = RepliedSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid input" }); return; }

  const { brandName, contactFirstName, brandMessage, option, niche } = parsed.data;

  const base = `You are writing on behalf of a ${niche} content creator replying to ${contactFirstName} at ${brandName}.\n\nTheir message:\n"${brandMessage}"\n\n`;

  const optionPrompts: Record<string, string> = {
    "Respond with more info":              `${base}Write a reply that provides compelling new details about the creator's content and audience — one or two specific, interesting things that make a strong case. Under 100 words. Warm, confident. End with a soft CTA. Do NOT mention rates. Output only the email body.`,
    "Propose next steps":                  `${base}Write a reply that enthusiastically moves the conversation forward. Suggest one specific, low-friction next step (a brief call, a concept idea, or a creative proposal). Under 80 words. Do NOT mention rates. Output only the email body.`,
    "Share my media kit":                  `${base}Write a brief, warm reply referencing a media kit being shared. Where the media kit would go, write literally: [Attach media kit]. Under 60 words. Do NOT mention rates. Output only the email body.`,
    "Counter this offer":                  `${base}Write a professional counter-offer. Do not cave immediately. Acknowledge their message warmly then anchor firmly to a higher value — reference content quality, audience engagement, and content rights. Do not write a specific dollar number; use the placeholder [your rate] instead. Under 100 words. Output only the email body.`,
    "Accept and confirm":                  `${base}Write a reply accepting the offer and asking about the clear next step — contract, brief, or timeline. Warm and professional. Under 80 words. Output only the email body.`,
    "Ask for time to consider":            `${base}Write a reply asking for 2–3 days to review. Express genuine enthusiasm. Warm and brief. Under 60 words. Output only the email body.`,
    "Confirm a call and ask about budget": `${base}Write a reply confirming availability for a call and slipping in one casual, non-pushy question about their budget range. Under 70 words. Output only the email body.`,
    "Decline the call and ask for details by email": `${base}Write a reply that politely declines a call in favor of email and asks for a brief or one-page overview of what they're looking for. Under 70 words. Output only the email body.`,
    "Suggest a briefer async option":      `${base}Write a reply suggesting an async option (email, DM, or a short voice note) instead of a full call — frame it as easier for both parties. Under 60 words. Output only the email body.`,
    "Thank them gracefully":               `${base}Write a warm, graceful reply thanking them for reaching out and leaving the door open for future work. No bitterness. Under 60 words. Output only the email body.`,
    "Ask for feedback":                    `${base}Write a genuine, non-desperate reply asking for brief feedback on why it wasn't the right fit — frame it as wanting to improve for next time. Under 60 words. Output only the email body.`,
    "Suggest future collaboration":        `${base}Write a reply that thanks them, acknowledges the timing might not be right, and warmly plants a seed for future collaboration. Under 70 words. Output only the email body.`,
  };

  const prompt = optionPrompts[option] ?? `${base}Write a professional, warm reply under 100 words. Do NOT mention rates. Output only the email body.`;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const controller = new AbortController();
  req.on("close", () => controller.abort());

  try {
    const stream = anthropic.messages.stream(
      { model: "claude-sonnet-4-6", max_tokens: 512, messages: [{ role: "user", content: prompt }] },
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
    if (err instanceof Error && err.name === "AbortError") { res.end(); return; }
    req.log.error({ err }, "Pipeline replied failed");
    res.write(`data: ${JSON.stringify({ error: "Generation failed" })}\n\n`);
    res.end();
  }
});

// ── Negotiating-stage message ─────────────────────────────────────────────────

const NegotiateSchema = z.object({
  brandName:        z.string().min(1).max(MAX),
  contactFirstName: z.string().min(1).max(MAX),
  option:           z.enum(["counter", "deliverables", "rate-range", "close"]),
  theirOffer:       z.string().max(MAX).optional(),
  niche:            z.string().max(MAX),
});

router.post("/pipeline/negotiate", async (req, res) => {
  const parsed = NegotiateSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid input" }); return; }

  const { brandName, contactFirstName, option, theirOffer, niche } = parsed.data;
  const base = `You are writing on behalf of a ${niche} content creator negotiating with ${contactFirstName} at ${brandName}.\n\n`;

  const prompts: Record<typeof option, string> = {
    counter:      `${base}Their offer: ${theirOffer ?? "an unspecified amount"}.\n\nWrite a professional counter-offer under 100 words. Acknowledge their offer warmly, then hold firm at a higher rate. Reference specific value (engagement quality, content ownership, audience fit). Do not apologize for the counter. Do not write a specific dollar number; use the placeholder [your rate]. Output only the email body.`,
    deliverables: `${base}Write a concise, focused message asking for clarity on one key deliverable detail — format, timeline, usage rights, or revision rounds. Under 80 words. Collaborative and professional in tone. Output only the email body.`,
    "rate-range": `${base}Write a message sending a rate range. Mention that the final number depends on deliverables and usage terms. Use the placeholders [your low] and [your high] where the range would go. Under 80 words. Confident and matter-of-fact. Output only the email body.`,
    close:        `${base}Write a warm closing message to move the deal forward. Reference that the terms look aligned and ask clearly about the next step — contract, brief, or a timeline confirmation. Under 80 words. Positive and decisive. Output only the email body.`,
  };

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const controller = new AbortController();
  req.on("close", () => controller.abort());

  try {
    const stream = anthropic.messages.stream(
      { model: "claude-sonnet-4-6", max_tokens: 512, messages: [{ role: "user", content: prompts[option] }] },
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
    if (err instanceof Error && err.name === "AbortError") { res.end(); return; }
    req.log.error({ err }, "Pipeline negotiate failed");
    res.write(`data: ${JSON.stringify({ error: "Generation failed" })}\n\n`);
    res.end();
  }
});

// ── Media kit ─────────────────────────────────────────────────────────────────

const MediaKitSchema = z.object({
  creatorName:      z.string().min(1).max(MAX),
  handle:           z.string().min(1).max(MAX),
  platform:         z.string().min(1).max(MAX),
  followers:        z.string().min(1).max(MAX),
  engagementRate:   z.string().min(1).max(MAX),
  niche:            z.string().min(1).max(MAX),
  pastPartnerships: z.string().max(MAX).optional(),
});

router.post("/pipeline/media-kit", async (req, res) => {
  const parsed = MediaKitSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid input" }); return; }

  const { creatorName, handle, platform, followers, engagementRate, niche, pastPartnerships } = parsed.data;

  const partnershipsLine = pastPartnerships?.trim()
    ? `Past partnerships: ${pastPartnerships}`
    : "Past partnerships: None listed yet";

  const prompt = `Generate a clean, professional plain text creator media kit under 200 words for this creator:

Name: ${creatorName}
Handle: @${handle}
Platform: ${platform}
Followers: ${followers}
Engagement rate: ${engagementRate}%
Niche: ${niche}
${partnershipsLine}

Format exactly as:

[One-line bio that names the creator, their platform, and their focus area in a single compelling sentence]

Platform stats:
- Platform: ${platform}
- Followers: ${followers}
- Avg. engagement rate: ${engagementRate}%

Content focus: [One sentence describing their niche and content style]

${pastPartnerships?.trim() ? "Past partnerships:\n[Clean bulleted list of past partners]" : ""}

Output only the media kit content. No preamble, no explanation, no title line that says "Media Kit".`;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const controller = new AbortController();
  req.on("close", () => controller.abort());

  try {
    const stream = anthropic.messages.stream(
      { model: "claude-sonnet-4-6", max_tokens: 512, messages: [{ role: "user", content: prompt }] },
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
    if (err instanceof Error && err.name === "AbortError") { res.end(); return; }
    req.log.error({ err }, "Media kit generation failed");
    res.write(`data: ${JSON.stringify({ error: "Generation failed" })}\n\n`);
    res.end();
  }
});

// ── Contract advice ───────────────────────────────────────────────────────────

const ContractAdviceSchema = z.object({
  contractText:    z.string().min(1).max(12000),
  contactType:     z.enum(["agency", "in-house"]).optional(),
  brandName:       z.string().max(MAX).optional(),
  dealPlatform:    z.string().max(MAX).optional(),
  dealDeliverable: z.string().max(MAX).optional(),
  dealExclusivity: z.string().max(MAX).optional(),
  dealUsage:       z.string().max(MAX).optional(),
});

router.post("/pipeline/contract-advice", async (req, res) => {
  const parsed = ContractAdviceSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid input" }); return; }

  const { contractText, contactType, brandName, dealPlatform, dealDeliverable, dealExclusivity, dealUsage } = parsed.data;

  const agencyNote = contactType === "agency"
    ? "\nImportant: This is an agency-managed contract. Flag any broad usage rights, whitelisting provisions, or indemnification clauses with particular care — agency contracts tend to be more aggressive in these areas."
    : "";

  const dealContextLines = [
    dealPlatform    && `Platform: ${dealPlatform}`,
    dealDeliverable && `Deliverable: ${dealDeliverable}`,
    dealExclusivity && `Exclusivity agreed: ${dealExclusivity}`,
    dealUsage       && `Usage scope: ${dealUsage}`,
  ].filter(Boolean).join("\n");

  const dealContextNote = dealContextLines
    ? `\nDeal context provided by the creator:\n${dealContextLines}\nWhen reviewing the contract, pay particular attention to how the contract terms align with or differ from this context — especially around usage, exclusivity scope, and deliverable definitions.`
    : "";

  const prompt = `You are a contract educator reviewing a sponsorship or brand deal contract on behalf of an independent content creator. Your only job is to identify terms that commonly matter to creators and explain — in plain English — what each term means and why creators typically pay attention to it. You must not recommend any action, suggest edits, propose replacement language or numbers, tell the creator to accept or reject anything, or say anything like "you should," "push back," "reject," "change this to," or "negotiate for."

${brandName ? `Brand: ${brandName}\n` : ""}${agencyNote}${dealContextNote}

Contract text:
---
${contractText}
---

Look for and explain the following six issues when they appear in the pasted text. For each one that is present, flag it and explain what it means and why creators pay attention to it. If one of these issues is entirely absent from the contract, note that too — its absence can itself be relevant.

The six issues to check:

1. Usage rights — How can the brand use the content, and for how long? Note whether usage is limited to the creator's own post or extends to the brand sharing it, boosting it, running ads with it, using it in other campaigns, or using the creator's name, image, or likeness. Note whether usage is time-limited or perpetual.

2. Exclusivity — Is the creator restricted from working with other brands? Note how broad the restriction is (entire category vs. narrow product type) and how long it lasts.

3. Payment terms — What is the amount, when is it due (e.g., net-30), and is any portion paid upfront?

4. Kill / cancellation clauses — Can the brand cancel the deal? On what notice? What happens to fees already owed or partially paid if they do?

5. Ownership vs. license — Does the creator keep ownership of the content or transfer it? What license or permissions does the brand receive?

6. Scope and revisions — What exactly must the creator deliver, and how many revisions can the brand request?

Do not recommend actions. Do not suggest edits. Do not propose specific numbers, durations, or replacement language. Do not say what the creator should do. Only explain what the term is and why it matters. If a term appears creator-favorable, note that and explain why.

Format each item as:
[number]. [⚠️ or ✓] [Issue name]
Relevant language: "[quote or description of the specific clause, or 'Not addressed in this contract' if absent]"
What this means: [plain-English explanation of the term and why creators pay attention to it]

End with exactly this sentence on its own line: "These are informational flags, not legal advice — review anything important with a licensed attorney."

Write for a smart creator who is not a lawyer. Under 600 words total.`;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const controller = new AbortController();
  req.on("close", () => controller.abort());

  try {
    const stream = anthropic.messages.stream(
      { model: "claude-sonnet-4-6", max_tokens: 1024, messages: [{ role: "user", content: prompt }] },
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
    if (err instanceof Error && err.name === "AbortError") { res.end(); return; }
    req.log.error({ err }, "Contract advice failed");
    res.write(`data: ${JSON.stringify({ error: "Generation failed" })}\n\n`);
    res.end();
  }
});

export default router;
