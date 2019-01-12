'use strict'

const EventEmitter = require('eventemitter3')
const main = require('./main')

class HermesBot extends main(EventEmitter) {
    
    constructor(UUID, options = {}) {
        super(UUID, options)
    }
    
    start(callback) {
        return super.loadMessages().then(updates => {
            if (updates != undefined) super._processMessages(updates)
            
        }).catch(error => {
            if (callback) callback(error)
            else throw error
            
        }).finally(() => {
            setTimeout(() => this.start(callback), super.PollingRate)
        })
    }
    
}

module.exports = HermesBot
