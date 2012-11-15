[Check out the live site here!](http://jdrydn.com)

# About this site

This website itself is hosted on [Github](//github.com) at [jdrydn/jdrydn.github.com](//github.com/jdrydn/jdrydn.github.com) with the domain name `jdrydn.com` set to forward to GitHub's servers.

By making a repo named `{username}.github.com` (so in my case `jdrydn.github.com`) I can make a [GitHub pages](//help.github.com/categories/20/articles) site to display content and information.

A simple `CNAME` file in the root of the repo, so Github can match the domain to the repo:

	jdrydn.com

The repo is a simplified Jekyll website, with a structure similar to this:

	_layouts
		default.html
	.git
		... Boring Git files
	img
		... Image files
	.gitignore
	CNAME
	index.md
	portfolio.md
	README.md

Jekyll formats the Markdown `.md` files, if they have layout options defined at the top of the file:

	---
	layout: default
	---

If you want to learn more about Jeykll, you can check out the official site or check out this [awesome tutorial on Nettuts](http://net.tutsplus.com/tutorials/other/building-static-sites-with-jekyll/)!