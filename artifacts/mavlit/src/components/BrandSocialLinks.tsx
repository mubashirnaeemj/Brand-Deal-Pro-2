import { Facebook, Instagram, Youtube, type LucideIcon } from "lucide-react";

export interface BrandSocials {
  instagram?: string | null;
  facebook?: string | null;
  youtube?: string | null;
}

const PLATFORMS: { key: keyof BrandSocials; label: string; Icon: LucideIcon }[] = [
  { key: "instagram", label: "Instagram", Icon: Instagram },
  { key: "facebook", label: "Facebook", Icon: Facebook },
  { key: "youtube", label: "YouTube", Icon: Youtube },
];

/** The brand's own pages as platform logos (the address itself is never shown); each opens that page in a new tab. Nothing when none is known. */
export default function BrandSocialLinks({ links, brandName }: { links?: BrandSocials | null; brandName?: string }) {
  const found = PLATFORMS.filter(({ key }) => !!links?.[key]);
  if (!found.length) return null;
  return (
    <div data-testid="brand-socials">
      <div className="mb-3 h-px bg-border" />
      <p className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Brand socials</p>
      <ul className="flex items-center gap-2.5">
        {found.map(({ key, label, Icon }) => (
          <li key={key}>
            <a href={links![key]!} target="_blank" rel="noopener noreferrer" data-testid={`link-social-${key}`}
              aria-label={brandName ? `${brandName} on ${label}` : label} title={label}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-background text-muted-foreground transition hover:border-primary/50 hover:bg-primary/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
              <Icon size={18} aria-hidden />
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
