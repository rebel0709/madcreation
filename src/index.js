require("babel-core/register");
require("babel-polyfill");
import express from 'express';
import graphqlHTTP from 'express-graphql';
import cors from 'cors';
import path from 'path'
import {
  graphql
} from 'graphql';
import { graphqlConnect } from 'graphql-server-express';
import schema from './schema/schema';
import bodyParser from 'body-parser';
import {
  AccessTokensModel,
} from './schema/model';

let PORT
switch (process.env.NODE_ENV) {
  case 'production_us':
  case 'production_eu':
  case 'staging':
    PORT = 80;
    break;
  default:
    PORT = 4000;
    break;
}
var app = express();



app.use(cors());
app.use(bodyParser.json());
app.use('/graphql', graphqlConnect(async (req) => {
  let code = ""
  if (req.headers.authorization) {
    code = req.headers.authorization.split(' ')[1]
  }
  let user = await AccessTokensModel.findOne({
    code
  })

  return {
    schema,
    context: { user }
  }
}))
// app.use('/graphql', graphqlHTTP(async (req) => {
//   let code = ""
//   if (req.headers.authorization) {
//     code = req.headers.authorization.split(' ')[1]
//   }
//   let user = await AccessTokensModel.findOne({
//     code
//   })

//   return {
//     context: {
//       user
//     },
//     schema,
//     graphiql: true,
//   }
// }));

app.use(express.static(path.resolve(__dirname, '..', 'public')));
// app.post('/hooks', (req, res) => {
//   console.log(JSON.stringify(req.body, null, 2))
//   res.send('')
// })
app.use('*', (req, res) => {
  res.sendFile(path.resolve(__dirname, '..', 'public', 'index.html'));
});

app.listen(PORT, function () {
  console.log('server listen on port' + PORT)
});


// require('./google-spreadsheet');