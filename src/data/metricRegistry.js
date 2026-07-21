const COMMON = {
  uptime:        { name: "Uptime",              direction: "higher", range: [99, 100], category: "Reliability" },
  availability:  { name: "Availability",        direction: "higher", range: [99, 100], category: "Reliability" },
  failure_rate:  { name: "Failure Rate",        direction: "lower",  range: [0, 5],    category: "Reliability" },

  long_term_savings:      { name: "Long-term Savings",      direction: "higher", range: [0, 100], category: "Amortized Cost" },
  reservation_efficiency: { name: "Reservation Efficiency", direction: "higher", range: [0, 100], category: "Amortized Cost" },
  upfront_allocation:     { name: "Upfront Allocation",     direction: "lower",  range: [0, 10000], category: "Amortized Cost" },

  predicted_monthly_cost: { name: "Predicted Monthly Cost", direction: "lower",  range: [0, 20000], category: "Forecasted Cost" },
  growth_trend:           { name: "Growth Trend",           direction: "lower",  range: [0, 20],    category: "Forecasted Cost" },
};

function templated(serviceLabel) {
  return {
    internal_allocation: { name: `${serviceLabel} Allocation`,          direction: "lower", range: [0, 100], category: "Blended Cost" },
    enterprise_share:    { name: `Enterprise ${serviceLabel} Share`,    direction: "lower", range: [0, 100], category: "Blended Cost" },
    distributed_usage:   { name: `Distributed ${serviceLabel} Usage`,  direction: "lower", range: [0, 100], category: "Blended Cost" },
  };
}

const SERVICE_SPECIFIC = {
  Compute: {
    avg_monthly_cost:  { name: "Avg Monthly Cost",  direction: "lower",  range: [500, 6000],  category: "Cost" },
    cost_per_hour:     { name: "Cost per Hour",      direction: "lower",  range: [0.1, 3],     category: "Cost" },
    cpu_usage:         { name: "CPU Usage",          direction: "higher", range: [0, 100],     category: "Usage" },
    memory_usage:      { name: "Memory Usage",       direction: "higher", range: [0, 100],     category: "Usage" },
    response_time:     { name: "Response Time",      direction: "lower",  range: [10, 300],    category: "Performance" },
    vm_startup_time:   { name: "VM Startup Time",    direction: "lower",  range: [5, 120],     category: "Performance" },
    cpu_efficiency:    { name: "CPU Efficiency",     direction: "higher", range: [0, 100],     category: "Efficiency" },
    cost_per_workload: { name: "Cost per Workload",  direction: "lower",  range: [1, 50],      category: "Efficiency" },
  },
  Storage: {
    cost_per_gb:            { name: "Cost per GB",             direction: "lower",  range: [0.005, 0.1], category: "Cost" },
    total_storage_cost:     { name: "Total Storage Cost",      direction: "lower",  range: [1000, 20000], category: "Cost" },
    storage_used:           { name: "Storage Used (GB)",       direction: "higher", range: [1000, 100000], category: "Usage" },
    read_latency:           { name: "Read Latency",            direction: "lower",  range: [1, 50],  category: "Performance" },
    write_latency:          { name: "Write Latency",           direction: "lower",  range: [1, 60],  category: "Performance" },
    storage_optimization:   { name: "Storage Optimization",    direction: "higher", range: [0, 100], category: "Efficiency" },
    compression_efficiency: { name: "Compression Efficiency",  direction: "higher", range: [0, 100], category: "Efficiency" },
  },
  Database: {
    db_instance_cost: { name: "DB Instance Cost", direction: "lower",  range: [1000, 15000], category: "Cost" },
    query_cost:       { name: "Query Cost",       direction: "lower",  range: [10, 500],     category: "Cost" },
    query_volume:     { name: "Query Volume",     direction: "higher", range: [1e6, 1e8],    category: "Usage" },
    query_latency:    { name: "Query Latency",    direction: "lower",  range: [1, 100],      category: "Performance" },
    failover_time:    { name: "Failover Time",    direction: "lower",  range: [1, 60],       category: "Reliability" },
    cache_efficiency: { name: "Cache Efficiency", direction: "higher", range: [0, 100],      category: "Efficiency" },
  },
  Networking: {
    egress_cost:        { name: "Egress Cost",         direction: "lower",  range: [500, 10000], category: "Cost" },
    inbound_traffic:    { name: "Inbound Traffic",     direction: "higher", range: [1000, 100000], category: "Usage" },
    latency:            { name: "Latency",             direction: "lower",  range: [5, 100], category: "Performance" },
    packet_loss:        { name: "Packet Loss",         direction: "lower",  range: [0, 1],   category: "Performance" },
    routing_efficiency: { name: "Routing Efficiency",  direction: "higher", range: [0, 100], category: "Efficiency" },
  },
  Kubernetes: {
    cluster_cost:      { name: "Cluster Cost",       direction: "lower",  range: [2000, 20000], category: "Cost" },
    node_utilization:  { name: "Node Utilization",   direction: "higher", range: [0, 100], category: "Usage" },
    pod_startup_time:  { name: "Pod Startup Time",   direction: "lower",  range: [1, 15],  category: "Performance" },
    pod_restart_rate:  { name: "Pod Restart Rate",   direction: "lower",  range: [0, 10],  category: "Reliability" },
    cluster_efficiency:{ name: "Cluster Efficiency", direction: "higher", range: [0, 100], category: "Efficiency" },
  },
  Serverless: {
    execution_cost:     { name: "Execution Cost",     direction: "lower",  range: [100, 5000], category: "Cost" },
    invocation_count:   { name: "Invocation Count",   direction: "higher", range: [1e5, 1e9],  category: "Usage" },
    cold_start_time:    { name: "Cold Start Time",    direction: "lower",  range: [50, 2000],  category: "Performance" },
    error_rate:         { name: "Error Rate",         direction: "lower",  range: [0, 5],      category: "Reliability" },
    execution_efficiency:{ name: "Execution Efficiency", direction: "higher", range: [0, 100], category: "Efficiency" },
  },
};

export function getMetricsForService(service) {
  return {
    ...COMMON,
    ...templated(service),
    ...(SERVICE_SPECIFIC[service] || {}),
  };
}

export function getAllServiceMetrics(services) {
  const out = {};
  services.forEach(s => { out[s] = getMetricsForService(s); });
  return out;
}