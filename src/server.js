import request from 'request';
var fs = require('fs');
import bodyParser from 'body-parser';
import express from 'express';
import mongodb from 'mongodb';
import config from 'config';
import {fromJS} from 'immutable';

const app = express();
const router = express.Router();
const MongoClient = mongodb.MongoClient;
const dbHost = config.get('database.host');
const dbPort = config.get('database.port');
const dbName = config.get('database.db');
const appPort = config.get('service.port');

app.use(bodyParser.json());
app.use('/api', router);

const PRICING_NAME = 'pricing';
const REGION_NAME = 'regions';

let db;
let Pricing;
let Regions;



MongoClient.connect(`mongodb://${dbHost}:${dbPort}/${dbName}`, {reconnectTries: 300}, (error, database) => {
  if (error) {
    return console.log(error);
  }
  db = database;
  db.collection(PRICING_NAME, {strict: true}, (err, collection) => {
    if (err && err.message.startsWith('Collection pricing does not exist')) {
      console.log('Creating collection', PRICING_NAME);
      db.createCollection(PRICING_NAME).then(c => Pricing = c).catch(e => console.log(e));
    } else {
      Pricing = collection;
    }
  });


  db.collection(REGION_NAME, {strict: true}, (err, collection) => {
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
  app.listen(appPort, () => {
    console.log(`listening on ${appPort}`);
    // update();
  });
});


// downloads AWS pricing json
// TODO: Convert data type from one collection to another.
// TODO: Store valid-until date. Only update on expiry.
const getEc2Json = cb => {
  console.log('Requesting AWS data');
   request('https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AmazonEC2/current/index.json', (err, response, body) => {
     if(err){
       cb(err, null);
     }
     cb(null, JSON.parse(body));
   })
};

// converts AWS on demand pricing JSON to useable objects
const convertOnDemandPricing = obj => {
  console.log('Converting');
  const iObj = fromJS(obj);
  const onDemand = iObj.getIn(['terms', 'OnDemand']);
  const flat = iObj.get('products').toList()
    .filter(product => onDemand.get(product.get("sku")) !== undefined)
    .map(product => {
      const flatItem = product.set("pricing", onDemand.get(product.get("sku")).flatten())
        .set("_id", product.get("sku"))
        .set('type', product.getIn(['attributes','instanceType']," . ").split(".")[0])
        .set('size', product.getIn(['attributes','instanceType']," . ").split(".")[1])
        .set('region', regionMap.getIn([product.getIn(['attributes', 'location'], ""), "region"], ""))
        .flatten();
      return flatItem;
    });
  console.log('Conversion complete');
  return flat.toJS();
};

router.post('/pricing/ec2s/update', (req, res) => {


  // var obj = JSON.parse(fs.readFileSync('src/index.json', 'utf8'));
  // const converted = convertOnDemandPricing(obj);
  // console.log(converted);
  // res.sendStatus(200);

  getEc2Json((err, file) => {
    if (err){
      console.log(err);
      res.sendStatus(500)
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
  const _id = {_id: req.params.id};
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
    {$match: q},
    {
      $group: {
        _id: {'type': '$type'},
        sizes: {$addToSet: '$size'}
      }
    },
    {$project: {_id: 0, type: '$_id.type', sizes: '$sizes'}},
    {$sort: {type: 1}}
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
  Regions.find({}, {_id: 0}).toArray((err, regions) => {
    if (err) {
      res.sendStatus(500);
      return console.log('error getting regions', err);
    }
    res.json(regions);
  });
});

// hard coded from http://docs.aws.amazon.com/general/latest/gr/rande.html#ec2_region
const regionMap = fromJS({
  "US West (N. California)":{ "region": 'us-west-1'},
  "US West (Oregon)":{"region": 'us-west-2'},
  "US East (N. Virginia)":{"region": 'us-east-1'},
  "US East (Ohio)":{"region": 'us-east-2'},
  "Asia Pacific (Mumbai)":{"region": 'ap-south-1'},
  "Canada (Central)":{"region": 'ca-central-1'},
  "Asia Pacific (Tokyo)": { "region": "ap-northeast-1" },
  "Asia Pacific (Seoul)":{"region": 'ap-northeast-2'},
  "Asia Pacific (Singapore)": { "region": "ap-southeast-1" },
  "Asia Pacific (Sydney)":{"region": 'ap-southeast-2'},
  "EU (Ireland)":{"region": 'eu-west-1'},
  "EU (London)":{"region": 'eu-west-2'},
  "EU (Frankfurt)":{"region": 'eu-central-1'},
  "South America (Sao Paulo)":{"region": 'sa-east-1'},
});

