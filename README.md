<!--
---
layout: default
---
-->
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
		... Image files for the portfolio.
	.gitignore
	CNAME
	index.md
	portfolio.md
	README.md

Jekyll formats the Markdown `.md` files, if they have layout options defined at the top of the file, and inserts the content into a pre-defined HTML page (defined in `_layouts`).

The layout options look like:

	---
	layout: default
	---

If you want to learn more about Jeykll, you can check out [the official GitHub repo](//github.com/mojombo/jekyll) or check out this [awesome tutorial on Nettuts](http://net.tutsplus.com/tutorials/other/building-static-sites-with-jekyll/)!

The design and styling comes from [Twitter's Bootstrap](http://twitter.github.com/bootstrap) framework, because I'm not a designer. I've put a static version of the CSS on my code repo because Twitter keep updating Bootstrap!

So yeah. That's my site. All this work into Jekyll has me wondering about building a quick blog environment for hackathons like [Angelhack](http://jdrydn.com/Angelhack2012).