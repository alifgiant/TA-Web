/**
 * Created by maakbar on 30/07/16.
 */

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var Alert = new Schema({
    // alert_id: { type: String, unique: true },
    device_id: String,    
    date: { type: Date, default: Date.now },
    status: String,
    occurance: Number
});

module.exports = mongoose.model('Alert', Alert);

// Alert
// - alert_id
// - username
// - date
// - status_alert
// - detail