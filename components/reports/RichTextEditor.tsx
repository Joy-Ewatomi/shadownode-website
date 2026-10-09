"use client"

import { EditorContent, useEditor } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import TextAlign from "@tiptap/extension-text-align"
import Underline from "@tiptap/extension-underline"
import { Table } from "@tiptap/extension-table"
import TableCell from "@tiptap/extension-table-cell"
import TableHeader from "@tiptap/extension-table-header"
import TableRow from "@tiptap/extension-table-row"
import { AlignCenter, AlignJustify, AlignLeft, AlignRight, Bold, CaseLower, CaseSensitive, CaseUpper, Columns3, Heading1, Heading2, Heading3, Italic, List, ListOrdered, Redo2, RemoveFormatting, Rows3, Table2, Trash2, Underline as UnderlineIcon, Undo2, type LucideIcon } from "lucide-react"
import { useEffect } from "react"
import type { Mark } from "@tiptap/pm/model"

import type { RichDocument } from "@/lib/report-document"

const buttonClass = "grid h-8 min-w-8 place-items-center rounded border border-[#143b28] px-1 text-white/65 transition hover:border-[#20dc73]/45 hover:bg-[#20dc73]/10 hover:text-[#20dc73] disabled:cursor-not-allowed disabled:opacity-30"

function titleCase(value: string) {
  return value.toLowerCase().replace(/\b([a-z])/g, (letter) => letter.toUpperCase())
}

