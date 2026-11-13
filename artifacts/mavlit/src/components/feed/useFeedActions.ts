import { useCallback } from "react";
import { toast } from "@/hooks/use-toast";

/** Prototype-only: the real product will open the original post; for now it is a visible, harmless interaction. */
export function useOpenOriginalPost() {
  return useCallback((creatorHandle: string, brandName: string) => {
    toast({ title: "Original post (prototype)", description: `This is where @${creatorHandle}'s ${brandName} post would open.` });
  }, []);
}
