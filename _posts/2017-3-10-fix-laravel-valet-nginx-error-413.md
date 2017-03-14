---
layout: post
title: Fix Laravel Valet Nginx error 413
permalink: fix-laravel-valet-nginx-error-413
---
## Nginx error 413: Request entity too large

I came across this error while importing some test data into the WordPress plugin CoursePress Pro on a new Valet site.

All we have to do is increase the `client_max_body_size` within that site's Nginx config.

```
atom ~/.valet/Nginx/example.dev
```

In this case I had to add a new line for `client_max_body_size` and set it to `500M`.

```
server {
    listen 443 ssl http2;
    server_name example.dev;
    root /;
    charset utf-8;
    client_max_body_size 500M;
```

Lastly, we need to restart valet.

```
valet restart
```
