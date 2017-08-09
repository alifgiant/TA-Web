/**
 * Created by MuhammadAlif on 10/23/2016.
 */
 'use strict';

const fs = require('fs');
let EventEmitter = require('events').EventEmitter;
let Detector = require('./detection/algorithm');
let time_holder = [];

let Device = require('./models/device');

// let count = 0;
// let start = process.hrtime();

class AlgorithmCallBack{
	constructor(broker, io){		
		this.broker = broker;
		this.io = io;    
	}

	createMessage(sensorId, topic, data, retain){
		return {
			topic: sensorId + '/' + topic,
			payload: JSON.stringify(data), // or a Buffer
			// payload: filtered, // or a Buffer
			qos: 0, // 0, 1, or 2
			retain: retain // or true
		};
	}

	filteredCallback(sensorId, filtered) {
		let message = this.createMessage(sensorId, 'visual', filtered, false);

		// continue the filtered message to all subscribers
		// console.log('forward filtered:'+ this.sensorId, filtered);
		
		this.broker.publish(message);		// to phone
		this.io.emit(message.topic, message.payload);  // to web
	}

	bpmCallback(sensorId, bpm){
		let message = this.createMessage(sensorId, 'bpm', bpm, true);

		// continue the bpm message to all subscribers
		// console.log('forward bpm:'+ this.sensorId, bpm);
		
		this.broker.publish(message);  // to phone
		this.io.emit(message.topic, message.payload);  // to web
	}

	beatClassCallback(sensorId, beatClass){		
		let message = this.createMessage(sensorId, 'class', beatClass, false);
		this.io.emit(message.topic, message.payload); // to web

		// console.log('beatClass', message);

		// continue the filtered message to all subscribers
		// console.log('forward filtered:'+ this.sensorId, filtered);
		
		let title = '';
		let detail = '';
		let condition = 0;
		if (beatClass.vf > 0){
			title = 'Condition: Dangerous';
			detail = 'Please see Doctor immediately, VF detected';
			condition = 2;
		}else if (beatClass.pc > 0) {
			title = 'Condition: Sick';
			detail = 'Please be Carefull, PC detected';
			condition = 1;
		}else {
			title = 'Condition: Normal';
			detail = 'Nothing to worry';
			condition = 0;
		}
		let data = title + '#' + detail + '#' + condition;
		message = this.createMessage(sensorId, 'alert', data, false);
		this.broker.publish(message);		
	}
}

class MqttApp{
	constructor(broker, socket){
		this.broker = broker;
		this.io = socket;

		this.detector_callback = new AlgorithmCallBack(broker, socket);
		this.detector = new Detector(this.detector_callback);

		// event emitter
		this.emitter = new EventEmitter();        
		this.emitter.on('sensor', (sensorId, data) => {
			this.sensorEvent(sensorId, data);
		});
		this.emitter.on('phone', (userId, data) => {
			this.phoneEvent(userId, data);
		});
		this.emitter.on('check', (userId, data) => {
			console.log(time_holder);
			fs.writeFileSync('./data10.json', JSON.stringify(time_holder, null, 2) , 'utf-8');
		});
	}

	onMessageReceived(packet, client) {
		/* packet received */
		// console.log('MQTT: Published topic', packet.topic);
		// console.log('MQTT: Published payload', packet.payload.toString('ascii'));
		// rootTopic: [0] = tipe publish, [1] = id
		let rootTopic = packet.topic.split('/');    

		// route message event
		this.emitter.emit(rootTopic[1], rootTopic[0], packet.payload.toString());        
	}

	clientConnected(client_id){
		// clientID = client.id;  // log a connected device
		console.log('MQTT ClientConnected: ', client_id);

		let detector = this.detector;
		process.nextTick(() => {  // do in next tick
			Device.findOne({device_id: client_id}, function (err, device) {
	 			if (device){
	 				// create new process id 				
	 				detector.addDevice(device.device_id, device.device_type, device.freq);
	 			}else {
	 				// ignore
	 			}
	 		});
 		});
	}

	clientDisconnected(client_id){
		// clientID = client.id;  // log a disconnected device  
		console.log('MQTT ClientDisconnected: ', client_id);

		let detector = this.detector;
		process.nextTick(() => {  // do in next tick
			Device.findOne({device_id: client_id}, function (err, device) {
	 			if (device){
	 				// free process id
	 				detector.removeDevice(client_id);	 			
	 			}else {
	 				// ignore
	 			}
	 		});
 		});		
	}

	sensorEvent(sensorId, message) {
		// // DELAY Reader
		// // count += 1;
		// let stop = process.hrtime(start);
		// // console.log('counter', count);
		// time_holder.push(stop);
		// start = process.hrtime();
		// // DELAY Reader

		// console.log(sensorId, ',', message);		

		// // console.log('get sensor read:'+sensorId, data);
		// let start = process.hrtime();
		let detector = this.detector;
		process.nextTick(() => {  // do in next tick
			message = message.split(':');
			detector.processSample(sensorId, message[0], message[1]);
		});
		// let stop = process.hrtime(start);
		// time_holder.push(stop);
	}

	phoneEvent (userId, data) {
		let obj = JSON.parse(data);
		// console.log('get phone data '+userId, obj);
	}
}

module.exports = MqttApp;
