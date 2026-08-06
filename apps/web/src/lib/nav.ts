import { ClipboardList, Dumbbell, LayoutGrid, User, UtensilsCrossed } from "lucide-react";

export const navItems = [
  { href: "/", label: "Início", icon: LayoutGrid },
  { href: "/treino", label: "Treino", icon: Dumbbell },
  { href: "/nutricao", label: "Nutrição", icon: UtensilsCrossed },
  { href: "/avaliacoes", label: "Avaliações", icon: ClipboardList },
  { href: "/perfil", label: "Perfil", icon: User },
] as const;
