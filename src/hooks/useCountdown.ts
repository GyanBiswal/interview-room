import { useCallback, useEffect, useRef, useState } from "react";

// Countdown based on timestamps, so it stays accurate even if the browser
// slows down timers in a background tab. Supports pause and resume.
export function useCountdown(totalSeconds: number, onExpire: () => void) {
  const [endsAt, setEndsAt] = useState<number>(
    () => Date.now() + totalSeconds * 1000
  );
  const [remaining, setRemaining] = useState<number>(totalSeconds);
  const [paused, setPaused] = useState(false);
  const leftWhenPausedMs = useRef(0);
  const expiredRef = useRef(false);
  const onExpireRef = useRef(onExpire);

  useEffect(() => {
    onExpireRef.current = onExpire;
  });

  useEffect(() => {
    let id: number | undefined;
    if (!paused) {
      const tick = () => {
        const left = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
        setRemaining(left);
        if (left <= 0 && !expiredRef.current) {
          expiredRef.current = true;
          onExpireRef.current();
        }
      };
      tick();
      id = window.setInterval(tick, 250);
    }
    return () => {
      if (id !== undefined) window.clearInterval(id);
    };
  }, [paused, endsAt]);

  const pause = useCallback(() => {
    leftWhenPausedMs.current = Math.max(0, endsAt - Date.now());
    setPaused(true);
  }, [endsAt]);

  const resume = useCallback(() => {
    setEndsAt(Date.now() + leftWhenPausedMs.current);
    setPaused(false);
  }, []);

  return { remaining, paused, pause, resume };
}
