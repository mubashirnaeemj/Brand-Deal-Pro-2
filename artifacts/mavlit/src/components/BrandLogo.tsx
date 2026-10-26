import { useState } from "react";
import { brandAvatarColor, brandWebsiteDomain } from "@/lib/brandLogo";

const failedFaviconDomains = new Set<string>();

function WebsiteLogo({ name, domain, testId, size }: { name: string; domain: string | null; testId?: string; size: number }) {
  const [failed, setFailed] = useState(() => domain !== null && failedFaviconDomains.has(domain));
  const fallback = !domain || failed;
  const letter = Array.from(name.trim())[0]?.toUpperCase() || "?";
  const markFailed = () => {
    if (domain) failedFaviconDomains.add(domain);
    setFailed(true);
  };

  return (
    <span aria-hidden="true" data-testid={testId}
      className="inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/10 font-semibold text-white"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.43), backgroundColor: fallback ? brandAvatarColor(name) : "#ffffff" }}>
      {fallback ? letter : (
        <img src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`}
          alt="" aria-hidden="true" loading="lazy" referrerPolicy="no-referrer"
          className="h-full w-full object-contain"
          onError={markFailed}
          onLoad={(event) => { if (event.currentTarget.naturalWidth <= 16) markFailed(); }} />
      )}
    </span>
  );
}

/** `size` is the diameter in pixels. */
export default function BrandLogo({ name, website, testId, size = 28 }: {
  name: string; website?: string | null; testId?: string; size?: number;
}) {
  const domain = brandWebsiteDomain(website);
  // New websites can load; failed domains stay cached across tab/filter remounts.
  return <WebsiteLogo key={domain ?? "no-website"} name={name} domain={domain} testId={testId} size={size} />;
}
