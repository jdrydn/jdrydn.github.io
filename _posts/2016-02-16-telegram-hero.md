---
title: Telegram Hero
---

If you've ever used [Telegram](https://telegram.org/), you'll know how great it is to chat securely between people. And if you're a developer and you've checked out Telegram Bots, you'll know [there is an API]() to allow you to programmatically communicate with people.

<!--more-->

Awesome!

… Well, nearly awesome.

```js
var bot = new TelegramBot('my-awesome-token-here');

bot.sendMessage('Hello, world!', callback);
```

Most modules written for Node are built around instances, similar to the above. And, whilst this is fine for just one, or a couple of bots, it's not ideal for a service with many potential bots. And these solutions aren't very flexible when it comes to [the webhooks feature](https://core.telegram.org/bots/api#setwebhook) that Telegram bots work with.

So instead, here is a simplified module to interact with Telegram & users with a focus on flexibility.

```js
var telegram = require('telegram-hero');

telegram.send({
  token: '<insert-your-bot-token>',
  to: '<insert-a-chat-id>',
  method: 'sendMessage',
  message: {
    text: 'This are not the droids that you are looking for, move along.'
  }
}, callback);
```
You can use this with as many bots and as many webhooks as you like.

```js
telegram.send({
  token: '<insert-your-bot-token>',
  to: '<insert-a-chat-id>',
  method: 'sendPhoto',
  message: {
    photo: fs.createReadStream(path.join(__dirname, 'droids.jpeg')),
    caption: 'This door is locked, move onto the next one'
  }
}, callback);
```

It’s built on top of the popular [`request`](github.com/request/request) module, to allow you to send attachments as streams, like above.

This API doesn’t make any assumptions of your existing codebase, so if you require sending many messages to many users you’ll need to add [`async`]() or an equivalent control-flow library to assist you. Take care when using `Promise.all` if the order of the messages matter to you 😉

There’s also support for incoming webhooks, to make handling multiple bots relatively easy:

```js
var bodyParser = require('body-parser');
var express = require('express');
var telegram = require('telegram-hero');

var app = express();

/**
 * /webhook/amazing-bot/4b238abe064c9d6c860e386d8cbf8cd2
 */
app.post(
  '/webhook/:bot_name/:bot_auth',
  bodyParser.json(),
  telegram.api({
    bots: {
      'amazing-bot': {
        name: 'The Amazing Bot',
        auth: '4b238abe064c9d6c860e386d8cbf8cd2',
        token: '<insert-this-bots-token>'
      },

      // Or, if you're lazy, you can use
      'simple-bot': '4b238abe064c9d6c860e386d8cbf8cd2'
      // Which will be constructed into a proper bot similar to:
      //   'simple-bot': {
      //     name: 'simple-bot',
      //     token: '4b238abe064c9d6c860e386d8cbf8cd2'
      //   }
      // HOWEVER this isn't advised, since the authentication will be *anything* that satisfies :bot_auth!
    }
  }),
  function (req, res, next) {
    // req.telegram.message is the message object.
    // req.telegram.bot is the bot object that we passed into the middleware.

    // An error with status code 403 is returned if authentication fails

    // Reply to the incoming message.
    // The bot token, chat id, and reply_to_message_id are preset.
    req.telegram.reply({
      method: 'sendMessage',
      message: {
        text: 'Thanks for the reply! Have a nice day'
      }
    });

    res.status(200); // Don't forgot to reply to Telegram, so they know the message was received correctly!
  }
);

/**
 * If you don't want to use `:bot_name` or `:bot_auth` as params, you can instruct the middleware to use different ones
 * like this example shows:
 *
 * /webhook/amazing-bot/4b238abe064c9d6c860e386d8cbf8cd2
 */
app.post(
  '/webhook/:telegram_bot_slug/:telegram_bot_auth',
  bodyParser.json(),
  telegram.api({
    bots: {
      'amazing-bot': {
        name: 'The Amazing Bot',
        auth: '4b238abe064c9d6c860e386d8cbf8cd2',
        token: '<insert-this-bots-token>'
      }
    },
    bot_name_param: 'telegram_bot_slug',
    bot_auth_param: 'telegram_bot_auth'
  }),
  function (req, res, next) {
    // Or, if you want to reply directly to Telegram, you can do so like you usually would:
    res.status(200).json({
      method: 'sendMessage',
      text: 'Thanks for the reply! Have a nice day'
    });
  }
);

app.listen(3000);
```

And that’s it! This is in use in a personal project of mine, which sends me notifications from my online services via Telegram 💪
