# HermesBot

A library for creating a bot for Hermes Messenger. Based on [Slimbot](https://github.com/edisonchee/bot), a Telegram bot library.

***

# Getting started

## Creating a bot

Go to https://hermesmessenger-testing.duckdns.org/createBot and create a bot on that page.   
Save the token it gives you, since that token is what lets your bot communicate with our API.

## Installing the library

This library is [published as an NPM module](https://www.npmjs.com/package/hermesbot), so you can just install it that way.

```bash
npm i hermesbot
```

## Example code

```javascript
const HermesBot = require('hermesbot');
const BOT_TOKEN = "YourBotToken" // Replace 'YourBotToken' with the token you got in Step 1. 

const bot = new HermesBot(BOT_TOKEN);

bot.on('message', message => {
  console.log('New message from ' + message.sender + ' saying ' + message.text)
  console.log('Sent at time ' + message.time + ' in chat ' + message.chat)
  console.log()

  if (message.text.indexOf('Hi bot') != -1) { // If message contains the text 'Hi bot', reply
    bot.quote(message, 'Hi, ' + message.sender)
  }
});
  
bot.start(); // Start the bot

```

Now go ahead and type `Hi bot` into Hermes. It should reply to you saying Hi and your username.
