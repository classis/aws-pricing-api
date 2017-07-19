import https from 'https';
import express from 'express';
import mongodb from 'mongodb';
import { fromJS, List } from 'immutable'; 
  
const getEc2Json = (cb) => {
  const options = {
    host: 'pricing.us-east-1.amazonaws.com',
    path: '/offers/v1.0/aws/AmazonEC2/current/index.json',
    headers: {'User-Agent': 'request'},
  };
  https.get(options, (res) => {
    console.log('Requesting AWS data');
    let json = '';
    res.on('data', (chunk) => json += chunk);
    res.on('end', () => {
      if (res.statusCode === 200) {
        console.log('Download complete, parsing...')
        const data = JSON.parse(json);
        if (data) return cb(data);
        throw Error;
      } 
      else console.log('Status:', res.statusCode);
    });
  })
  .on('error', (err) => {
    console.log('Error:', err)
    return cb(error);
  });
};

const convertOnDemandPricing = (obj) => {
  console.log('Converting');
  const iObj = fromJS(obj);
  const no = iObj.get('products').filter(v => v.getIn(['attributes', 'operatingSystem']) === 'Linux'
  && v.getIn(['attributes', 'location']) === 'US West (Oregon)'
  && v.getIn(['attributes', 'tenancy']) === 'Shared');
  const onDemand = iObj.getIn(['terms', 'OnDemand']);
  const more = List(no).map(value => value[1].set('pricing', onDemand.get(value[0])));
  console.log('Conversion complete');
  return more.toJS();
};

const MongoClient = mongodb.MongoClient;
MongoClient.connect('mongodb://localhost/data', (error, database) => {
  if (error) return console.log(error)
  const db = database;
  getEc2Json((cb) => {
    const file = cb;
    const conversion = convertOnDemandPricing(file);
    db.collection('pricing').save(conversion, (error, res) => {
      if (error) return console.log(error);
      console.log(res);
    });
  });
  // app.listen(3000, () => {
  //   console.log('listening on 3000')
  // });
});
  
  

