import { ApiError } from '@/lib/apiError';

export async function readJsonBody(request) {
  try {
    return await request.json();
  } catch {
    throw new ApiError('Request body must be valid JSON', 400);
  }
}