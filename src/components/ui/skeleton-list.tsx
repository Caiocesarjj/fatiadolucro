import { cn } from "@/lib/utils";

interface SkeletonListProps {
  count?: number;
  variant?: "list" | "card" | "row";
  className?: string;
}

function SkeletonPulse({ className }: { className?: string }) {
  return (
    <div className={cn("animate-pulse rounded-md bg-muted", className)} />
  );
}

export function SkeletonList({
  count = 4,
  variant = "list",
  className,
}: SkeletonListProps) {
  return (
    <div className={cn("space-y-3", className)}>
      {Array.from({ length: count }).map((_, i) => {
        if (variant === "card") {
          return (
            <div key={i} className="rounded-2xl border bg-card p-4">
              <div className="flex items-center gap-3">
                <SkeletonPulse className="h-10 w-10 rounded-xl shrink-0" />
                <div className="flex-1 space-y-2">
                  <SkeletonPulse className="h-4 w-3/4" />
                  <SkeletonPulse className="h-3 w-1/2" />
                </div>
                <SkeletonPulse className="h-8 w-16 rounded-lg shrink-0" />
              </div>
            </div>
          );
        }

        if (variant === "row") {
          return (
            <div key={i} className="flex items-center gap-4 p-3">
              <SkeletonPulse className="h-4 w-20" />
              <SkeletonPulse className="h-4 flex-1" />
              <SkeletonPulse className="h-4 w-16" />
            </div>
          );
        }

        // Default: "list" — native app row style
        return (
          <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-muted/30">
            <SkeletonPulse className="h-10 w-10 rounded-xl shrink-0" />
            <div className="flex-1 space-y-2">
              <SkeletonPulse className="h-4 w-3/4" />
              <SkeletonPulse className="h-3 w-1/2" />
            </div>
          </div>
        );
      })}
    </div>
  );
}
