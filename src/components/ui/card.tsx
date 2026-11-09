import { cn } from "@/lib/utils/cn";

type CardVariant = "default" | "raised" | "hero" | "plain";

export function Card({
  className,
  children,
  variant = "default",
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { variant?: CardVariant }) {
  const base =
    variant === "hero" ? "panel-hero" : variant === "raised" ? "panel-raised" : variant === "plain" ? "" : "panel";
  return (
    <div className={cn(base, variant !== "plain" && "p-5", "hover-lift", className)} {...props}>
      {children}
    </div>
  );
}

export function CardHeader({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("mb-3 flex items-center justify-between", className)} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({ className, children }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn("label", className)}>{children}</h3>;
}

export function CardContent({ className, children }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn(className)}>{children}</div>;
}

export function StatCard({
  label,
  value,
  sub,
  trend,
  accent = false,
  className,
}: {
  label: string;
  value: string;
  sub?: string;
  trend?: { value: string; positive: boolean };
  accent?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "panel p-4 hover-lift",
        accent && "border-accent/40",
        className
      )}
      style={accent ? { boxShadow: "0 1px 0 0 rgba(255,255,255,0.05) inset, 0 18px 40px -24px rgba(0,0,0,0.8), 0 0 40px -18px rgba(216,172,99,0.4)" } : undefined}
    >
      <p className="label">{label}</p>
      <p className={cn("display-xl text-[28px] mt-1.5", accent ? "text-accent" : "text-ink")}>{value}</p>
      <div className="flex items-center gap-2 mt-1">
        {trend && (
          <span className={cn("font-mono text-[11px]", trend.positive ? "text-green" : "text-red")}>
            {trend.positive ? "▲" : "▼"} {trend.value}
          </span>
        )}
        {sub && <span className="text-[11px] text-ink-faint">{sub}</span>}
      </div>
    </div>
  );
}

export function SectionLabel({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="label">{children}</h2>
      {action}
    </div>
  );
}
