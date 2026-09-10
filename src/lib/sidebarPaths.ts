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

/**
 * The API's top-level `order` field doesn't match the order we want to
 * display in the sidebar, so we reorder by link on the client instead.
 * Any item not listed here keeps its relative position at the end.
 */
const TOP_LEVEL_DISPLAY_ORDER = [
  "/dashboard",
  "/superadmin",
  "/studentmanagement",
  "/schoolsetting",
];

export function sortTopLevelItems(items: SidebarItem[]): SidebarItem[] {
  const rank = (link: string) => {
    const index = TOP_LEVEL_DISPLAY_ORDER.indexOf(link);
    return index === -1 ? TOP_LEVEL_DISPLAY_ORDER.length : index;
  };

  return [...items].sort((a, b) => rank(a.link) - rank(b.link));
}
