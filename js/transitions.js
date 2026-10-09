/* ==========================================================================
   TRANSITIONS
   `Transitions.run(swap, opts)` fades the page out, awaits `swap()` (which
   renders the next tab underneath), then fades it back in.
   ========================================================================== */
(function () {
  const layer = document.getElementById("transition");
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const anim = (el, kf, o) => el.animate(kf, Object.assign({ fill: "both", easing: "ease" }, o)).finished;

  /** a standard fade through the page colour; startCovered = begin fully faded (the first load) */
  async function fade(swap, { startCovered = false } = {}) {
    layer.innerHTML = '<div class="tx tx-fade"></div>';
    layer.classList.add("active");
    const cover = layer.firstElementChild;
    if (startCovered) cover.style.opacity = "1";
    else await anim(cover, [{ opacity: 0 }, { opacity: 1 }], { duration: reduce ? 120 : 250 });
    await swap();
    await anim(cover, [{ opacity: 1 }, { opacity: 0 }], { duration: reduce ? 150 : 350 });
    layer.classList.remove("active");
    layer.innerHTML = "";
  }

  window.Transitions = { run: fade };
})();
