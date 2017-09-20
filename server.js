import https from 'https';
import fs from 'fs';
import bodyParser from 'body-parser';
import express from 'express';
import mongodb from 'mongodb';
import config from 'config';
import { fromJS, List } from 'immutable';
import DefaultRegions from './region.js';

const app = express();
const router = express.Router();
const MongoClient = mongodb.MongoClient;
const dbHost = config.get('database.host');
const dbPort = config.get('database.port');
const db = config.get('database.db');
const appPort = config.get('service.port');

app.use(bodyParser.json());
app.use('/api', router);

const PRICING_NAME = 'pricing';
const REGION_NAME = 'regions';
MongoClient.connect(`mongodb://${dbHost}:${dbPort}/${db}`, { reconnectTries: 300 }, (error, database) => {
  if (error) {
    return console.log(error);
  }
  const db = database;

  let Pricing;
  db.collection(PRICING_NAME, { strict: true }, (err, collection) => {
    if (err && err.message.startsWith('Collection pricing does not exist')) {
      console.log('Creating collection', PRICING_NAME);
      db.createCollection(PRICING_NAME).then(c => Pricing = c).catch(e => console.log(e));
    } else {
      Pricing = collection;
    }
  });

  let Regions;
  db.collection(REGION_NAME, { strict: true }, (err, collection) => {
    if (err && err.message.startsWith(`Collection ${REGION_NAME} does not exist`)) {
      console.log('Creating collection', REGION_NAME);
      db.createCollection(REGION_NAME)
        .then((c) => {
          Regions = c;
          Regions.insert(DefaultRegions.getRegions());
        })
        .catch(e => console.log(e));

    } else {
      Regions = collection;
    }

  });
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
          if (data) {
            return cb(data);
          }
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
    const more = List(no)
      .map(value => ({ key: value[1], onDemandKey: value[0] }))
      .filter(item => onDemand.get(item.onDemandKey) !== undefined)
      .map(item => item.key.set('pricing', onDemand.get(item.onDemandKey).flatten()));

    const setIds = more.map(value => value.set('_id', value.get('sku'))); // sets id as sku
    const setSizeTypeRegion = setIds.map((value) => {
      const iVal = fromJS(value);

      // split instance type if we have it
      const instanceType = iVal.getIn(['attributes', 'instanceType']);
      if (instanceType) {
        const arr = instanceType.split('.');
        value = value.set('type', arr[0]);
        value = value.set('size', arr[1]);
      }

      // add region from location
      const location = iVal.getIn(['attributes', 'location']);
      if (location) {
        const region = DefaultRegions.regionFromName(location);
        if (region) {
          value = value.set('region', region);
        }
      }
      return value;
    });
    const flat = setSizeTypeRegion.map(value => value.flatten()); // flattens objects
    console.log('Conversion complete');
    return flat.toJS();
  };

  router.post('/pricing/ec2s/update', (req, res) => {
    getEc2Json(file => {
      if (!file) {
        return res.sendStatus(500);
      }
      const conversion = convertOnDemandPricing(file);
      Pricing.drop()
        .then(() => Pricing.insert(conversion)
          .then((response) => {
            console.log('Database updated');
            res.sendStatus(200);
          }))
        .catch((error) => {
          res.sendStatus(500);
          if (error) {
            return console.log(error);
          }
        });
    });
  });

  router.get('/', (req, res) => {
    res.send('yep yep the service is up');
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

  router.get('/instancetypes', (req, res) => {
    const q = req.query || {};
    Pricing.aggregate([
      { $match: q },
      {
        $group: {
          _id: { 'type': '$type' },
          sizes: { $addToSet: '$size' }
        }
      },
      { $project: { _id: 0, type: '$_id.type', sizes: '$sizes' } },
      { $sort: { type: 1 } }
    ])
      .toArray()
      .then((instanceTypes) => {
        res.json(instanceTypes);
      })
      .catch((err) => {
        console.log(err);
        res.sendStatus(500);
      });
  });

  router.get('/regions', (req, res) => {
    Regions.find({}, { _id: 0 }).toArray((err, regions) => {
      if (err) {
        res.sendStatus(500);
        return console.log('error getting regions', err);
      }
      res.json(regions);
    });
  });

  app.listen(appPort, () => {
    console.log(`listening on ${appPort}`);
    // update();
  });
});
