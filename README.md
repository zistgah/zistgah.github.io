# Zistgah PWA + Android home-screen widget
© 1993–2026 Abhishek Choudhary · AyeAI · model: Claude Opus 4.8

Installable outside any store, works offline. The widget is a standalone surface
driven by the pure CHAKRA dial (project-ilm/chakra).

## Files
    index.html                the full Zistgah portal, PWA-enabled (manifest + service worker + install prompt)
    widget.html               the home-screen widget: CHAKRA dial + today's calendars, offline, taps through to the portal
    manifest.webmanifest       app identity, icons, the "Time dial" shortcut
    sw.js                      cache-first service worker (offline shell + runtime cache)
    icon-192.png / 512 / maskable-512   generated app icons (dome glyph on night ground)

## Deploy (any static host over HTTPS — GitHub Pages works)
    # copy the whole folder to the site root, e.g. zistgah/zistgah.github.io
    cp -r * /path/to/zistgah.github.io/
    cd /path/to/zistgah.github.io && git add -A && git commit -m "Zistgah PWA v1" && git push
HTTPS is required for service workers (GitHub Pages, Netlify, Cloudflare Pages all qualify).

## Install — Android (outside the Play Store)
Open the URL in Chrome → menu → **Install app** (or the ⤓ Install button that appears).
It lands on the home screen as a standalone app. No store account, no APK sideload.

## Install — iPhone
Open in Safari → Share → **Add to Home Screen**. Runs full-screen, offline.

## The Android home-screen widget
Two honest paths, in order of effort:

1. **Now (zero build):** long-press the home screen → Widgets → Chrome → **Bookmark/Shortcut**
   to `widget.html`. It opens the live dial. This works today.
2. **Native AppWidget (small wrapper, later):** a thin Android project whose
   `AppWidgetProvider` hosts a WebView pointed at `widget.html`, refreshed on the widget update
   interval. The widget UI itself is already built and offline — the wrapper only places it in a
   real home-screen cell. This is the Play-Store path and is the next mobile task.

## What is NOT done (honest)
- Native APK build + Play Store submission — the wrapper above.
- iOS App Store build.
Both were flagged as post-PWA. The PWA is the installable-today deliverable.
