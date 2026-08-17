// ── @lib ───────────────────────────────────────────────────────────────────
import {
  Archive,
  AlertCircle,
  Beaker,
  Book,
  Bookmark,
  Box,
  Briefcase,
  Camera,
  CheckCircle2,
  Clock,
  Eye,
  FileCode2,
  FileImage,
  FileJson,
  FileText,
  Flag,
  Flame,
  Folder,
  FolderGit2,
  FolderHeart,
  FolderLock,
  FolderOpen,
  Globe,
  Heart,
  Inbox,
  Lock,
  Music,
  Newspaper,
  NotebookPen,
  Package,
  Palette,
  Pin,
  Rocket,
  Scroll,
  Star,
  Tag,
  Target,
  Trash2,
  Wrench,
  Zap,
  type LucideIcon
} from '@icons'

// ── @shared ────────────────────────────────────────────────────────────────
import type { IconName } from '@shared'

/**
 * The picker's icons, by name.
 *
 * The names live in `@shared/types` (a rule stored on disk refers to one) and
 * the components live here, because a settings file must never hold a
 * component reference and the renderer is the only place that can resolve one.
 */
export const ICON_COMPONENTS: Record<IconName, LucideIcon> = {
  folder: Folder,
  'folder-open': FolderOpen,
  'folder-git': FolderGit2,
  'folder-heart': FolderHeart,
  'folder-lock': FolderLock,
  archive: Archive,
  package: Package,
  box: Box,

  'file-text': FileText,
  'file-code': FileCode2,
  'file-json': FileJson,
  'file-image': FileImage,
  book: Book,
  notebook: NotebookPen,
  newspaper: Newspaper,
  scroll: Scroll,

  star: Star,
  heart: Heart,
  flag: Flag,
  bookmark: Bookmark,
  pin: Pin,
  tag: Tag,
  zap: Zap,
  flame: Flame,

  briefcase: Briefcase,
  target: Target,
  rocket: Rocket,
  wrench: Wrench,
  beaker: Beaker,
  palette: Palette,
  camera: Camera,
  music: Music,

  'check-circle': CheckCircle2,
  'alert-circle': AlertCircle,
  clock: Clock,
  lock: Lock,
  eye: Eye,
  trash: Trash2,
  inbox: Inbox,
  globe: Globe
}

export function iconComponent(name: string | null): LucideIcon | null {
  if (!name) return null
  return ICON_COMPONENTS[name as IconName] ?? null
}
