// hard coded from http://docs.aws.amazon.com/general/latest/gr/rande.html#ec2_region
const region = [
  { name: 'US West (N. California)', region: 'us-west-1', endpoint: 'ec2.us-west-1.amazonaws.com', },
  { name: 'US West (Oregon)', region: 'us-west-2' , endpoint: 'ec2.us-west-2.amazonaws.com', },
  { name: 'US East (N. Virginia)', region: 'us-east-1', endpoint: 'ec2.us-east-1.amazonaws.com',},
  { name: 'US East (Ohio)', region: 'us-east-2', endpoint: 'ec2.us-east-2.amazonaws.com',},
  { name: 'Asia Pacific (Mumbai)', region: 'ap-south-1' , endpoint: 'ec2.ap-south-1.amazonaws.com', },
  { name: 'Canada (Central)', region: 'ca-central-1' , endpoint: 'ec2.ca-central-1.amazonaws.com', },
  { name: 'Asia Pacific (Tokyo)', region: 'ap-northeast-1', endpoint: 'ec2.ap-northeast-1.amazonaws.com', },
  { name: 'Asia Pacific (Seoul)', region: 'ap-northeast-2', endpoint: 'ec2.ap-northeast-2.amazonaws.com', },
  { name: 'Asia Pacific (Singapore)', region: 'ap-southeast-1', endpoint: 'ec2.ap-southeast-1.amazonaws.com', },
  { name: 'Asia Pacific (Sydney)', region: 'ap-southeast-2', endpoint: 'ec2.ap-southeast-2.amazonaws.com', },
  { name: 'EU (Ireland)', region: 'eu-west-1', endpoint: 'ec2.eu-west-1.amazonaws.com', },
  { name: 'EU (London)', region: 'eu-west-2', endpoint: 'ec2.eu-west-2.amazonaws.com', },
  { name: 'EU (Frankfurt)', region: 'eu-central-1', endpoint: 'ec2.eu-central-1.amazonaws.com', },
  { name: 'South America (Sao Paulo)', region: 'sa-east-1', endpoint: 'ec2.sa-east-1.amazonaws.com', },
];

const Region = {
  getRegions: () => region,
  regionFromName: (name) => {
    if (name) {
      const match = region.filter(r => r.name === name);
      return match.length > 0 ? match[0].region : null;
    }
  },
  nameFromRegion: (reg) => {
    if (reg) {
      const match = region.filter(r => r.region === reg);
      return match.length > 0 ? match[0].name : null;
    }
  }

};

export { Region as default };
