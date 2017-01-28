---
layout: post
title: How To Force Hardware Acceleration In Your CSS
permalink: how-to-force-hardware-acceleration-in-your-css
---

Looking to make your CSS animations buttery smooth?  Maybe you should push off that task to the GPU (Graphics Processing Unit).  This offloading is known as hardware acceleration.  Certain properties such as 3d transformations are already handled by the GPU, but we can also trick browsers into it as well.

```css
.box {
	transform: translateZ(0);
}

// or
.box {
	transform: translate3d(0, 0, 0);
}
```

Adding either one of these won’t visibly do anything, but it does tell the browser, “Whoa dude, this is too hot for the CPU, send this guy elsewhere.”

Anytime we work with 3d transformations you may also see a performance increase by adding perspective and backface-visibility to the mix.

```css
.box {
	transform: translate3d(0, 0, 0);
	backface-visibility: hidden;
	perspective: 1000;
}
```

*Keep in mind that I did not use vendor prefixes in order to demonstrate the concept without all that prefix bloat.

## Well what about JavaScript?

JavaScript should be used when you need control over your animations, such as pausing, stopping, reversing, or slowing down. Stuff like slide out menus and simpler self contained UI states are going to see better performance with CSS.

## Comparison

Below you can see both hardware accelerated CSS, non-hardware accelerated CSS, and jQuery animations side by side. We can see that simply using a translate instead of left does the exact same thing, but offers a mode stable and fluid slide, although very subtle on this level.

<p data-height="268" data-theme-id="7049" data-slug-hash="OPRpPM" data-default-tab="result" data-user="fusco" class='codepen'>See the Pen <a href='http://codepen.io/fusco/pen/OPRpPM/'>Animation Experiment with Hardware Acceleration</a> by Joseph Fusco (<a href='http://codepen.io/fusco'>@fusco</a>) on <a href='http://codepen.io'>CodePen</a>.</p>
<script async src="//assets.codepen.io/assets/embed/ei.js"></script>
