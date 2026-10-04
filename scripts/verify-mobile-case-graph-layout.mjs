import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"

const layout = await readFile("app/cases/[id]/layout.tsx", "utf8")
const graph = await readFile("app/cases/[id]/graph/page.tsx", "utf8")

assert.match(layout, /max-w-full overflow-x-auto/)
assert.match(layout, /aria-label="Case workspace sections"/)
assert.match(layout, /shrink-0 whitespace-nowrap/)
assert.match(layout, /min-w-0/)

assert.match(graph, /lg:h-\[calc\(100vh-130px\)\]/)
assert.doesNotMatch(graph, /grid h-\[calc\(100vh-130px\)\]/)
assert.match(graph, /order-1[^"]*lg:order-1/)
assert.match(graph, /order-2[^"]*lg:order-3/)
assert.match(graph, /order-3[^"]*lg:order-2/)
assert.match(graph, /h-\[65svh\]/)
assert.match(graph, /overflow-x-auto overscroll-x-contain/)
assert.match(graph, /role="dialog" aria-modal="false"/)
assert.match(graph, /fixed inset-x-3/)
assert.match(graph, /max-h-\[calc\(100dvh-/)
assert.match(graph, /overflow-y-auto rounded-xl/)
assert.match(graph, /Entity Types/)
assert.match(graph, /Research & Review/)

console.log("Mobile case graph layout verification passed.")
