# Test results — 2026-11-11, products, cart and checkout

Lab: headless Chromium, as below. Real browser: the Claude desktop browser pane on an Apple M2.

- tests/contrast.mjs: 20/20 (tokens unchanged).
- tests/probe.mjs: 95/95 checks, 0 console errors. Twenty-six are new and walk the shop: all 17 pictures in use; a bag opens its panel; arrows and arrow keys move between bags; size and quantity set the price; adding is confirmed and counted; the cart opens with the line, its stepper keeps focus, checkout validates and writes the order out, the last line removed shows the empty cart, Escape closes it and focus returns; a card's quick add; the gift box opens on four bags and adds one of each; the cart survives a reload; the method filter alone and together with the process filter; compare takes three and refuses a fourth, and sets notes out by family; a coffee's panel, Take it home, and Book a tasting filling the contact form.
- tests/axe.mjs: 0 violations in 42 states (fourteen new: bag panel, cart, checkout with errors, opened gift box, coffee panel, compare bar and compare dialog, each at 1440 and 390 px).
- Scripted walkthrough with screenshots at 1440×900 and 390×844: no horizontal overflow; the panel's confirmation fits without scrolling on a laptop; three compared coffees fit a phone without sideways scroll.
- Real browser: tilt, zoom and highlight follow the pointer on a bag; clicking the card opens the panel without moving the page; the original picture is served to the panel on a 2× display.
- Not tested: touch devices in hand, Safari and Firefox, a real email client receiving the order (the lab cannot open one).

# Test results — 2026-11-10, scenery pass (volcano, field, crossings, room and yard detail)

Lab: headless Chromium with SwiftShader, as below. Real GPU: the Claude desktop browser pane on an Apple M2 (ANGLE Metal).

- tests/contrast.mjs: 20/20. tests/probe.mjs: 69/69 checks, 0 console errors. tests/axe.mjs: 0 violations in 28 states.
- Frame sheets through `renderAt`: the plantation at 0.02–0.7, every crossing at 0.04–0.06 steps (the lift, the mist closing, the white-out with wisps, the next place emerging), the mill, the roastery from arrival to close-up, the pour and the cup, at 1440×900 full; the reworked chapters at 390×844 lite and 2× device pixels. All four looks on the new field and roastery.
- One place at a time: at the midpoint of each crossing the fog density is about 0.97, so nothing beyond two or three units is visible when the neighbours change over.
- `?nopost` and a reduced-motion session render without errors.
- Real GPU (2048×1536 buffer, 2× multisampling, full post pass), synchronous per-frame time: plantation about 9.5–12 ms (it was about 8 ms before the field, trees and far landscape), the lift over the rows 7.4 ms, mid-crossing 7.2 ms, harvest 6.5 ms, mill 7.7 ms, roastery 7.6 ms, pour 7.8 ms, cup 4.3 ms. The pane's timer is noisy by a couple of milliseconds. Not a frame-rate measurement of a scrolling session, and not a phone.
- Not measured: phone GPUs, Safari and Firefox, touch.

# Test results — 2026-11-10, anime cel pass

Lab: headless Chromium with SwiftShader (software GPU), as below. Real GPU: the Claude desktop browser pane on an Apple M2 (ANGLE Metal).

- tests/contrast.mjs: 20/20 pairs pass (tokens unchanged).
- tests/probe.mjs: 69/69 checks, 0 console errors, at 1440×900 (full), 390×844 (lite) and 820×1180 (still). Nine of the checks are new and cover the Look panel: it appears when the scene is ready, opens with focus on the current style, follows the arrow keys, sets and stores a style and a detail level, never scrolls the page, closes on Escape with focus returned, and persists across a reload. The four warnings are the driver's "ReadPixels" notices from the probe's own canvas read-back.
- tests/axe.mjs: 0 violations across all 28 states (the Look panel open, at both widths, is new).
- Looks: Anime, Pastel, Manga and Film rendered through `renderAt` at four to six chapters each, 1440×900; Manga also confirmed on the real GPU by switching from the panel. Detail: buffer size and multisampling read back for Auto, High, Balanced and Light on both tiers at 2× device pixels (full tier 2880×1800 with 2× multisampling → 1800×1125 → 1440×900 and back; lite tier 585×1266 → 780×1688 with multisampling → 487×1055 → 390×844 and back), no WebGL errors.
- Frame sheets through `renderAt` (all six chapters, every crossing at 0.04–0.1 steps, 1440×900 full; 390×844 and 820×1180 lite at 2× device pixels): cel shading, ink lines, sky, bloom and shafts present; no neighbouring floor showing through another (the mill's yard had been; it now keeps to its slot); the roastery's wall no longer reads as a rectangle against the sky during the mill → roast crossing (the sky closes into haze first).
- Calm session (`prefers-reduced-motion`): held poses render through the same post pass; the notice appears; no entrance animation.
- `?nopost`: the cel scene draws straight to the canvas with no errors.
- Real GPU (Apple M2, 2048×1536 buffer, 2× multisampling, full post pass): 3.8–8.0 ms per frame measured synchronously per chapter (plantation the heaviest), no WebGL errors, no console output. Not a frame-rate measurement of a scrolling session, and not a phone.
- Not measured: phone GPUs (the lite tier now renders at up to 1.5× with a three-level bloom; the watchdog is the safety net), Safari and Firefox, touch.

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
