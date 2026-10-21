import { useCallback, useEffect, useRef, useState } from "react";
import { api, ApiRequestError } from "@/lib/api";

export interface OwnBrand {
  brand_id: number;
  name: string | null;
  instagram_handle: string | null;
  niche: string | null;
  description: string | null;
  target_audience_gender: "male" | "female" | "both" | null;
  target_audience_min_age: number | null;
  target_audience_max_age: number | null;
  latest_product: string | null;
}

export interface OwnBrandJob {
  job_id: string;
  status: "queued" | "running" | "ready" | "failed";
  stage: string | null;
  error: string | null;
  brand: OwnBrand | null;
}

export interface OwnBrandLookupState {
  phase: "idle" | "starting" | "running" | "ready" | "failed";
  jobId: string | null;
  stage: string | null;
  error: string | null;
  inputError: string | null;
  brand: OwnBrand | null;
}

const INITIAL: OwnBrandLookupState = { phase: "idle", jobId: null, stage: null, error: null, inputError: null, brand: null };
const POLL_MS = 2000;
const MAX_POLL_FAILURES = 3;
const FAILED_FALLBACK = "MAVLIT couldn't gather info for this brand. Please try again.";

function fromJob(job: OwnBrandJob): OwnBrandLookupState {
  if (job.status === "failed") return { ...INITIAL, phase: "failed", error: job.error || FAILED_FALLBACK };
  if (job.status === "ready") {
    return job.brand ? { ...INITIAL, phase: "ready", brand: job.brand } : { ...INITIAL, phase: "failed", error: FAILED_FALLBACK };
  }
  return { ...INITIAL, phase: "running", jobId: job.job_id, stage: job.stage };
}

/** Instagram lookup for a brand outside the creator's matches: start a job, then poll it. */
export function useOwnBrandLookup() {
  const [input, setInputValue] = useState("");
  const [state, setState] = useState<OwnBrandLookupState>(INITIAL);
  const attempt = useRef(0);

  // Editing the input forgets any previous result, in-flight start or running job.
  const setInput = useCallback((value: string) => {
    attempt.current++;
    setInputValue(value);
    setState(INITIAL);
  }, []);

  const busy = state.phase === "starting" || state.phase === "running";

  const find = useCallback(async () => {
    const text = input.trim();
    if (!text || busy) return;
    const mine = ++attempt.current;
    setState({ ...INITIAL, phase: "starting" });
    try {
      const job = await api.post<OwnBrandJob>("/own-brands", { instagram: text });
      if (mine === attempt.current) setState(fromJob(job));
    } catch (err) {
      if (mine !== attempt.current) return;
      setState({ ...INITIAL, inputError: err instanceof Error ? err.message : "Couldn't look up this brand. Please try again." });
    }
  }, [input, busy]);

  const { phase, jobId } = state;
  useEffect(() => {
    if (phase !== "running" || !jobId) return;
    let cancelled = false;
    let failures = 0;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try {
        const job = await api.get<OwnBrandJob>(`/own-brands/jobs/${encodeURIComponent(jobId)}`);
        if (cancelled) return;
        failures = 0;
        setState(fromJob(job));
        if (job.status === "queued" || job.status === "running") timer = setTimeout(poll, POLL_MS);
      } catch (err) {
        if (cancelled) return;
        const gone = err instanceof ApiRequestError && (err.status === 403 || err.status === 404);
        if (gone || ++failures >= MAX_POLL_FAILURES) {
          setState({ ...INITIAL, phase: "failed", error: err instanceof Error ? err.message : FAILED_FALLBACK });
          return;
        }
        timer = setTimeout(poll, POLL_MS);
      }
    };
    timer = setTimeout(poll, POLL_MS);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [phase, jobId]);

  return { input, setInput, state, busy, find };
}

export type OwnBrandLookup = ReturnType<typeof useOwnBrandLookup>;

export function brandDisplayName(brand: OwnBrand): string {
  const name = brand.name?.trim();
  if (name) return name;
  const handle = brand.instagram_handle?.trim().replace(/^@/, "");
  return handle ? `@${handle}` : "";
}

const GENDER_TEXT = { male: "mostly men", female: "mostly women", both: "men and women" } as const;

export function audienceText(brand: OwnBrand): string {
  const { target_audience_gender: gender, target_audience_min_age: min, target_audience_max_age: max } = brand;
  const parts = [
    gender ? GENDER_TEXT[gender] : null,
    min != null && max != null ? `about ${min} to ${max} (estimate)` : null,
  ].filter(Boolean);
  return parts.length ? parts.join(" ") : "Not known";
}
