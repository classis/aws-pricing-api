import request from 'request';
var fs = require('fs');
import bodyParser from 'body-parser';
import express from 'express';
import mongodb from 'mongodb';
import config from 'config';
import {fromJS, List} from 'immutable';


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

let db;
let Pricing;



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
const convertOnDemandPricing = (iProducts, iOnDemand) => {
  console.log('Converting');
  const flat = iProducts
    .toList()
    .filter(product => iOnDemand.get(product.get("sku")) !== undefined)
    .map(product => {
      return product.set("pricing", iOnDemand.get(product.get("sku")).flatten())
        .set("_id", product.get("sku"))
        .set('type', product.getIn(['attributes','instanceType']," . ").split(".")[0])
        .set('size', product.getIn(['attributes','instanceType']," . ").split(".")[1])
        .set('region', regionMap.getIn([product.getIn(['attributes', 'location'], ""), "region"], ""))
        .flatten();
    });
  console.log('Conversion complete');
  return flat.toJS();
};

router.post('/pricing/ec2s/update', (req, res) => {


  // var obj = JSON.parse(fs.readFileSync('src/index.json', 'utf8'));
  // const iProducts = fromJS(obj.products);
  // const iOnDemand = fromJS(obj.terms.OnDemand);
  // const converted = convertOnDemandPricing(iProducts,iOnDemand);
  // Pricing.drop()
  //   .then(() => Pricing.insert(converted)
  //     .then((response) => {
  //       console.log('Database updated');
  //       res.sendStatus(200);
  //     }))
  //   .catch((error) => {
  //     res.sendStatus(500);
  //     if (error) {
  //       return console.log(error);
  //     }
  //   });

  getEc2Json((err, file) => {
    if (err){
      console.log(err);
      res.sendStatus(500)
    }
    //try to split to save memory
    const iProducts = fromJS(file.products);
    const iOnDemand = fromJS(file.terms.OnDemand);
    const conversion = convertOnDemandPricing(iProducts, iOnDemand);
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

router.get('/healthcheck', (req, res) => {
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
  const regions = List(regionMap)
    .map(region => {
      const newRegion = region[1]
        .set("name", region[0])
        .set("endpoint", "ec2." + region[1].get("region") + ".amazonaws.com");
      return newRegion
  });
  res.json(regions.toJS());
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

