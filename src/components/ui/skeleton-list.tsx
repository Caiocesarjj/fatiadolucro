import { Skeleton } from "@/components/ui/skeleton";

interface SkeletonListProps {
  count?: number;
}

export const SkeletonList = ({ count = 4 }: SkeletonListProps) => (
  <div className="space-y-3">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="flex items-center gap-4 p-4 rounded-xl bg-muted/30">
        <Skeleton className="h-10 w-10 rounded-xl shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
        <Skeleton className="h-8 w-8 rounded-lg shrink-0" />
      </div>
    ))}
  </div>
);
