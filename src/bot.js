'use strict';

const EventEmitter = require('eventemitter3');
const main = require('./main');

const NULLCHAR = String.fromCharCode(0x0);
const SEPCHAR = String.fromCharCode(0x1);

var _offset = 0

class HermesBot extends main(EventEmitter) {
  constructor(UUID, options = {}) {
    super(UUID, options);
    this.PollingRate = options.PollingRate || 1000;
  }

  _processMessages(message) {
    let newMessages = message.length - _offset
    if (newMessages > 0) {
      for (_offset; _offset < message.length; _offset++) {

        let message_pair = message[_offset].split(SEPCHAR);
        let messageInfo = {
          sender: message_pair[0],
          text: message_pair[1],
          time: message_pair[2], 
          chat: 'general' // TODO: Change this when we add multiple chats
        }

        this.emit('message', messageInfo);
      }
    };
  }

  start(callback) {
    return super.loadMessages()
    .then(updates => {
      if (updates !== undefined) {
        this._processMessages(updates);
      }
      return null;
    })
    .catch(error => {
      if (callback) {
        callback(error);
      }
      else {
        throw error;
      }
    })
    .finally(() => {
      setTimeout(() => this.start(callback), this.PollingRate); 
    });
  }
}

module.exports = HermesBot;
