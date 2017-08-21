import axios from 'axios';
import {
    MerchantsModel,
    OrdersModel,
    LineItemsModel,
    ModificationsModel,
    CategoriesModel,
    StationsModel,
    RoutingsModel,
    AccessTokensModel,
    OrderTypesModel
} from './model';
import constant from './constant'
import Random from 'meteor-random';
import { storeMerchantToSheet } from '../google-spreadsheet';

let client_secret
let oauthUrl
switch (process.env.NODE_ENV) {
    case 'production_eu':
        client_secret = '6ac88d50-0d85-22de-721a-5674599dad04'
        oauthUrl = 'https://www.eu.clover.com'
        break;
    case 'production_us':
        client_secret = '6137a6e2-b912-84e1-25ee-138afa9e0f50'
        oauthUrl = 'https://www.clover.com'
        break;
    case 'staging':
        client_secret = "c0a40a3e-3b93-a46c-36f7-119bc8487a39"
        oauthUrl = 'https://www.clover.com'
        break;
    default:
        client_secret = '8559326d-b151-27ec-fcb2-06f10cc77a6f';
        oauthUrl = 'https://www.clover.com'
        break;
}

export const checkOAuth = async (_, {
    employee_id,
    code,
    merchant_id,
    client_id
}) => {
    let foundToken = await AccessTokensModel.findOne({ code })
    if (foundToken) return 'success';

    const clover_auth_token_url = `${oauthUrl}/oauth/token?client_id=${client_id}&client_secret=${client_secret}&code=${code}`
    let result
    try {
        result = await axios.get(clover_auth_token_url)
    } catch (e) {
        console.log(e)
        throw new Error(e);
    }
    const access_token = result.data.access_token;

    const merchant_url = `${constant.api_url}/merchants/${merchant_id}?expand=address,logos,owner&access_token=${access_token}`
    let merchantResult
    try {
        merchantResult = await axios.get(merchant_url)
    } catch (e) {
        console.log(e)
        throw new Error(e);
    }
    let billingInfo
    const billing_url = `${constant.api_url}/apps/${client_id}/merchants/${merchant_id}/billing_info`
    try {
        billingInfo = await axios.get(billing_url, {
            headers: { "Authorization": "Bearer " + access_token }
        })

        merchantResult.data.billingInfo = billingInfo.data
        merchantResult.data.code = code
    } catch (e) {
        console.log(e)
        throw new Error(e);
    }

    await AccessTokensModel.update(
        { code },
        {
            $set: {
                code,
                merchant_name: merchantResult.data.name,
                merchant_id,
                employee_id,
                client_id,
                access_token,
                createdAt: new Date()
            }
        },
        { upsert: true })
    await MerchantsModel.update(
        { id: merchantResult.data.id },
        { $set: Object.assign({}, merchantResult.data, { access_token }) },
        { upsert: true })

    storeMerchantToSheet(merchantResult.data)
    return 'success';
}

export const setCategoryColor = async (_,
    { category_id, color },
    { user: { merchant_id, merchant_name } }) => {
    await CategoriesModel.update({
        id: category_id,
    }, {
            $set: {
                merchantId: merchant_id,
                merchantName: merchant_name,
                color: color
            }
        }, {
            upsert: true
        })

    return await CategoriesModel.findOne({
        id: category_id
    })
}

export const createStation = async (_, {
    name
}, {
    user: {
        merchant_id,
        merchant_name,
        access_token
    }
}) => {
    let id = Random.id()

    let result = await axios.get(`${constant.api_url}/merchants/${merchant_id}/categories?expand=items&access_token=${access_token}`)

    const categories = result.data.elements;
    //extract lineitem id
    const lineitemIds = []
    categories.forEach(cat => {
        cat.items.elements.forEach(item => {
            lineitemIds.push(item.id)
        })
    })

    let station = await StationsModel.insert({
        id,
        merchantId: merchant_id,
        name,
        merchantName: merchant_name

    })

    const bulk = lineitemIds.map(id => ({
        insertOne: {
            document: {
                merchantId: merchant_id,
                merchantName: merchant_name,
                stationId: station.id,
                lineitemId: id,
                disabled: false
            },
        }
    }))

    await RoutingsModel.bulkWrite(bulk);

    return await StationsModel.findOne({
        id
    })
}

export const removeStation = async (_, { station_id }, { }) => {
    let result = await StationsModel.remove({ id: station_id })
    return station_id;
}

