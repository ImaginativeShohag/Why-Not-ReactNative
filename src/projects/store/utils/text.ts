/** "electronics" → "Electronics". Leaves the rest of the string untouched. */
export const capitalize = (value: string) =>
  value.charAt(0).toUpperCase() + value.slice(1);
