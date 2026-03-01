import * as React from "react";
import { useInView } from "react-intersection-observer";

export interface CountUpProps {
  end: number | string;
  start?: number;
  duration?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  separator?: string;
  className?: string;
}

export function CountUp({
  end,
  start = 0,
  duration = 2000,
  decimals = 0,
  prefix = "",
  suffix = "",
  separator = ",",
  className,
}: CountUpProps) {
  const [count, setCount] = React.useState<number | string>(typeof end === 'string' ? end : start);
  const { ref, inView } = useInView({
    threshold: 0.3,
    triggerOnce: true,
  });

  React.useEffect(() => {
    if (typeof end === 'string' || !inView) return;

    const startTime = Date.now();
    const endTime = startTime + duration;
    const range = end - start;

    const updateCount = () => {
      const now = Date.now();
      const progress = Math.min((now - startTime) / duration, 1);

      // Easing function (ease-out)
      const easeOut = 1 - Math.pow(1 - progress, 3);

      const currentCount = start + range * easeOut;
      setCount(currentCount);

      if (now < endTime) {
        requestAnimationFrame(updateCount);
      } else {
        setCount(end);
      }
    };

    requestAnimationFrame(updateCount);
  }, [inView, end, start, duration]);

  const formatNumber = (num: number) => {
    const formatted = num.toFixed(decimals);
    const parts = formatted.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, separator);
    return parts.join('.');
  };

  // Handle string values (no animation)
  if (typeof end === 'string') {
    return (
      <span
        ref={ref}
        className={className}
        aria-live="polite"
        aria-atomic="true"
      >
        {prefix}
        {end}
        {suffix}
      </span>
    );
  }

  return (
    <span
      ref={ref}
      className={className}
      aria-live="polite"
      aria-atomic="true"
    >
      {prefix}
      {typeof count === 'number' ? formatNumber(count) : count}
      {suffix}
    </span>
  );
}