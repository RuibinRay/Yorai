# YORAI — café de altura, Costa Rica

A luxury coffee site built as a scroll-driven 3D journey: misty plantation → harvest → micro-mill → roast → pour → cup, followed by the cupping table (menu), the collection, the farm story, an interactive map of Costa Rica's coffee regions and a contact section.

Static HTML / CSS / JavaScript. Three.js (minified module, 176 KB gzipped, loaded only after first paint and only on WebGL tiers) and GSAP (ScrollTrigger) are vendored in `site/vendor/`; the typefaces are self-hosted in `site/fonts/`. No build step, no trackers, no external requests at runtime. (A tree-shaken bundle was tried and saved only ~20 %, because the renderer pulls in most of the library, so the plain vendored file was kept for editability.)

## Deploy to GitHub Pages

Repository: `RuibinRay/Yorai`. Live at https://ruibinray.github.io/Yorai/ once Pages is enabled.

The deployable site is the `site/` folder. `.github/workflows/pages.yml` uploads it as the Pages artifact on every push to `main`, so the repository keeps its structure (site, tests, docs) and nothing is copied by hand.

One-time setup: Settings → Pages → Source: **GitHub Actions**. (The workflow cannot enable Pages itself; until it is enabled, the deploy job fails at `configure-pages`.) After that, every push to `main` redeploys in about a minute.

Every asset path in the site is relative, so it works at the `/Yorai/` sub-path and at a root domain alike; only the `og:image` and `canonical` URLs in `index.html` are absolute and would need changing for a custom domain.

## Editing content

Everything a visitor reads lives in `site/data/content.js`: chapter copy, menu, collection, story, regions, contact details. Brand facts marked `PLACEHOLDER` are invented for the demo and must be replaced before launch. The scroll length of each chapter is `length` (in vh) in `CHAPTERS`.

When you change any JS or CSS, bump the `?v=1` query on every import in `index.html` and the `js/*.js` imports at once (search for `?v=`), or browsers will mix old and new modules.

## Motion, quality tiers and diagnostics

- **Motion** button in the header: turns the live scene off (held still frames per chapter, crossfaded) and on. The choice is remembered on the device. If the operating system asks for reduced motion and the visitor hasn't chosen, the site starts still and shows a one-click notice to turn motion on.
- **Pause scene** (bottom right of the journey) pauses time-based motion (mist, steam, tumbling beans) without touching the scroll.
- Quality tiers: `full` (device pixel ratio up to 2, full particle counts) → `lite` (dpr 1, fewer instances; chosen on small screens, ≤ 4 cores or a software GPU; the watchdog also steps full down to lite after 4 s under 24 fps) → `still` (no WebGL: painted gradients per chapter) → `text`. Force one with `?tier=full|lite|still|text`; an explicit tier is never demoted.
- `?why` shows a diagnostic panel: tier and the reason, calm state and the reason, GPU, fps, scene state, progress.

## Tests (lab)

```
npm install            # playwright, axe-core, lighthouse, esbuild (dev only)
node tests/contrast.mjs   # every text/background token pair ≥ 4.5:1 (UI marks ≥ 3:1)
node tests/probe.mjs      # headless sweep: console errors, overflow, every chapter and section at 1440/390/820 px, interactions, reduced-motion session
node tests/axe.mjs        # axe-core at every chapter, section and with dialogs open, at 1440 and 390 px
node tests/og.mjs         # regenerates assets/og.jpg from the live hero scene
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
  js/journey3d.js       the Three.js journey (six procedural environments, camera path, atmosphere, tiers)
  js/menu.js, collection.js, story.js, origins.js, contact.js, forms.js, settings.js
  vendor/               three.module.js (minified, MIT), gsap.min.js + ScrollTrigger.min.js (GSAP licence)
  fonts/                Newsreader Variable (OFL), Hanken Grotesk Variable (OFL)
  assets/               favicon.svg, og.jpg
tests/                  probe, axe, contrast, og scripts (dev only)
```
