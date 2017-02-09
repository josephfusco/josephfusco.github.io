---
layout: post
title: Creating An Off Canvas Menu With Just CSS
permalink: creating-an-off-canvas-menu-with-just-css
---

Off canvas menus have been popping up everywhere, and there’s a reason for it. They allow for more focus on content, are great for touch enabled devices, and work well responsively.

This is a CSS only approach to an off canvas slide out menu, so we will be needing to make a checkbox toggle to trigger open and closed states. If you’re currently like, “how the heck do I make a checkbox open a menu with just CSS?” Don’t worry! We will go over how this will work in a bit.

```html
<body>
	<input id="menu-trigger" type="checkbox" />
	<label for="menu-trigger">MENU</label>
</body>
```

Next step is adding our menu right underneath and a wrapper for the page content.

```html
<body>
	<input id="menu-trigger" type="checkbox" />
	<label for="menu-trigger">MENU</label>

	<header>
		<ul class="menu">
			<li><a href="#">link</a></li>
			<li><a href="#">link</a></li>
			<li><a href="#">link</a></li>
			<li><a href="#">link</a></li>
			<li><a href="#">link</a></li>
		</ul>
	</header>

	<div id="content">

	</div>
</body>
```

You will notice that the trigger, menu wrapper, and content wrapper are all on the same level. This will play a crucial part a little later.

## The Trigger

So back to that checkbox…

We will be using the checked pseudo-class selector. Our label is directly underneath the input, which will allow us to use an adjacent sibling selector, because sometimes it’s nice to have less HTML markup, and those things are super duper cool.

```css
#menu-trigger {
	display: none;
}

#menu-trigger + label {
	background-color: #333;
	color: #FFF;
	cursor: pointer;
	padding: 20px 10px;
	margin: 10px;
	position: fixed;
	top: 0;
	left: 0;
	z-index: 1; /* since the trigger comes first in our markup */
	border-radius: 8px;
	-webkit-transition: -webkit-transform .3s ease;
	transition: transform .3s ease;
	-webkit-user-select: none;
	-khtml-user-select: none;
	-moz-user-select: none;
	-ms-user-select: none;
	user-select: none;
}
```

Occasionally the MENU text will become selected from a double click. We can prevent that with setting user select to none.

## The Menu

Our menu will be wrapped in a header which will be fixed, and moved off canvas to the left, negating the width. You’re going to want overflow on auto to prevent smaller screens from being handicapped with navigating your website.

```css
header {
	background-color: #333;
	height: 100%;
	width: 250px;
	overflow: auto;
	position: fixed;
	top: 0;
	left: 0;
	-webkit-transform: translateX(-250px);
	-ms-transform: translateX(-250px);
	transform: translateX(-250px);
	-webkit-transition: -webkit-transform .3s ease;
	transition: transform .3s ease;
}

ul.menu > li > a {
	color: #AAA;
	text-decoration: none;
	padding: 10px 30px;
	display: block;
}

ul.menu > li > a:hover {
	background-color: #222;
	color: #FFF;
}
```

## The Content

Creating a content wrapper is not necessary, but it does add to the overall effect, allowing the page to be pushed off to the right while the menu is coming into view.

```css
body {
	overflow-x: hidden; /* prevent a horizontal scrollbar from pushing the content right */
}

#content {
	-webkit-transition: -webkit-transform .3s ease;
	transition: transform .3s ease;
}
```

## Now for the cool stuff!

Use the checked selector to move all 3 parts accordingly. Remember that the initial state should have a transition applied to create the sliding effect.

```css
#menu-trigger:checked + label {
	-webkit-transform: translateX(250px);
	-ms-transform: translateX(250px);
	transform: translateX(250px);
}

#menu-trigger:checked ~ header {
	-webkit-transform: translateX(0px);
	-ms-transform: translateX(0px);
	transform: translateX(0px);
}

#menu-trigger:checked ~ #content {
	-webkit-transform: translateX(250px);
	-ms-transform: translateX(250px);
	transform: translateX(250px);
}
```

## Demo

<p data-height="300" data-theme-id="27795" data-slug-hash="bNwQGJ" data-default-tab="result" data-user="fusco" data-embed-version="2" data-pen-title="CSS Triggered Side Menu" class="codepen">See the Pen <a href="http://codepen.io/fusco/pen/bNwQGJ/">CSS Triggered Side Menu</a> by Joseph Fusco (<a href="http://codepen.io/fusco">@fusco</a>) on <a href="http://codepen.io">CodePen</a>.</p>
<script async src="https://production-assets.codepen.io/assets/embed/ei.js"></script>