export default function RichTextEditor({ value, onChange, disabled = false, label }: { value: RichDocument; onChange: (document: RichDocument) => void; disabled?: boolean; label: string }) {
  const editor = useEditor({
    immediatelyRender: false,
    editable: !disabled,
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Underline,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Table.configure({ resizable: false }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: value,
    editorProps: { attributes: { class: "min-h-52 px-4 py-3 outline-none prose-invert max-w-none text-sm leading-7 text-white/75" } },
    onUpdate: ({ editor: current }) => onChange(current.getJSON() as RichDocument),
  })

  useEffect(() => {
    if (!editor) return
    editor.setEditable(!disabled)
  }, [editor, disabled])

  useEffect(() => {
    if (!editor) return
    const next = JSON.stringify(value)
    if (JSON.stringify(editor.getJSON()) !== next) editor.commands.setContent(value, { emitUpdate: false })
  }, [editor, value])

  function transformSelection(transform: (value: string) => string) {
    if (!editor || disabled) return
    const { from, to } = editor.state.selection
    if (from === to) return
    const replacements: Array<{ from: number; to: number; text: string; marks: readonly Mark[] }> = []
    editor.state.doc.nodesBetween(from, to, (node, position) => {
      if (!node.isText || !node.text) return
      const start = Math.max(from, position)
      const end = Math.min(to, position + node.nodeSize)
      const relativeStart = start - position
      const relativeEnd = end - position
      replacements.push({ from: start, to: end, text: transform(node.text.slice(relativeStart, relativeEnd)), marks: node.marks })
    })
    const transaction = editor.state.tr
    for (const item of replacements.reverse()) transaction.replaceWith(item.from, item.to, editor.state.schema.text(item.text, item.marks))
    if (transaction.docChanged) editor.view.dispatch(transaction)
  }

  if (!editor) return <div className="min-h-52 animate-pulse rounded-md border border-[#143b28] bg-black/30" aria-label={`${label} loading`} />
  const command = (run: () => void) => () => { if (!disabled) run() }
  const active = (name: string, attrs?: Record<string, unknown>) => editor.isActive(name, attrs) ? "border-[#20dc73]/60 bg-[#20dc73]/15 text-[#20dc73]" : ""

  return <div className="overflow-hidden rounded-md border border-[#143b28] bg-black/30 focus-within:border-[#20dc73]/55">
    {!disabled ? <div className="flex flex-wrap gap-1 border-b border-[#143b28] bg-[#06110f] p-2" role="toolbar" aria-label={`${label} formatting`}>
      <button type="button" title="Undo" aria-label="Undo" className={buttonClass} onClick={command(() => editor.chain().focus().undo().run())} disabled={!editor.can().undo()}><Undo2 className="h-3.5 w-3.5" /></button>
      <button type="button" title="Redo" aria-label="Redo" className={buttonClass} onClick={command(() => editor.chain().focus().redo().run())} disabled={!editor.can().redo()}><Redo2 className="h-3.5 w-3.5" /></button>
      <span className="mx-1 h-8 w-px bg-[#143b28]" />
      <button type="button" title="Bold" aria-label="Bold" className={`${buttonClass} ${active("bold")}`} onClick={command(() => editor.chain().focus().toggleBold().run())}><Bold className="h-3.5 w-3.5" /></button>
      <button type="button" title="Italic" aria-label="Italic" className={`${buttonClass} ${active("italic")}`} onClick={command(() => editor.chain().focus().toggleItalic().run())}><Italic className="h-3.5 w-3.5" /></button>
      <button type="button" title="Underline" aria-label="Underline" className={`${buttonClass} ${active("underline")}`} onClick={command(() => editor.chain().focus().toggleUnderline().run())}><UnderlineIcon className="h-3.5 w-3.5" /></button>
      <button type="button" title="Clear formatting" aria-label="Clear formatting" className={buttonClass} onClick={command(() => editor.chain().focus().unsetAllMarks().clearNodes().run())}><RemoveFormatting className="h-3.5 w-3.5" /></button>
      <span className="mx-1 h-8 w-px bg-[#143b28]" />
      {([[1, Heading1], [2, Heading2], [3, Heading3]] as Array<[1 | 2 | 3, LucideIcon]>).map(([level, Icon]) => <button key={level} type="button" title={`Heading ${level}`} aria-label={`Heading ${level}`} className={`${buttonClass} ${active("heading", { level })}`} onClick={command(() => editor.chain().focus().toggleHeading({ level }).run())}><Icon className="h-3.5 w-3.5" /></button>)}
      <button type="button" title="Bullet list" aria-label="Bullet list" className={`${buttonClass} ${active("bulletList")}`} onClick={command(() => editor.chain().focus().toggleBulletList().run())}><List className="h-3.5 w-3.5" /></button>
      <button type="button" title="Numbered list" aria-label="Numbered list" className={`${buttonClass} ${active("orderedList")}`} onClick={command(() => editor.chain().focus().toggleOrderedList().run())}><ListOrdered className="h-3.5 w-3.5" /></button>
      <span className="mx-1 h-8 w-px bg-[#143b28]" />
      {([["left", AlignLeft], ["center", AlignCenter], ["right", AlignRight], ["justify", AlignJustify]] as Array<["left" | "center" | "right" | "justify", LucideIcon]>).map(([alignment, Icon]) => <button key={alignment} type="button" title={`Align ${alignment}`} aria-label={`Align ${alignment}`} className={`${buttonClass} ${active("paragraph", { textAlign: alignment })}`} onClick={command(() => editor.chain().focus().setTextAlign(alignment).run())}><Icon className="h-3.5 w-3.5" /></button>)}
      <span className="mx-1 h-8 w-px bg-[#143b28]" />
      <button type="button" title="Uppercase selection" aria-label="Uppercase selection" className={buttonClass} onClick={() => transformSelection((text) => text.toUpperCase())}><CaseUpper className="h-3.5 w-3.5" /></button>
      <button type="button" title="Lowercase selection" aria-label="Lowercase selection" className={buttonClass} onClick={() => transformSelection((text) => text.toLowerCase())}><CaseLower className="h-3.5 w-3.5" /></button>
      <button type="button" title="Title case selection" aria-label="Title case selection" className={buttonClass} onClick={() => transformSelection(titleCase)}><CaseSensitive className="h-3.5 w-3.5" /></button>
      <span className="mx-1 h-8 w-px bg-[#143b28]" />
      <button type="button" title="Insert table" aria-label="Insert table" className={buttonClass} onClick={command(() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run())}><Table2 className="h-3.5 w-3.5" /></button>
      <button type="button" title="Add row" aria-label="Add row" className={buttonClass} onClick={command(() => editor.chain().focus().addRowAfter().run())}><Rows3 className="h-3.5 w-3.5" /></button>
      <button type="button" title="Add column" aria-label="Add column" className={buttonClass} onClick={command(() => editor.chain().focus().addColumnAfter().run())}><Columns3 className="h-3.5 w-3.5" /></button>
      <button type="button" title="Delete row" aria-label="Delete row" className={buttonClass} onClick={command(() => editor.chain().focus().deleteRow().run())}><Rows3 className="h-3.5 w-3.5 text-red-300" /></button>
      <button type="button" title="Delete column" aria-label="Delete column" className={buttonClass} onClick={command(() => editor.chain().focus().deleteColumn().run())}><Columns3 className="h-3.5 w-3.5 text-red-300" /></button>
      <button type="button" title="Delete table" aria-label="Delete table" className={buttonClass} onClick={command(() => editor.chain().focus().deleteTable().run())}><Trash2 className="h-3.5 w-3.5 text-red-300" /></button>
    </div> : null}
    <EditorContent editor={editor} />
  </div>
}
