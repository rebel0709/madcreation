let host
let clientId
switch (process.env.NODE_ENV) {
    case "production_us":
        host = "http://104.236.47.62"
        clientId = "75DY65YX31M9C"
        break;
    case "production_eu":
        host = "http://138.68.151.236"
        clientId = "CDWGB48SFEJ92"
        break;
}

export default {
    host,
    clientId
}