export const REPORT_DOCUMENT_VERSION = 1 as const

export type RichMark = { type: "bold" | "italic" | "underline" }

export type RichNode = {
  type: string
  attrs?: Record<string, unknown>
  marks?: RichMark[]
  text?: string
  content?: RichNode[]
}

export type RichDocument = {
  type: "doc"
  content: RichNode[]
}

export type RichDocumentResult =
  | { ok: true; document: RichDocument }
  | { ok: false; error: string }

const MAX_DOCUMENT_TEXT = 200_000
const MAX_NODES = 8_000
const ALIGNMENTS = new Set(["left", "center", "right", "justify"])
const BLOCKS = new Set(["paragraph", "heading", "bulletList", "orderedList", "listItem", "table", "tableRow", "tableCell", "tableHeader"])
const INLINE_MARKS = new Set(["bold", "italic", "underline"])

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null
}

function normalizeText(value: unknown, state: { characters: number; nodes: number }): RichDocumentResult | RichNode {
  if (typeof value !== "string") return { ok: false, error: "Text nodes must contain a string." }
  state.characters += value.length
  state.nodes += 1
  if (state.characters > MAX_DOCUMENT_TEXT || state.nodes > MAX_NODES) return { ok: false, error: "Document exceeds the permitted size." }
  return { type: "text", text: value }
}

function normalizeMarks(value: unknown): RichDocumentResult | RichMark[] | undefined {
  if (value == null) return undefined
  if (!Array.isArray(value)) return { ok: false, error: "Text marks must be an array." }
  const seen = new Set<string>()
  const marks: RichMark[] = []
  for (const candidate of value) {
    const mark = record(candidate)
    const type = typeof mark?.type === "string" ? mark.type : ""
    if (!INLINE_MARKS.has(type)) return { ok: false, error: `Unsupported text mark: ${type || "unknown"}.` }
    if (!seen.has(type)) {
      seen.add(type)
      marks.push({ type: type as RichMark["type"] })
    }
  }
  return marks.length ? marks : undefined
}

function normalizeAlignment(attrs: Record<string, unknown> | null, allowed: string[] = ["textAlign"]): RichDocumentResult | Record<string, unknown> | undefined {
  if (!attrs || Object.keys(attrs).length === 0) return undefined
  if (Object.keys(attrs).some((key) => !allowed.includes(key))) return { ok: false, error: "Unsupported paragraph attributes." }
  const alignment = attrs.textAlign
  if (alignment == null) return undefined
  if (typeof alignment !== "string" || !ALIGNMENTS.has(alignment)) return { ok: false, error: "Unsupported text alignment." }
  return { textAlign: alignment }
}

function normalizeNode(value: unknown, state: { characters: number; nodes: number }, parent?: string): RichDocumentResult | RichNode {
  const source = record(value)
  const type = typeof source?.type === "string" ? source.type : ""
  if (!source || !type) return { ok: false, error: "Every document node needs a type." }
  if (type === "text") {
    const text = normalizeText(source.text, state)
    if ("ok" in text) return text
    const marks = normalizeMarks(source.marks)
    if (marks && "ok" in marks) return marks
    return marks ? { ...text, marks } : text
  }
  if (!BLOCKS.has(type)) return { ok: false, error: `Unsupported document node: ${type}.` }
  state.nodes += 1
  if (state.nodes > MAX_NODES) return { ok: false, error: "Document exceeds the permitted size." }
  if (!Array.isArray(source.content)) return { ok: false, error: `${type} requires child content.` }

  const content: RichNode[] = []
  for (const child of source.content) {
    const normalized = normalizeNode(child, state, type)
    if ("ok" in normalized) return normalized
    content.push(normalized)
  }

  if (type === "paragraph" || type === "heading") {
    if (content.some((child) => child.type !== "text")) return { ok: false, error: `${type} may contain text only.` }
    const attrs = normalizeAlignment(record(source.attrs), type === "heading" ? ["textAlign", "level"] : ["textAlign"])
    if (attrs && "ok" in attrs && attrs.ok === false) {
      return attrs as Extract<RichDocumentResult, { ok: false }>
    }
    if (type === "heading") {
      const level = record(source.attrs)?.level
      if (![1, 2, 3].includes(Number(level))) return { ok: false, error: "Headings must use level 1, 2, or 3." }
      return { type, attrs: { ...(attrs || {}), level: Number(level) }, content }
    }
    return attrs ? { type, attrs, content } : { type, content }
  }

  if (type === "bulletList" || type === "orderedList") {
    if (content.some((child) => child.type !== "listItem")) return { ok: false, error: `${type} may contain list items only.` }
  } else if (type === "listItem") {
    if (content.some((child) => !["paragraph", "bulletList", "orderedList"].includes(child.type))) return { ok: false, error: "List items may contain paragraphs and nested lists only." }
  } else if (type === "table") {
    if (content.some((child) => child.type !== "tableRow")) return { ok: false, error: "Tables may contain rows only." }
  } else if (type === "tableRow") {
    if (content.some((child) => !["tableCell", "tableHeader"].includes(child.type))) return { ok: false, error: "Table rows may contain cells only." }
  } else if (type === "tableCell" || type === "tableHeader") {
    if (content.some((child) => !["paragraph", "heading", "bulletList", "orderedList"].includes(child.type))) return { ok: false, error: "Table cells contain unsupported content." }
  }
  if (source.attrs && Object.keys(record(source.attrs) || {}).length) return { ok: false, error: `Unsupported attributes on ${type}.` }
  if (parent === "doc") return { type, content }
  return { type, content }
}

