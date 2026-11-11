# YORAI — café de altura, Costa Rica

A luxury coffee site built as a scroll-driven 3D journey, drawn in a cel-shaded anime style (painted skies, ink lines, bloom and light shafts): misty plantation → harvest → micro-mill → roast → pour → cup, followed by the cupping table (menu), the collection, the farm story, an interactive map of Costa Rica's coffee regions and a contact section.

Static HTML / CSS / JavaScript. Three.js (minified module, 176 KB gzipped, loaded only after first paint and only on WebGL tiers) and GSAP (ScrollTrigger) are vendored in `site/vendor/`; the typefaces are self-hosted in `site/fonts/`. No build step, no trackers, no external requests at runtime. (A tree-shaken bundle was tried and saved only ~20 %, because the renderer pulls in most of the library, so the plain vendored file was kept for editability.)

## Deploy to GitHub Pages

Repository: `RuibinRay/Yorai`. Live at https://ruibinray.github.io/Yorai/ once Pages is enabled.

The deployable site is the `site/` folder. `.github/workflows/pages.yml` uploads it as the Pages artifact on every push to `main`, so the repository keeps its structure (site, tests, docs) and nothing is copied by hand.

One-time setup: Settings → Pages → Source: **GitHub Actions**. (The workflow cannot enable Pages itself; until it is enabled, the deploy job fails at `configure-pages`.) After that, every push to `main` redeploys in about a minute.

Every asset path in the site is relative, so it works at the `/Yorai/` sub-path and at a root domain alike; only the `og:image` and `canonical` URLs in `index.html` are absolute and would need changing for a custom domain.

## Editing content

Everything a visitor reads lives in `site/data/content.js`: chapter copy, menu, collection, story, regions, contact details. Brand facts marked `PLACEHOLDER` are invented for the demo and must be replaced before launch. The scroll length of each chapter is `length` (in vh) in `CHAPTERS`.

When you change any JS or CSS, bump the `?v=5` query on every import in `index.html` and the `js/*.js` imports at once (search for `?v=`), or browsers will mix old and new modules.

## Motion, quality tiers and diagnostics

