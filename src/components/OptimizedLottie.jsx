// src/components/OptimizedLottie.jsx
// Performance-optimized wrapper around lottie-react.
//
// Why this exists: the plain <Lottie loop autoplay> icons each run a
// non-stop requestAnimationFrame loop with the heavy SVG renderer. With
// several of them mounted at once (e.g. the dashboard quick-action grid)
// the SVG DOM mutations every frame saturate the main thread on low-end
// phones and the page "freezes".
//
// This wrapper keeps the icons looping (lively feel) but makes each frame
// cheap and avoids wasted work:
//  - Uses the CANVAS renderer instead of SVG → one element per icon, no
//    per-frame DOM/layout thrash (the main cause of the freeze).
//  - Auto-pauses whenever the icon is scrolled offscreen or the browser
//    tab is hidden (IntersectionObserver + Page Visibility API), so no
//    animation runs when nobody can see it.
import React, { useRef, useEffect } from "react";
import Lottie from "lottie-react";

const OptimizedLottie = ({
  animationData,
  className = "h-5 w-5",
  loop = true,
  autoplay = true,
}) => {
  const lottieRef = useRef(null);
  const containerRef = useRef(null);

  // Pause when offscreen / tab hidden so looping icons never burn CPU in
  // the background. Resumes automatically when visible again.
  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;

    let isVisible = true;
    const sync = () => {
      const anim = lottieRef.current;
      if (!anim) return;
      if (loop && isVisible && !document.hidden) {
        anim.play();
      } else {
        anim.pause();
      }
    };

    const io = new IntersectionObserver(
      ([entry]) => {
        isVisible = entry.isIntersecting;
        sync();
      },
      { threshold: 0.1 }
    );
    io.observe(el);
    document.addEventListener("visibilitychange", sync);

    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", sync);
    };
  }, [loop]);

  return (
    <span
      ref={containerRef}
      className={`inline-flex flex-shrink-0 items-center justify-center overflow-hidden ${className}`}
      aria-hidden="true"
    >
      <Lottie
        lottieRef={lottieRef}
        animationData={animationData}
        loop={loop}
        autoplay={autoplay}
        renderer="canvas"
        rendererSettings={{ clearCanvas: true, progressiveLoad: false }}
        className="h-full w-full"
      />
    </span>
  );
};

export default OptimizedLottie;
