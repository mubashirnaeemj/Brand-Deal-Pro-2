import { Instagram, Youtube } from "lucide-react";
import type { PlatformKey } from "./types";

export default function PlatformSelector({
  value,
  onChange,
  error,
}: {
  value: PlatformKey[];
  onChange: (platforms: PlatformKey[]) => void;
  error?: string;
}) {
  const toggle = (platform: PlatformKey) => onChange(value.includes(platform)
    ? value.filter((item) => item !== platform)
    : [...value, platform]);

  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Primary platforms <span className="text-primary">*</span>
      </p>
      <div className="grid grid-cols-2 gap-3" role="group" aria-label="Primary platforms">
        {([
          ["instagram", "Instagram", Instagram],
          ["youtube", "YouTube", Youtube],
        ] as const).map(([platform, label, Icon]) => {
          const active = value.includes(platform);
          return (
            <button key={platform} type="button" aria-pressed={active}
              onClick={() => toggle(platform)}
              className={`flex items-center gap-3 rounded-xl border p-4 text-left transition ${
                active ? "border-primary/70 bg-primary/10 text-white" :
                  "border-border bg-secondary/40 text-muted-foreground hover:border-primary/30 hover:text-white"
              }`}>
              <Icon size={18} className={active ? "text-primary" : ""} />
              <span className="text-sm font-semibold">{label}</span>
            </button>
          );
        })}
      </div>
      {error && <p className="mt-1.5 text-xs text-red-400">{error}</p>}
    </div>
  );
}