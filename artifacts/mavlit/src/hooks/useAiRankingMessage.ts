import { useEffect, useState } from "react";

const RANKING_MESSAGES = [
  "AI is organizing brands according to your profile…",
  "Matching your niche and content with every brand…",
  "Reading brand descriptions and tags…",
  "Shuffling brands into the perfect order…",
  "Finding the brands that fit you best…",
  "Polishing your top matches…",
  // Added: grouped by stage (understanding the profile, finding brands, checking fit, ranking, preparing the result).
  "Getting to know your content style...",
  "Analyzing your creator profile...",
  "Exploring what makes your content unique...",
  "Understanding your niche and audience...",
  "Identifying your strongest content categories...",
  "Discovering what sets you apart as a creator...",
  "Mapping your content interests...",
  "Building your creator profile...",
  "Learning what makes your audience tick...",
  "Preparing a personalized brand search...",
  "Finding brands that fit your niche...",
  "Exploring your potential sponsorship opportunities...",
  "Discovering brands that align with your content...",
  "Searching for your next potential brand partner...",
  "Exploring companies that work with creators like you...",
  "Looking beyond the obvious brand choices...",
  "Uncovering new collaboration opportunities...",
  "Finding brands your audience might love...",
  "Exploring potential partners in your industry...",
  "Narrowing down the most promising brands...",
  "Checking how well each brand fits your content...",
  "Comparing your profile with potential sponsors...",
  "Measuring creator-brand compatibility...",
  "Looking for a natural fit between your content and brands...",
  "Evaluating the relevance of each potential partnership...",
  "Matching your content themes with brand interests...",
  "Assessing potential collaboration opportunities...",
  "Identifying the brands most relevant to you...",
  "Connecting your content with the right partners...",
  "Refining your strongest brand matches...",
  "Ranking brands by their compatibility with your profile...",
  "Finding your strongest brand matches...",
  "Prioritizing brands that fit your content...",
  "Calculating your personalized match scores...",
  "Comparing brands to uncover your best fits...",
  "Fine-tuning your brand recommendations...",
  "Separating strong matches from less relevant options...",
  "Highlighting promising sponsorship opportunities...",
  "Organizing your top brand matches...",
  "Identifying brands worth exploring first...",
  "Bringing your best brand matches together...",
  "Preparing recommendations tailored to you...",
  "Organizing potential partners for easy discovery...",
  "Your strongest matches are coming into focus...",
  "Getting your next sponsorship opportunities ready...",
  "Putting your brand rankings together...",
  "Getting your best-fit brands ready to explore...",
  "Almost ready to reveal your recommendations...",
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
