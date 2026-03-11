import { useState, useCallback } from "react";
import { useMotionValue, useTransform, animate } from "framer-motion";

const PULL_THRESHOLD = 80;

export function usePullToRefresh(onRefresh: () => Promise<void> | void) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const y = useMotionValue(0);
  const pullProgress = useTransform(y, [0, PULL_THRESHOLD], [0, 1]);
  const spinnerOpacity = useTransform(y, [0, PULL_THRESHOLD * 0.4, PULL_THRESHOLD], [0, 0.5, 1]);
  const spinnerScale = useTransform(y, [0, PULL_THRESHOLD], [0.5, 1]);

  const handleDragEnd = useCallback(async () => {
    if (y.get() >= PULL_THRESHOLD && !isRefreshing) {
      setIsRefreshing(true);
      animate(y, PULL_THRESHOLD * 0.6, { type: "spring", stiffness: 300 });
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
        animate(y, 0, { type: "spring", stiffness: 300, damping: 25 });
      }
    } else {
      animate(y, 0, { type: "spring", stiffness: 300, damping: 25 });
    }
  }, [onRefresh, isRefreshing, y]);

  return {
    y,
    pullProgress,
    spinnerOpacity,
    spinnerScale,
    isRefreshing,
    handleDragEnd,
    PULL_THRESHOLD,
  };
}
