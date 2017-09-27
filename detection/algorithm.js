/**
 * loader of algorithms
 */

let classifier = require('./classifier');
let PanTomkins = require('./PanTomkins');
let Sample = require('../models/sample');
let Alert = require('../models/alert');
let Patient = require('../models/patient');

// const SAMPLING_FREQUENCY = 200;
// const SAMPLING_FREQUENCY = 360;
const FPS = 15;  // frame rate send back filter result

/**
 * @param {String} deviceId id of connected device
 * @param {float} data sensor read value
 * @param {AlgorithmCallBack} callback an instance of AlgorithmCallBack
 * @returns {Array} of category
 * category:
 * 1 = Normal
 * 2 = PVC
 * 3 = VF
 * 4 = Heart Block
 */

function saveSample(device_id, data) {
	let newSample = new Sample({
        device_id : device_id,
        sample : data
    });
    // console.log(newSample);
    newSample.save((err) => {
        if (err) {
            console.log(err, 'error in saving sample');
        }        
    });
}

function saveAlert(device_id, status, occurance) {
	let newAlert = new Alert({
        device_id : device_id,
        status : status,
        occurance : occurance
    });
    // console.log(newSample);
    newAlert.save((err) => {
        if (err) {
            console.log(err, 'error in saving Alert');
        }        
    });
}

function count(arr) {
	let counts = {};

	for (let i = 0; i < arr.length; i++) {
	  let element = arr[i];
	  counts[element] = counts[element] ? counts[element] + 1 : 1;
	}

	return counts;
}

class Algortihm{
 	constructor(messageCallBack){
 		this.holder = {};
 		this.callback = messageCallBack;
 	}

 	addDevice(id, type, freq){	
		if (!(id in this.holder)){  // device id not in holder
			this.holder[id] = {
				count: 0,
				type: type,
				last_index: 0,
				last_sample: 0,
				freq : freq,
				panTom: new PanTomkins(freq),
				beatClassifier: new classifier.BeatClassifier(freq)
			};
		}
		// console.log(this.holder);		
	}

	removeDevice(id){	
		delete(this.holder[id]);
		// console.log(this.holder);		
	}

	tsipourasCallback(sensorId, rrSegment) {
		let holder = this.holder;
		let callback = this.callback;
	 	process.nextTick(function () {
	 		let beatClassification = holder[sensorId].beatClassifier.detect(rrSegment);
			// let episodeClassification = classifier.classifyEpisode(beatClassification);

			let data = count(beatClassification);

			console.log('data', data);

			if (data.pc > 0) {
				saveAlert(sensorId, 'pc', data.pc);
				console.log('called pc');
			}
			if (data.vf > 0) {
				saveAlert(sensorId, 'vf', data.vf);
				console.log('called vf');
			}

			// data = { vf, pc, normal }
			Patient.findOne({device_id: sensorId},function(err, patient){

				if ('pc' in data){
                    if (patient.total_pvc !== undefined){
                        patient.total_pvc += data.pc
                    } else {
                        patient.total_pvc = data.pc
                    }
				}

				if ('normal' in data){
                    if (patient.total_normal !== undefined){
                        patient.total_normal += data.normal
                    } else {
                        patient.total_normal = data.normal
                    }
                }

                if ('vf' in data){
                    if (patient.total_vf !== undefined){
                        patient.total_vf += data.vf
                    } else {
                        patient.total_vf = data.vf
                    }
				}

				// console.log(patient);
                patient.save(function (err) {
                    if (err) {
                        console.log(err);
                    }
                });
			});

			callback.beatClassCallback(sensorId, data);
		});
	 }

	pantomCallBack(sensorId, type, data){
		// console.log('callback', type, this.holder[sensorId].count, DOWN_SAMPLE_COUNT, data);
		const DOWN_SAMPLE_COUNT = Math.round(this.holder[sensorId].freq / FPS);
		// console.log(DOWN_SAMPLE_COUNT);

		if (type === 'filter'){
			saveSample(sensorId, data);
			if (this.holder[sensorId].count % DOWN_SAMPLE_COUNT === 0){ // send only if sampling ok
				// console.log('filtered', data);
				this.callback.filteredCallback(sensorId, data);
				this.holder[sensorId].count = 0;  // reset count, send
			}
		} else if (type === 'beat') {
			// data = [this.peaks_position, this.rr_distance]
			let positions = data[0];
			const rr_distances = data[1];

			// console.log('rr_distances', rr_distances);

			const bpm = (this.holder[sensorId].freq * 60) /* 1 minute = freq * 60s */ / classifier.BeatClassifier.mean(rr_distances);                
			this.callback.bpmCallback(sensorId, bpm);

			this.tsipourasCallback(sensorId, rr_distances);
		}
	}

	processSample(sensorId, index, data){
		
		console.log(sensorId, this.holder);
		
		if (this.holder[sensorId] === undefined) {
			return false
		}	
				
		if (this.holder[sensorId].type > 0){	
			data = (data * 3) / 1024;  // turn to volt
		}

		let distance = index - this.holder[sensorId]; 
		if (distance < 0){
			distance = (1000+index) - this.holder[sensorId];
		}

		// console.log('add', index, data);
		if (distance > 1){  // missing value detected
			let factor = (data - this.holder[sensorId].last_sample)/distance;
			for (var i = 1; i < distance; i++) {
				// execute missing value
				this.holder[sensorId].panTom.execute(factor * i, (type, data) => 
					this.pantomCallBack(sensorId, type, data));
				this.holder[sensorId].count += 1;  //
			}
		} else {
			this.holder[sensorId].panTom.execute(data, (type, data) => 
				this.pantomCallBack(sensorId, type, data));
			this.holder[sensorId].count += 1;  //
		}

		this.holder[sensorId].last_sample = data;
		this.holder[sensorId].last_index = index;	
	}
}

module.exports = Algortihm;

