let url;
switch (process.env.NODE_ENV) {
    case "production_eu":
        url = "https://api.eu.clover.com:443/v3"
        break;
    case "production_us":
        url = "https://api.clover.com:443/v3"
        break;
    default:
        url = "https://api.clover.com:443/v3"
        break;
}

export default {
    api_url: url
}