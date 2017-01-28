---
layout: post
title: Converting .psd to .png the Fast Way
permalink: coverting-psd-to-png-the-fast-way
---

As a front end developer, there are times where you need to quickly reference a design. At the time of writing this, I had a folder of about 25 .psd files I was sent that I needed smaller more manageable 'previews' of. I didn't want to go through each file and export as a png, or even open up Photoshop at all! So here is what I came up with.

Open up terminal.

We will first need a library called [imagemagick](http://www.imagemagick.org/script/index.php). You can download it with the OSX package manager [homebrew](http://brew.sh/).

```sh
brew update
brew install imagemagick
```

Once imagemagick is installed, just `cd` into the directory containing all the .psds and paste this in:

```sh
mkdir -p _png; for f in *.psd; do convert ${f}[0] _png/${f}.png; done
```
Depending on how big the each .psd is, this might take a while. Just let your mac do its thing.

Congratulations! you can now find your new .png files inside `currentdirectory/_png/`.

To speed up the process later, you can even throw this in an alias!

```sh
alias psd2png='mkdir -p _png; for f in *.psd; do convert ${f}[0] _png/${f}.png; done'
```