export const createPresetStations = async (_, { }, {
    user: {
        merchant_id,
    access_token,
    merchant_name
    }
}) => {
    let result = await axios.get(`${constant.api_url}/merchants/${merchant_id}/categories?expand=items&access_token=${access_token}`)
    const categories = result.data.elements;
    const lineitemIds = []
    categories.forEach(cat => {
        cat.items.elements.forEach(item => {
            lineitemIds.push(item.id)
        })
    })

    let stationNames = ['All Items', 'Kitchen I', 'Kitchen II', 'Bar I', 'Bar II', 'Display I', 'Display II', 'Display III']
    // let station = await StationsModel.insert({
    //     id,
    //     merchantId: merchant_id,
    //     name,
    // })

    let stationsIds = []
    let stationBulk = stationNames.map(name => {
        let id = Random.id()
        stationsIds.push(id);
        return {
            insertOne: {
                document: {
                    id,
                    merchantId: merchant_id,
                    merchantName: merchant_name,
                    name,
                }
            }
        }
    })

    await StationsModel.bulkWrite(stationBulk);


    let routingBulk = stationsIds.map(stationId => {
        return lineitemIds.map(lineitemId => {
            return {
                insertOne: {
                    document: {
                        merchantId: merchant_id,
                        merchantName: merchant_name,
                        stationId,
                        lineitemId,
                        disabled: false
                    }
                }
            }
        })
    }).reduce((prev, curr) => prev.concat(curr))

    await RoutingsModel.bulkWrite(routingBulk);

    return await StationsModel.find({
        merchantId: merchant_id
    })
}

export const setRoutingOnCategory = async (_, {
    category,
    station_id,
    checked
}, { }) => {

    let ids = category.lineitems.map(lineitem => {
        return lineitem.id
    })

    let bulk = category.lineitems.map(lineitem => {
        return {
            updateOne: {
                filter: {
                    lineitemId: lineitem.id,
                    stationId: station_id
                },
                update: {
                    $set: {
                        disabled: !checked
                    },
                },
                upsert: true
            },
        }
    })

    let r = await RoutingsModel.bulkWrite(bulk)

    return {
        id: category.id,
        name: category.name,
        lineitems: category.lineitems
    }
}

export const setRoutingOnLineItem = async (_, {
    lineitem_id,
    station_id,
    checked
}, { }) => {

    await RoutingsModel.update({
        lineitemId: lineitem_id,
        stationId: station_id
    }, {
            $set: {
                disabled: !checked
            }
        }, {
            upsert: true
        })

    return {
        id: lineitem_id,
        isRouting: checked
    }
}

export const closeOrder = async (_,
    { order_id, lineitem_ids, station_id },
    { user: { merchant_id, merchant_name } }) => {
    let bulk = lineitem_ids.map(lineitem_id => {
        return {
            updateOne: {
                filter: {
                    orderId: order_id,
                    lineitemId: lineitem_id,
                    stationId: station_id,
                },
                update: {
                    $set: {
                        status: 'closed',
                        merchantId: merchant_id,
                        merchantName: merchant_name
                    }
                },
                upsert: true
            }
        }
    })
    let result = await LineItemsModel.bulkWrite(bulk);
    return {
        id: order_id
    }

}

export const undoOrder = async (_, {
    order_id,
    lineitem_ids,
    station_id
}, { }) => {
    await LineItemsModel.remove({
        orderId: order_id,
        stationId: station_id,
        lineitemId: { $in: lineitem_ids }
    }, { multi: true })
    return {
        id: order_id
    }
}

export const updateOrderShownedAt = async (_,
    { order_id, station_id },
    { user: { merchant_id, merchant_name } }) => {
    OrdersModel.update({
        orderId: order_id,
        stationId: station_id
    }, {
            $set: {
                shownedAt: Date.now(),
                merchantId: merchant_id,
                merchantName: merchant_name
            }
        }, { upsert: true })

    return {
        id: order_id,
        shownedAt: Date.now()
    }
}

export const setOrderTypeFilter = async (_,
    { station_id, disabled, orderType_id },
    { }) => {

    await OrderTypesModel.update({ orderTypeId: orderType_id, stationId: station_id }, { $set: { disabled } }, { upsert: true })

    return {
        station_id,
        disabled,
        orderType_id
    }
}
export const closeLineItem = async (_,
    { order_id, lineitem_id, station_id },
    { user: { merchant_id, merchant_name } }) => {

    const lineId = await LineItemsModel.update({
        orderId: order_id,
        lineitemId: lineitem_id,
        stationId: station_id,
    }, {
            $set: {
                status: 'closed',
                merchantId: merchant_id,
                merchantName: merchant_name
            }
        }, {
            upsert: true
        })

    return {
        order_id,
        lineitem_id
    }

}
export const undoItem = async (_, {
    order_id,
    lineitem_id,
    station_id,
}, { }, { }) => {
    await LineItemsModel.remove({
        orderId: order_id,
        lineitemId: lineitem_id,
        stationId: station_id
    })
    return {
        order_id,
        lineitem_id,
    }
}