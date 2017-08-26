const request = require('superagent');

// CONFIG for send message
const BASE_URL = 'https://api.mainapi.net/smsnotification/1.0.0';
const ENDPOINT = '/messages';
// const USER_TOKEN = ''; // always re-request token (for failsafe)

// CONFIG for get token
const URL_TOKEN = 'https://api.mainapi.net/token';
// token below signed from kiswanto_d2@yahoo.com
// need to change this, if quota sms has reached limit
const AUTH_TOKEN = 'a29MM0N0VlNYaXBiXzR2OEpQYU9oeERVeHpnYTpQUzlNTlh4VFpEZVJmR0Vpd0ZDTERwYzFVTDBh';

const requestApi = function(number, message, accessToken){

    request
        // url request
        .post(BASE_URL+ENDPOINT)

        // header
        .set('Accept', 'application/json')
        .set('Content-Type', 'application/x-www-form-urlencoded')
        .set('Authorization', 'Bearer ' + accessToken)

        // body
        .send(`msisdn=${number}`)
        .send(`content=${message}`)

        // callback
        .end((err,res)=>{
            if (err || !res.ok) {
                console.log(err)
            } else {
                console.log(res.body);
                console.log(res.status);
            }
        })
};

const sendMessage = function(number, message){

    // get token first
    request
        .post(URL_TOKEN)
        .set('Authorization', 'Basic ' + AUTH_TOKEN)
        .send('grant_type=client_credentials')
        .end((err,res)=>{
            if (err || !res.ok) {
                console.log(err)
            } else {
                const accessToken = res.body.access_token;
                console.log(`Get token ${accessToken} ${res.status}`);

                // make api request sms notification
                requestApi(number, message, accessToken)
            }
        })
};

// Example Usage (Tested + Worked)
// getToken();
// sendMessage('085399044108', 'From Javascript using SuperAgent (Re-request token, for failsafe)');
