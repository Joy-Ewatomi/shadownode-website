import assert from "node:assert/strict"
import { readFileSync } from "node:fs"

const source = readFileSync("components/dashboard/NotificationBell.tsx", "utf8")
const mobileMargin = 32
const desktopMaximum = 26 * 16
for (const viewport of [320, 360, 375, 390, 430]) {
  const panelWidth = Math.min(desktopMaximum, viewport - mobileMargin)
  assert.ok(panelWidth <= viewport - mobileMargin, `${viewport}px viewport retains horizontal margins`)
  assert.ok(panelWidth > 0 && panelWidth <= viewport, `${viewport}px viewport cannot overflow horizontally`)
}
assert.match(source, /width: "min\(26rem, calc\(100vw - 2rem - env\(safe-area-inset-left\) - env\(safe-area-inset-right\)\)\)"/)
assert.doesNotMatch(source, /(?:^|\s)w-\[26rem\](?:\s|$)/m)
assert.match(source, /max-w-\[26rem\]/)
assert.match(source, /100dvh - 5rem - env\(safe-area-inset-top\) - env\(safe-area-inset-bottom\)/)
assert.match(source, /min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain/)
assert.match(source, /<Popover[\s\S]*modal=\{false\}/)
assert.match(source, /<PopoverContent[\s\S]*align="end"[\s\S]*side="bottom"/)
assert.match(source, /collisionPadding=\{16\}/)
assert.match(source, /onPointerDownOutside=\{\(\) => setOpen\(false\)\}/)
assert.match(source, /onEscapeKeyDown=\{\(\) => setOpen\(false\)\}/)
assert.match(source, /useEffect\(\(\) => \{\s*setOpen\(false\)\s*\}, \[pathname\]\)/)
assert.match(source, /aria-haspopup="dialog"/)
assert.match(source, /aria-expanded=\{open\}/)
assert.match(source, /aria-controls="dashboard-notification-panel"/)
assert.match(source, /role="dialog"/)
assert.match(source, /aria-modal="false"/)
assert.match(source, /aria-labelledby="dashboard-notification-title"/)
assert.match(source, /h-11 w-11/)
assert.match(source, /min-h-11/)
assert.match(source, /break-words[\s\S]*\[overflow-wrap:anywhere\]/)
assert.match(source, /shrink-0 border-t/)
console.log("Notification panel checks passed (31 assertions).")
