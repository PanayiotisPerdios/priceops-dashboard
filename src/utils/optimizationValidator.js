import Ajv2020 from 'ajv/dist/2020.js';
import requestSchema from '../../schemas/optimization-request.schema.json';
import responseSchema from '../../schemas/optimization-response.schema.json';

const ajv = new Ajv2020({allErrors: true, strict: false});

const validateRequest = ajv.compile(requestSchema);
const validateResponse = ajv.compile(responseSchema);

function formatValidationErrors(errors) {
  return (errors ?? []).map(error => {
    const location = error.instancePath || '/';
    return `${location}: ${error.message}`;
  });
}

export function validateOptimizationRequest(request) {
  const valid = validateRequest(request);

  if (!valid) {
    throw new Error(`Invalid optimization request:\n${formatValidationErrors(validateRequest.errors).join('\n')}`);
  }

  return true;
}

export function validateOptimizationResponse(response) {
  const valid = validateResponse(response);

  if (!valid) {
    throw new Error(`Invalid optimization response:\n${formatValidationErrors(validateResponse.errors).join('\n')}`
);
  }

  return true;
}
