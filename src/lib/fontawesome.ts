/**
 * FontAwesome-to-Lucide Icon Mapping Layer
 * Provides backward compatibility by mapping FA icon names to Lucide icons
 *
 * IMPORTANT: named imports only — `import * as LucideIcons` pulls the entire
 * 1,194-icon library (~730KB) into the main bundle and breaks tree-shaking.
 */

import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  BarChart3,
  Bell,
  BookOpen,
  Bot,
  Calendar,
  CalendarClock,
  Camera,
  Check,
  CheckCircle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Circle,
  CircleDot,
  Clock,
  Code,
  Coins,
  Copy,
  CreditCard,
  DollarSign,
  Download,
  Edit,
  ExternalLink,
  Eye,
  EyeOff,
  FileText,
  Filter,
  Flame,
  Gauge,
  Globe,
  GripVertical,
  Handshake,
  Headphones,
  Heart,
  HelpCircle,
  History,
  Info,
  Layers,
  Lightbulb,
  LineChart,
  Link,
  Loader2,
  Lock,
  LogOut,
  Maximize2,
  Megaphone,
  Minimize2,
  Minus,
  MoreHorizontal,
  MoreVertical,
  Network,
  Pause,
  PieChart,
  Play,
  Plus,
  RefreshCw,
  RotateCcw,
  RotateCw,
  Save,
  Scale,
  Search,
  SearchCheck,
  Send,
  Settings,
  Share,
  Shield,
  SkipBack,
  SkipForward,
  Sparkles,
  Star,
  Tags,
  Target,
  Trash,
  TrendingDown,
  TrendingUp,
  Trophy,
  Upload,
  User,
  Wallet,
  Waves,
  X,
  XCircle,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { cn } from './utils';

// Comprehensive FontAwesome to Lucide icon mapping
const iconMap: Record<string, LucideIcon> = {
  // Arrows & Trends
  'fa-arrow-trend-up': TrendingUp,
  'fa-arrow-trend-down': TrendingDown,
  'fa-arrow-up': ArrowUp,
  'fa-arrow-down': ArrowDown,
  'fa-arrow-right': ArrowRight,
  'fa-arrow-left': ArrowLeft,
  'fa-chevron-up': ChevronUp,
  'fa-chevron-down': ChevronDown,
  'fa-chevron-left': ChevronLeft,
  'fa-chevron-right': ChevronRight,
  'fa-arrows-rotate': RefreshCw,
  'fa-rotate-left': RotateCcw,

  // Actions & UI
  'fa-xmark': X,
  'fa-check': Check,
  'fa-copy': Copy,
  'fa-download': Download,
  'fa-upload': Upload,
  'fa-paper-plane': Send,
  'fa-bell': Bell,
  'fa-magnifying-glass': Search,
  'fa-gear': Settings,
  'fa-filter': Filter,
  'fa-ellipsis': MoreHorizontal,
  'fa-plus': Plus,
  'fa-minus': Minus,
  'fa-pen': Edit,
  'fa-trash': Trash,
  'fa-floppy-disk': Save,

  // Status & Info
  'fa-circle-info': Info,
  'fa-circle-question': Info,
  'fa-triangle-exclamation': AlertTriangle,
  'fa-circle-exclamation': AlertCircle,
  'fa-circle-check': CheckCircle,
  'fa-circle-xmark': XCircle,

  // Icons & Symbols
  'fa-sparkles': Sparkles,
  'fa-star': Star,
  'fa-shield': Shield,
  'fa-lock': Lock,
  'fa-bolt': Zap,
  'fa-lightbulb': Lightbulb,
  'fa-eye': Eye,
  'fa-eye-slash': EyeOff,
  'fa-fire': Flame,
  'fa-heart': Heart,

  // Loading
  'fa-spinner': Loader2,

  // External & Links
  'fa-arrow-up-right-from-square': ExternalLink,
  'fa-globe': Globe,
  'fa-link': Link,

  // Business & Finance
  'fa-dollar-sign': DollarSign,
  'fa-coins': Coins,
  'fa-trophy': Trophy,
  'fa-wallet': Wallet,
  'fa-chart-column': BarChart3,
  'fa-chart-simple': BarChart3,
  'fa-chart-line': LineChart,
  'fa-chart-pie': PieChart,
  'fa-credit-card': CreditCard,
  'fa-tags': Tags,
  'fa-handshake': Handshake,
  'fa-scale-balanced': Scale,

  // Media & Social
  'fa-play': Play,
  'fa-pause': Pause,
  'fa-share': Share,
  'fa-backward-step': SkipBack,
  'fa-forward-step': SkipForward,

  // User & Account
  'fa-user': User,
  'fa-right-from-bracket': LogOut,

  // Time & Calendar
  'fa-clock': Clock,
  'fa-calendar': Calendar,

  // Navigation & Menu
  'fa-ellipsis-vertical': MoreVertical,
  'fa-wave-square': Activity,
  'fa-clock-rotate-left': History,
  'fa-magnifying-glass-chart': SearchCheck,
  'fa-gauge-high': Gauge,
  'fa-timeline': CalendarClock,
  'fa-water': Waves,
  'fa-diagram-project': Network,
  'fa-robot': Bot,
  'fa-layer-group': Layers,
  'fa-file-lines': FileText,
  'fa-camera': Camera,
  'fa-book-open': BookOpen,
  'fa-bullhorn': Megaphone,
  'fa-headset': Headphones,

  // Other
  'fa-code': Code,
  'fa-headphones': Headphones,
  'fa-grip-vertical': GripVertical,
  'fa-maximize': Maximize2,
  'fa-minimize': Minimize2,
  'fa-circle': Circle,
  'fa-circle-dot': CircleDot,
  'fa-bullseye': Target,
  'fa-rotate': RotateCw,
};

export type SolidIconName = keyof typeof iconMap;
export type BrandIconName = string;

/**
 * Legacy faIcon helper - returns Lucide icon name with className
 * Used for backward compatibility with existing <i> tag patterns
 */
export function faIcon(_iconName: string, additionalClasses?: string): string {
  return cn('lucide-icon', additionalClasses);
}

/**
 * Legacy faBrand helper - maps to Lucide equivalents
 */
export function faBrand(_iconName: string, additionalClasses?: string): string {
  return cn('lucide-icon', additionalClasses);
}

/**
 * Get Lucide icon component by FA icon name
 */
export function getLucideIcon(faIconName: string): LucideIcon {
  return iconMap[faIconName] ?? HelpCircle;
}
