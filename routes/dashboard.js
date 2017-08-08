/**
 * Created by maakbar on 5/29/17.
 */
let express = require('express');
let router = express.Router();
let Doctor = require('../models/doctor');
let Patient = require('../models/patient');
let Alert = require('../models/alert');
let utils = require('./utils');
let passport = require('passport');

router.get('/', utils.isAuthenticated, (req, res) => {
    res.render('component/body', {
        title: 'JANTUNG',
        sub:'App',
        username:req.user.username,
        full_name:req.user.full_name
    });
});

router.get('/content', (req, res, next) => {    
    // console.log('doctor', req.query.user);
    Doctor.findOne({username: req.query.user}).then((doctor) =>{
        if (doctor){
            const patients = doctor.patients;            
            res.render('menu/dashboard', {
                total: patients.length
            });
        }
    });
});

router.get('/patient/list', utils.isAuthenticated, (req, res) => {
    Doctor.findOne({username: req.query.user}).then((doctor) =>{
        if (doctor){
            const patients = doctor.patients;
            res.render('menu/list_patient', {
                patients: patients
            });
        }
    });
});

router.get('/patient/monitoring', utils.isAuthenticated, (req, res) => {    
    const patient_id = req.query.id;

    Patient.findOne({_id: patient_id.toString()}).then((patient) => {        
        if (patient)
            res.render('menu/monitoring', {patient: patient});
    });        
});

router.get('/patient/add', utils.isAuthenticated, (req, res) => {
    res.render('menu/add_patient');
});

router.get('/record', utils.isAuthenticated, (req, res) => {    
    Doctor.findOne({username: req.query.user}).then((doctor) =>{
        if (doctor){
            const patients = doctor.patients
            // console.log(patients);

            let patients_device = {};
            let query = [];
            for (let i = 0; i < patients.length; i++){
                query[i] = patients[i].device_id;
                patients_device[patients[i].device_id] = {
                    full_name: patients[i].full_name,
                    phone_num: patients[i].phone_num
                };
            }

            // console.log(patients_device);
            // console.log(query);

            Alert.find({}).where('device_id').in(query).then((record) => {
                let alerts = [];
                for (let i = 0; i < record.length; i++) {
                    alerts.push({
                        time : record[i].date,
                        full_name : patients_device[record[i].device_id].full_name,
                        device_id : record[i].device_id,
                        phone_num : patients_device[record[i].device_id].phone_num,
                        type : record[i].status,
                        occurance : record[i].occurance
                    });                    
                }                

                res.render('menu/record', {
                    alerts: alerts                    
                });
            });        
        }
    });
    
});

module.exports = router;