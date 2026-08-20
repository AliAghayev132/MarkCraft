/**
 * The application's icon set.
 *
 * Lucide is imported only here, and only the icons actually in use are
 * re-exported. That gives a single consistent icon family (§52) and makes the
 * icon inventory reviewable: adding a glyph is a visible line in this file
 * rather than an incidental import buried in a component.
 *
 * Aliases (`Image as ImageIcon`) are resolved here too, so component code never
 * has to rename around a collision with a DOM or React name.
 */

export {
  // ── Status and feedback ──────────────────────────────────────────────────
  AlertTriangle,
  CheckCircle2,
  Info,
  LifeBuoy,
  OctagonAlert,
  TriangleAlert,
  XCircle,
  FileWarning,

  // ── Navigation and disclosure ────────────────────────────────────────────
  ChevronDown,
  ChevronLeft,
  ChevronUp,
  ChevronRight,
  ChevronsDownUp,
  ArrowDown,
  ArrowUp,
  CornerDownLeft,
  MoreHorizontal,
  Home,

  // ── Window and layout ────────────────────────────────────────────────────
  Minus,
  Square,
  Copy,
  X,
  PanelLeft,
  Columns2,
  Eye,
  PenLine,
  Layers,
  Group,
  Crop,
  ZoomIn,
  ZoomOut,

  // ── Files and folders ────────────────────────────────────────────────────
  File as FileIconBase,
  FileText,
  FileType2,
  FileCode2,
  FileImage,
  FileJson,
  FileCog,
  FilePlus2,
  Folder,
  FolderOpen,
  FolderPlus,
  FolderTree,
  FolderX,

  // ── Document history ─────────────────────────────────────────────────────
  History,
  Presentation,
  Smile,

  // ── Release notes ────────────────────────────────────────────────────────
  TrendingUp,

  // ── Output ───────────────────────────────────────────────────────────────
  Braces,

  // ── Assistance ───────────────────────────────────────────────────────────
  Sparkles,
  Wand2,
  Expand,
  Minimize2,
  MessageSquareText,
  KeyRound,
  ExternalLink,

  // ── Actions ──────────────────────────────────────────────────────────────
  Save,
  Plus,
  Trash2,
  RefreshCw,
  RotateCcw,
  Upload,
  Play,
  Printer,
  Share2,
  Mail,
  Clipboard,
  Link2,
  Star,
  Clock,
  Search,
  Replace,
  Undo2,
  Redo2,

  // ── Text formatting ──────────────────────────────────────────────────────
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Code,
  Code2,
  SquareCode,
  Quote,
  List,
  ListOrdered,
  ListChecks,
  Heading1,
  Heading2,
  Heading3,
  Table2,
  Image,
  Image as ImageIcon,

  // ── Alignment ────────────────────────────────────────────────────────────
  AlignLeft,
  AlignCenter,
  AlignRight,
  ArrowDownAZ,

  // ── Search options ───────────────────────────────────────────────────────
  CaseSensitive,
  WholeWord,
  Regex,

  // ── Settings and appearance ──────────────────────────────────────────────
  Settings,
  Settings as SettingsIcon,
  Palette,
  Type,
  Keyboard,
  Languages,
  Sun,
  Moon,

  // ── Misc ─────────────────────────────────────────────────────────────────
  AlignCenterHorizontal,
  AlignCenterVertical,
  AlignEndHorizontal,
  AlignHorizontalSpaceAround,
  AlignStartHorizontal,
  AlignVerticalSpaceAround,
  Ban,
  BringToFront,
  Check,
  Circle,
  Grid2x2,
  Hash,
  LayoutGrid,
  Scaling,
  Scissors,
  SendToBack,
  Triangle,

  // ── Working together ─────────────────────────────────────────────────────
  LogIn,
  Radio,
  Users,
  Wifi,

  // ── Locked documents ─────────────────────────────────────────────────────
  Download,
  EyeOff,
  FileLock2,
  Unlock,

  /*
   * ── Icon picker ──────────────────────────────────────────────────────────
   * Assignable to a file or folder in Settings > Icons. Kept in one block so
   * the picker's list and this import cannot drift apart — see
   * features/icons/icon-library.ts and ICON_LIBRARY in @shared/types.
   */
  Archive,
  AlertCircle,
  Beaker,
  Book,
  BookOpen,
  Bookmark,
  Box,
  Briefcase,
  Camera,
  Flag,
  Flame,
  FolderGit2,
  FolderHeart,
  FolderLock,
  Globe,
  Heart,
  Inbox,
  Lock,
  Music,
  Newspaper,
  NotebookPen,
  Package,
  Pin,
  Rocket,
  Scroll,
  Shapes,
  Tag,
  Target,
  Wrench,
  Zap
} from 'lucide-react'

export type { LucideIcon, LucideProps } from 'lucide-react'
