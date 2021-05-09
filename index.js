let fetch = require('node-fetch');


let state = process.argv[2];
let city = process.argv[3];

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
                    .filter(m => !!m.sessions.find(n => n.available_capacity > 0))
                    .map(c => ({
                        name : c.name,
                        address : c.address,
                        pincode: c.pincode,
                        latlong: c.lat + ',' + c.long,
                        sessions : c.sessions.filter(s => s.available_capacity > 0)
                    }));

    return _centers;
}

let findSlots = async (ageLimit, districtId, date, pinCode) => {
    let result = await fetch(`${host}/v2/appointment/sessions/public/calendarByDistrict?district_id=${districtId}&date=${date}`, { headers : headers });
    result = await result.json();
    return processCenters(result.centers);
}



let polling = async () => {
    let _s = await findState(state);
    let _d = await findDistrict(_s.state_id, city);
    let _c = await findSlots(45, _d.district_id, '10-05-2021')
                .then(center => {
                    console.log(center[0]);
                })
                .finally(() => setTimeout(polling, 2000));
}

polling().then().finally();