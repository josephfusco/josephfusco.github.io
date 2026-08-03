#!/usr/bin/env python3
"""Pull the WordPress record from official sources into _data/wp.json.

Three endpoints, all public and documented enough to rely on:
  core credits   which releases carry props for this contributor
  plugin info    install counts and release dates for maintained plugins

Pull requests are deliberately not counted: core patches land as
Trac changesets, so a contribution that shipped often shows on
GitHub as a closed, unmerged PR. Props in the credits API are the
record that matches how core actually works.

Run before `jekyll build`. If a source is unreachable the previous
file is kept, so a bad network never publishes a page that claims
less than the truth.
"""
import json
import os
import sys
import urllib.error
import urllib.request

USER = "joefusco"
PLUGINS = ["wpgraphql-ide", "presence-api"]
RELEASES = ["4.5", "4.6", "4.7", "4.8", "4.9", "5.0", "5.5", "5.9",
            "6.0", "6.1", "6.2", "6.3", "6.4", "6.5", "6.6", "6.7", "6.8", "7.0"]
OUT = os.path.join(os.path.dirname(__file__), "..", "_data", "wp.json")


def get(url, headers=None):
    req = urllib.request.Request(url, headers=headers or {"User-Agent": "josephfus.co build"})
    with urllib.request.urlopen(req, timeout=20) as r:
        return json.load(r)


def credited_releases():
    out = []
    for v in RELEASES:
        try:
            d = get("https://api.wordpress.org/core/credits/1.1/?version=%s&locale=en_US" % v)
        except Exception:
            continue
        for group in (d.get("groups") or {}).values():
            data = group.get("data")
            if isinstance(data, dict) and USER in data:
                out.append(v)
                break
    return out


def plugins():
    out = []
    for slug in PLUGINS:
        try:
            d = get("https://api.wordpress.org/plugins/info/1.2/"
                    "?action=plugin_information&request[slug]=" + slug)
        except Exception:
            continue
        if not d or d.get("error"):
            continue
        out.append({
            "slug": slug,
            "name": d.get("name"),
            "installs": d.get("active_installs"),
            "version": d.get("version"),
            "updated": (d.get("last_updated") or "").split(" ")[0],
        })
    return out


def main():
    data = {"releases": credited_releases(), "plugins": plugins()}
    if not data["releases"] and not data["plugins"]:
        print("every source failed; keeping the file that is already there", file=sys.stderr)
        return 0
    with open(OUT, "w") as f:
        json.dump(data, f, indent=2, sort_keys=True)
        f.write("\n")
    print("releases %d, plugins %d" % (len(data["releases"]), len(data["plugins"])))
    return 0


if __name__ == "__main__":
    sys.exit(main())
