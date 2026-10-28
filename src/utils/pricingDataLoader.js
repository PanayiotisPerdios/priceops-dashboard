import { uniqSorted } from '@/utils/calculationServices';
import { CATEGORY_TO_DOMAIN, PROVIDER_LABELS, BASE_URL, DEFAULT_EFFECTIVE_DATE, 
GENERIC_SKU  } from '@/data/constants'
import Papa from 'papaparse';
import Ajv2020 from 'ajv/dist/2020.js';

export const DEFAULT_CSV_URL = `${BASE_URL}data/mock_data2.csv`

export const CSV_SCHEMA_URL = `${BASE_URL}data/unified_pricing.table-schema.json`;

export const JSON_SCHEMA_URL = `${BASE_URL}data/json_exchange_schema.json`;

let schemasPromise = null;

export function loadSchemas() {
    if (schemasPromise) {
        return schemasPromise;
    }

    schemasPromise = Promise.all([ fetch(CSV_SCHEMA_URL), fetch(JSON_SCHEMA_URL) ]).then(async ([csvResponse, jsonResponse]) => {
        if (!csvResponse.ok) {
            throw new Error(
                `Failed to load CSV schema (${csvResponse.status})`
            );
        }

        if (!jsonResponse.ok) {
            throw new Error(
                `Failed to load JSON schema (${jsonResponse.status})`
            );
        }

        return { csvSchema: await csvResponse.json(), jsonSchema: await jsonResponse.json() };
    }).catch(error => {
        schemasPromise = null;
        throw error;
    });

    return schemasPromise;
}

function toNum(value) {
  if (value === '' || value == null) {
    return null;
  }
  const number = Number(value);

  if (Number.isFinite(number)) {
    return number;
  }

  return null;
}

function toStr(value) {
  if (value === '' || value == null) {
    return null;
  }
  return String(value);
}

export function csvToObjects(text) {
    return Papa.parse(text, {
        header: true,
        delimiter: ',',
        skipEmptyLines: true,
        transformHeader: h => h.trim()
    });
}

export function validateHeaders(headers, schema) {
    const errors = [];

    const expected = schema.fields.map(field => field.name);

    if (headers.length === 0) {
        errors.push('CSV is empty or has no header');
        return errors;
    }

    for (const field of expected) {
        if (!headers.includes(field)) {
            errors.push(`Missing column: ${field}`);
        }
    }

    for (const field of headers) {
        if (!expected.includes(field)) {
            errors.push(`Unexpected column: ${field}`);
        }
    }

    return errors;
}

export function validateRows(rows, schema){
    const validRows = [];
    const rejectedRows = [];

    for (const [index, row] of rows.entries()){
        const rowErrors = [];

        for (const field of schema.fields){
            const value = row[field.name];
            const constraints = field.constraints ?? {};

            if (constraints.required && (value == null || String(value).trim() === '')){
                rowErrors.push(`${field.name} is required`);
                continue;
            }

            if (value == null || value === ''){
                continue;
            }

            if (field.type === 'number'){
                if (typeof value !== 'string' && typeof value !== 'number') {
                    rowErrors.push(`${field.name} must be a number`);
                    continue;
                }

                if (String(value).trim() === '' || !Number.isFinite(Number(value))) {
                    rowErrors.push(`${field.name} must be a number`);
                    continue;
                }

                if (constraints.minimum !== undefined && Number(value) < constraints.minimum) {
                    rowErrors.push(`${field.name} must be >= ${constraints.minimum}`);
                }
            }

            if (field.type === 'string' && typeof value !== 'string') {
                rowErrors.push(`${field.name} must be a string`);
                continue;
            }

            if (constraints.enum && !constraints.enum.includes(value)){
                rowErrors.push(`Invalid ${field.name}: ${value}`);
            }

        }

        if (row.TierStart !== '' && row.TierEnd !== '' && row.TierStart != null && row.TierEnd != null && Number.isFinite(Number(row.TierStart)) && Number.isFinite(Number(row.TierEnd)) && Number(row.TierEnd) < Number(row.TierStart)) {
            rowErrors.push('TierEnd must be >= TierStart');
        }

        if (rowErrors.length > 0) {
            rejectedRows.push({row: index + 1,errors: rowErrors});
        } else {
            validRows.push(row);
        }
    }

    return { validRows, rejectedRows };
}

function createImportResult(total, validRows, rejectedRows) {
    const records = validRows.map(mapRows);
    return { records, report: {total, loaded: records.length, rejected: rejectedRows.length, errors: rejectedRows.flatMap(item => item.errors.map(error => `Row ${item.row}: ${error}`)),rejectedRows}};
}

