'use strict';

const EventEmitter = require('eventemitter3');
const Request = require('request-promise');

const NULLCHAR = String.fromCharCode(0x0);
const SEPCHAR = String.fromCharCode(0x1);

const HermesBot = EventEmitter => class extends EventEmitter {
  constructor(UUID, options = {}) {
    super();
    if (UUID === undefined) {
      throw new Error('Please provide a bot username.');
    }

    this.BotUUID = UUID;
    this.options = options;
    this.HermesURL = options.HermesURL || 'https://hermesmessenger.duckdns.org';
    
    this.PollingRate = options.PollingRate || 200;

  }

  /**
   * A function that sends API requests
   * @param {String} method The HTTP method to send the request with (GET, POST, etc.)
   * @param {String} location The sub URL to send the request to (api/sendmessage)
   * @param {Object} formData (Optional) Data to send in the body of the request
   */

  async _request(method, location, formData) {

    // the 3rd or 4th argument could be a callback
    let callback;
    if (typeof arguments[3] == 'function') {
      callback = arguments[3];
    } else if (typeof arguments[2] == 'function') {
      callback = arguments[2];
      formData = null;
    }

    let options = {
      method: method, 
      uri: this.HermesURL + '/' + location,
      body: formData,
      json: true
    };

    try {
      const body = await Request(options);
      if (body) {
        var messages = body.split(NULLCHAR);
      }
      if (callback) {
        callback(null, messages);
      }
      return messages;
    }
    catch (err) {
      if (callback) {
        callback(err);
      }
      else {
        throw err;
      }
    }
  }

  loadMessages(callback) {
    let params = {
      uuid: this.BotUUID
    }

    return this._request('POST', 'api/loadmessages', params, callback);
  }

  sendMessage(chat, message, callback) {
    let params = {
      uuid: this.BotUUID,
      message: message
//    chat: chat  TODO: Add multiple groups
    };
    
    return this._request('POST', 'api/sendmessage', params, callback);
  }

  quote(orig, message, callback) {
    let new_message = '\"' + orig.sender + ': ' + orig.text + '\" ' + message

    return this.sendMessage(orig.chat, new_message, callback)
  }

}

module.exports = HermesBot;