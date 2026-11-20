# [https://josephfus.co](https://josephfus.co)

The source for josephfus.co, built with [Jekyll](https://jekyllrb.com/).

# Development

```sh
bundle exec jekyll serve --config _config.yml,_config_dev.yml --drafts --livereload
```

A post starts in `_drafts/` with no date in its filename. It shows locally with `--drafts` and nowhere else. Moving it to `_posts/` as `YYYY-MM-DD-slug.md` publishes it.

GitHub labels in a post are an include: `{% include label.html name="[Area] CLI" color="FEF298" %}`, with `dark=true` for a dark color.

The forest at the foot of the page is drawn by `python3 script/build-tree.py`, which writes the `assets/images/tree-*.svg` drawings and `_includes/tree.html`.

The album under RiffPress plays in Riff's own player, at the foot of the page. `python3 script/build-riff.py` reads the player's markup, settings and module names off the demo Riff into `assets/riff/kit.json`; the styles and scripts load from the Riff itself. Each deploy runs it again, so the copy follows a Riff release.

A source cited in a post is linked where it is mentioned, followed by its Wayback Machine snapshot: `[title](url) ([archived](https://web.archive.org/web/…))`.

# Tests

```sh
npm ci && npx playwright install chromium
npm test
```

Playwright builds the site and checks what has broken before: the nav marking the wrong page, the margins leaving the title's baseline, paragraphs leaving the grid, Lately repeating itself, a clamped line showing through, the masthead stacking on a phone, a quotation leaning left, birds hanging under the far wire, and old addresses that no longer answer. CI runs them on every pull request.

# License

MIT