export async function parseCSVRows(text){
    const { csvSchema } = await loadSchemas();
    const parsed = csvToObjects(text);
    const headerErrors = validateHeaders(parsed.meta.fields ?? [], csvSchema);

    if (headerErrors.length > 0) {
        throw new Error(`CSV header validation failed:\n${headerErrors.join('\n')}`);
    }

    const {validRows, rejectedRows } = validateRows(parsed.data,csvSchema);

    const fatalParseErrors = parsed.errors.filter(error => !Number.isInteger(error.row) || error.row < 0);
    
    if (fatalParseErrors.length > 0) {
        throw new Error(`CSV parsing failed: ${fatalParseErrors.map(error => error.message).join('; ')}`);
    }
    
    const parseErrorsByRow = new Map();

    for (const error of parsed.errors) {
        const rowNumber = error.row + 1;

        if (!parseErrorsByRow.has(rowNumber)) {
            parseErrorsByRow.set(rowNumber, []);
        }

        parseErrorsByRow.get(rowNumber).push(`CSV parse error: ${error.message}`);
    }

    const rejectedByRow = new Map(rejectedRows.map(item => [item.row, item]));

    for (const [rowNumber, errors] of parseErrorsByRow) {
        const existing = rejectedByRow.get(rowNumber);

        if (existing) {
            existing.errors.push(...errors);
        } else {
            rejectedByRow.set(rowNumber, { row: rowNumber, errors });
        }
    }

    const allRejected = [...rejectedByRow.values()].sort((a, b) => a.row - b.row);
    const rejectedNumbers = new Set(allRejected.map(item => item.row));
    const accepted = parsed.data.filter((_, index) => !rejectedNumbers.has(index + 1));

    return createImportResult(parsed.data.length, accepted, allRejected);
}

const ajv = new Ajv2020({ allErrors: true, strict: false });

let jsonValidatorPromise = null;

async function getJsonValidator() {
    if (!jsonValidatorPromise) {
        jsonValidatorPromise = loadSchemas()
            .then(({ jsonSchema }) => ajv.compile(jsonSchema))
            .catch(error => {
                jsonValidatorPromise = null;
                throw error;
            });
    }

    return jsonValidatorPromise;
}

export async function parseJSONRows(text) {
    const rows = JSON.parse(text);

    if (!Array.isArray(rows)) { throw new Error('JSON must contain an array of pricing records');}

    const validateJson = await getJsonValidator();

    const validRows = [];
    const rejectedRows = [];

    for (const [index, row] of rows.entries()) {
        if (!validateJson([row])) {
            const errors = (validateJson.errors ?? []).map(error => {
                const location = error.instancePath || '/';
                return `${location}: ${error.message}`;
            }
        );

            rejectedRows.push({row: index + 1, errors});

            continue;
        }

        // Same cross-field rule as CSV
        if (row.TierStart != null && row.TierEnd != null && row.TierEnd < row.TierStart) {
            rejectedRows.push({ row: index + 1, errors: ['TierEnd must be >= TierStart'] });
            continue;
        }

        validRows.push(row);
    }

    return createImportResult(rows.length, validRows, rejectedRows);
}

export function importPricingData(text, format = 'csv') {
    if (format === 'csv') {
        return parseCSVRows(text);
    }

    if (format === 'json') {
        return parseJSONRows(text);
    }

    throw new Error(`Unsupported format: ${format}`);
}

export async function loadUnifiedPricing(url = DEFAULT_CSV_URL, format = 'csv') {
    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(`Could not load ${url} (${response.status})`);
    }

    const text = await response.text();

    return importPricingData(text, format);
}

export function mapRows(row){
    return {
        ServiceProviderName: toStr(row.ServiceProviderName),
        ServiceCategory: toStr(row.ServiceCategory),
        ServiceName: toStr(row.ServiceName),
        SkuId: toStr(row.SkuId),
        ChargeDescription: toStr(row.ChargeDescription),
        RegionId: toStr(row.RegionId),
        PricingCategory: toStr(row.PricingCategory),
        PricingUnit: toStr(row.PricingUnit),
        ListUnitPrice: toNum(row.ListUnitPrice),
        SkuName: toStr(row.SkuName),
        PriceComponent: toStr(row.PriceComponent),
        StorageClass: toStr(row.StorageClass),
        ServiceTier: toStr(row.ServiceTier),
        RegionGroup: toStr(row.RegionGroup),
        CommitmentTerm: toStr(row.CommitmentTerm),
        CommitmentType: toStr(row.CommitmentType),
        Tenancy: toStr(row.Tenancy),
        OperatingSystem: toStr(row.OperatingSystem),
        TierStart: toNum(row.TierStart),
        TierEnd: toNum(row.TierEnd),
        DatabaseEngine: toStr(row.DatabaseEngine),
        DeploymentOption: toStr(row.DeploymentOption),
        VCpu: toNum(row.VCpu),
        MemoryGiB: toNum(row.MemoryGiB)
    };
}

function uniqueValues(records, getValue) {
  const values = records.map(getValue);
  return uniqSorted(values);
}

export function deriveFilterOptions(records) {
    return {
        providers: uniqueValues(records, r => r.ServiceProviderName),
        categories: uniqueValues(records, r => r.ServiceCategory),
        services: uniqueValues(records, r => r.ServiceName),
        regions: uniqueValues(records, r => r.RegionId),
        regionGroups: uniqueValues(records, r => r.RegionGroup),
        operatingSystems: uniqueValues(records, r => r.OperatingSystem),
        dbEngines: uniqueValues(records, r => r.DatabaseEngine),
        pricingModels: uniqueValues(records, r => r.PricingCategory),
        pricingUnits: uniqueValues(records, r => r.PricingUnit),
        priceComponents: uniqueValues(records, r => r.PriceComponent),
        storageClasses: uniqueValues(records, r => r.StorageClass),
        serviceTiers: uniqueValues(records, r => r.ServiceTier),
        commitmentTerms: uniqueValues(records, r => r.CommitmentTerm),
        commitmentTypes: uniqueValues(records, r => r.CommitmentType),
        tenancies: uniqueValues(records, r => r.Tenancy),
        deploymentOptions: uniqueValues(records, r => r.DeploymentOption)
    };
}
