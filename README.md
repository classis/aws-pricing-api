[![Build Status](https://drone.pelo.tech/api/badges/classis/aws-pricing-api/status.svg)](https://drone.pelo.tech/classis/aws-pricing-api)
# aws-pricing-api


## API

#### GET

 `/api/pricing/ec2s //all`
 
 `/api/pricing/ec2s/{sku} //specific pricing record`
 
 `/api/pricing/ec2s?{key}={value} //query`  
  
 example query: `/api/pricing/ec2s?tenancy=Shared&operatingSystem=Linux&location=US West (Oregon)`

#### POST to update database 

(The file from AWS is ~120mb and may take several minutes to download and parse)

`/api/pricing/ec2s/update`


### Example Pricing Object
``` {
    "_id": "83KC74WNYCKW5CYN",
    "beginRange": "0",
    "clockSpeed": "2.3 GHz",
    "currentGeneration": "Yes",
    "dedicatedEbsThroughput": "1600 Mbps",
    "description": "$0.532 per On Demand Linux r4.2xlarge Instance Hour",
    "ecu": "53",
    "effectiveDate": "2017-07-01T00:00:00Z",
    "endRange": "Inf",
    "enhancedNetworkingSupported": "Yes",
    "instanceFamily": "Memory optimized",
    "instanceType": "r4.2xlarge",
    "licenseModel": "No License required",
    "location": "US West (Oregon)",
    "locationType": "AWS Region",
    "memory": "61 GiB",
    "networkPerformance": "Up to 10 Gigabit",
    "offerTermCode": "JRTCKXETXF",
    "operatingSystem": "Linux",
    "operation": "RunInstances",
    "physicalProcessor": "Intel Xeon E5-2686 v4 (Broadwell)",
    "preInstalledSw": "NA",
    "processorArchitecture": "64-bit",
    "processorFeatures": "Intel AVX, Intel AVX2, Intel Turbo",
    "productFamily": "Compute Instance",
    "rateCode": "83KC74WNYCKW5CYN.JRTCKXETXF.6YS6EN2CT7",
    "servicecode": "AmazonEC2",
    "sku": "83KC74WNYCKW5CYN",
    "storage": "EBS only",
    "tenancy": "Shared",
    "unit": "Hrs",
    "usagetype": "USW2-BoxUsage:r4.2xlarge",
    "USD": "0.5320000000",
    "vcpu": "8"
}
