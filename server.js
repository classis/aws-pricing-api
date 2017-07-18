import https from 'https';
import express from 'express';
import { fromJS, List } from 'immutable'; 
  
const getEc2Json = (cb) => {
  const options = {
    host: 'pricing.us-east-1.amazonaws.com',
    path: '/offers/v1.0/aws/AmazonEC2/current/index.json',
    headers: {'User-Agent': 'request'},
  };
  let dataSheet;
  https.get(options, (res) => {
    console.log('requsting');
    let json = '';
    res.on('data', (chunk) => json += chunk);
    res.on('end', () => {
      if (res.statusCode === 200) {
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
  const iObj = fromJS(obj);
  const no = iObj.get('products').filter(v => v.getIn(['attributes', 'operatingSystem']) === 'Linux'
  && v.getIn(['attributes', 'location']) === 'US West (Oregon)'
  && v.getIn(['attributes', 'tenancy']) === 'Shared');
  const onDemand = iObj.getIn(['terms', 'OnDemand']);
  const more = List(no).map(value => value[1].set('pricing', onDemand.get(value[0])));
  return more.toJS();
};

getEc2Json((cb) => {
  const file = cb;
  const conversion = convertOnDemandPricing(file);
  console.log(conversion);
})

// export default (PORT) => {
//   const app = express();
//  
//   
//   app.listen(PORT || 3000);
// };
