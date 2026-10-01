import fs from "fs";
import { parse } from "csv-parse/sync";

export function readCsv(file){
    const csv = fs.readFileSync(file, "utf8")

    return parse (csv, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        bom: true,
    });

}

function normalizeUnit(raw, price) {
  const m = String(raw ?? "").trim().match(/^(\d+(?:\.\d+)?)?\s*(.+)$/);
  const qty = m?.[1] ? Number(m[1]) : 1;
  const unit = (m?.[2] ?? "").toLowerCase();

  if (unit === "second") {
    return { unit_norm: "hour", price_per_unit_norm: (price * 3600) / qty };
  }

  if (["hour", "hours", "h"].includes(unit)){
    return { unit_norm: "hour", price_per_unit_norm: price / qty };
  } 
    
  if (["gib", "giby", "gb"].includes(unit)){
    return { unit_norm: "gb", price_per_unit_norm: price / qty };
  } 
    
  return { unit_norm: unit || null, price_per_unit_norm: price / qty };
}

export function loadAWSdata(file = "data/aws_combined.csv"){
    return readCsv(file).map((r) => {
        const price = Number(r.priceUSD)
        return {
            provider: "aws",
            sku_id: r.sku,
            service: r["attributes.servicecode"],
            category: r.productFamily,
            description: r.description,
            region_code: r.attributes.location,
            price_usd: price,
            unit_raw: r.unit,
            ...normalizeUnit(r.unit, price),
            instance_type: r["attributes.instancetype"] || null,
            vcpu: null,
            memory_gb: null,
            specs_complete: false,
            attributes: { usagetype: r["attributes.usagetype"], operation: r["attributes.operation"] },
        };
    })
}

export function loadAzuredata(file = "data/azure_combined.csv") {
    return readCsv(file).map((r) => {
        const price = Number(r.priceUSD);
        const specs = parseSpecs(`${r.meterName} ${r.skuName}`);
        return {
            provider: "azure",
            sku_id: r.skuId,
            service: r.serviceName,
            category: r.serviceFamily,
            description: `${r.meterName} (${r.skuName})`,
            region_code: r.armRegionName,
            price_usd: price,
            unit_raw: r.unitOfMeasure,
            ...normalizeUnit(r.unitOfMeasure, price),
            instance_type: r.armSkuName || null,
            ...specs,
            specs_complete: specs.vcpu != null && specs.memory_gb != null,
            attributes: { meterId: r.meterId, productName: r.productName, skuName: r.skuName },
        };
    });
}

export function loadGoogledata(file = "data/gcp_combined.csv") {
    return readCsv(file).map((r) => {
        const price = Number(r.priceUSD);
        const specs = parseSpecs(r.description);
        return {
            provider: "gcp",
            sku_id: r.skuId,
            service: r["category.serviceDisplayName"],
            category: r["category.resourceFamily"],
            description: r.description,
            region_code: r["geoTaxonomy.regions"],
            price_usd: price,
            unit_raw: r["pricingExpression.usageUnit"],
            ...normalizeUnit(r["pricingExpression.usageUnit"], price),
            instance_type: null,
            ...specs,
            specs_complete: specs.vcpu != null && specs.memory_gb != null,
            attributes: { name: r.name, resourceGroup: r["category.resourceGroup"] },
        };
    });
}
