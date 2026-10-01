export function backendAdapter(rawBackendData){
    return{
        provider: rawBackendData.provider,
        service: rawBackendData.service,
        metric: rawBackendData.metric,
        dimensions: rawBackendData.dimensions || {},
        series: rawBackendData.series || { hourly: [], daily: [], timestamps: [] }
    }
}
