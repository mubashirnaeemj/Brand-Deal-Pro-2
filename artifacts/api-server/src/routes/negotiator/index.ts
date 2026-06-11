import { Router, type IRouter } from "express";
import { z } from "zod";
import { anthropic } from "@workspace/integrations-anthropic-ai";

const router: IRouter = Router();

const NegotiatorInputSchema = z.object({
  brandName: z.string().min(1),
  followerCount: z.string().min(1),
  brandResponse: z.string().min(1),
});

router.post("/negotiator/advise", async (req, res) => {
  const parsed = NegotiatorInputSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
    return;
  }

  const { brandName, followerCount, brandResponse } = parsed.data;

  const prompt = `You are a seasoned creator deal advisor. A content creator needs tactical negotiation advice.

Brand: ${brandName}
Creator follower count: ${followerCount}
Brand's response / situation: ${brandResponse}

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

export default router;
