---
layout: post
title: Ignoring Folders In A Sublime Search
permalink: ignoring-folders-in-a-sublime-search
---

I've been utilizing Sublime's *Find in Folder* feature lately, and can't believe I didn't know about this earlier. You can get to it by either right clicking a folder in the file tree, or with the shortcut `cmd` + `shift` + `f`.

By using an absolute path, you can recursively search every bit of text in project files to locate specific elements. You are essentialy performing a [grep](http://www.gnu.org/software/grep/manual/html_node/Usage.html) command but using the Sublime GUI.

This was sometimes taking forever though as I would search from a project root. With a workflow that includes SASS and Grunt, I was sometimes searching unecessary files adding to the search time and making my CPU work harder than it should. After some research on the issue, I discovered `folder_exclude_patterns`.

This can be placed in your `Packages/User/Preferences.sublime-settings`

```json
{
	"folder_exclude_patterns": [
		".svn",
		".git",
		".hg",
		"CVS",
		"node_modules",
		".sass-cache"
	]
}
```

If you are using git for version control. Your exclude pattern should generally contain the same things as your `.gitignore`.
