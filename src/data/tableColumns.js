export const tableColumnMap = {
Compute: {
  "Cost": {
    fields: [
      { name: "Avg Monthly Cost", direction: "lower", range: [0, 5000] },
      { name: "Cost per Hour", direction: "lower", range: [0, 100] },
      { name: "Runtime Cost", direction: "lower", range: [0, 10000] },
      { name: "Peak Usage Cost", direction: "lower", range: [0, 15000] },
      { name: "Idle Resource Cost", direction: "lower", range: [0, 3000] }
    ]
  },

  "Usage": {
    fields: [
      { name: "CPU Usage", direction: "higher", range: [0, 100] },
      { name: "Memory Usage", direction: "higher", range: [0, 100] },
      { name: "Runtime Hours", direction: "higher", range: [0, 10000] },
      { name: "Active Instances", direction: "higher", range: [0, 1000] },
      { name: "Peak Utilization", direction: "higher", range: [0, 100] }
    ]
  },

  "Performance": {
    fields: [
      { name: "Response Time", direction: "lower", range: [0, 500] },
      { name: "VM Startup Time", direction: "lower", range: [0, 300] },
      { name: "Processing Throughput", direction: "higher", range: [0, 20000] },
      { name: "Network I/O", direction: "higher", range: [0, 10000] },
      { name: "Compute Latency", direction: "lower", range: [0, 300] }
    ]
  },

  "Efficiency": {
    fields: [
      { name: "Cost per CPU Cycle", direction: "lower", range: [0, 10] },
      { name: "Cost per Workload", direction: "lower", range: [0, 100] },
      { name: "CPU Efficiency", direction: "higher", range: [0, 100] },
      { name: "Memory Efficiency", direction: "higher", range: [0, 100] },
      { name: "Utilization Efficiency", direction: "higher", range: [0, 100] }
    ]
  },

  "Reliability": {
    fields: [
      { name: "Uptime", direction: "higher", range: [99, 100] },
      { name: "Failure Rate", direction: "lower", range: [0, 100] },
      { name: "Restart Frequency", direction: "lower", range: [0, 100] },
      { name: "Availability", direction: "higher", range: [99, 100] },
      { name: "SLA Compliance", direction: "higher", range: [90, 100] }
    ]
  },

  "Forecasted Cost": {
    fields: [
      { name: "Predicted Monthly Cost", direction: "lower", range: [0, 6000] },
      { name: "Growth Trend", direction: "lower", range: [0, 100] },
      { name: "Peak Forecast", direction: "lower", range: [0, 15000] },
      { name: "Estimated Scaling Cost", direction: "lower", range: [0, 20000] },
      { name: "Future Utilization", direction: "lower", range: [0, 100] }
    ]
  },

  "Blended Cost": {
    fields: [
      { name: "Shared Resource Cost", direction: "lower", range: [0, 10000] },
      { name: "Blended Compute Rate", direction: "lower", range: [0, 200] },
      { name: "Team Allocation", direction: "lower", range: [0, 100] },
      { name: "Enterprise Usage Share", direction: "lower", range: [0, 100] },
      { name: "Cost Distribution", direction: "lower", range: [0, 100] }
    ]
  },

  "Amortized Cost": {
    fields: [
      { name: "Reserved Savings", direction: "higher", range: [0, 100] },
      { name: "Upfront Allocation", direction: "lower", range: [0, 10000] },
      { name: "Effective Hourly Cost", direction: "lower", range: [0, 100] },
      { name: "Long-term Savings", direction: "higher", range: [0, 100] },
      { name: "Reservation Efficiency", direction: "higher", range: [0, 100] }
    ]
  }
},
Storage: {
  "Cost": {
    fields: [
      { name: "Cost per GB", direction: "lower", range: [0, 1] },
      { name: "Total Storage Cost", direction: "lower", range: [0, 50000] },
      { name: "Retrieval Cost", direction: "lower", range: [0, 5000] },
      { name: "Archive Cost", direction: "lower", range: [0, 20000] },
      { name: "Transfer Cost", direction: "lower", range: [0, 10000] }
    ]
  },

  "Usage": {
    fields: [
      { name: "Storage Used", direction: "higher", range: [0, 100000] },
      { name: "Object Count", direction: "higher", range: [0, 1000000000] },
      { name: "Egress Traffic", direction: "higher", range: [0, 50000] },
      { name: "Read Requests", direction: "higher", range: [0, 100000000] },
      { name: "Write Requests", direction: "higher", range: [0, 50000000] }
    ]
  },

  "Performance": {
    fields: [
      { name: "Read Latency", direction: "lower", range: [0, 500] },
      { name: "Write Latency", direction: "lower", range: [0, 500] },
      { name: "Retrieval Speed", direction: "higher", range: [0, 10000] },
      { name: "Throughput", direction: "higher", range: [0, 40000] },
      { name: "Cache Hit Rate", direction: "higher", range: [0, 100] }
    ]
  },

  "Efficiency": {
    fields: [
      { name: "Cost per TB", direction: "lower", range: [0, 1000] },
      { name: "Compression Efficiency", direction: "higher", range: [0, 100] },
      { name: "Retrieval Efficiency", direction: "higher", range: [0, 100] },
      { name: "Storage Optimization", direction: "higher", range: [0, 100] },
      { name: "Transfer Efficiency", direction: "higher", range: [0, 100] }
    ]
  },

  "Reliability": {
    fields: [
      { name: "Data Durability", direction: "higher", range: [99, 100] },
      { name: "Replication Success", direction: "higher", range: [0, 100] },
      { name: "Backup Availability", direction: "higher", range: [99, 100] },
      { name: "Restore Success Rate", direction: "higher", range: [0, 100] },
      { name: "Availability", direction: "higher", range: [99, 100] }
    ]
  },

  "Forecasted Cost": {
    fields: [
      { name: "Predicted Storage Growth", direction: "lower", range: [0, 100] },
      { name: "Estimated Monthly Cost", direction: "lower", range: [0, 60000] },
      { name: "Archive Forecast", direction: "lower", range: [0, 30000] },
      { name: "Transfer Forecast", direction: "lower", range: [0, 20000] },
      { name: "Future Capacity", direction: "lower", range: [0, 200000] }
    ]
  },

  "Blended Cost": {
    fields: [
      { name: "Shared Storage Cost", direction: "lower", range: [0, 50000] },
      { name: "Blended Storage Rate", direction: "lower", range: [0, 5] },
      { name: "Department Allocation", direction: "lower", range: [0, 100] },
      { name: "Enterprise Share", direction: "lower", range: [0, 100] },
      { name: "Distributed Usage", direction: "lower", range: [0, 100] }
    ]
  },

  "Amortized Cost": {
    fields: [
      { name: "Reserved Capacity Savings", direction: "higher", range: [0, 100] },
      { name: "Upfront Storage Cost", direction: "lower", range: [0, 50000] },
      { name: "Effective Storage Rate", direction: "lower", range: [0, 5] },
      { name: "Long-term Savings", direction: "higher", range: [0, 100] },
      { name: "Reservation Efficiency", direction: "higher", range: [0, 100] }
    ]
  }
},

Database: {
  "Cost": {
    fields: [
      { name: "DB Instance Cost", direction: "lower", range: [0, 20000] },
      { name: "Query Cost", direction: "lower", range: [0, 1000] },
      { name: "Storage Cost", direction: "lower", range: [0, 10000] },
      { name: "Replication Cost", direction: "lower", range: [0, 5000] },
      { name: "Backup Cost", direction: "lower", range: [0, 5000] }
    ]
  },

  "Usage": {
    fields: [
      { name: "Active Connections", direction: "higher", range: [0, 100000] },
      { name: "Query Volume", direction: "higher", range: [0, 100000000] },
      { name: "Storage Used", direction: "higher", range: [0, 50000] },
      { name: "Transactions/sec", direction: "higher", range: [0, 100000] },
      { name: "Read/Write Ratio", direction: "higher", range: [0, 100] }
    ]
  },

  "Performance": {
    fields: [
      { name: "Query Latency", direction: "lower", range: [0, 1000] },
      { name: "Throughput", direction: "higher", range: [0, 100000] },
      { name: "Cache Efficiency", direction: "higher", range: [0, 100] },
      { name: "Replication Delay", direction: "lower", range: [0, 300] },
      { name: "Transaction Speed", direction: "higher", range: [0, 100000] }
    ]
  },

  "Efficiency": {
    fields: [
      { name: "Cost per Query", direction: "lower", range: [0, 1] },
      { name: "CPU Efficiency", direction: "higher", range: [0, 100] },
      { name: "Connection Efficiency", direction: "higher", range: [0, 100] },
      { name: "Storage Efficiency", direction: "higher", range: [0, 100] },
      { name: "Cache Optimization", direction: "higher", range: [0, 100] }
    ]
  },

  "Reliability": {
    fields: [
      { name: "Failover Time", direction: "lower", range: [0, 300] },
      { name: "Replication Stability", direction: "higher", range: [0, 100] },
      { name: "Availability", direction: "higher", range: [99, 100] },
      { name: "Crash Recovery", direction: "higher", range: [0, 100] },
      { name: "Backup Reliability", direction: "higher", range: [0, 100] }
    ]
  },

  "Forecasted Cost": {
    fields: [
      { name: "Predicted DB Cost", direction: "lower", range: [0, 30000] },
      { name: "Growth Forecast", direction: "lower", range: [0, 100] },
      { name: "Storage Forecast", direction: "lower", range: [0, 100000] },
      { name: "Scaling Forecast", direction: "lower", range: [0, 50000] },
      { name: "Future Workload", direction: "lower", range: [0, 100] }
    ]
  },

  "Blended Cost": {
    fields: [
      { name: "Shared DB Cost", direction: "lower", range: [0, 50000] },
      { name: "Blended Query Rate", direction: "lower", range: [0, 10] },
      { name: "Department Allocation", direction: "lower", range: [0, 100] },
      { name: "Enterprise Usage Share", direction: "lower", range: [0, 100] },
      { name: "Distributed DB Usage", direction: "lower", range: [0, 100] }
    ]
  },

  "Amortized Cost": {
    fields: [
      { name: "Reserved DB Savings", direction: "higher", range: [0, 100] },
      { name: "Upfront DB Cost", direction: "lower", range: [0, 50000] },
      { name: "Effective DB Rate", direction: "lower", range: [0, 10] },
      { name: "Long-term Savings", direction: "higher", range: [0, 100] },
      { name: "Reservation Efficiency", direction: "higher", range: [0, 100] }
    ]
  }
},

Networking: {
  "Cost": {
    fields: [
      { name: "Egress Cost", direction: "lower", range: [0, 20000] },
      { name: "Load Balancer Cost", direction: "lower", range: [0, 5000] },
      { name: "CDN Cost", direction: "lower", range: [0, 10000] },
      { name: "Transfer Cost", direction: "lower", range: [0, 30000] },
      { name: "VPN Cost", direction: "lower", range: [0, 2000] }
    ]
  },

  "Usage": {
    fields: [
      { name: "Inbound Traffic", direction: "higher", range: [0, 100000] },
      { name: "Outbound Traffic", direction: "higher", range: [0, 100000] },
      { name: "Requests/sec", direction: "higher", range: [0, 1000000] },
      { name: "Packet Volume", direction: "higher", range: [0, 1000000000] },
      { name: "Active Connections", direction: "higher", range: [0, 1000000] }
    ]
  },

  "Performance": {
    fields: [
      { name: "Latency", direction: "lower", range: [0, 500] },
      { name: "Throughput", direction: "higher", range: [0, 100000] },
      { name: "Packet Loss", direction: "lower", range: [0, 100] },
      { name: "Response Time", direction: "lower", range: [0, 1000] },
      { name: "Network Stability", direction: "higher", range: [0, 100] }
    ]
  },

  "Efficiency": {
    fields: [
      { name: "Cost per GB", direction: "lower", range: [0, 5] },
      { name: "Routing Efficiency", direction: "higher", range: [0, 100] },
      { name: "Transfer Efficiency", direction: "higher", range: [0, 100] },
      { name: "Bandwidth Efficiency", direction: "higher", range: [0, 100] },
      { name: "CDN Efficiency", direction: "higher", range: [0, 100] }
    ]
  },

  "Reliability": {
    fields: [
      { name: "Availability", direction: "higher", range: [99, 100] },
      { name: "Packet Failure Rate", direction: "lower", range: [0, 100] },
      { name: "Downtime", direction: "lower", range: [0, 1000] },
      { name: "Routing Stability", direction: "higher", range: [0, 100] },
      { name: "SLA Compliance", direction: "higher", range: [90, 100] }
    ]
  },

  "Forecasted Cost": {
    fields: [
      { name: "Predicted Network Cost", direction: "lower", range: [0, 50000] },
      { name: "Bandwidth Forecast", direction: "lower", range: [0, 100000] },
      { name: "Traffic Growth", direction: "lower", range: [0, 100] },
      { name: "CDN Forecast", direction: "lower", range: [0, 20000] },
      { name: "Scaling Projection", direction: "lower", range: [0, 100] }
    ]
  },

  "Blended Cost": {
    fields: [
      { name: "Shared Traffic Cost", direction: "lower", range: [0, 50000] },
      { name: "Blended Network Rate", direction: "lower", range: [0, 10] },
      { name: "Department Allocation", direction: "lower", range: [0, 100] },
      { name: "Enterprise Traffic Share", direction: "lower", range: [0, 100] },
      { name: "Distributed Transfer Cost", direction: "lower", range: [0, 100] }
    ]
  },

  "Amortized Cost": {
    fields: [
      { name: "Reserved Bandwidth Savings", direction: "higher", range: [0, 100] },
      { name: "Upfront Network Cost", direction: "lower", range: [0, 50000] },
      { name: "Effective Transfer Rate", direction: "lower", range: [0, 10] },
      { name: "Long-term Savings", direction: "higher", range: [0, 100] },
      { name: "Reservation Efficiency", direction: "higher", range: [0, 100] }
    ]
  }
},
Kubernetes: {
  "Cost": {
    fields: [
      { name: "Cluster Cost", direction: "lower", range: [0, 50000] },
      { name: "Node Cost", direction: "lower", range: [0, 10000] },
      { name: "Pod Cost", direction: "lower", range: [0, 5000] },
      { name: "Autoscaling Cost", direction: "lower", range: [0, 10000] },
      { name: "Idle Node Cost", direction: "lower", range: [0, 5000] }
    ]
  },

  "Usage": {
    fields: [
      { name: "Node Utilization", direction: "higher", range: [0, 100] },
      { name: "Pod Count", direction: "higher", range: [0, 100000] },
      { name: "CPU Usage", direction: "higher", range: [0, 100] },
      { name: "Memory Usage", direction: "higher", range: [0, 100] },
      { name: "Container Density", direction: "higher", range: [0, 500] }
    ]
  },

  "Performance": {
    fields: [
      { name: "Scheduling Speed", direction: "higher", range: [0, 10000] },
      { name: "Deployment Time", direction: "lower", range: [0, 1800] },
      { name: "Pod Startup Time", direction: "lower", range: [0, 300] },
      { name: "Cluster Throughput", direction: "higher", range: [0, 100000] },
      { name: "Network Latency", direction: "lower", range: [0, 500] }
    ]
  },

  "Efficiency": {
    fields: [
      { name: "Resource Packing", direction: "higher", range: [0, 100] },
      { name: "Autoscaling Efficiency", direction: "higher", range: [0, 100] },
      { name: "Pod Efficiency", direction: "higher", range: [0, 100] },
      { name: "Cost per Deployment", direction: "lower", range: [0, 1000] },
      { name: "Cluster Efficiency", direction: "higher", range: [0, 100] }
    ]
  },

  "Reliability": {
    fields: [
      { name: "Pod Restart Rate", direction: "lower", range: [0, 1000] },
      { name: "Cluster Stability", direction: "higher", range: [0, 100] },
      { name: "Availability", direction: "higher", range: [99, 100] },
      { name: "Deployment Success", direction: "higher", range: [0, 100] },
      { name: "Recovery Time", direction: "lower", range: [0, 3600] }
    ]
  },

  "Forecasted Cost": {
    fields: [
      { name: "Predicted Cluster Cost", direction: "lower", range: [0, 100000] },
      { name: "Scaling Forecast", direction: "lower", range: [0, 100] },
      { name: "Node Growth", direction: "lower", range: [0, 1000] },
      { name: "Pod Expansion", direction: "lower", range: [0, 100000] },
      { name: "Future Capacity", direction: "lower", range: [0, 100000] }
    ]
  },

  "Blended Cost": {
    fields: [
      { name: "Shared Cluster Cost", direction: "lower", range: [0, 100000] },
      { name: "Blended Node Rate", direction: "lower", range: [0, 500] },
      { name: "Team Allocation", direction: "lower", range: [0, 100] },
      { name: "Enterprise Cluster Share", direction: "lower", range: [0, 100] },
      { name: "Distributed Resource Usage", direction: "lower", range: [0, 100] }
    ]
  },

  "Amortized Cost": {
    fields: [
      { name: "Reserved Node Savings", direction: "higher", range: [0, 100] },
      { name: "Upfront Cluster Cost", direction: "lower", range: [0, 100000] },
      { name: "Effective Cluster Rate", direction: "lower", range: [0, 500] },
      { name: "Long-term Savings", direction: "higher", range: [0, 100] },
      { name: "Reservation Efficiency", direction: "higher", range: [0, 100] }
    ]
  }
},

Serverless: {
  "Cost": {
    fields: [
      { name: "Execution Cost", direction: "lower", range: [0, 10000] },
      { name: "Invocation Cost", direction: "lower", range: [0, 5000] },
      { name: "Idle Cost", direction: "lower", range: [0, 1000] },
      { name: "API Gateway Cost", direction: "lower", range: [0, 5000] },
      { name: "Scaling Cost", direction: "lower", range: [0, 10000] }
    ]
  },

  "Usage": {
    fields: [
      { name: "Invocation Count", direction: "higher", range: [0, 1000000000] },
      { name: "Avg Duration", direction: "higher", range: [0, 900000] },
      { name: "Memory Usage", direction: "higher", range: [0, 100] },
      { name: "Concurrent Executions", direction: "higher", range: [0, 100000] },
      { name: "Trigger Frequency", direction: "higher", range: [0, 1000000] }
    ]
  },

  "Performance": {
    fields: [
      { name: "Cold Start Time", direction: "lower", range: [0, 10000] },
      { name: "Execution Latency", direction: "lower", range: [0, 5000] },
      { name: "Response Time", direction: "lower", range: [0, 5000] },
      { name: "Throughput", direction: "higher", range: [0, 1000000] },
      { name: "Invocation Speed", direction: "higher", range: [0, 100000] }
    ]
  },

  "Efficiency": {
    fields: [
      { name: "Cost per Invocation", direction: "lower", range: [0, 1] },
      { name: "Memory Efficiency", direction: "higher", range: [0, 100] },
      { name: "Execution Efficiency", direction: "higher", range: [0, 100] },
      { name: "Scaling Efficiency", direction: "higher", range: [0, 100] },
      { name: "Resource Efficiency", direction: "higher", range: [0, 100] }
    ]
  },

  "Reliability": {
    fields: [
      { name: "Error Rate", direction: "lower", range: [0, 100] },
      { name: "Timeout Rate", direction: "lower", range: [0, 100] },
      { name: "Retry Success", direction: "higher", range: [0, 100] },
      { name: "Availability", direction: "higher", range: [99, 100] },
      { name: "Failure Recovery", direction: "higher", range: [0, 100] }
    ]
  },  

  "Forecasted Cost": {
    fields: [
      { name: "Predicted Execution Cost", direction: "lower", range: [0, 50000] },
      { name: "Invocation Forecast", direction: "lower", range: [0, 1000000000] },
      { name: "Scaling Projection", direction: "lower", range: [0, 100] },
      { name: "Future Usage", direction: "lower", range: [0, 1000000] },
      { name: "Growth Trend", direction: "lower", range: [0, 100] }
    ]
  },

  "Blended Cost": {
    fields: [
      { name: "Shared Execution Cost", direction: "lower", range: [0, 50000] },
      { name: "Blended Invocation Rate", direction: "lower", range: [0, 1] },
      { name: "Department Allocation", direction: "lower", range: [0, 100] },
      { name: "Enterprise Function Share", direction: "lower", range: [0, 100] },
      { name: "Distributed Runtime Usage", direction: "lower", range: [0, 100] }
    ]
  },

  "Amortized Cost": {
    fields: [
      { name: "Reserved Compute Savings", direction: "higher", range: [0, 100] },
      { name: "Upfront Allocation", direction: "lower", range: [0, 50000] },
      { name: "Effective Execution Rate", direction: "lower", range: [0, 1] },
      { name: "Long-term Savings", direction: "higher", range: [0, 100] },
      { name: "Reservation Efficiency", direction: "higher", range: [0, 100] }
    ]
  }
}
}