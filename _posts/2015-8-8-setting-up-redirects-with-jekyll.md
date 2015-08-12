---
layout: post
title: Setting Up Redirects With Jekyll
permalink: setting-up-redirects-with-jekyll
comments: true
---

If you are hosting yout jekyll site on GitHub like myself, there are some sacrifcies that have to be made. Unfortunately GitHub Pages does not support `.htacess`. This leaves you with very few options for redirects. I came across this awesome plugin [Jekyll Redirect From](https://github.com/jekyll/jekyll-redirect-from) which allows you to setup redirections quite easily.

### Setup

Download the plugin into your project. The quickest method would just be to install it via command-line.

```
gem install jekyll-redirect-from
```

Next add the following line to your `_config.yml`:

```
gems:
  - jekyll-redirect-from
```

Lastly, add the old url to the front matter of the existing destination page.

```
redirect_from: "/foo"
```

### Example

Let's say we want an old post `/redirect-jibjab` from our old site to redirect to this post, I would need to add this to the YAML front matter of *this* post.

```
---
layout: post
title: Setting Up Redirects With Jekyll
redirect_from: "/redirect-jibjab"
---
```

### Issues

In some cases with this plugin there is a quick flash of the redirected page that was generated with some basic unstyled html. It looks pretty ugly but there is talk of improving this with custom html options for these pages. See [Issue #55](https://github.com/jekyll/jekyll-redirect-from/issues/55)