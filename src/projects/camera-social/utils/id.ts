/**
 * Sortable, collision-resistant id without a dependency: base36 timestamp +
 * random tail. Short enough to live in a deep link (…/post/<id>).
 */
export function newId(): string {
  const time = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8).padEnd(6, "0");
  return `${time}${rand}`;
}
