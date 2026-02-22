import { BookOpen, Heart, MessageSquare, Shield, FileText } from "lucide-react";

export const HELP_MENU_ITEMS = [
  {
    label: "Terms of Service",
    icon: FileText,
    href: "https://decoy-phrase.gitbook.io/documentation-decoy-phrase/legal/terms-of-service",
    external: true,
  },
  {
    label: "Documentation",
    icon: BookOpen,
    href: "https://decoy-phrase.gitbook.io/documentation-decoy-phrase",
    external: true,
  },
  {
    label: "Privacy & Policies",
    icon: Shield,
    href: "https://decoy-phrase.gitbook.io/documentation-decoy-phrase/legal/privacy-policy",
    external: true,
  },
  {
    label: "Feedback & Suggestions",
    icon: MessageSquare,
    href: "https://decoyphrase.arweave.net/feedback/",
    external: true,
  },
  {
    label: "Donate",
    icon: Heart,
    href: "https://decoyphrase.arweave.net/",
    external: true,
  },
];
