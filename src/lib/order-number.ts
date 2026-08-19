/** Human-friendly order number, e.g. TNP-260814-4821. Uniqueness in the DB
 * is enforced by a unique index; collisions are astronomically unlikely
 * but if you ever see one, just retry the insert. */
export function generateOrderNumber(): string {
  const d = new Date();
  const yy = String(d.getFullYear()).slice(2);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `TNP-${yy}${mm}${dd}-${rand}`;
}
