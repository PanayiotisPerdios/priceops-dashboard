export const providers = [
  "AWS",
  "Google Cloud",
  "Azure"
]

export const instanceTypesByProvider = {
  AWS: ["t3.micro", "m5.large", "c5.xlarge"],
  Azure: ["B1s", "D2s_v3", "F4s_v2"],
  'Google Cloud': ["e2-micro", "n2-standard-2", "c2-standard-4"],
};

export const domains = ["IaaS", "PaaS", "SaaS", "FaaS"];

export const services = [
  "Compute",
  "Storage",
  "Database",
  "Networking",
  "Kubernetes",
  "Serverless"
]

export const domainServiceMap = {
  IaaS: ["Compute", "Storage", "Networking"],
  PaaS: ["Database", "Kubernetes"],
  SaaS: [],
  FaaS: ["Serverless"],
};

export const regions = [
  "us-east-1",
  "us-west-2",
  "eu-west-1",
  "eu-central-1",
  "asia-east1"
]

export const metrics = [
  "Cost",
  "Usage",
  "Performance",
  "Efficiency",
  "Reliability",
  "Amortized Cost",
  "Blended Cost",
  "Forecasted Cost"
]

export const pricingModels = ["OnDemand", "Reserved", "Spot"];
export const operatingSystems = ["Linux", "Windows"];
export const tenancyOptions = ["Shared", "Dedicated", "Host"];

export const defaultUsageHoursPerMonth = 730;