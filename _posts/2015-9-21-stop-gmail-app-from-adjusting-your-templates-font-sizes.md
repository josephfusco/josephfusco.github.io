---
layout: post
title: Stop Gmail App From Adjusting Your Template's Font Sizes
permalink: stop-gmail-app-from-adjusting-your-templates-font-sizes
comments: false
---

Working heavily with email templates lately within MailChimp, I came across some weird behavior. The iOS Gmail app was just making things look completely different than every other email client. At this point I knew that a lot of stuff didn't work with Gmail but this had me scratching me head. After some research I discovered that this was due to Gmail adjusting the email font size for a *better experience* by increasing readability. In the case of my template design, this was not desired.

Putting a hidden `div` filled up with a bunch of non breaking spaces into your email template prevents this font resize. In the code below there is just enough of them that it creates ~ 500px area which is enough to prevent a resize.

```html
<div style="display:none; white-space:nowrap; font:15px courier; line-height:0;">
&nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp;
&nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp;
&nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp;
</div>
```

Ironically enough, this snippet was taken straight from a Google Analytics email.
