"use client"

import type { CSSProperties, ReactNode } from "react"

import type { RichDocument, RichNode } from "@/lib/report-document"

function Inline({ node }: { node: RichNode }) {
  let content: ReactNode = node.text || ""
  for (const mark of node.marks || []) {
    if (mark.type === "bold") content = <strong>{content}</strong>
    if (mark.type === "italic") content = <em>{content}</em>
    if (mark.type === "underline") content = <u>{content}</u>
  }
  return <>{content}</>
}

function NodeContent({ node }: { node: RichNode }) {
  if (node.type === "text") return <Inline node={node} />
  const children = (node.content || []).map((child, index) => <NodeContent key={`${child.type}-${index}`} node={child} />)
  const alignment = typeof node.attrs?.textAlign === "string" ? node.attrs.textAlign : undefined
  if (node.type === "paragraph") return <p className="mb-3 whitespace-pre-wrap leading-7 text-white/70" style={{ textAlign: alignment as CSSProperties["textAlign"] }}>{children}</p>
  if (node.type === "heading") {
    const level = Number(node.attrs?.level || 2)
    const classes = level === 1 ? "mt-7 mb-3 text-2xl font-bold text-white" : level === 2 ? "mt-6 mb-3 text-xl font-bold text-white" : "mt-5 mb-2 text-lg font-semibold text-white"
    if (level === 1) return <h1 className={classes} style={{ textAlign: alignment as CSSProperties["textAlign"] }}>{children}</h1>
    if (level === 3) return <h3 className={classes} style={{ textAlign: alignment as CSSProperties["textAlign"] }}>{children}</h3>
    return <h2 className={classes} style={{ textAlign: alignment as CSSProperties["textAlign"] }}>{children}</h2>
  }
  if (node.type === "bulletList") return <ul className="mb-3 list-disc space-y-1 pl-6 text-white/70">{children}</ul>
  if (node.type === "orderedList") return <ol className="mb-3 list-decimal space-y-1 pl-6 text-white/70">{children}</ol>
  if (node.type === "listItem") return <li>{children}</li>
  if (node.type === "table") return <div className="my-4 overflow-x-auto border border-[#143b28]"><table className="min-w-full border-collapse text-left text-sm">{children}</table></div>
  if (node.type === "tableRow") return <tr className="border-b border-[#143b28]">{children}</tr>
  if (node.type === "tableHeader") return <th className="bg-[#0d693d]/30 px-3 py-2 align-top text-xs font-semibold text-white">{children}</th>
  if (node.type === "tableCell") return <td className="px-3 py-2 align-top text-xs text-white/70">{children}</td>
  return null
}

export default function RichDocumentContent({ document, fallback }: { document?: RichDocument | null; fallback?: string | null }) {
  if (!document) return <p className="whitespace-pre-wrap leading-7 text-white/70">{fallback || "No content recorded."}</p>
  return <>{document.content.map((node, index) => <NodeContent key={`${node.type}-${index}`} node={node} />)}</>
}
