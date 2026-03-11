import { ReactNode, useRef, useState, useCallback } from "react";
import { Loader2 } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

interface PullToRefreshProps {
  onRefresh: () => Promise<void> | void;
  children: ReactNode;
}

const THRESHOLD = 80;

export function PullToRefresh({ onRefresh, children }: PullToRefreshProps) {
  const isMobile = useIsMobile();
  const [pulling, setPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  if (!isMobile) {
    return <>{children}</>;
  }

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    // Only start pull if scrolled to the top
    const scrollTop = containerRef.current?.closest('[class*="flex-1"]')?.scrollTop
      ?? document.documentElement.scrollTop
      ?? 0;
    if (scrollTop <= 0 && !refreshing) {
      startY.current = e.touches[0].clientY;
      setPulling(true);
    }
  }, [refreshing]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!pulling) return;
    const delta = e.touches[0].clientY - startY.current;
    if (delta > 0) {
      setPullDistance(Math.min(delta * 0.5, THRESHOLD * 1.5));
    } else {
      setPullDistance(0);
    }
  }, [pulling]);

  const handleTouchEnd = useCallback(async () => {
    if (!pulling) return;
    setPulling(false);

    if (pullDistance >= THRESHOLD) {
      setRefreshing(true);
      setPullDistance(THRESHOLD * 0.5);
      try {
        await onRefresh();
      } finally {
        setRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
  }, [pulling, pullDistance, onRefresh]);

  const progress = Math.min(pullDistance / THRESHOLD, 1);

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull indicator */}
      <div
        className="flex justify-center overflow-hidden transition-all duration-200"
        style={{ height: pullDistance > 0 || refreshing ? Math.max(pullDistance, refreshing ? 40 : 0) : 0 }}
      >
        <div
          className="flex items-center justify-center"
          style={{
            opacity: progress,
            transform: `scale(${0.5 + progress * 0.5})`,
          }}
        >
          <div className="bg-card rounded-full p-2 shadow-md border border-border/50">
            <Loader2
              className={`h-5 w-5 text-primary ${refreshing ? "animate-spin" : ""}`}
              style={!refreshing ? { transform: `rotate(${progress * 360}deg)` } : undefined}
            />
          </div>
        </div>
      </div>
      {children}
    </div>
  );
}
