// Minimal contract the prototype expects from its host (the full sandbox passes the same
// shape). Kept here so the bulk-migration design imports resolve unchanged.
export type PrototypeProps = {
  isDark: boolean
  onToggleTheme: () => void
}
