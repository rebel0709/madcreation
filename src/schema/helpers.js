import {
    RoutingsModel,
    OrdersModel,
    CategoriesModel,
    LineItemsModel,
    OrderTypesModel
} from './model';

export const reshapeOrders = (orders) => orders
    .map(order => {
        let lineitems = !(order.lineItems === undefined) ? order.lineItems.elements : []
        let reshapedLineitems = lineitems.map(item => {
            let modifications = item.modifications ? item.modifications.elements : []
            return {
                id: item.id,
                name: item.name,
                modifications: modifications,
                item: item.item,
                note: item.note
            }
        })
        return {
            id: order.id,
            title: order.title,
            orderType: order.orderType,
            lineitems: reshapedLineitems,
            modifiedTime: order.modifiedTime,
            note: order.note
        }
    })


export const filterPayTypeOrders = (orders, payType) => {
    let [payTypeOpen, payTypePaid] = payType;
    return orders.filter(order => {
        if (order.payType === 'FULL') {
            return payTypePaid
        } else if (order.payType !== 'FULL') {
            return payTypeOpen
        }
    })
}

export const filterClosedLineItem = async (orders, station_id) => {
    const orderIds = orders.map(order => order.id);
    const lineitems = await LineItemsModel.find({ orderId: { $in: orderIds }, stationId: station_id, status: "closed" })
    const filteredOrders = orders.map(order => {
        order.lineitems = order.lineitems.filter(lineitem => {
            return lineitems.findIndex(item => item.lineitemId == lineitem.id) === -1
        })
        return order
    })

    return filteredOrders
}

export const filterNotClosedLineItem = async (orders, station_id) => {
    const orderIds = orders.map(order => order.id);
    const lineitems = await LineItemsModel.find({ orderId: { $in: orderIds }, stationId: station_id, status: "closed" })

    const filteredOrders = orders.map(order => {
        order.lineitems = order.lineitems.filter(lineitem => {
            return lineitems.findIndex(item => item.lineitemId == lineitem.id) !== -1
        })
        return order
    })

    return filteredOrders
}

export const mapLineItemsStatus = async (orders, station_id) => {
    const orderIds = orders.map(order => order.id);
    const lineitems = await LineItemsModel.find({ orderId: { $in: orderIds }, stationId: station_id, status: "closed" })
    const mappedOrders = orders.map(order => {
        order.lineitems = order.lineitems.map(lineitem => {
            if (lineitems.findIndex(item => item.lineitemId == lineitem.id) !== -1) {
                lineitem.status = "closed"
            }
            return lineitem
        })
        return order
    })
    return mappedOrders

}

export const filterClosedOrders = async (orders, station_id, expression) => {
    //filter order by 'closed' status
    const closedOrders = await OrdersModel.find({
        stationId: station_id,
        status: "closed",
    })
    const closedOrderIds = closedOrders.map(order => order.orderId)
    //filter by closed orders 
    //get station ids for map routing lineitem
    let filteredByClosedOrders;
    if (expression === "===") {
        filteredByClosedOrders = orders.filter(order => closedOrderIds.findIndex(closedId => closedId === order.id) === -1)
    } else {
        filteredByClosedOrders = orders.filter(order => closedOrderIds.findIndex(closedId => closedId === order.id) !== -1)
    }

    return filteredByClosedOrders
}


export const filteredByRouting = async (orders, station_id) => {
    const stations = await RoutingsModel.find({
        stationId: station_id,
        // checked: true
        disabled: true
    })

    //get lineitem id that has checked
    const lineitemIds = stations
        .map(station => station.lineitemId)

    // //filter by routing
    const filteredOrders = orders.map(order => {
        order.lineitems = order.lineitems.filter(lineitem => {
            if (!lineitem.item) return false;
            return lineitemIds.findIndex(id => id === lineitem.item.id) === -1
        })
        return order
    })
    return orders
}

export const filteredByOrderType = async (orders, station_id) => {
    let types = await OrderTypesModel.find({ stationId: station_id })
    let filtered = orders.filter(o => {
        let found = types.find(t => t.orderTypeId === o.orderType.id)
        return found ? !found.disabled : true
    })

    return filtered
}

export const mapOrdersShownedTime = async (orders, station_id) => {
    const orderIds = orders.map(order => order.id);
    const statuses = await OrdersModel.find({ stationId: station_id, orderId: { $in: orderIds } })
    const ordersWithStatus = orders.map(order => {
        let found = statuses.find(status => status.orderId == order.id)
        if (found) {
            order.shownedAt = found.shownedAt || null;
        } else {
            order.shownedAt = null;
        }
        return order
    })
    return ordersWithStatus

}
export const mapOrdersColor = async (orders) => {
    //extract categories id for map color
    const mappedOrder = orders.map(order => {
        return order.lineitems.map(lineitem => {
            // console.log(lineitem)
            if (!lineitem.item) return;
            let cat = lineitem.item.categories
            if (cat && cat.elements[0]) return cat.elements[0].id
        })
    })

    let catIds = []

    if (mappedOrder.length !== 0) {
        catIds = mappedOrder.reduce(function (prev, curr) {
            return prev.concat(curr);
        }).filter(ids => ids !== undefined)
    }

    const uniqueCatIds = [...new Set(catIds)]
    //get colors
    const categories = await CategoriesModel.find({
        id: {
            $in: uniqueCatIds
        }
    })
    // console.log(categories)
    //map color
    const coloredOrders = orders.map(order => {
        order.lineitems.map(lineitem => {
            // console.log(lineitem)
            if (!lineitem.item) return;
            let cat = lineitem.item.categories
            if (cat && cat.elements[0]) {
                let catId = cat.elements[0].id
                let found = categories.find(category => category.id === catId)
                if (found) lineitem.color = found.color;
            }
        })
        return order
    })

    return coloredOrders
}