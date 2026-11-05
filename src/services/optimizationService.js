import { validateOptimizationRequest, validateOptimizationResponse } from '@/utils/optimizationValidator';

export async function getOptimizationRecommendations(request) {
  validateOptimizationRequest(request);

  const response = await fetch(`${import.meta.env.BASE_URL}data/mock-optimization-response.json`);

  if (!response.ok) {
    throw new Error('Failed to load optimization results');
  }

  const data = await response.json();
  validateOptimizationResponse(data);

  return data;
}