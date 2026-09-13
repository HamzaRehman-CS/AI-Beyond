# Superconscious — Intelligence, beyond limits

A local recreation of the website visible in the supplied screen recording. The previous Rah travel project has been removed.

Run `npm start` and open http://localhost:3000. No build step or installation is required. Three.js is vendored locally; the site makes no external asset requests.

The experience includes a rotating four-card carousel, an interactive Three.js particle ring, a pinned horizontal project gallery, floating artwork that transitions into a full-screen metallic-star scene, and a purple prompt panel that rotates away into the closing screen. The star is a procedural rounded mesh with physically based metallic shading. Scroll and pointer interactions, small-screen layouts, keyboard navigation, dialog focus handling, and reduced-motion support are included.

Search, card details, project previews, prompt copying, pricing previews, and the journey form work. Journey requests are stored in `data/join.jsonl`; no email, real AI inference, payment, or subscription service is connected. Unseen button destinations were implemented as matching preview flows. Visible reference text, including the creative-community count, was reproduced from the recording and is not an independently verified business claim.

Artwork was extracted from the user-supplied recording; its resolution is limited by that recording. The original site's source code, assets, exact animation curves, and unseen flows were not provided, so this is a visual reconstruction rather than a verified pixel-identical copy. The separate Gravity prompt was not used as the design specification.

`dist/index.html`, `dist/style.css`, and `dist/app.js` contain the site. `server.mjs` serves it and handles local requests. `reference/` contains extracted frames and screenshot comparisons. `verify.cjs` checks rendering, search, dialogs, local signup, and mobile overflow. The test removes its own signup record after completion.

## Performance

Wheel and touch input use native browser scrolling. Navigation links use native smooth scrolling, with instant navigation when reduced motion is enabled. The animation loop caches layout measurements, updates only visible sections, and sleeps on static sections, hidden tabs, and behind open dialogs. Decorative CSS animation also pauses offscreen and behind dialogs. In Updates, the floating artwork uses compositor transforms during scrolling; the metallic-star scene holds its last frame until scrolling settles, then renders once at the final position.

WebGL scenes initialize near their sections. The metallic-star canvas has a fixed drawing-buffer size and its panel uses compositor transforms during expansion, avoiding repeated canvas allocation. Images below the hero load lazily. Animated SVG noise and expensive background blurs have been removed.

Quality starts from device memory, processor count, viewport size, and data-saving preferences. Low / balanced / high modes use 5,000 / 10,000 / 22,000 particles and cap pixel ratio at 0.85 / 1.1 / 1.4. Sustained slow frames automatically reduce quality. Low mode also uses a simpler metal material and smaller mesh. Mobile scroll sections are shorter and carousel touch controls have larger hit areas.

In a short Chromium mobile test at 390×844, device pixel ratio 2, simulated 2-core / 2 GB hardware hints, and 4× CPU throttling, the optimized hero averaged 16.8 ms/frame, the particle scene 16.5 ms/frame, and the star scene 20.2 ms/frame. These are synthetic results on the development machine, not a guarantee for every physical device. Raw before/after results are in `reference/performance-before.json` and `reference/performance-after.json`.

`node reference/optimization-check.cjs` verifies native scroll response, low-device settings, lazy scene initialization, dialog/offscreen/reduced-motion idle behavior, fixed canvas allocation during scrolling, navigation, search, and a 320px-wide layout.
