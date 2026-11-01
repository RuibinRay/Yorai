# Test results — 2026-11-01, cinematic pass (lab)

Same lab as below (headless Chromium, SwiftShader). Re-run after the camera-path, atmosphere, entrance/reveal and micro-interaction changes.

- tests/contrast.mjs: 20/20 pairs pass (tokens unchanged).
- tests/probe.mjs: 60/60 checks, 0 console errors, on two consecutive runs at 1440×900 (full), 390×844 (lite) and 820×1180 (still). The probe now waits for the collection's staggered reveal before opening the reserve dialog; without that wait Playwright's own scroll-into-view could nudge the page by a pixel mid-transition. The lab reports four "GPU stall due to ReadPixels" driver warnings, which come from the probe's own canvas read-back, not from the site.
- tests/axe.mjs: 0 violations across all 26 states.
- Frame sheets (renderAt at 0.05–0.25 steps through all six chapters, 1440×900 and 390×844): no empty frames outside the two short dark crossings (now 0.2 of a chapter, with a lamp visible on the approach), no foliage in the lens on the plantation → harvest and harvest → mill crossings (the camera cranes over the rows and the canopy), the roastery lit on arrival.
- Calm session (`prefers-reduced-motion`): no entrance animation on header, rail or sheet, titles and bags not clipped, pins visible without animation, dialogs without animation, `--m: 0`.
- Not measured here: real-GPU frame rate with the leaf wind shader and clouds (expected cost: one extra uniform and ~14 point sprites), the feel of the 1.1 s scrub, Safari/Firefox, touch.

# Test results — 2026-11-01 (lab)

Environment: headless Chromium (Playwright 1.63) with SwiftShader (software GPU), 2 cores, served from a local Python static server with no compression. Real-GPU frame rate, touch, Safari/Firefox and screen readers were not tested.

## tests/contrast.mjs
20/20 token pairs pass (text ≥ 4.5:1, UI marks ≥ 3:1), including each chapter accent on the copy scrim.

## tests/probe.mjs — 60/60 checks
- 0 console errors, 0 warnings on 1440×900 (full tier), 390×844 (lite), 820×1180 (still).
- No horizontal overflow on any width.
- Every chapter's copy fully visible and the driver on the right chapter at each midpoint, all three widths.
- Menu filter → 2 of 8; map list ↔ pin sync; a pin hit-tested and clicked at its centre; reserve dialog opens without scrolling, validates, copies the summary, closes on Escape and returns focus; contact validation; motion toggle persists across reload; first Tab → skip link.
- Reduced-motion session: starts calm, shows the notice, "Turn the motion on" works.

## tests/axe.mjs — 0 violations
26 states at 1440 and 390 px: every chapter, every section, the reserve dialog, the nav sheet (WCAG 2.x A/AA + 2.2 AA + best-practice rules, minor impact excluded).

## Lighthouse 12.6 (one run each)
| | Perf | A11y | BP | SEO | FCP | LCP | TBT | CLS |
|---|---|---|---|---|---|---|---|---|
| Desktop preset | 67 | 100 | 100 | 100 | 0.5 s | 0.8 s | 1.3 s | 0.001 |
| Mobile emulation (slow 4G, 4× CPU) | 62 | 100 | 100 | 100 | 1.8 s | 3.4 s | 1.7 s | 0.004 |

CLS meets the ≤ 0.1 target. Mobile LCP misses 2.5 s in this lab (text LCP element; the display-font swap and the throttled network are the remaining cost). TBT is the three.js parse and the first scene build on a 4×-throttled CPU; the environments after the first are built in idle time. INP cannot be measured in the lab. The software GPU makes the performance score itself pessimistic for a WebGL page; `?why` on a real device is the number that matters.

## Payload (uncompressed / gzip)
three.module.js 688 KB / 176 KB (loaded after first paint, WebGL tiers only) · gsap + ScrollTrigger 116 KB / ~45 KB · site.css 22 KB / 7 KB · fonts 117 KB (four instances) · js 96 KB total.
