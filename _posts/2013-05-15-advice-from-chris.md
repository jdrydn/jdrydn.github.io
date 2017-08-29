---
layout: post
title: Advice From Chris
image: 2013-05-15-advice-from-chris.png
author: james
supported:
- Main image [from SimpleDesktops](http://simpledesktops.com/browse/desktops/2012/apr/13/brain/)
---

So I was looking for a way to teach myself `Node.JS` and `MongoDB`, so I decided to write an API for an “advice engine”,
somewhere to store quotes and display them on a lovely website.

My friend loves giving advice. Sometimes it’s really good advice, but sometimes it’s incredibly funny advice. So I
wanted an API where my friends & I could add new quotes, and a website where quotes could be showcased and displayed.

The API would be built in `Node`, with a `MongoDB` database, and the website would be a simple `HTML5` + `JS` page.
No need to touch PHP.

## Express & Mongoose

Two frameworks that made this possible.

[ExpressJS](https://expressjs.com):

> web application framework for node

Express makes handling HTTP requests in Node extremely simple, and has helped me pick up Node & it’s core concepts very
quickly. If you’ve not looked at Express (or Node) at all, I strongly recommend you read the
[Express Getting-Started Guide](http://expressjs.com/en/starter/hello-world.html).

And [Mongoose](http://mongoosejs.com/):

> elegant mongodb object modeling for node.js

And that’s exactly what it is! There’s also a fantastic [Getting-Started guide](http://mongoosejs.com/docs/index.html)
for Mongoose too! Thanks to Mongoose I’ve got an excellent data structure for these quotes, easy input and output, some
excellent pre & post save hooks for timestamping, randomising and tweeting the quote when a new quote is added. All of
which are in contained in a simple
[`models.js`](https://github.com/jdrydn/advicefromchris/blob/15add83db65bf599324c9b8687fbbb5f5f661524/models.js).

## Tweetie

I finally managed to kick my brain into gear and work out how
[Twitter’s Streaming APIs](https://dev.twitter.com/streaming/overview) works.

Using Twitter’s Public Streaming API and a magical tracking keyword “*@AdviceFromChris*”, any tweet that mentions the
account can be processed and turned into a valid quote.

This makes Twitter an excellent source of content, and means any of my friends can add to this API by simply tweeting!

### Filters - Authors

Now, obviously I have some filters in place. Simple filters.

```js
stream.on('tweet', function (tweet) {
  var userid = tweet.user.id_str || null;
  console.log('User id is ' + userid);
  if (private.authors.indexOf(userid) >= 0) {
    // Add this tweet to our dataset
  }
});
```
First set of filters control the author of the tweets. I only wanted my friends to be able to add to this (not anybody
in the world) so an array of their IDs and a simple check is in place.

### Filters - Content

When the content comes in, I wanted to be able to process the content. Add quotation marks around it, if needed. But
there were also some tweets I wanted to ignore, such as old-style RTs and replies.

Old-style RTs are great ways that’ll make the content dirty - I’m looking for content more like:

> “Turn left at the roundabout, said no-one ever” @AdviceFromChris

Rather than:

> RT @AdviceFromChris: “Turn left at the roundabout, said no-one ever”

Replies are much harder. They look like:

> @AdviceFromChris Nice website dudes!

But what if someone is trying to send a quote this way? In order to get round this I’m insisting that replies have to
be in quotations:

> @AdviceFromChris “And yes, that is what she said.”

So I needed some way to filter the text. Enter
[regular expressions](https://github.com/jdrydn/advicefromchris/blob/15add83db65bf599324c9b8687fbbb5f5f661524/tweetie.js#L12-L41).

Really they’re a bunch of `if` statements testing the content of the tweet, and seeing if it is valuable. If the content
doesn’t match, then this function will return undefined and the code where this is called knows that if the resulting
text is undefined then ignore this tweet.

### Forever

Running Node servers involves leaving a shell running, controlling the script. Enter
[Forever](https://github.com/nodejitsu/forever).

> A simple CLI tool for ensuring that a given script runs continuously (i.e. forever)

It involves running a simple command to start running a script, it offers error logs and output logs (so you can
monitor exactly what is going on with the server) and with a little manipulation I’ve got Forever handling everything,
including archiving logs to a timestamped folder to keep a record of everything!

---

## So what have I actually learned building this project?

I’ve learned **NodeJS**, something I’ve wanted to learn for ages. I’ve also learned **MongoDB**, to a degree, but more
importantly got my head around document-driven databases.

I got a taste at using **Express** & **Mongoose** in a real project (and not some project
[I knocked up at a hackathon](https://github.com/jdrydn/Angelhack2013/tree/master/api-node)!).

I’ve also tackled **Twitter’s Streaming API** - something I’ve always wanted to take on - and won. I really like the
idea of using tweets as content (and not just relying on Twitter’s Search API and searching for hashtags - this here is
a more managed and more long-term solution).

And I got a taste at **Forever** - which I’ve now installed globally through npm and I’m using for other scripts that
aren’t Node-based!

All of this code is on [the GitHub repo](https://github.com/jdrydn/advicefromchris) for this project - and the actual
site showcasing quotes is located in the gh-pages branch, since I’m powering the frontend by HTML5, JavaScript &
[GitHub Pages](https://pages.github.com/)!

I’m kinda hoping that this project will inspire me to use Node.JS in more projects, over other languages I regularly use
like PHP. I really like the idea of server-side JavaScript, and I really liked working on this project. It’s been fun!

Thank you for taking the time to read this article. I hope you enjoyed it!