- **Motion** button in the header: turns the live scene off (held still frames per chapter, crossfaded) and on. The choice is remembered on the device. If the operating system asks for reduced motion and the visitor hasn't chosen, the site starts still and shows a one-click notice to turn motion on.
- **Pause scene** (bottom right of the journey) pauses time-based motion (mist, drifting cloud, leaf wind, steam, tumbling beans, the camera's breath) without touching the scroll.
- The camera path is a dolly per chapter (pose `a` → `b`) and a crossing to the next chapter. A crossing is travel through mist: the camera eases away, rises by `CAM[i].lift` at its middle and settles down into the next place, while the fog closes over the first half until nothing of the place behind is left and opens over the second. Soft wisps stream past the lens, driven by the scroll, so they run backwards when the visitor does. Only one place is drawn at a time: the neighbours change over at the heart of the crossing, where the mist is total, so nothing pops and no two places are ever seen through each other. `CAM[i].cross` shortens a crossing where the way is dark. The knots are rounded by a small sampling kernel so the camera never halts or kinks at a pose.
- Entrance and reveal motion is CSS only: header, rail and nav-sheet links rise in on load (`rise-in` / `fade-up`, keyed off `html.js`), sections reveal with `.rv` and a `--rv-i` sibling stagger (set by `js/ui.js`), section titles and bags are uncovered with `clip-path`, dialogs and the phone nav sheet animate open and closed (`closeDialog` in `js/ui.js`). Every one of these is switched off under calm motion, which an inline script in `<head>` settles before first paint.
- Quality tiers: `full` (the display's pixel ratio up to 2× within a budget of about 8.5 million rendered pixels, a multisampled scene target, bloom on four levels, light shafts, full particle counts) → `lite` (pixel ratio up to 1.5×, or 1× on a software GPU; no multisampling or shafts, bloom on three levels, fewer instances; chosen on small screens, ≤ 4 cores or a software GPU) → `still` (no WebGL: painted gradients per chapter) → `text`. A watchdog steps the quality down after four seconds under 24 fps: first to pixel ratio 1 without multisampling and with fewer instances, then to no bloom or shafts. Force a tier with `?tier=full|lite|still|text`; an explicit tier is never demoted.
- The look is cel-shaded anime, built from three.js core only (no add-ons). Every surface is a toon material on one shared ramp with a rim light (`cel()` in `journey3d.js`; `rim: 0` for floors and walls). The sky is painted in a shader: gradient, cumulus sheets, cumulus towers on the horizon, a sun disc where the sun is in frame; it closes into haze during a crossing so fogged scenery ahead never shows as a flat shape. The post pass (`createPost`) draws the scene into a half-float target with a depth texture, then composites ink lines where depth breaks, bloom, light shafts toward the sun, tone mapping, a grade and a little grain. Per-chapter amounts (`cloud`, `disc`, `rays`, `ink`, `bloom`, `sat`) live in `PAL`. `?nopost` draws the cel scene straight to the canvas, for comparison and debugging.
- **Look** (bottom right of the journey, beside Pause scene) gives the visitor options for how the journey is drawn, remembered on the device. *Style*: Anime (the default), Pastel (lifted shadows, gentler colour, lighter lines), Manga (ink and screentone on paper, with the reds kept) and Film (no ink pass, soft shading, filmic contrast, grain, a vignette). *Detail*: Auto (the tier's own resolution, with the watchdog), High (full resolution and every effect), Balanced (up to 1.25×, no multisampling or shafts) and Light (1×, lines and colour only). Both apply live, without a reload. A look is a preset in `LOOKS` in `journey3d.js` over the same scene: the shared shading ramp is rewritten, and the post pass takes the rest. `?look=anime|pastel|manga|film` and `?detail=auto|high|balanced|light` set them from a link. The control appears only when the live scene is running; the still and text tiers have nothing to restyle.
- Far scenery (the volcano, the second cone, the two lines of hills in front of them) does not use the scene's distance fog, which would erase it at that range. It carries its own haze (`distant()`): a set amount at the top, growing toward the base, so the mountain stands clear of the mist that hides its foot. The volcano is a lathe on a concave profile with a crater, gullies and colour by height (`volcanoGeo`); the hills are flat cut-outs (`ridgeGeo`); steam drifts from the crater.
- Surfaces are drawn into canvases and tiled, in flat tones with ink joints: the field's rows and aisles (`fieldTex`), bare earth (`earthTex`), the yard's flagstones (`flagstoneTex`), brick (`brickTex`), terracotta tiles (`tileTex`), planks (`woodTex`), grass tufts (`tuftTex`). The roastery is a room (tiled floor, brick on three sides, a boarded ceiling on beams, open toward the way in); boulders are coarse icospheres (`rockGeo`).
- Each scene's floor still keeps to its own 70-unit stretch of the journey; the mill's yard uses `melt()` to dissolve into the haze before its edges.
- `?why` shows a diagnostic panel: tier and the reason, calm state and the reason, GPU, fps, scene state, progress.

## Tests (lab)

```
npm install            # playwright, axe-core, lighthouse, esbuild (dev only)
node tests/contrast.mjs   # every text/background token pair ≥ 4.5:1 (UI marks ≥ 3:1)
node tests/probe.mjs      # headless sweep: console errors, overflow, every chapter and section at 1440/390/820 px, interactions, reduced-motion session
node tests/axe.mjs        # axe-core at every chapter, section and with dialogs open, at 1440 and 390 px
node tests/og.mjs         # regenerates site/assets/og.jpg from the live hero scene (run from the repository root)
```

Lighthouse was run with `npx lighthouse` against a local server (see `tests/out/lh-*.json`). The lab has a software GPU, so its performance numbers for the WebGL page are pessimistic; the real frame rate on a device is the open check (see `?why`).

## Structure

```
site/
  index.html            markup, metadata, importmap
  css/tokens.css        design tokens (tested for contrast)
  css/site.css          styles, namespaced per section (.hdr .jr .cup .col .sty .org .ctc .ftr)
  data/content.js       all copy and data
  js/main.js            settings, header, scroll driver (--jt / --pn custom properties), tier decision, sections
  js/journey3d.js       the Three.js journey (six procedural environments, cel materials, painted sky, post pass, camera path, atmosphere, tiers)
  js/menu.js, collection.js, story.js, origins.js, contact.js, forms.js, settings.js
  js/ui.js              animated dialog close, reveal stagger indices
  js/look.js            the Look panel: style and detail options, stored under the `yorai:` prefix
  vendor/               three.module.js (minified, MIT), gsap.min.js + ScrollTrigger.min.js (GSAP licence)
  fonts/                Newsreader Variable (OFL), Hanken Grotesk Variable (OFL)
  assets/               favicon.svg, og.jpg
tests/                  probe, axe, contrast, og scripts (dev only)
```
