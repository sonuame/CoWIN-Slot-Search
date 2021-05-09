let fetch = require('node-fetch');

const yargs = require('yargs/yargs')
const { hideBin } = require('yargs/helpers')
const argv = yargs(hideBin(process.argv)).argv


let state = argv.state;
let city = argv.city;
let polling_interval = argv.polling;
let age = argv.age
let date = argv.date

polling_interval = polling_interval < 5000 ? 5000 : polling_interval;

let host = 'https://cdn-api.co-vin.in/api';

console.log(state, city);

let headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/56.0.2924.76 Safari/537.36',
    'content-type' : 'application/json',
    'connection' : 'keep-alive'
}

let findState = async (state) => {
    let result = await fetch(`${host}/v2/admin/location/states`, { headers : headers });
    result = await result.json();
    return result.states.find(m => m.state_name === state);
}


let findDistrict = async (stateId, city) => {
    let result = await fetch(`${host}/v2/admin/location/districts/${stateId}`, { headers : headers });
    result = await result.json();
    return result.districts.find(m => m.district_name === city);
}

let processCenters = (centers) => {
    let _centers = centers
                    .map(c => ({
                        name : c.name,
                        address : c.address,
                        pincode: c.pincode,
                        latlong: c.lat + ',' + c.long,
                        sessions : c.sessions.filter(s => s.available_capacity > 0)
                    }));

    return _centers;
}

let columnWithCorrection = (value, width) => {
    for(let i = 0;i < width; i++) value += value.length - 1 < i ? ' ' : '';
    return value;
}

let userFriendlyPrint = (centers) => {
    let table = [];
    let center_name_width = 40;
    table.push(`${columnWithCorrection('CENTER', center_name_width)} PINCODE LATLONG\tSESSION`)
    table.push('-----------------------------------------------------------------------------');
    centers.forEach(center => {
        let sessions = center.sessions.map(m => `${m.date} - ${m.available_capacity}`).join('\t');
        let c_name = columnWithCorrection(center.name, center_name_width);
        
        table.push(`${c_name} ${center.pincode}\t${center.latlong}\t\t${sessions}`);
    });
    table.push('-----------------------------------------------------------------------------');
    return table.join('\n');
}

let findSlots = async (ageLimit, districtId, date, pinCode) => {
    let result = await fetch(`${host}/v2/appointment/sessions/public/calendarByDistrict?district_id=${districtId}&date=${date}`, { headers : headers });
    result = await result.json();
    return result.centers.filter(m => m.sessions.filter(n => n.available_capacity > 0 && n.min_age_limit === ageLimit).length > 0);
}



let polling = async () => {
    let _s = await findState(state).catch(e => console.error('state not found', e));
    let _d = await findDistrict(_s.state_id, city).catch(e => console.error('city not found', e));;
    let _c = await findSlots(age, _d.district_id, date)
                .catch(e => console.error('slot not found', e))
                .finally(() => setTimeout(polling, polling_interval));
    
    // Do Something with this data
    let availableSlots = processCenters(_c);
    
    //PrettyPrint
    console.log(userFriendlyPrint(availableSlots));
}

polling().then().finally();

// RUN
// node index --state="Uttar Pradesh" --city=Meerut --polling=2000 --age=45 --date=10-05-2021 