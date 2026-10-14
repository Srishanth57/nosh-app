import * as repo from '@/repositories/dishes.repository';
import { validateDishId, validatePatchBody, isHttpUrl } from '@/validators/dish.validator';

const bad = (message) => ({ status: 400, body: { error: 'VALIDATION_ERROR', message } });
const notFound = (id) => ({ status: 404, body: { error: 'NOT_FOUND', message: `Dish ${id} not found` } });

export async function listDishes() {
  return { status: 200, body: await repo.findAll() };
}

export async function updateDish(dishId, body) {
  const idError = validateDishId(dishId);
  if (idError) return bad(idError);
  const bodyError = validatePatchBody(body);
  if (bodyError) return bad(bodyError);

  const current = await repo.findById(dishId);
  if (!current) return notFound(dishId);

  const name = body.dishName.trim();
  if (body.isPublished) {
    if (!name) return bad('A published dish needs a non-empty name');
    if (!isHttpUrl(current.imageUrl)) {
      return bad('A published dish needs a valid http/https image URL');
    }
  }

  // Atomic version check prevents stale drafts from overwriting newer edits.
  const saved = await repo.updateIfVersion(dishId, name, body.isPublished, body.expectedVersion);
  if (saved) return { status: 200, body: saved };

  const latest = await repo.findById(dishId);
  if (!latest) return notFound(dishId);
  return {
    status: 409,
    body: {
      error: 'VERSION_CONFLICT',
      message: 'This dish was updated by someone else',
      currentDish: latest,
    },
  };
}
