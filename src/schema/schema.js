import {
  makeExecutableSchema,
  addMockFunctionsToSchema
} from 'graphql-tools';
import resolvers from './resolvers';

const typeDefs = `

 #Order Type

type Merchant{
  logoUrl : String
  name : String,
  subscriptionName : String
}

type OrderType{
  id : ID!
  label : String!
}

type OrderTypeFilter{
  id : ID!
  label : String!
  disabled : Boolean
}

type Order {
  #the id of order
  id: ID!
  title: String
  shownedAt : Float
  modifiedTime : Float
  lineitems : [LineItem]
  orderType : OrderType
  note: String
}

type Station{
  id : ID!
  name : String

  orderTypeFilter : [OrderTypeFilter]
}

type Category{
  id : ID!
  name : String
  color : String
  lineitems : [LineItem]
}

type LineItem {
  id: ID!
  name : String
  color :  String
  status : String
  modifications : [Modification]
  isRouting(station_id : ID!) : Boolean
  note : String
}

type Modification{
  id : ID!
  name : String
}

input LineItemInput{
  id : ID!
  name : String
  isRouting : Boolean
}

input CategoryInput{
  id : ID!
  name : String
  lineitems : [LineItemInput]
}

type OrderIdAndLineItemId{
  order_id : ID
  lineitem_id : ID
}

type outputOrderTypeFilter{
  orderType_id : ID
  station_id : ID
  disabled : Boolean
}


# the schema allows the following query:
type Query {
  ordersInProgress(station_id : ID!,payType : [Boolean]!,time : Int!) : [Order]
  ordersCompleted(station_id : ID!,payType : [Boolean]!,time : Int!) : [Order]
  categories : [Category]
  station(station_id : ID!) : Station
  stations : [Station]
  merchant : Merchant
  test : String
}

# this schema allows the following mutation:
type Mutation {
  closeOrder(order_id : ID!,lineitem_ids : [ID]!,station_id : ID!) : Order
  undoOrder(order_id : ID!, lineitem_ids : [ID]!, station_id : ID!) : Order
  updateOrderShownedAt(order_id : ID!,station_id : ID!) : Order
  closeLineItem(order_id:ID!,lineitem_id : ID!,station_id : ID!) : OrderIdAndLineItemId
  undoItem(order_id : ID!,lineitem_id : ID!,station_id : ID!) : OrderIdAndLineItemId
  checkOAuth(employee_id : ID! ,merchant_id : ID! , client_id : ID! , code : String!) : String
  setCategoryColor(category_id : ID!,color : String!) : Category
  createStation(name:String!) : Station
  removeStation(station_id : ID!) : ID
  createPresetStations : [Station]
  setRoutingOnCategory(category : CategoryInput!,station_id:  ID!,checked : Boolean!) : Category
  setRoutingOnLineItem(lineitem_id : ID!,station_id:  ID!,checked : Boolean!) : LineItem
  setOrderTypeFilter(station_id: ID!,disabled : Boolean!,orderType_id : ID!) : outputOrderTypeFilter
}

# we need to tell the server which types represent the root query
# and root mutation types. We call them RootQuery and RootMutation by convention.
schema {
  query: Query
  mutation: Mutation
}`;

export default makeExecutableSchema({
  typeDefs,
  resolvers,
});