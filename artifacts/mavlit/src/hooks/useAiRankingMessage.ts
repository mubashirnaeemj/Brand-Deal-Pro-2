import { useEffect, useState } from "react";

const RANKING_MESSAGES = [
  "Getting to know your content style...",
  "Analyzing your creator profile...",
  "Understanding your niche and audience...",
  "Discovering what sets you apart as a creator...",
  "Learning what makes your audience tick...",
  "Exploring your potential sponsorship opportunities...",
  "Exploring companies that work with creators like you...",
  "Finding brands your audience might love...",
  "Measuring creator-brand compatibility...",
  "Looking for a natural fit between your content and brands...",
  "Matching your content themes with brand interests...",
  "Assessing potential collaboration opportunities...",
  "Connecting your content with the right partners...",
  "Ranking brands by their compatibility with your profile...",
  "Prioritizing brands that fit your content...",
  "Calculating your personalized match scores...",
  "Fine-tuning your brand recommendations...",
  "Identifying brands worth exploring first...",
  "Preparing recommendations tailored to you...",
  "Getting your next sponsorship opportunities ready...",
  "Getting your best-fit brands ready to explore...",
  "Putting your potential brand partners in order...",
  "Finding your next great brand partnership...",
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