export function validateRichDocument(value: unknown): RichDocumentResult {
  const source = record(value)
  if (!source || source.type !== "doc" || !Array.isArray(source.content)) return { ok: false, error: "A rich document must be a document root." }
  const state = { characters: 0, nodes: 1 }
  const content: RichNode[] = []
  for (const child of source.content) {
    const normalized = normalizeNode(child, state, "doc")
    if ("ok" in normalized) return normalized
    content.push(normalized)
  }
  return { ok: true, document: { type: "doc", content: content.length ? content : [{ type: "paragraph", content: [] }] } }
}

export function plainTextDocument(value: string | null | undefined): RichDocument {
  const blocks = String(value || "").replace(/\r\n/g, "\n").split(/\n{2,}/).map((paragraph) => ({ type: "paragraph", content: paragraph ? [{ type: "text", text: paragraph }] : [] }))
  return { type: "doc", content: blocks.length ? blocks : [{ type: "paragraph", content: [] }] }
}

export function documentPlainText(value: RichDocument | null | undefined): string {
  if (!value) return ""
  const text = (node: RichNode): string => {
    if (node.type === "text") return String(node.text || "")
    return (node.content || []).map(text).join(node.type === "tableRow" ? " | " : "")
  }

  const block = (node: RichNode): string => {
    if (node.type === "paragraph" || node.type === "heading") return text(node)
    if (node.type === "bulletList" || node.type === "orderedList") {
      return (node.content || []).map((item, index) => {
        const content = (item.content || []).map(block).filter(Boolean).join("\n")
        return `${node.type === "orderedList" ? `${index + 1}.` : "-"} ${content}`
      }).join("\n")
    }
    if (node.type === "table") return (node.content || []).map((row) => text(row)).join("\n")
    if (node.type === "listItem") return (node.content || []).map(block).join("\n")
    return text(node)
  }

  return (value.content || [])
    .map(block)
    .join("\n\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;")
}

function richInlineHtml(node: RichNode) {
  let value = escapeHtml(node.text || "")
  for (const mark of node.marks || []) {
    if (mark.type === "bold") value = `<strong>${value}</strong>`
    if (mark.type === "italic") value = `<em>${value}</em>`
    if (mark.type === "underline") value = `<u>${value}</u>`
  }
  return value
}

/**
 * Renders only the constrained document model accepted by validateRichDocument.
 * It deliberately does not accept arbitrary HTML, links, styles, or attributes.
 */
export function renderRichDocumentToHtml(document: RichDocument | null | undefined) {
  if (!document) return ""

  const render = (node: RichNode): string => {
    if (node.type === "text") return richInlineHtml(node)

    const content = (node.content || []).map(render).join("")
    const alignment = typeof node.attrs?.textAlign === "string" && ALIGNMENTS.has(node.attrs.textAlign)
      ? ` style="text-align:${node.attrs.textAlign}"`
      : ""

    if (node.type === "paragraph") return `<p${alignment}>${content || "&nbsp;"}</p>`
    if (node.type === "heading") {
      const level = [1, 2, 3].includes(Number(node.attrs?.level)) ? Number(node.attrs?.level) : 2
      return `<h${level}${alignment}>${content}</h${level}>`
    }
    if (node.type === "bulletList") return `<ul>${content}</ul>`
    if (node.type === "orderedList") return `<ol>${content}</ol>`
    if (node.type === "listItem") return `<li>${content}</li>`
    if (node.type === "table") return `<table class="rich-table"><tbody>${content}</tbody></table>`
    if (node.type === "tableRow") return `<tr>${content}</tr>`
    if (node.type === "tableHeader") return `<th>${content}</th>`
    if (node.type === "tableCell") return `<td>${content}</td>`
    return ""
  }

  return document.content.map(render).join("")
}

