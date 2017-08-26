---
layout: post
title: Emoji Shorts
image: 2016-12-19-background.jpg
author: james
supported:
- See the [GitHub repository](https://github.com/car-throttle/emoji-shorts)
- Or the [NPM package](https://npm.im/emoji-shorts)
---

Sometimes, when you work with emojis 😎😍🤖🌎✊ they can be a real pain in the ass. One physical symbol can equal up to
four Unicode characters, so when counting strings & encoding emojis into a valid format for your favourite legacy
database, these fun little icons can physically make you 😡

[![Angry emotions with emoji]({{ '/img/posts/2016-12-19-angry-emotion.gif' | relative_url }})](https://giphy.com/gifs/disneypixar-disney-pixar-11tTNkNy1SdXGg/)

But then you look at Slack, and that handles emoji with style...

[![How Slack handles emoji]({{ '/img/posts/2016-12-19-slack-example.gif' | relative_url }})](https://giphy.com/gifs/disneypixar-disney-pixar-11tTNkNy1SdXGg/)

I love how Slack handles emoji. Transforming `:tada:` into 🎉 and `:sunglasses:` into 😎 and so on. So, the engineer
within me decided to find [a NPM module](https://www.npmjs.com/search?q=emoji) to do this for me.

And after several hours, the closest I could find was [Mojier](https://npm.im/mojier), published two years ago, which
mapped emojis to their shortcodes and back again. But being two years out of date means the library was half-complete,
and the lookups were slow (`for(var p in emoji)`), so ten minutes later I had *emoji-shorts* online ✊

> <https://npm.im/emoji-shorts>

Using this to translate strings containing emoji is easy:

```js
var emoji = require('emoji-shorts');
console.log(emoji.toPlain('These violent delights have violent ends 😈'));
// These violent delights have violent ends :smiling_imp:
console.log(emoji.toRich('The most elegant parts of me weren\'t written by you :thinking:'));
// The most elegant parts of me weren't written by you 🤔
```

The emojis & relevant short-codes came [from Github themselves](https://github.com/github/gemoji), with a little
post-processing to make the lookups a little faster. Ideally this would be used when saving user-input & when fetching
user-input, so your ORM / database engine of choice is none the wiser 😉

If you have any questions, or you wish to submit a PR (of which all are welcome, we all ❤️ emojis!) then please feel
free to get involved: <https://github.com/car-throttle/emoji-shorts>

In the meantime, Merry Christmas 🎄🎁🎅
