'use strict'

const Request = require('request-promise')
const fs = require('fs')

const NULLCHAR = String.fromCharCode(0x0)
const SEPCHAR = String.fromCharCode(0x1)

var _offset = 0


const HermesBot = EventEmitter => class extends EventEmitter {
    constructor(UUID, options = {}) {
        super()
        if (UUID === undefined) {
            throw new Error('Please provide a bot token.')
        }
        
        this.BotUUID = UUID
        this.options = options
        this.HermesURL = options.HermesURL || 'https://hermesmessenger.duckdns.org'
        
        this.PollingRate = options.PollingRate || 500
        
        this.getUsername(this.BotUUID).then(username => {
            this.BotUsername = username
        })
        
    }
    
    /**
    * A function that sends API requests
    * @param {String} method The HTTP method to send the request with (GET, POST, etc.)
    * @param {String} location The sub URL to send the request to (api/sendmessage)
    * @param {Object} formData (Optional) Data to send in the body of the request
    */
    
    async _request(method, location, formData) {
        
        // the 3rd or 4th argument could be a callback
        let callback
        if (typeof arguments[3] == 'function') {
            callback = arguments[3]
        } else if (typeof arguments[2] == 'function') {
            callback = arguments[2]
            formData = null
        }
        
        let options = {
            method: method, 
            uri: this.HermesURL + '/' + location,
            body: formData,
            json: true, 
            resolveWithFullResponse: true,
            simple: false
        }

        try {
            const res = await Request(options)
            if (res) {
                if (res.statusCode == 200) {
                    if (callback) {
                        callback(null, res.body)
                    }
                    return res.body
                } else {
                    if (res.statusCode == 500 && location == 'api/getusername') {
                        throw new Error('Invalid token')
                    } else {
                        throw new Error('Bad status code: ' + res.statusCode)
                    }
                }
            }
        } catch (err) {
            if (err.name == 'RequestError') {
                throw new Error('Error: Can\'t connect to Hermes. \nEnsure you are connected to the Internet. ' + this.HermesURL + '\n\n') 
                
            } else if (err == 'Error: Invalid token') {
                throw new Error('Error: Invalid bot token: ' + this.BotUUID + '\n\n') 
            }
        }
        
    }
    
    _processMessages(message) {
        message = message.split(NULLCHAR)
        
        if (message.length > _offset) {
            for (_offset; message.length > _offset; _offset++) {
                
                let message_pair = message[_offset].split(SEPCHAR)
                let messageInfo = {
                    id: _offset,
                    sender: message_pair[0],
                    text: message_pair[1],
                    time: message_pair[2], 
                    chat: 'general' // TODO: Change this when we add multiple chats
                }
                
                let quoteRegex = /"([^:]*): *(.+)"/
                let quoteMatch = messageInfo.text.match(quoteRegex)
                if (quoteMatch) {
                    messageInfo.text.replace(quoteRegex, '') // Delete quotes from message since the info is in the quote field
                    messageInfo.quote = {
                        sender: quoteMatch[1], 
                        text: quoteMatch[2]
                    }
                }
                
                // --------------------------------------------------------------
                //      Emit the message object to the corresponding event
                // --------------------------------------------------------------
                
                if (messageInfo.sender != this.BotUsername) {
                    
                    this.emit('message', messageInfo)
                    
                    if (messageInfo.quote && messageInfo.quote.sender == this.BotUsername) {
                        this.emit('quoted', messageInfo)
                    } else if (messageInfo.text.indexOf('@' + this.BotUsername) != -1) {
                        this.emit('mentioned', messageInfo)
                    }
                }
            }
        }
    }
    
    getUsername(uuid, callback) {
        let params = {
            uuid: uuid
        }
        
        return this._request('POST', 'api/getusername', params, callback)
    }
    
    loadMessages(callback) {
        let params = {
            uuid: this.BotUUID
        }
        
        return this._request('POST', 'api/loadmessages', params, callback)
    }
    
    sendMessage(chat, message, callback) {
        let params = {
            uuid: this.BotUUID,
            message: message,
            chat: chat
        }
        
        return this._request('POST', 'api/sendmessage', params, callback)
    }
    
    quote(orig, message, callback) {
        let new_message = '"' + orig.sender + ': ' + orig.text + '" ' + message
        
        return this.sendMessage(orig.chat, new_message, callback)
    }
    
    saveSetting(color = undefined, image = undefined, callback) {
        
        this._request('GET', 'api/getSettings/' + this.BotUsername, { uuid: this.BotUUID }).then(settings => {
            
            if (color == undefined)  color = settings.color
            if (image == undefined)  image = settings.image
            
            let params = {
                uuid: this.BotUUID,
                color: color, 
                notifications: 2, // Disable notifications since they are useless
                dark: false, // Disable dark theme since it is useless
                image_b64: encodeURIComponent(image)
            }
            
            return this._request('POST', 'api/saveSettings', params, callback)
        })
    }
    
    setColor(color, callback) {
        
        try {
            if (color.charAt(0) == '#')  color = color.substring(1)
            let valid = color.match(/^#?[0-9A-Fa-f]{6}$|^#?[0-9A-Fa-f]{3}$/)
        
            if (valid) return this.saveSetting(color, undefined, callback)

        } catch (err) {
            return new Error ('Invalid color specified.')
        }
        
    }
    
    setImage(image, callback) {
        fs.readFile(image, 'base64', (err, data) => {
            if (!err)  image = data 
            
            return this.saveSetting(undefined, image, callback)
        })
        
    }
    
}

module.exports = HermesBot
