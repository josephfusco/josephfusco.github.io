---
layout: post
title: Output Sass Variables Directly To Page
permalink: output-sass-variables-directly-to-page
---

By interpolating the Sass variable into the `content` property on `html:before`, we are able to see the variable on the page, without the need for additional markup.

We can also grab the variable type. By using the Sass function `type-of()`, we are able to check for the variable type, and then interpolate it into the pseudo element along side the variable.

![output Sass variable]({{ site.url }}/assets/images/output-sass-variable-0.png)

Without using both `html:before` & `html:after` we can separate these two items to make it more readable by using `\A`.

![output Sass variable with newline]({{ site.url }}/assets/images/output-sass-variable-1.png)

Since we can create horizontal bars with gradients, we can create 2 distinct sections, one for the variable type, and the other for the value.

![output Sass variable with newline and gradient background]({{ site.url }}/assets/images/output-sass-variable-2.png)

## Mixin

```scss
@mixin output($val, $z: 10000) {
	$type: null;
	@if (type-of($val) == string) {
		$type: 'string';
	}
	@else if (type-of($val) == number) {
		$type: 'number';
	}
	@else if (type-of($val) == bool) {
		$type: 'bool';
	}
	@else if (type-of($val) == color) {
		$type: 'color';
	}
	@at-root {
		html {
			&:after {
				background: linear-gradient(to bottom, #d800ff 0, #d800ff 45px, #ed71ef 30px);
				bottom: 0;
				box-sizing: border-box;
				color: #222;
				content: '(#{$type})\A\A\A#{$val}';
				font: bold 15px/15px monospace;
				left: 0;
				padding: 15px;
				position: fixed;
				white-space: pre-wrap;
				width: 100%;
				z-index: $z;
			}
		}
	}
}
```

## Demo

[View demo on CodePen](http://codepen.io/fusco/pen/XpxBQx)
