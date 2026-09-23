import { Instagram, MapPin, User, Youtube } from "lucide-react";
import type { OnboardingData } from "./types";

export default function ReviewStep({ data }: { data: OnboardingData }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">One last check</p>
      <h1 className="mt-2 text-2xl font-extrabold text-white sm:text-3xl">Review your profile</h1>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">Confirm everything looks right before MAVLIT starts building your matches.</p>

      <div className="mt-7 space-y-4">
        <ReviewCard icon={<User size={17} />} title="Creator information">
          <Rows rows={[
            ["Name", data.creator.fullName],
            ["Location", `${data.creator.city}, ${data.creator.country}`],
            ["Age", data.creator.age],
            ["Gender", data.creator.gender],
            ["Platforms", data.creator.platforms.map(capitalize).join(", ")],
            ["Content", data.creator.contentDescription],
          ]} />
        </ReviewCard>

        {data.creator.platforms.includes("instagram") && (
          <ReviewCard icon={<Instagram size={17} />} title="Instagram information">
            <Rows rows={[
              ["Username", `@${data.instagram.username}`],
              ["Profile", data.instagram.profileUrl],
              ["Followers", formatNumber(data.instagram.followers)],
              ["Niches", [...data.instagram.niches, ...data.instagram.subNiches].join(", ")],
              ["Audience", audienceLabel(data.instagram.audience)],
              ["Top country", data.instagram.audience.topCountry],
              ["Avoid", data.instagram.excludedCategories || "None specified"],
            ]} />
          </ReviewCard>
        )}

        {data.creator.platforms.includes("youtube") && (
          <ReviewCard icon={<Youtube size={17} />} title="YouTube information">
            <Rows rows={[
              ["Channel", data.youtube.channelName],
              ["Profile", data.youtube.channelUrl],
              ["Subscribers", formatNumber(data.youtube.subscribers)],
              ["Niches", [...data.youtube.niches, ...data.youtube.subNiches].join(", ")],
              ["Audience", audienceLabel(data.youtube.audience)],
              ["Top country", data.youtube.audience.topCountry],
              ["Avoid", data.youtube.excludedCategories || "None specified"],
            ]} />
          </ReviewCard>
        )}
      </div>
      <div className="mt-5 flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/10 p-4">
        <MapPin size={16} className="mt-0.5 shrink-0 text-primary" />
        <p className="text-xs leading-5 text-slate-300">Submitting creates your creator profile and takes you to your personalized dashboard. You can update these details later from Profile.</p>
      </div>
    </div>
  );
}

function ReviewCard({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-border/70 bg-background/35 p-4 sm:p-5">
      <div className="mb-4 flex items-center gap-2 text-primary">{icon}<h2 className="text-sm font-bold text-white">{title}</h2></div>
      {children}
    </section>
  );
}

function Rows({ rows }: { rows: [string, string][] }) {
  return <dl className="grid gap-3 sm:grid-cols-2">{rows.map(([label, value]) => <div key={label} className={label === "Content" ? "sm:col-span-2" : ""}><dt className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</dt><dd className="mt-1 break-words text-sm leading-5 text-slate-200">{value || "—"}</dd></div>)}</dl>;
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatNumber(value: string) {
  return value ? Number(value).toLocaleString() : "0";
}

function audienceLabel(value: { malePct: string; femalePct: string }) {
  return `${value.malePct || "0"}% male · ${value.femalePct || "0"}% female`;
}