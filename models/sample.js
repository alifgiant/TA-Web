/**
 * Created by maakbar on 11/16/16.
 */
let mongoose = require('mongoose');
let Schema = mongoose.Schema;

let Sample = new Schema({    
    sample : Number,    
    device_id : String,
    date: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Sample', Sample);