import type { SidebarItem } from "../types/auth.types";

/** Exact match, or a parent segment of the current path (e.g. link "/a/b" matches path "/a/b/c"). */
export function isLinkActive(link: string, pathname: string): boolean {
  if (!link) return false;
  return pathname === link || pathname.startsWith(`${link}/`);
}

/** True if the current path matches this item or any of its descendants. */
export function subtreeContainsPath(item: SidebarItem, pathname: string): boolean {
  if (isLinkActive(item.link, pathname)) return true;
  return (item.children ?? []).some((child) => subtreeContainsPath(child, pathname));
}
