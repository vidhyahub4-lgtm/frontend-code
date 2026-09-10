import {
  Banknote,
  Circle,
  Clock,
  CreditCard,
  Eye,
  File,
  FileText,
  Folder,
  Gift,
  GraduationCap,
  Hash,
  Landmark,
  LayoutDashboard,
  Languages,
  Layers,
  List,
  Lock,
  Map,
  Pencil,
  Percent,
  Plus,
  CirclePlus,
  Printer,
  RefreshCw,
  School,
  Settings,
  ShieldCheck,
  Tag,
  User,
  UserPlus,
  Users,
  type LucideIcon,
} from "lucide-react";

/** Maps the `icon` string sent by the API to a Lucide icon component. */
const ICON_BY_KEY: Record<string, LucideIcon> = {
  users: Users,
  user: User,
  lock: Lock,
  settings: Settings,
  map: Map,
  school: School,
  group: Users,
  list: List,
  language: Languages,
  bank: Landmark,
  "credit-card": CreditCard,
  hash: Hash,
  money: Banknote,
  file: File,
  clock: Clock,
  tag: Tag,
  student: GraduationCap,
  gift: Gift,
  percent: Percent,
  "user-plus": UserPlus,
  "plus-circle": CirclePlus,
  eye: Eye,
  print: Printer,
  "graduation-cap": GraduationCap,
  plus: Plus,
  refresh: RefreshCw,
  layers: Layers,
  edit: Pencil,
  "file-text": FileText,
};

/**
 * The API currently sends empty icon strings for top-level sections.
 * Give those recognizable items a nicer default instead of a generic dot.
 */
const ICON_BY_TEXT: Record<string, LucideIcon> = {
  "Super Admin": ShieldCheck,
  Dashboard: LayoutDashboard,
  "School Setting": Settings,
  "Student Management": Users,
};

export function resolveSidebarIcon(
  iconKey: string | undefined,
  text: string,
  hasChildren: boolean
): LucideIcon {
  if (iconKey && ICON_BY_KEY[iconKey]) return ICON_BY_KEY[iconKey];
  if (ICON_BY_TEXT[text]) return ICON_BY_TEXT[text];
  return hasChildren ? Folder : Circle;
}
