import monk from 'monk';
const db = monk('mongodb://localhost:27017/clover')
db.then(() => {
    console.log('Connected correctly to server')
})
export const OrdersModel = db.get('orders');
export const OrderTypesModel = db.get('order_types');
export const LineItemsModel = db.get('lineitems');
export const MerchantsModel = db.get('merchants');
export const ModificationsModel = db.get('modifications');
export const CategoriesModel = db.get('categories');
export const StationsModel = db.get('stations');
export const RoutingsModel = db.get('routings');
export const AccessTokensModel = db.get('access_tokens');