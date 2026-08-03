---
layout: page
permalink: /about/
title: About
meta: The person holding the pen.
---

<img class="about-portrait" src="/assets/images/joe.jpg" alt="Joe Fusco smiling in a sun hat, in his garden among young trees" width="400" height="400">

I'm Joe Fusco. I maintain headless WordPress plugins at [WP Engine](https://wpengine.com) and contribute to WordPress core.

Core work centers on the [Presence API](https://github.com/WordPress/presence-api), WordPress's system-wide presence and awareness layer. {% assign r = site.data.wp.releases %}{% if r.size > 1 %}Props in the credits for WordPress {% for v in r %}{% if forloop.last %}and {{ v }}{% else %}{{ v }}{% unless forloop.length == 2 %},{% endunless %} {% endif %}{% endfor %}.{% endif %} On the headless side, that work continues in the [WPGraphQL IDE](https://wordpress.org/plugins/wpgraphql-ide/). Most of my open-source time goes into release automation and testing.

Outside WordPress there is [LexGrade](https://lexgrade.org), an open standard for grading legal motions, published under CC-BY-SA and owned by no one.

The rest is amateur arboriculture, and being a dad. The desk itself is cataloged on the [uses page](/uses), last inventoried in 2015 and owed a fresh one.
