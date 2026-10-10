# [https://josephfus.co](https://josephfus.co)

A simple portfolio theme powered by [jekyll](https://jekyllrb.com/).

# Development

```sh
bundle exec jekyll serve --config _config.yml,_config_dev.yml --drafts --livereload
```

A post starts in `_drafts/` with no date in its filename. It shows locally with `--drafts` and nowhere else. Moving it to `_posts/` as `YYYY-MM-DD-slug.md` publishes it.

GitHub labels in a post are an include: `{% include label.html name="[Area] CLI" color="FEF298" %}`, with `dark=true` for a dark color.

# License

MIT
