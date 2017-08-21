var path = require('path');
var fs = require('fs');
var readline = require('readline');
var google = require('googleapis');
var googleAuth = require('google-auth-library');
var moment = require('moment');
// var path = require('path');
// If modifying these scopes, delete your previously saved credentials
// at ~/.credentials/sheets.googleapis.com-nodejs-quickstart.json
var SCOPES = ['https://www.googleapis.com/auth/drive', 'https://www.googleapis.com/auth/spreadsheets'];
var TOKEN_DIR = path.resolve(__dirname, '../.credentials/');
var TOKEN_PATH = TOKEN_DIR + '/client_secret.json';

var range

switch (process.env.NODE_ENV) {
    case "production_us":
        range = "Order Display"
        break;
    case "production_eu":
        range = "Order Display - EU"
        break;
    default:
        range = "Order Display"
        break;
}

import config from './config';
export function storeMerchantToSheet(merchantInfo) {

    if (merchantInfo.id === "MZWZMVZWJWY24" || merchantInfo.id === "C8NH9EJYAXBHE") {
        return;
    }
    fs.readFile('client_secret.json', function processClientSecrets(err, content) {
        if (err) {
            console.log('Error loading client secret file: ' + err);
            return;
        }
        // Authorize a client with the loaded credentials, then call the
        // Google Sheets API.
        authorize(JSON.parse(content), merchantInfo, updateMerchant);
    });
}


function authorize(credentials, merchantInfo, callback) {
    var clientSecret = credentials.installed.client_secret;
    var clientId = credentials.installed.client_id;
    var redirectUrl = credentials.installed.redirect_uris[0];
    var auth = new googleAuth();
    var oauth2Client = new auth.OAuth2(clientId, clientSecret, redirectUrl);

    // Check if we have previously stored a token.
    fs.readFile(TOKEN_PATH, function (err, token) {
        if (err) {
            getNewToken(oauth2Client, callback);
        } else {
            oauth2Client.credentials = JSON.parse(token);
            callback(oauth2Client, merchantInfo);
        }
    });
}

function getNewToken(oauth2Client, callback) {
    var authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES
    });
    console.log('Authorize this app by visiting this url: ', authUrl);
    var rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    rl.question('Enter the code from that page here: ', function (code) {
        rl.close();
        oauth2Client.getToken(code, function (err, token) {
            if (err) {
                console.log('Error while trying to retrieve access token', err);
                return;
            }
            oauth2Client.credentials = token;
            storeToken(token);
            callback(oauth2Client, merchantInfo);
        });
    });
}

function storeToken(token) {
    try {
        fs.mkdirSync(TOKEN_DIR);
    } catch (err) {
        if (err.code != 'EEXIST') {
            throw err;
        }
    }
    fs.writeFile(TOKEN_PATH, JSON.stringify(token));
    console.log('Token stored to ' + TOKEN_PATH);
}

function updateMerchant(auth, merchantInfo) {
    // console.log(merchantInfo);
    var sheets = google.sheets('v4');
    sheets.spreadsheets.values.get({
        auth: auth,
        spreadsheetId: '1q9AAzDROYngEKIHtc9JN3G5e_1iZpj8mnOq-b82_GV4',
        // spreadsheetId: '1pXF0myAZ1_XzoeRMHhd1ULWLCu6q9XHRee-HvCDAHgo',
        range: range,
        // valueInputOption: 'USER_ENTERED',
        // resource: {
        //   values: [['sfsdfdsf']],
        //   // majorDimension: 'ROWS',
        // }
    }, function (err, response) {
        if (err) {
            console.log('The API returned an error: ' + err);
            return;
        }
        var values = response.values
        var index
        if (values) {
            // console.log(values)
            var row = "";
            for (var i = 0; i < values.length; i++) {
                for (var j = 0; j < values[i].length; j++) {
                    if (values[i][j] == merchantInfo.id) {
                        row = values[i][j];
                        // console.log(row)
                        index = i + 1;
                    }
                }
            }
            // console.log(row);
            if (!row) {
                sheets.spreadsheets.values.append({
                    auth,
                    spreadsheetId: '1q9AAzDROYngEKIHtc9JN3G5e_1iZpj8mnOq-b82_GV4',
                    // spreadsheetId: '1pXF0myAZ1_XzoeRMHhd1ULWLCu6q9XHRee-HvCDAHgo',
                    range: range,
                    valueInputOption: 'USER_ENTERED',
                    resource: {
                        values: [
                            [
                                moment().format('M-D-YYYY'),//Install Date
                                merchantInfo.id,//Merchant ID
                                merchantInfo.owner ? merchantInfo.owner.email : null,//Email 
                                merchantInfo.owner ? merchantInfo.owner.name : null,// Manager / owner
                                merchantInfo.phoneNumber ? merchantInfo.phoneNumber : null,//Phone number
                                merchantInfo.name ? merchantInfo.name : null,//Merchant Name
                                merchantInfo.address ? `${merchantInfo.address.city || ""} , ${merchantInfo.address.country || ""} ,${merchantInfo.address.state || ""} ,${merchantInfo.address.zip || ""}` : null, //address
                                merchantInfo.address.phoneNumber ? merchantInfo.address.phoneNumber : null,
                                merchantInfo.website ? merchantInfo.website : null,//Website
                                merchantInfo.billingInfo.appSubscription.name,//Plan
                                merchantInfo.billingInfo.isInTrial,//status
                                `${config.host}?client_id=${config.clientId}&employee_id=&merchant_id=${merchantInfo.id}&code=${merchantInfo.code}`,//Access Link
                                moment().format('M-D-YYYY'),//LastActive
                            ]
                        ],
                        // majorDimension: 'ROWS',
                    }
                }, function (err, response) {
                    if (err) {
                        console.log(err)
                    }
                })
            } else {
                sheets.spreadsheets.values.update({
                    auth,
                    spreadsheetId: '1q9AAzDROYngEKIHtc9JN3G5e_1iZpj8mnOq-b82_GV4',
                    // spreadsheetId: '1pXF0myAZ1_XzoeRMHhd1ULWLCu6q9XHRee-HvCDAHgo',
                    range: range + '!A' + index,
                    valueInputOption: 'USER_ENTERED',
                    resource: {
                        values: [
                            [
                                null,//Install Date
                                merchantInfo.id,//Merchant ID
                                merchantInfo.owner ? merchantInfo.owner.email : null,//Email 
                                merchantInfo.owner ? merchantInfo.owner.name : null,// Manager / owner
                                merchantInfo.phoneNumber ? merchantInfo.phoneNumber : null,//Phone number
                                merchantInfo.name ? merchantInfo.name : null,//Merchant Name
                                merchantInfo.address ? `${merchantInfo.address.city || ""} , ${merchantInfo.address.country || ""} ,${merchantInfo.address.state || ""} ,${merchantInfo.address.zip || ""}` : null, //address
                                merchantInfo.address.phoneNumber ? merchantInfo.address.phoneNumber : null,
                                merchantInfo.website ? merchantInfo.website : null,//Website
                                merchantInfo.billingInfo.appSubscription.name,//Plan
                                merchantInfo.billingInfo.isInTrial,//status
                                `${config.host}?client_id=${config.clientId}&employee_id=&merchant_id=${merchantInfo.id}&code=${merchantInfo.code}`,//Access Link
                                moment().format('M-D-YYYY'),//Last Active,
                            ]
                        ],
                        // majorDimension: 'ROWS',
                    }
                }, function (err, response) {
                    if (err) {
                        console.log(err)
                    }
                    // console.log(response);
                })
            }
        }

    });
}