function inlineMarkdown(value: string): RichNode[] {
  const parts: RichNode[] = []
  const expression = /(\*\*[^*]+\*\*|\*[^*]+\*|__[^_]+__)/g
  let index = 0
  for (const match of value.matchAll(expression)) {
    if (match.index! > index) parts.push({ type: "text", text: value.slice(index, match.index) })
    const token = match[0]
    const mark = token.startsWith("**") ? "bold" : token.startsWith("__") ? "underline" : "italic"
    parts.push({ type: "text", text: token.slice(mark === "bold" ? 2 : 1, mark === "bold" ? -2 : -1), marks: [{ type: mark }] })
    index = match.index! + token.length
  }
  if (index < value.length || !parts.length) parts.push({ type: "text", text: value.slice(index) })
  return parts.filter((part) => part.text)
}

function paragraph(value: string): RichNode {
  return { type: "paragraph", content: inlineMarkdown(value) }
}

function tableFromLines(lines: string[]): RichNode | null {
  if (lines.length < 2 || !/^\s*\|?\s*:?-{3,}/.test(lines[1])) return null
  const cells = (line: string) => line.trim().replace(/^\||\|$/g, "").split("|").map((cell) => cell.trim())
  const header = cells(lines[0])
  const separator = cells(lines[1])
  if (!header.length || header.length !== separator.length || separator.some((cell) => !/^:?-{3,}:?$/.test(cell))) return null
  const row = (items: string[], type: "tableHeader" | "tableCell") => ({ type: "tableRow", content: items.map((item) => ({ type, content: [paragraph(item)] })) })
  const rows = [row(header, "tableHeader")]
  for (const line of lines.slice(2)) {
    const values = cells(line)
    if (values.length !== header.length) return null
    rows.push(row(values, "tableCell"))
  }
  return { type: "table", content: rows }
}

export function formatPlainTextAsDocument(value: string): RichDocument {
  const lines = String(value || "").replace(/\r\n/g, "\n").split("\n")
  const content: RichNode[] = []
  for (let index = 0; index < lines.length;) {
    const line = lines[index]
    if (!line.trim()) { index += 1; continue }
    if (line.includes("|") && index + 1 < lines.length) {
      const tableLines = [line]
      let cursor = index + 1
      while (cursor < lines.length && lines[cursor].includes("|")) { tableLines.push(lines[cursor]); cursor += 1 }
      const table = tableFromLines(tableLines)
      if (table) { content.push(table); index = cursor; continue }
    }
    const markdownHeading = line.match(/^(#{1,3})\s+(.+)$/)
    const numberedHeading = line.match(/^(\d+(?:\.\d+){1,2})\.?\s+(.+)$/)
    if (markdownHeading || numberedHeading) {
      const level = markdownHeading ? markdownHeading[1].length : Math.min(3, numberedHeading![1].split(".").length)
      content.push({ type: "heading", attrs: { level }, content: inlineMarkdown(markdownHeading ? markdownHeading[2] : numberedHeading![2]) })
      index += 1
      continue
    }
    if (/^[-*+]\s+/.test(line)) {
      const items: RichNode[] = []
      while (index < lines.length && /^[-*+]\s+/.test(lines[index])) { items.push({ type: "listItem", content: [paragraph(lines[index].replace(/^[-*+]\s+/, ""))] }); index += 1 }
      content.push({ type: "bulletList", content: items })
      continue
    }
    if (/^\d+\.\s+/.test(line)) {
      const items: RichNode[] = []
      while (index < lines.length && /^\d+\.\s+/.test(lines[index])) { items.push({ type: "listItem", content: [paragraph(lines[index].replace(/^\d+\.\s+/, ""))] }); index += 1 }
      content.push({ type: "orderedList", content: items })
      continue
    }
    content.push(paragraph(line))
    index += 1
  }
  return { type: "doc", content: content.length ? content : [{ type: "paragraph", content: [] }] }
}

export type RegisterKind = "evidence" | "entities" | "relationships" | "financial" | "chronology" | "correlation" | "findings"

const registerHeadings: Record<RegisterKind, string[]> = {
  evidence: ["Evidence", "Type", "SHA-256", "Verification"],
  entities: ["Entity", "Type", "Verification", "Confidence"],
  relationships: ["Source", "Relationship", "Target", "Verification"],
  financial: ["Date", "Reference", "Amount", "Verification"],
  chronology: ["Date", "Event", "Source", "Verification"],
  correlation: ["Evidence", "Linked record", "Association", "Review state"],
  findings: ["Finding", "Status", "Evidence reference", "Limitation"],
}

export function registerDocument(kind: RegisterKind, rows: string[][]): RichDocument {
  const header = registerHeadings[kind]
  const makeRow = (cells: string[], cellType: "tableHeader" | "tableCell") => ({ type: "tableRow", content: header.map((_, index) => ({ type: cellType, content: [paragraph(cells[index] || "")] })) })
  return { type: "doc", content: [{ type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: `${kind[0].toUpperCase()}${kind.slice(1)} Register` }] }, { type: "table", content: [makeRow(header, "tableHeader"), ...(rows.length ? rows.map((row) => makeRow(row, "tableCell")) : [makeRow(["No authorized records available.", "", "", ""], "tableCell")])] }] }
}
