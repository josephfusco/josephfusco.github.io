---
layout: page
title: Blog
---

{% for post in site.posts %}
<a class="post-title" href="{{ post.url }}">{{ post.title }}</a>
<time datetime="{{ post.date | date_to_xmlschema }}">{{ post.date | date_to_string }}</time>
{% endfor %}