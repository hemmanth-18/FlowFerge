import React from 'react';
import {
  Code2,
  Megaphone,
  Zap,
  Rocket,
  Wrench,
  Palette,
  Briefcase,
  BarChart3,
  Shield,
  Globe,
  Users,
} from 'lucide-react';

export const TEAM_ICON_MAP = {
  '💻': Code2,
  code: Code2,
  '📢': Megaphone,
  megaphone: Megaphone,
  '⚡': Zap,
  zap: Zap,
  '🚀': Rocket,
  rocket: Rocket,
  '🛠️': Wrench,
  wrench: Wrench,
  '🎨': Palette,
  palette: Palette,
  '💼': Briefcase,
  briefcase: Briefcase,
  '📊': BarChart3,
  chart: BarChart3,
  '🛡️': Shield,
  shield: Shield,
  '🌐': Globe,
  globe: Globe,
};

export const AVAILABLE_TEAM_ICONS = [
  { id: 'code', label: 'Engineering & Code', Icon: Code2 },
  { id: 'rocket', label: 'Product & Launch', Icon: Rocket },
  { id: 'zap', label: 'Speed & Operations', Icon: Zap },
  { id: 'megaphone', label: 'Marketing & Outreach', Icon: Megaphone },
  { id: 'wrench', label: 'Infrastructure & Tools', Icon: Wrench },
  { id: 'palette', label: 'Design & Creative', Icon: Palette },
  { id: 'briefcase', label: 'Business & Management', Icon: Briefcase },
  { id: 'chart', label: 'Data & Analytics', Icon: BarChart3 },
  { id: 'shield', label: 'Security & QA', Icon: Shield },
  { id: 'globe', label: 'Global & Remote', Icon: Globe },
];

export const TeamIcon = ({ icon, className = 'w-5 h-5 text-brand-400' }) => {
  const IconComponent = TEAM_ICON_MAP[icon] || (icon && AVAILABLE_TEAM_ICONS.find((i) => i.id === icon)?.Icon) || Users;
  return <IconComponent className={className} />;
};
