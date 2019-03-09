'use strict'

const Request = require('request-promise')
const fs = require('fs')

const HermesBot = EventEmitter => class extends EventEmitter {
    constructor(UUID, options = {}) {
        super()
        if (UUID === undefined) {
            throw new Error('Please provide a bot token.')
        }

        this._offset = '13814000-1dd2-11b2-8080-808080808080' // Smallest posible TimeUUID
        
        this.BotUUID = UUID
        this.options = options
        this.HermesURL = options.HermesURL || 'https://hermesmessenger.chat'
        
        this.PollingRate = options.PollingRate || 500

        if (this.PollingRate < 200)  this.PollingRate = 200
        
        this.getUsername(this.BotUUID).then(username => {
            this.BotUsername = username
        })

        this.uuid_header = {
            uuid: this.BotUUID
        }
        
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
    
    _processMessages(messages) {

        let newm = messages.newmessages
        let delm = messages.deletedmessages
        
        for (let i = 0; i < newm.length; i++) {
            
            let message = newm[i]

            let messageInfo = {
                id: message.uuid,
                sender: message.username,
                text: message.message,
                time: message.time, 
                edited: message.edited,
                chat: 'general' // TODO: Change this when we add multiple chats
            }

            this._offset = message.uuid
            
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
                
                
                if (messageInfo.edited) {
                    this.emit('edited', messageInfo)
                    this._offset = message.time_uuid
                } else if (messageInfo.quote && messageInfo.quote.sender == this.BotUsername) {
                    this.emit('quoted', messageInfo)
                } else if (messageInfo.text.indexOf('@' + this.BotUsername) != -1) {
                    this.emit('mentioned', messageInfo)
                } else {
                    this.emit('message', messageInfo)
                }
            }
        }

        for (let i = 0; i < delm.length; i++) {        
            
            let message = delm[i]

            let messageInfo = {
                del_time: message.del_time,
                original_message: {
                    id: message.original_message.uuid,
                    sender: message.original_message.username,
                    text: message.original_message.message,
                    time: message.original_message.timesent, 
                    chat: 'general' // TODO: Change this when we add multiple chats
                }
            }
            
            if (messageInfo.sender != this.BotUsername) {
                this.emit('deleted', messageInfo)

                this._offset = message.time_uuid
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
        
        return this._request('POST', 'api/loadmessages/' + this._offset, params, callback)
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
        
        this._request('GET', 'api/getSettings/' + this.BotUsername, this.uuid_header).then(settings => {
            
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
        
        if (color.charAt(0) == '#')  color = color.substring(1)
        let valid = color.match(/^#?[0-9A-Fa-f]{6}$|^#?[0-9A-Fa-f]{3}$/)
    
        if (valid) return this.saveSetting(color, undefined, callback)
        else return new Error ('Invalid color specified.')
        
    }
    
    setImage(image, callback) {
        fs.readFile(image, 'base64', (err, data) => {
            if (!err)  image = data 
            
            return this.saveSetting(undefined, image, callback)
        })
        
    }
    
}

module.exports = HermesBot
