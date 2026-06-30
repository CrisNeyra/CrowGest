/**
 * DEPRECADO: la cabecera y la navegación ahora viven en Layout (TopBar + ModuleNav
 * + SubNav + Breadcrumb). Este shim se mantiene para compatibilidad con páginas
 * que todavía hacen `<Header title subtitle />`. No renderiza nada.
 */
export default function Header() {
  return null;
}
