import { useEffect, useState } from "react";

const RANKING_MESSAGES = [
  "AI is organizing brands according to your profile…",
  "Matching your niche and content with every brand…",
  "Reading brand descriptions and tags…",
  "Shuffling brands into the perfect order…",
  "Finding the brands that fit you best…",
  "Polishing your top matches…",
];

// Called once by the Matches page, not once per AI section.
export default function useAiRankingMessage(busy: boolean) {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    if (!busy) return;
    let current = Math.floor(Math.random() * RANKING_MESSAGES.length);
    setMessageIndex(current);
    const timer = window.setInterval(() => {
      current = (current + 1 + Math.floor(Math.random() * (RANKING_MESSAGES.length - 1))) % RANKING_MESSAGES.length;
      setMessageIndex(current);
    }, 5_000);
    return () => window.clearInterval(timer);
  }, [busy]);

  return RANKING_MESSAGES[messageIndex];
}
