#!/usr/bin/env python3
"""Pull recent WordPress.org activity into _data/wp.json.

Source: https://profiles.wordpress.org/joefusco/feed/, the official
RSS feed behind the .org profile. It carries the real record, plugin
SVN commits, pull requests opened and merged, pushes, in the order
they happened.

Run before `jekyll build`. If the feed is unreachable the previous
file stands, so a bad network never publishes a page that claims
less than the truth.
"""
import html
import json
import os
import re
import sys
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime

FEED = "https://profiles.wordpress.org/joefusco/feed/"
OUT = os.path.join(os.path.dirname(__file__), "..", "_data", "wp.json")
KEEP = 6

# "Merged pull request #158 into WordPress/presence-api: fix: enforce ..."
PR = re.compile(r"^(Submitted|Merged) pull request #(\d+) (?:to|into) ([\w.-]+/[\w.-]+): (.+)$")
PUSH = re.compile(r"^Pushed (\d+) commits? to ([\w.-]+/[\w.-]+): (.+)$")
SVN = re.compile(r"^Committed \[(\d+)\] to (.+?): (.+)$")


def phrase(title):
    """Say what happened in the site's voice, without the bookkeeping."""
    m = PR.match(title)
    if m:
        verb = "Opened" if m.group(1) == "Submitted" else "Merged"
        return "%s a pull request in %s" % (verb, m.group(3)), m.group(4)
    m = PUSH.match(title)
    if m:
        n = int(m.group(1))
        return "Pushed %s to %s" % ("a commit" if n == 1 else "%d commits" % n, m.group(2)), m.group(3)
    m = SVN.match(title)
    if m:
        return "Committed to %s" % m.group(2), m.group(3)
    return title, ""


def main():
    req = urllib.request.Request(FEED, headers={"User-Agent": "josephfus.co build"})
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            root = ET.fromstring(r.read())
    except Exception as e:
        print("feed unreachable (%s); keeping the file already there" % e, file=sys.stderr)
        return 0

    seen, items = set(), []
    for it in root.findall(".//item"):
        title = html.unescape(re.sub(r"<[^>]+>", "", (it.findtext("title") or "")).strip())
        link = (it.findtext("link") or "").strip()
        if not title or link in seen:
            continue
        seen.add(link)
        what, subject = phrase(title)
        # collapse an opened-then-merged pair into the merge alone
        try:
            when = parsedate_to_datetime(it.findtext("pubDate")).date().isoformat()
        except Exception:
            when = ""
        items.append({"what": what, "subject": subject.rstrip("."), "url": link, "date": when})
        if len(items) >= KEEP:
            break

    if not items:
        print("feed held nothing; keeping the file already there", file=sys.stderr)
        return 0

    with open(OUT, "w") as f:
        json.dump({"activity": items, "fetched": datetime.now(timezone.utc).date().isoformat()},
                  f, indent=2, sort_keys=True)
        f.write("\n")
    print("wrote %d items, newest %s" % (len(items), items[0]["date"]))
    return 0


if __name__ == "__main__":
    sys.exit(main())
