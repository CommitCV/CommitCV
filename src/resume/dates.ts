/** New and migrated files are stamped with today's date, as MM-DD-YY. */
export function today(): string {
    const now = new Date();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    return `${mm}-${dd}-${String(now.getFullYear() % 100).padStart(2, "0")}`;
}
