export const MAX_NAME_LENGTH = 200;

export function validateDishId(id) {
  return typeof id === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(id)
    ? null
    : "dishId must be 1-64 characters: letters, digits, '-' or '_'";
}

export function validatePatchBody(body) {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    return 'Request body must be a JSON object';
  }
  const { dishName, isPublished, expectedVersion } = body;
  if (typeof dishName !== 'string') return 'dishName must be a string';
  if (dishName.trim().length > MAX_NAME_LENGTH) {
    return `dishName must be at most ${MAX_NAME_LENGTH} characters`;
  }
  if (typeof isPublished !== 'boolean') return 'isPublished must be true or false';
  if (!Number.isInteger(expectedVersion) || expectedVersion < 1) {
    return 'expectedVersion must be a positive integer';
  }
  return null;
}

export function isHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}
