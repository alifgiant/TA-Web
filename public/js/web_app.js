/**
 * Socket IO config
 */
var socket = io('http://localhost:3000');
var device_id = 'temp';

socket.on('connect', function(){
	console.log('socket connected');
});

socket.on('disconnect', function(){
	console.log('socket disconnect');
});

function addListener(topic, callback){  
	socket.on(topic, callback);
}

function closeListener(device_id, callback){
	socket.off(device_id + '/visual');
	socket.off(device_id + '/bpm');
}

function playSound() {
	var sound = document.getElementById("audio");
	sound.play();
}

function setupPatientDetail(){
	/**
	 * Heart Signal Chart
	 * Socket IO config
	 */

	 var maxLength = 100;
	 var data = new Array(maxLength).fill(0);  

	// set initial 0 to chart
	var res = [];
	for (var i = 0; i < data.length; ++i) {
		res.push([i, data[i]]);
	}

	var plot = $.plot($('#heart-chart'), [res], {
		grid: {
			borderWidth: 0
		},
		series: {
			shadowSize: 0, // Drawing is faster without shadows
			color: "#00c0ef"
		},      
		yaxis: {     
			// min:-0.2, max: 2,
			min:-0.6, max: 0.6,
			// min:-30, max: 100,
			// min:-100, max: 200000,
			show: false
		},
		xaxis: {        
			show: false
		}
	});

	// Fetch data from server
	device_id = $('#patient-device-id').text().split(' ')[2];  // ["Device", "Id:", '001']  

	// listener for chart
	addListener(device_id+'/visual', (payload) => {    		
		// console.log(payload);

		if (data.length > 0) data = data.slice(1);
		data.push(parseFloat(payload));

		// Zip the generated y values with the x values
		var res = [];		
		for (var i = 0; i < data.length; ++i) {			
			res.push([i, data[i]]);
		}    
		
		var min = Math.min.apply(null, data);
		var max = Math.max.apply(null, data);
		var halfDistance = (max - min) / 2;

		// plot.setData([res]);
		// plot.setupGrid(); //only necessary if your new data will change the axes or grid
		// plot.draw();  

		var plot = $.plot($('#heart-chart'), [res], {
			grid: {
				borderWidth: 0
			},
			series: {
				shadowSize: 0, // Drawing is faster without shadows
				color: "#00c0ef"
			},      
			yaxis: {     				
				min: min - (3 * halfDistance) , max: max + (3 * halfDistance),
				// min: -0.2, max: 0.2,
				show: false
			},
			xaxis: {        
				show: false
			}
		});
	});

	// listener for bpm
	var bpm_holder = $('#patient-bpm');
	addListener(device_id+'/bpm', (payload) => {    
		var bpm = (Math.round(payload * 100) / 100);
		bpm_holder.text('BPM: ' + bpm);

		var status_rhythm = $('#status-rhythm');
		if (bpm < 60) {
			status_rhythm.text('Bradycardia');
			playSound();
		} else if (bpm > 110) {
			status_rhythm.text('Tachycardia');
			playSound();
		} else {
			status_rhythm.text('Normal');
		}		
	});

	// listener for class
	// var bpm_holder = $('#patient-bpm');
	addListener(device_id+'/class', (payload) => {    
		// bpm_holder.text('BPM: ' + (Math.round(payload * 100) / 100));
		var status_normal = $('#status-normal');
		var status_pvc = $('#status-pvc');
		var status_vf = $('#status-vf');

		var total_normal = $("#total-normal");
		var total_pvc = $("#total-pvc");
		var total_vf = $("total-vf");

		// console.log('payload', payload);
		payload = JSON.parse(payload);

		// empty first
		status_normal.text(0);
		status_pvc.text(0);
		status_vf.text(0);

		console.log(payload);
		// fill later
		status_normal.text(payload.normal);
		status_pvc.text(payload.pc);
		status_vf.text(payload.vf);

		// data segment
		var normal_val = parseInt(payload.normal) || 0;
		var pvc_val  = parseInt(payload.pc) || 0;
		var vf_val = parseInt(payload.vf) || 0;

        // update statistic data in view
        total_normal.text(parseInt(total_normal.text()) + normal_val);
        total_pvc.text(parseInt(total_pvc.text()) + pvc_val);
        total_vf.text(parseInt(total_vf.text()) + vf_val);


		if(payload.pc > 0 || payload.vf > 0) playSound();
	});
}

function setupPatientList(patient_id) {
	const main = $('#main-content');
	main.load('/dashboard/patient/monitoring?id='+patient_id, setupPatientDetail);

	// handle 1..2..3..4
}

function setupPatientAdd() {  
	const doctor_username =  $('#username');
	const patient_username =  $('#add-patient-username');
	$.post( "/api/doctor/" + doctor_username.text() + "/data/add", {username: patient_username.val()}, function( data ) {
		console.log(data);
		if(data){
			switch (data.status){
				case 'success':
				patient_username.val('');
				alert('patient add success');
				break;
				case 'failed':
				patient_username.val('');
				alert('patient not exist');
				break;
			}
		}else
		alert('patient not exist');
	});
}

function handleSideBarClick(menu, point) {
	// remove last selection
	$('.sidebar-menu').find('li').removeClass('active');

	// mark current selection  
	$(point).addClass('active');  

	const doctor_username =  $('#username');

	const main = $('#main-content');

	switch (menu){ // menu
		case 'menu-dashboard':
		main.load('/dashboard/content?user=' + doctor_username.text());
			closeListener(device_id);  // close any possible socket
			break;
			case 'menu-patient-list':
			main.load('/dashboard/patient/list?user=' + doctor_username.text());
			closeListener(device_id);  // close any possible socket
			break;
			case 'menu-patient-add':
			main.load('/dashboard/patient/add');
			closeListener(device_id);  // close any possible socket
			break;
			case 'menu-record':
			main.load('/dashboard/record?user=' + doctor_username.text());
			closeListener(device_id);  // close any possible socket
			break;
		}
	}

	function loadRecord() {
	// remove last selection
	$('.sidebar-menu').find('li').removeClass('active');

	const main = $('#main-content');
	closeListener(device_id);

	const doctor_username =  $('#username');
	main.load('/dashboard/record?user=' + doctor_username.text());
	$('#menu-record').addClass('active');
}

function setupSideBar() {  
	const main = $('#main-content');
	const doctor_username =  $('#username');

	main.load('/dashboard/content?user=' + doctor_username.text());
	$('#menu-dashboard').addClass('active');
}

function test(){
	console.log('test');
}

$(document).ready(function () {
	setupSideBar();

	// loadContent(pathname);

	// console.log(sidebar_menus.length);
	// console.log('path', pathname);
});