import { useCallback, useEffect, useRef, useState } from "react";

export function useFullscreen<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const update = () => {
      setIsFullscreen(document.fullscreenElement === ref.current);
    };

    update();
    document.addEventListener("fullscreenchange", update);
    return () => document.removeEventListener("fullscreenchange", update);
  }, []);

  const toggleFullscreen = useCallback(async () => {
    const el = ref.current;
    if (!el) return;

    if (document.fullscreenElement) {
      await document.exitFullscreen();
      return;
    }

    if (typeof el.requestFullscreen === "function") {
      await el.requestFullscreen();
    }
  }, []);

  return { ref, isFullscreen, toggleFullscreen };
}
