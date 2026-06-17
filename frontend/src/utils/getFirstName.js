/**
 * Returns the first name from a full name for display purposes.
 * Full names are stored as entered ("Ritik Kumar Yadav") but the UI shows only
 * the first token ("Ritik"). Safe on null/undefined/empty values.
 *
 * @param {string} [fullName]
 * @param {string} [fallback=""] value returned when there's no usable name
 * @returns {string}
 */
export const getFirstName = (fullName, fallback = "") => {
  if (!fullName || typeof fullName !== "string") return fallback;
  const first = fullName.trim().split(/\s+/)[0];
  return first || fallback;
};

export default getFirstName;
