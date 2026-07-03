import {
  Target,
  ListNumbers,
  ArrowsClockwise,
  ArrowUUpLeft,
  Eye,
  HandPalm,
  Balloon,
  Trophy,
} from "@phosphor-icons/react/dist/ssr";
import type { IconProps } from "@phosphor-icons/react";

export const RULE_ICON_OPTIONS = [
  "target",
  "list-numbers",
  "arrows-clockwise",
  "arrow-u-up-left",
  "eye",
  "hand-palm",
  "balloon",
  "trophy",
] as const;

const ICONS: Record<string, React.ComponentType<IconProps>> = {
  target: Target,
  "list-numbers": ListNumbers,
  "arrows-clockwise": ArrowsClockwise,
  "arrow-u-up-left": ArrowUUpLeft,
  eye: Eye,
  "hand-palm": HandPalm,
  balloon: Balloon,
  trophy: Trophy,
};

export function RuleIcon({ iconKey, ...props }: { iconKey: string } & IconProps) {
  const Icon = ICONS[iconKey] ?? Trophy;
  return <Icon {...props} />;
}
