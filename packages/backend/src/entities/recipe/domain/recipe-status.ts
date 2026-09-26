export type RecipeStatus = 'ACTIVA' | 'ARCHIVADA';

/**
 * A recipe loaded by the agronomist is immediately available to instruct the
 * contractor preparation, so it is created as ACTIVE.
 */
export const RECIPE_INITIAL_STATUS: RecipeStatus = 'ACTIVA';
