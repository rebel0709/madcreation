import axios from 'axios';
import moment from 'moment';
import {
    CategoriesModel,
    StationsModel,
    RoutingsModel,
    OrdersModel,
    OrderTypesModel
} from './model';

import {
    reshapeOrders,
    filteredByRouting,
    filterPayTypeOrders,
    mapOrdersColor,
    filterClosedOrders,
    mapOrdersShownedTime,
    mapLineItemsStatus,
    filterClosedLineItem,
    filterNotClosedLineItem,
    filteredByOrderType
} from './helpers';
import constant from './constant';

export const getSubscriptionName = async (_, { }, { user: { client_id, merchant_id, access_token } }) => {
    const url = `${constant.api_url}/apps/${client_id}/merchants/${merchant_id}/billing_info`
    let result
    try {
        result = await axios({
            url,
            headers: { 'Authorization': "Bearer " + access_token }
        });
    } catch (e) {
        console.log(e);
        return;
    }
    return result.data.appSubscription.name
}

export const getMerchant = async (_, { }, { user: { merchant_id, access_token } }) => {
    const url = `${constant.api_url}/merchants/${merchant_id}?expand=logos&access_token=${access_token}`
    let result
    try {
        result = await axios.get(url)
    } catch (e) {
        console.log(e)
        return;
    }

    return {
        logoUrl: result.data.logos.elements[0] ? result.data.logos.elements[0].url : '',
        name: result.data.name
    }
}
export const getOrdersInProgress = async (
    _,
    { station_id, payType, time = 60 * 3 },
    { user: { merchant_id, access_token } }) => {

    //add some cheat to let merchants demo app
    if (merchant_id === "MZWZMVZWJWY24") {
        time = 60 * 24 * 7
    }

    let oneDay = moment().subtract(time, 'm').valueOf()
    const url = `${constant.api_url}/merchants/${merchant_id}/orders?filter=createdTime>${oneDay}&expand=orderType,lineItems,lineItems.modifications,lineItems.item,lineItems.item.categories&access_token=${access_token}`
    let result
    try {
        result = await axios.get(url)
    } catch (e) {
        console.log(e);
        return;
    }
    const orders = result.data.elements
    const filteredByPayType = await filterPayTypeOrders(orders, payType);
    const reshaped = reshapeOrders(filteredByPayType);
    // const filteredByClosedOrders = await filterClosedOrders(reshaped, station_id, '===');
    const filteredByRoutingOrders = await filteredByRouting(reshaped, station_id)
    const coloredOrders = await mapOrdersColor(filteredByRoutingOrders)
    const statusedOrders = await mapOrdersShownedTime(coloredOrders, station_id)
    // const mappedLineItem = await mapLineItemsStatus(statusedOrders, station_id)
    const filteredClosedLineItem = await filterClosedLineItem(statusedOrders, station_id);

    //filter out orders that have empty lineitem 
    const filteredEmpty = filteredClosedLineItem.filter(order => order.lineitems.length !== 0)
    const filteredOrderType = await filteredByOrderType(filteredEmpty, station_id)
    return filteredOrderType;
}


export const getOrdersCompleted = async (
    _,
    { station_id, payType, time = 60 * 3 },
    { user: { merchant_id, access_token } }) => {
    // let oneDay = moment().subtract(48, 'h').valueOf()

    //add some cheat to let merchants demo app
    if (merchant_id === "MZWZMVZWJWY24") {
        time = 60 * 24 * 7
    }

    let oneDay = moment().subtract(time, 'm').valueOf()
    const url = `${constant.api_url}/merchants/${merchant_id}/orders?filter=createdTime>${oneDay}&expand=orderType,lineItems,lineItems.modifications,lineItems.item,lineItems.item.categories&access_token=${access_token}`
    let result
    try {
        result = await axios.get(url)
    } catch (e) {
        console.log(e);
        return;
    }
    const orders = result.data.elements
    const filteredByPayType = filterPayTypeOrders(orders, payType);
    const reshaped = reshapeOrders(filteredByPayType);
    // const filteredByClosedOrders = await filterClosedOrders(reshaped, station_id, '!==');
    const filteredByRoutingOrders = await filteredByRouting(reshaped, station_id);
    const coloredOrders = await mapOrdersColor(filteredByRoutingOrders)
    const statusedOrders = await mapOrdersShownedTime(coloredOrders, station_id)

    const filteredClosedLineItem = await filterNotClosedLineItem(statusedOrders, station_id);
    //filter out orders that have empty lineitem 
    const filteredEmpty = filteredClosedLineItem.filter(order => order.lineitems.length !== 0)
    const filteredOrderType = await filteredByOrderType(filteredEmpty, station_id)
    return filteredOrderType
}

export const getTheOrderLineItems = async (_, { }, { }) => {
    return _.lineitems
}


export const getStation = async (_,
    { station_id },
    { }) => {

    // https://api.clover.com:443/v3/merchants/MZWZMVZWJWY24/order_types
    // const url = `${constant.api_url}/merchants/${merchant_id}/order_types`
    // let result
    // try {
    //     result = await axios.get(url,
    //         {
    //             headers: { "Authorization": "Bearer " + access_token }
    //         })
    // } catch (e) {
    //     console.log(e)
    //     return;
    // }

    // let orderTypes = result.data.elements
    // console.log(orderTypes)

    let station = await StationsModel.findOne({
        id: station_id
    })

    return station
}

export const getOrderTypeFilter = async (_, { }, { user: { merchant_id, access_token } }) => {

    // https://api.clover.com:443/v3/merchants/MZWZMVZWJWY24/order_types
    const url = `${constant.api_url}/merchants/${merchant_id}/order_types`
    let result
    try {
        result = await axios.get(url,
            {
                headers: { "Authorization": "Bearer " + access_token }
            })
    } catch (e) {
        console.log(e)
        return;
    }

    let orderTypes = result.data.elements
    let types = await OrderTypesModel.find({ stationId: _.id })
    let mapped = orderTypes.map(type => {
        let found = types.find(o => o.orderTypeId === type.id)
        type.disabled = found ? found.disabled : false
        return type
    })
    return mapped
}

export const getStations = async (_, { },
    { user: { merchant_id } }) => {
    let stations = await StationsModel.find({
        merchantId: merchant_id
    })

    return stations
}

export const getCategories = async (_, { }, {
    user: {
        merchant_id,
    access_token
    }
}) => {
    let result
    try {
        result = await axios.get(`${constant.api_url}/merchants/${merchant_id}/categories?expand=items&access_token=${access_token}`)
    } catch (e) {
        console.log(e)
        return;
    }

    let categories = result.data.elements
    //reshape
    let reshape = categories.map(category => {
        return {
            id: category.id,
            name: category.name,
            color: category.color,
            lineitems: category.items.elements
        }
    })

    //extract id
    let catIds = reshape.map(category => {
        return category.id
    })

    //get all colors
    let colors = await CategoriesModel.find({
        id: {
            $in: catIds
        }
    })

    //map color
    reshape.map(category => {
        let found = colors.find(color => color.id === category.id)
        if (found) category.color = found.color
    })

    return reshape
}
export const getIsRouting = async ({
    id
}, {
    station_id
}) => {
    let routing = await RoutingsModel.findOne({
        lineitemId: id,
        stationId: station_id
    })
    return routing ? !routing.disabled : false
}