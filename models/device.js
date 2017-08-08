/**
 * Created by maakbar on 11/16/16.
 */
let mongoose = require('mongoose');
let Schema = mongoose.Schema;
let uniqueValidator = require('mongoose-unique-validator');

let Device = new Schema({
    device_id : { type: String, unique: true }, // field level
    device_type : Number,  // 0=tes; 1=ppg; 2=ecg
    freq : Number
});

Device.plugin(uniqueValidator);
module.exports = mongoose.model('Device', Device);