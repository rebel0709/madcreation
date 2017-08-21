import {
    getOrdersInProgress,
    getTheOrderLineItems,
    getCategories,
    getLineItems,
    getStation,
    getStations,
    getIsRouting,
    getOrderTypeFilter,
    // getOrdersToDisplay,
    getOrdersCompleted,
    getMerchant,
    getSubscriptionName
} from './query-connector'

import {
    checkOAuth,
    syncOrders,
    syncCategories,
    setCategoryColor,
    createStation,
    removeStation,
    setRoutingOnLineItem,
    setRoutingOnCategory,
    setOrderTypeFilter,
    createPresetStations,
    closeOrder,
    closeLineItem,
    undoOrder,
    updateOrderShownedAt,
    undoItem,
} from './mutation-connector';

import {
    LineItemsModel,
    ModificationsModel,
    CategoriesModel,
} from './model'

export default {
    Merchant: {
        subscriptionName: getSubscriptionName
    },
    Order: {
        lineitems: getTheOrderLineItems,
        orderType: (_, args) => _.orderType
    },
    Category: {
        lineitems: (_, args) => _.lineitems
    },
    LineItem: {
        modifications: (_, args) => _.modifications,
        isRouting: getIsRouting
    },
    Station: {
        orderTypeFilter: getOrderTypeFilter
    },
    Query: {
        // ordersToDisplay: getOrdersToDisplay,
        test: () => "OK",
        ordersInProgress: getOrdersInProgress,
        ordersCompleted: getOrdersCompleted,
        categories: getCategories,
        station: getStation,
        stations: getStations,
        merchant: getMerchant,
    },
    Mutation: {
        checkOAuth,
        closeOrder,
        undoOrder,
        closeLineItem,
        undoItem,
        updateOrderShownedAt,
        setCategoryColor,
        createStation,
        removeStation,
        createPresetStations,
        setRoutingOnCategory,
        setRoutingOnLineItem,
        setOrderTypeFilter
    }
}