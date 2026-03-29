import {
  AlertCircle,
  CheckCircle,
  X,
  Printer,
  Download,
  Package,
  Clock,
  User,
  BookOpen,
  FileText,
  Save,
  RotateCcw,
  Plus,
  Trash2
} from 'lucide-react';

// Icon mapping following the reference approach
// This allows us to easily swap icons or update them in one place
export const Icons = {
  // Form actions
  check: CheckCircle,
  close: X,
  print: Printer,
  download: Download,
  save: Save,
  reset: RotateCcw,
  add: Plus,
  delete: Trash2,
  
  // Field icons
  alert: AlertCircle,
  equipment: Package,
  time: Clock,
  user: User,
  academic: BookOpen,
  document: FileText,
} as const;

// Type for icon names
export type IconName = keyof typeof Icons;
