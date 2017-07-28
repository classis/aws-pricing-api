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

MongoClient.connect('mongodb://database/data', (error, database) => {
  if (error) return console.log(error);
  const db = database;
  const Pricing = db.collection('pricing');

  // downloads AWS pricing json
  // TODO: Convert data type from one collection to another.
  // TODO: Store valid-until date. Only update on expiry.
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
          console.log('File not parsed, Invalid JSON');
          return cb(false);
        } else {
          console.log('Status:', res.statusCode);
          return cb(false);
        }
      });
    });
  };

  // converts AWS on demand pricing JSON to useable objects
  const convertOnDemandPricing = obj => {
    console.log('Converting');
    const iObj = fromJS(obj);
    const no = iObj.get('products');
    const onDemand = iObj.getIn(['terms', 'OnDemand']);
    const more = List(no).map(value =>
      value[1].set('pricing', onDemand.get(value[0]).flatten())
    );
    const setIds = more.map(value => value.set('_id', value.get('sku'))); // sets id as sku
    const flat = setIds.map(value => value.flatten()); // flattens objects
    console.log('Conversion complete');
    return flat.toJS();
  };

  const update = () => {
    getEc2Json(file => {
      if (!file) return;
      const conversion = convertOnDemandPricing(file);
      Pricing.drop()
      .then(() => Pricing.insert(conversion)
      .then((response) => {
        console.log('Database updated');
      }))
      .catch((error) => {
        if (error) return console.log(error);
      });
    });
  };

  router.post('/pricing/ec2s/update', (req, res) => {
    getEc2Json(file => {
      if (!file) return res.sendStatus(500);
      const conversion = convertOnDemandPricing(file);
      Pricing.drop()
      .then(() => Pricing.insert(conversion)
      .then((response) => {
        console.log('Database updated');
        res.sendStatus(200);
      }))
      .catch((error) => {
        res.sendStatus(500);
        if (error) return console.log(error);
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
    const q = req.query || {};
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
    // update();
  });
});
