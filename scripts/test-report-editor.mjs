import assert from "node:assert/strict"
import fs from "node:fs"
import { createRequire } from "node:module"
import ts from "typescript"

const require = createRequire(import.meta.url)
const read = (path) => fs.readFileSync(path, "utf8")

function compile(source) {
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText
  const module = { exports: {} }
  new Function("require", "module", "exports", output)(require, module, module.exports)
  return module.exports
}

function test(name, run) {
  run()
  console.log(`PASS ${name}`)
}

const documentSource = read("lib/report-document.ts")
const {
  documentPlainText,
  formatPlainTextAsDocument,
  plainTextDocument,
  registerDocument,
  renderRichDocumentToHtml,
  validateRichDocument,
} = compile(documentSource)

test("legacy plaintext remains plaintext until an investigator formats it", () => {
  const legacy = plainTextDocument("# Existing narrative\n\n**Not automatically reformatted**")
  assert.equal(legacy.content[0].type, "paragraph")
  assert.equal(documentPlainText(legacy), "# Existing narrative\n\n**Not automatically reformatted**")
})

test("the deterministic formatter recognizes headings, lists, and markdown tables", () => {
  const formatted = formatPlainTextAsDocument("# Heading\n\n- One\n- Two\n\n| Name | State |\n| --- | --- |\n| A | verified |")
  assert.deepEqual(formatted.content.map((node) => node.type), ["heading", "bulletList", "table"])
  assert.match(documentPlainText(formatted), /Heading/)
  assert.match(documentPlainText(formatted), /verified/)
})

test("rich documents reject unsafe and unsupported nodes", () => {
  assert.equal(validateRichDocument({ type: "doc", content: [{ type: "script", content: [] }] }).ok, false)
  assert.equal(validateRichDocument({ type: "doc", content: [{ type: "paragraph", attrs: { onclick: "x" }, content: [] }] }).ok, false)
  assert.equal(validateRichDocument({ type: "doc", content: [{ type: "heading", attrs: { level: 4 }, content: [] }] }).ok, false)
})

test("validated formatting is rendered with escaped text rather than raw HTML", () => {
  const document = formatPlainTextAsDocument("## Finding\n\n**Observed** <not-html>")
  const html = renderRichDocumentToHtml(document)
  assert.match(html, /<h2>/)
  assert.match(html, /<strong>Observed<\/strong>/)
  assert.match(html, /&lt;not-html&gt;/)
  assert.doesNotMatch(html, /<not-html>/)
})

test("structured registers use only supplied records and preserve an empty-state row", () => {
  const empty = registerDocument("evidence", [])
  const populated = registerDocument("entities", [["Synthetic entity", "DOMAIN", "unreviewed", "Not scored"]])
  assert.match(documentPlainText(empty), /No authorized records available/)
  assert.match(documentPlainText(populated), /Synthetic entity/)
  assert.match(documentPlainText(populated), /unreviewed/)
})

const route = read("app/api/cases/[id]/reports/route.ts")
const editor = read("components/reports/RichTextEditor.tsx")
const viewer = read("components/reports/RichDocumentContent.tsx")
const pdf = read("lib/report-pdf.tsx")
const word = read("app/api/reports/[id]/export/route.ts")
const artifacts = read("lib/report-artifacts.ts")
const graphLayout = read("lib/report-graph-layout.ts")
const graphRoute = read("app/api/cases/[id]/reports/[reportId]/graph/route.ts")

test("rich documents use an optional, versioned contract without replacing legacy text", () => {
  assert.match(route, /summary_document/)
  assert.match(route, /summary_document_version/)
  assert.match(route, /content_document/)
  assert.match(route, /content_document_version/)
})

test("editor supplies the approved formatting controls as a client component", () => {
  assert.match(editor, /^"use client"/)
  for (const control of ["toggleBold", "toggleItalic", "toggleUnderline", "toggleBulletList", "toggleOrderedList", "insertTable", "undo", "redo", "setTextAlign"]) assert.match(editor, new RegExp(control))
  assert.match(editor, /immediatelyRender: false/)
  assert.match(viewer, /RichDocumentContent/)
})

test("API validates rich JSON, preserves plaintext, and rejects changes after approval", () => {
  assert.match(route, /validateRichDocument/)
  assert.match(route, /richDocumentStorageAvailable/)
  assert.match(route, /summary_document = \$5::jsonb/)
  assert.match(route, /content_document = \$5::jsonb/)
  assert.match(route, /Approved, finalized, delivered, or published report content is immutable/)
})

test("preview and exports render rich documents without changing frozen versions", () => {
  assert.match(pdf, /RichDocumentBlocks/)
  assert.match(word, /renderRichDocumentToHtml/)
  assert.match(word, /frozenSnapshot/)
  assert.match(artifacts, /schema_version: richDocuments \? 2 : 1/)
})

test("new graph attachments default to a deterministic hierarchical ELK layout", () => {
  assert.match(graphLayout, /elk\.algorithm": "layered"/)
  assert.match(graphLayout, /elk\.direction": "RIGHT"/)
  assert.match(artifacts, /buildHierarchicalGraphSvg/)
  assert.match(artifacts, /cross-page relationships retained/)
  assert.match(graphRoute, /layout = body\?\.layout === "network" \? "network" : "hierarchical"/)
})

const { layoutHierarchicalReportGraph } = compile(graphLayout)
const hierarchy = await layoutHierarchicalReportGraph({
  entities: [{ id: "entity-a" }, { id: "entity-b" }, { id: "entity-c" }],
  relationships: [
    { id: "edge-a", source_entity_id: "entity-a", target_entity_id: "entity-b" },
    { id: "edge-b", source_entity_id: "entity-a", target_entity_id: "entity-c" },
    { id: "edge-c", source_entity_id: "entity-c", target_entity_id: "entity-b" },
  ],
})

test("ELK lays out every node and preserves directed cross-links", () => {
  assert.equal(hierarchy.nodes.size, 3)
  assert.equal(hierarchy.edges.size, 3)
  assert.ok(hierarchy.width >= 920)
  assert.ok(hierarchy.height >= 520)
})

console.log("\n11 report editor checks passed.")
