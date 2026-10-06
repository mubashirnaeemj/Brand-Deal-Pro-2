import { CheckCircle2 } from "lucide-react";

export const CARD_REASON_LIMIT = 5;

export default function BrandMatchReasons({ reasons }: { reasons: string[] }) {
  return (
    <ul className="flex flex-col gap-3">
      {reasons.map((reason, index) => (
        <li key={index} className="flex items-start gap-2.5">
          <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-primary" />
          <span className="text-sm text-muted-foreground leading-relaxed">{reason}</span>
        </li>
      ))}
    </ul>
  );
}
