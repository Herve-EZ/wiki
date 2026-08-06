import type { CSSProperties } from "react";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  AtSign,
  Bell,
  Blocks,
  Bold,
  BookOpen,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  CircleHelp,
  Clock,
  Code,
  Copy,
  Download,
  ExternalLink,
  FilePlus2,
  FileText,
  GraduationCap,
  Heading,
  History,
  House,
  Info,
  Italic,
  KeyRound,
  LayoutTemplate,
  Link2,
  List,
  Lock,
  LogOut,
  Mail,
  Menu,
  MessageSquare,
  Monitor,
  Moon,
  MoreHorizontal,
  Pencil,
  Plus,
  Quote,
  RefreshCw,
  Save,
  Scale,
  Search,
  Settings,
  ShieldCheck,
  Siren,
  SquareCheckBig,
  Strikethrough,
  Sun,
  Table,
  Terminal,
  Trash2,
  TriangleAlert,
  Upload,
  User,
  Users,
  Wifi,
  WifiOff,
  Workflow,
  X,
  ZoomIn,
  ZoomOut,
  type LucideIcon,
} from "lucide-react";

/**
 * Single icon vocabulary for the app, backed by lucide-react. Call sites use a
 * stable semantic name (`"trash"`, `"diagram"`) rather than importing lucide
 * directly, so an icon can be swapped in one place — and `IconName` keeps typos
 * from silently rendering a blank square.
 *
 * Stroke width, colour and line joins come from `svg.ic` in index.css so every
 * icon matches the design system at any size.
 */
const ICONS = {
  alert: TriangleAlert,
  alertCircle: CircleAlert,
  alignCenter: AlignCenter,
  alignLeft: AlignLeft,
  alignRight: AlignRight,
  at: AtSign,
  bell: Bell,
  bold: Bold,
  book: BookOpen,
  check: Check,
  checkSquare: SquareCheckBig,
  chevronDown: ChevronDown,
  chevronLeft: ChevronLeft,
  chevronRight: ChevronRight,
  clock: Clock,
  code: Code,
  comment: MessageSquare,
  copy: Copy,
  diagram: Workflow,
  download: Download,
  externalLink: ExternalLink,
  file: FileText,
  filePlus: FilePlus2,
  graduationCap: GraduationCap,
  heading: Heading,
  help: CircleHelp,
  history: History,
  home: House,
  info: Info,
  italic: Italic,
  key: KeyRound,
  link: Link2,
  list: List,
  lock: Lock,
  logout: LogOut,
  mail: Mail,
  menu: Menu,
  monitor: Monitor,
  moon: Moon,
  more: MoreHorizontal,
  pencil: Pencil,
  plus: Plus,
  quote: Quote,
  refresh: RefreshCw,
  save: Save,
  scale: Scale,
  search: Search,
  settings: Settings,
  shield: ShieldCheck,
  siren: Siren,
  strike: Strikethrough,
  sun: Sun,
  table: Table,
  template: LayoutTemplate,
  terminal: Terminal,
  transclude: Blocks,
  trash: Trash2,
  upload: Upload,
  user: User,
  users: Users,
  wifi: Wifi,
  wifiOff: WifiOff,
  x: X,
  zoomIn: ZoomIn,
  zoomOut: ZoomOut,
} satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof ICONS;

/**
 * The icon scale, mirrored by `--ic-*` in index.css. Four steps, matched to the
 * app's UI type sizes:
 *
 * - `xs` (12) inside badges and chips, where the label itself is ~11px
 * - `sm` (14) buttons and toolbars — the workhorse
 * - `md` (16) navigation, page tree, section headers (the default)
 * - `lg` (20) empty states and modal headers
 *
 * A raw number is still accepted for the rare case that needs one, but new code
 * should stay on the scale — seven ad-hoc sizes is how the rhythm drifts from
 * one component to the next.
 */
const SIZES = { xs: 12, sm: 14, md: 16, lg: 20 } as const;

export type IconSize = keyof typeof SIZES;

interface Props {
  name: IconName;
  size?: IconSize | number;
  className?: string;
  style?: CSSProperties;
}

export function Icon({ name, size = "md", className = "ic", style }: Props) {
  const Glyph = ICONS[name];
  const px = typeof size === "number" ? size : SIZES[size];
  return <Glyph className={className} size={px} style={style} aria-hidden="true" />;
}
