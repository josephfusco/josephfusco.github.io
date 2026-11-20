#!/usr/bin/env python3
"""Take Riff's player from a Riff, as WordPress prints it, into assets/riff/kit.json.

The player at the foot of a WordPress page is five things the Riff
plugin enqueues or prints: two stylesheets, the player's markup
(#riff), its settings (#riff-data), an import map naming its modules,
and the scripts themselves. This reads them off a live page of the Riff
and writes them down as one file, which assets/js/riff.js puts on the
page when someone presses a track. Nothing of Riff's is copied here but
the markup and the settings; the styles and scripts stay at the Riff's
own addresses, each with the version WordPress stamped on it.

Run after a Riff release: the markup and the scripts are one version and
must be taken together. If the Riff is unreachable, or the page no
longer holds a part, the previous file stands.
"""
import json
import os
import re
import sys
import urllib.request

RIFF = "https://open.riffpress.com/demo/"
OUT = os.path.join(os.path.dirname(__file__), "..", "assets", "riff", "kit.json")

# The stylesheets and scripts of the player itself, by the ids WordPress
# gives them, in the order they must run. The Listen app's, the
# network's and the extensions' are left where they are.
STYLES = ["riff-tokens-css", "riff-css"]
SCRIPTS = ["wp-hooks-js", "wp-dom-ready-js", "wp-i18n-js", "wp-a11y-js"]
MODULE = "riff-js-module"
# The views the player draws itself; one an extension adds needs that
# extension's script, which is not brought along.
VIEWS = ["album", "about", "queue"]


def tag(page, name, ident):
    """The opening tag with this id."""
    m = re.search(r"<%s\b[^>]*\bid=['\"]%s['\"][^>]*>" % (name, re.escape(ident)), page)
    if not m:
        raise LookupError(ident)
    return m.group(0)


def attr(markup, name):
    m = re.search(r"\b%s=(['\"])(.*?)\1" % name, markup)
    if not m:
        raise LookupError(name)
    return m.group(2).replace("&#038;", "&").replace("&amp;", "&")


def element(page, ident):
    """The whole div with this id, counted out to its own closing tag."""
    start = page.find('<div id="%s"' % ident)
    if start < 0:
        raise LookupError(ident)
    depth = 0
    for m in re.finditer(r"<(/?)div\b[^>]*>", page[start:]):
        depth += -1 if m.group(1) else 1
        if depth == 0:
            return page[start:start + m.end()]
    raise LookupError(ident)


def block(page, opening):
    """The text of the script that opens with this tag."""
    start = page.index(opening) + len(opening)
    return page[start:page.index("</script>", start)]


def main():
    try:
        req = urllib.request.Request(RIFF, headers={"User-Agent": "josephfus.co build"})
        page = urllib.request.urlopen(req, timeout=30).read().decode("utf-8")
        data = json.loads(block(page, tag(page, "script", "riff-data")))
        imports = json.loads(block(page, tag(page, "script", "wp-importmap")))["imports"]
        kit = {
            "riff": RIFF,
            "styles": [attr(tag(page, "link", s), "href") for s in STYLES],
            "scripts": [attr(tag(page, "script", s), "src") for s in SCRIPTS],
            "module": attr(tag(page, "script", MODULE), "src"),
            # the player's own modules; the Listen app's are never asked for here
            "imports": {k: v for k, v in imports.items() if k.startswith("riff-player/")},
            "root": element(page, "riff"),
        }
    except Exception as e:  # noqa: BLE001 - any failure leaves the old kit
        print("riff: %s: %s; keeping the previous kit" % (type(e).__name__, e), file=sys.stderr)
        return 0

    # This page is not the Listen app: no app to import, no panel open
    # before anything plays, and only the views the player draws itself.
    data.pop("panel", None)
    data.get("assets", {}).pop("app", None)
    for view in [k for k in data.get("views", {}) if k not in VIEWS]:
        del data["views"][view]
        # its buttons go too: pressed, they would open nothing
        kit["root"] = re.sub(r'<button\b[^>]*\bdata-riff-opens="%s"[^>]*>.*?</button>' % re.escape(view), "", kit["root"], flags=re.S)
    kit["data"] = data

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(kit, f, ensure_ascii=False, indent=1)
        f.write("\n")
    print("riff: %s, %d modules, %d bytes of markup" % (kit["module"].split("ver=")[-1], len(kit["imports"]), len(kit["root"])))
    return 0


if __name__ == "__main__":
    sys.exit(main())
