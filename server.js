import https from 'https';
import fs from 'fs';
import bodyParser from 'body-parser';
import express from 'express';
import mongodb from 'mongodb';
import { fromJS, List } from 'immutable';

const app = express();
const router = express.Router();
const MongoClient = mongodb.MongoClient;

app.use(bodyParser.json());
app.use('/api', router);

MongoClient.connect('mongodb://localhost/data', (error, database) => {
  if (error) return console.log(error);
  const db = database;
  const Pricing = db.collection('pricing');

  // downloads AWS pricing json
  const getEc2Json = cb => {
    const options = {
      host: 'pricing.us-east-1.amazonaws.com',
      path: '/offers/v1.0/aws/AmazonEC2/current/index.json',
      headers: { 'User-Agent': 'request' }
    };
    https.get(options, res => {
      console.log('Requesting AWS data');
      let json = '';
      res.on('data', chunk => (json += chunk));
      res.on('end', () => {
        if (res.statusCode === 200) {
          console.log('Download complete, parsing...');
          const data = JSON.parse(json);
          if (data) return cb(data);
          throw Error;
        } else console.log('Status:', res.statusCode);
      });
    })
    .on('error', err => {
      console.log('Error:', err);
      return cb(error);
    });
  };

  // converts AWS pricing JSON to useable object
  const convertOnDemandPricing = obj => {
    console.log('Converting');
    const iObj = fromJS(obj);
    const no = iObj.get('products')
      .filter(
        v =>
          v.getIn(['attributes', 'operatingSystem']) === 'Linux' &&
          v.getIn(['attributes', 'location']) === 'US West (Oregon)' &&
          v.getIn(['attributes', 'tenancy']) === 'Shared'
      );
    const onDemand = iObj.getIn(['terms', 'OnDemand']);
    const more = List(no).map(value =>
      value[1].set('pricing', onDemand.get(value[0]).flatten())
    );
    const setIds = more.map(value => value.set('_id', value.get('sku')));
    const flat = setIds.map(value => value.flatten());
    console.log('Conversion complete');
    return flat.toJS();
  };

  router.post('/pricing/ec2s/update', (req, res) => {
    Pricing.drop();
    getEc2Json(file => {
      const conversion = convertOnDemandPricing(file);
      Pricing.insert(conversion, (error, response) => {
        if (error) {
          res.sendStatus(500);
          return console.log(error);
        }
        console.log('Database updated');
        res.sendStatus(200);
      });
    });
  });

  router.get('/pricing/ec2s/:id', (req, res) => {
    const _id = { _id: req.params.id };
    Pricing.findOne(_id, (error, doc) => {
      if (error) {
        res.sendStatus(500);
        return console.log(error);
      }
      res.json(doc);
    });
  });

  router.get('/pricing/ec2s', (req, res) => {
    const q = req.query;
    Pricing.find(q).toArray((error, docs) => {
      if (error) {
        res.sendStatus(500);
        return console.log(error);
      }
      res.json(docs);
    });
  });

  app.listen(3000, () => {
    console.log('listening on 3000');
  });
});
