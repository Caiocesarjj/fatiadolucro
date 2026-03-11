import { ReactNode, useRef } from "react";
import { motion, useMotionValueEvent } from "framer-motion";
import { Loader2 } from "lucide-react";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { useIsMobile } from "@/hooks/use-mobile";

interface PullToRefreshProps {
  onRefresh: () => Promise<void> | void;
  children: ReactNode;
}

export function PullToRefresh({ onRefresh, children }: PullToRefreshProps) {
  const isMobile = useIsMobile();
  const {
    y,
    spinnerOpacity,
    spinnerScale,
    isRefreshing,
    handleDragEnd,
    PULL_THRESHOLD,
  } = usePullToRefresh(onRefresh);

  const containerRef = useRef<HTMLDivElement>(null);

  // Only enable on mobile
  if (!isMobile) {
    return <>{children}</>;
  }

  return (
    <div className="relative overflow-hidden" ref={containerRef}>
      {/* Spinner indicator */}
      <motion.div
        className="absolute left-1/2 -translate-x-1/2 z-10 flex items-center justify-center"
        style={{
          opacity: spinnerOpacity,
          scale: spinnerScale,
          top: 8,
        }}
      >
        <div className="bg-card rounded-full p-2 shadow-md border border-border/50">
          <Loader2
            className={`h-5 w-5 text-primary ${isRefreshing ? "animate-spin" : ""}`}
          />
        </div>
      </motion.div>

      {/* Draggable content */}
      <motion.div
        style={{ y }}
        drag="y"
        dragConstraints={{ top: 0, bottom: PULL_THRESHOLD }}
        dragElastic={{ top: 0, bottom: 0.4 }}
        onDragEnd={handleDragEnd}
        dragDirectionLock
        onDirectionLock={(axis) => {
          // If user is scrolling horizontally, ignore
          if (axis === "x") return;
        }}
      >
        {children}
      </motion.div>
    </div>
  );
}
