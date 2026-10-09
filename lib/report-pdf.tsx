import { Document, Font, Image, Page, pdf, StyleSheet, Text, View } from "@react-pdf/renderer"
import type { Style } from "@react-pdf/stylesheet"
import path from "path"
import React from "react"

import type { FrozenReportSnapshot } from "@/lib/report-artifacts"
import type { RichDocument, RichNode } from "@/lib/report-document"

const fontRoot = path.join(process.cwd(), "public/fonts/noto-sans-regular.woff")
const fontBold = path.join(process.cwd(), "public/fonts/noto-sans-bold.woff")

Font.register({ family: "NotoSans", fonts: [{ src: fontRoot, fontWeight: 400 }, { src: fontBold, fontWeight: 700 }] })

const styles = StyleSheet.create({
  page: { paddingTop: 58, paddingBottom: 54, paddingHorizontal: 42, fontFamily: "NotoSans", fontSize: 9, color: "#17211c", lineHeight: 1.45 },
  cover: { paddingTop: 180, paddingBottom: 64, paddingHorizontal: 48, fontFamily: "NotoSans", color: "#17211c" },
  brand: { fontSize: 24, fontWeight: 700, color: "#0d693d", letterSpacing: 1.2 },
  bureau: { fontSize: 9, color: "#0d693d", letterSpacing: 2, marginTop: 3 },
  coverTitle: { marginTop: 80, fontSize: 26, fontWeight: 700, lineHeight: 1.25 },
  coverMeta: { marginTop: 26, borderTopWidth: 2, borderTopColor: "#159957", paddingTop: 14, gap: 6 },
  header: { position: "absolute", top: 20, left: 42, right: 42, flexDirection: "row", justifyContent: "space-between", borderBottomWidth: 1, borderBottomColor: "#cfe5d8", paddingBottom: 6, fontSize: 7, color: "#526258" },
  footer: { position: "absolute", bottom: 19, left: 42, right: 42, flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: "#cfe5d8", paddingTop: 6, fontSize: 7, color: "#526258" },
  heading: { marginTop: 18, marginBottom: 8, fontSize: 15, fontWeight: 700, color: "#0d693d", borderBottomWidth: 1, borderBottomColor: "#cfe5d8", paddingBottom: 4 },
  subheading: { marginTop: 12, marginBottom: 5, fontSize: 11, fontWeight: 700, color: "#23533a" },
  meta: { borderWidth: 1, borderColor: "#cfe5d8", backgroundColor: "#f2f8f5", padding: 10, marginTop: 18 },
  row: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#dce9e0", paddingVertical: 5 },
  label: { width: "28%", color: "#526258", fontSize: 7, textTransform: "uppercase" },
  value: { width: "72%" },
  text: { marginBottom: 7, lineHeight: 1.55 },
  notice: { marginTop: 18, padding: 10, borderWidth: 1, borderColor: "#c9a227", backgroundColor: "#fffbea", fontSize: 8 },
  table: { borderWidth: 1, borderColor: "#cbd8d0", marginTop: 6 },
  tableHead: { flexDirection: "row", backgroundColor: "#0d693d", color: "#ffffff", fontWeight: 700, fontSize: 7 },
  tableRow: { flexDirection: "row", borderTopWidth: 1, borderTopColor: "#dce9e0", fontSize: 7 },
  cell: { padding: 5, borderRightWidth: 1, borderRightColor: "#dce9e0" },
  richParagraph: { marginBottom: 7, lineHeight: 1.55 },
  richHeadingOne: { marginTop: 16, marginBottom: 7, fontSize: 15, fontWeight: 700, color: "#0d693d" },
  richHeadingTwo: { marginTop: 13, marginBottom: 6, fontSize: 12, fontWeight: 700, color: "#23533a" },
  richHeadingThree: { marginTop: 10, marginBottom: 5, fontSize: 10, fontWeight: 700, color: "#23533a" },
  richListItem: { flexDirection: "row", marginBottom: 3, paddingLeft: 8 },
  richListMarker: { width: 14, flexShrink: 0 },
  richListContent: { flexGrow: 1, flexBasis: 0 },
  richTable: { borderWidth: 1, borderColor: "#cbd8d0", marginBottom: 9 },
  richTableHeader: { backgroundColor: "#0d693d", color: "#ffffff", fontWeight: 700 },
  graph: { width: "100%", objectFit: "contain", marginTop: 8 },
  caption: { marginTop: 5, color: "#526258", fontSize: 7, lineHeight: 1.4 },
})

function date(value: unknown) {
  if (!value) return "Not recorded"
  const parsed = new Date(String(value))
  return Number.isNaN(parsed.getTime()) ? String(value) : parsed.toISOString().replace("T", " ").replace(".000Z", " UTC")
}

function HeaderFooter({ reportId, classification }: { reportId: string; classification: string | null }) {
  return <>
    <View fixed style={styles.header}><Text>SHADOWNODE OPERATIONS BUREAU LIMITED</Text><Text>{String(classification || "confidential").toUpperCase()} · CONTROLLED REPORT</Text></View>
    <View fixed style={styles.footer}><Text>Report ID: {reportId}</Text><Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} /></View>
  </>
}

function RichInline({ nodes }: { nodes: RichNode[] }) {
  return <>
    {nodes.map((node, index) => {
      if (node.type !== "text") return null
      let style: Style = {}
      for (const mark of node.marks || []) {
        if (mark.type === "bold") style = { ...style, fontWeight: 700 }
        if (mark.type === "italic") style = { ...style, fontStyle: "italic" }
        if (mark.type === "underline") style = { ...style, textDecoration: "underline" }
      }
      return <Text key={index} style={style}>{node.text || ""}</Text>
    })}
  </>
}

function RichBlocks({ nodes, depth = 0 }: { nodes: RichNode[]; depth?: number }) {
  return <>
    {nodes.map((node, index) => {
      if (node.type === "paragraph") return <Text key={index} style={[styles.richParagraph, { textAlign: String(node.attrs?.textAlign || "left") as "left" | "center" | "right" | "justify" }]}><RichInline nodes={node.content || []} /></Text>
      if (node.type === "heading") {
        const level = Number(node.attrs?.level || 2)
        const style = level === 1 ? styles.richHeadingOne : level === 3 ? styles.richHeadingThree : styles.richHeadingTwo
        return <Text key={index} style={[style, { textAlign: String(node.attrs?.textAlign || "left") as "left" | "center" | "right" | "justify" }]}><RichInline nodes={node.content || []} /></Text>
      }
      if (node.type === "bulletList" || node.type === "orderedList") {
        return <View key={index}>{(node.content || []).map((item, itemIndex) => <View key={itemIndex} style={[styles.richListItem, { paddingLeft: depth * 10 + 8 }]}><Text style={styles.richListMarker}>{node.type === "orderedList" ? `${itemIndex + 1}.` : "•"}</Text><View style={styles.richListContent}><RichBlocks nodes={item.content || []} depth={depth + 1} /></View></View>)}</View>
      }
      if (node.type === "table") {
        return <View key={index} style={styles.richTable}>
          {(node.content || []).map((row, rowIndex) => <View key={rowIndex} style={[styles.tableRow, rowIndex === 0 ? styles.richTableHeader : {}]} wrap={false}>{(row.content || []).map((cell, cellIndex, cells) => <View key={cellIndex} style={[styles.cell, { width: `${100 / Math.max(1, cells.length)}%` }]}><RichBlocks nodes={cell.content || []} depth={depth + 1} /></View>)}</View>)}
        </View>
      }
      return null
    })}
  </>
}

function RichDocumentBlocks({ document, fallback }: { document?: RichDocument | null; fallback: string }) {
  if (!document) return <Text style={styles.text}>{fallback}</Text>
  return <RichBlocks nodes={document.content} />
}

function Register({ headers, rows, widths }: { headers: string[]; rows: string[][]; widths: string[] }) {
  const groups = rows.length ? Array.from({ length: Math.ceil(rows.length / 12) }, (_, index) => rows.slice(index * 12, index * 12 + 12)) : [[]]
  return <>
    {groups.map((group, groupIndex) => <View key={groupIndex} style={styles.table} wrap={false}>
      <View style={styles.tableHead}>{headers.map((header, index) => <Text key={header} style={[styles.cell, { width: widths[index] }]}>{header}</Text>)}</View>
      {group.length ? group.map((row, rowIndex) => <View style={styles.tableRow} wrap={false} key={`${groupIndex}-${rowIndex}-${row.join("-")}`}>{row.map((value, index) => <Text key={index} style={[styles.cell, { width: widths[index] }]}>{value}</Text>)}</View>) : <View style={styles.tableRow}><Text style={[styles.cell, { width: "100%" }]}>No records available.</Text></View>}
    </View>)}
  </>
}

export async function renderReportPdf(input: { snapshot: FrozenReportSnapshot; version: number; graphPngs?: Buffer[]; graphTitle?: string | null; graphDescription?: string | null; exportedAt: string }) {
  const { snapshot } = input
  const report = snapshot.report
  const graphSources = (input.graphPngs || []).map((image) => `data:image/png;base64,${image.toString("base64")}`)
  const graphSource = graphSources[0] || null
  const document = <Document title={report.title || "Investigation Report"} author="SHADOWNODE Operations Bureau Limited" subject={`Case ${report.case_number || report.case_id}`}>
    <Page size="A4" style={styles.cover}>
      <Text style={styles.brand}>SHADOWNODE</Text>
      <Text style={styles.bureau}>OPERATIONS BUREAU LIMITED</Text>
      <Text style={styles.coverTitle}>{report.title || "Investigation Report"}</Text>
      <View style={styles.coverMeta}>
        <Text>Case reference: {report.case_number || report.case_id}</Text>
        <Text>Classification: {String(report.classification || "confidential").toUpperCase()}</Text>
        <Text>Approved report version: {input.version}</Text>
        <Text>Approval record: {report.approved_by_name || "Recorded approving officer"}</Text>
        <Text>Exported: {date(input.exportedAt)}</Text>
      </View>
      <View style={styles.notice}><Text>This controlled investigative report is a work product. Its findings must be assessed against the underlying evidence, provenance, and applicable legal requirements.</Text></View>
    </Page>
    <Page size="A4" style={styles.page}>
      <HeaderFooter reportId={report.id} classification={report.classification} />
      <Text style={styles.heading}>Document Control</Text>
      <View style={styles.meta}>
        {[["Case", `${report.case_number || report.case_id} - ${report.case_title || "Untitled case"}`], ["Report status", report.status || "approved"], ["Classification", report.classification || "confidential"], ["Prepared by", report.created_by_name || "Not recorded"], ["Approved by", report.approved_by_name || "Not recorded"], ["Version", String(input.version)]].map(([label, value]) => <View style={styles.row} key={label}><Text style={styles.label}>{label}</Text><Text style={styles.value}>{value}</Text></View>)}
      </View>
      <Text style={styles.heading}>Executive Summary</Text>
      <RichDocumentBlocks document={report.summary_document} fallback={report.summary || "No executive summary recorded."} />
      {snapshot.sections.map((section, index) => <View key={`${section.order_index}-${section.title}`} wrap><Text style={styles.heading}>{index + 1}. {section.title || section.section_type || "Report section"}</Text><RichDocumentBlocks document={section.content_document} fallback={section.content || "No content recorded."} /></View>)}
      <Text style={styles.heading}>Investigation Graph</Text>
      {graphSource ? <><Image src={graphSource} style={styles.graph} /><Text style={styles.caption}>{input.graphTitle || "Investigation graph"}. {input.graphDescription || "Recorded entities and relationships shown with their stored verification statuses."}</Text></> : <Text style={styles.text}>No graph snapshot was attached to this report version.</Text>}
      <Text style={styles.heading}>Relationship Register</Text>
      <Register headers={["Source", "Relationship", "Target", "Review state"]} widths={["27%", "24%", "27%", "22%"]} rows={snapshot.relationships.map((relationship) => {
        const source = snapshot.entities.find((entity) => entity.id === relationship.source_entity_id)
        const target = snapshot.entities.find((entity) => entity.id === relationship.target_entity_id)
        return [source?.name || source?.value || relationship.source_entity_id, String(relationship.relationship_type || "related to").replaceAll("_", " "), target?.name || target?.value || relationship.target_entity_id, relationship.verification_status || "unreviewed"]
      })} />
      <Text style={styles.heading}>Evidence Register</Text>
      <Register headers={["Evidence", "Type", "SHA-256", "Collection / custodian"]} widths={["29%", "18%", "30%", "23%"]} rows={snapshot.evidence.map((item) => [item.file_name || item.id, item.evidence_type || item.file_type || "Evidence", item.file_hash || "Hash not recorded", `${item.uploaded_by_name || "Not recorded"}\n${date(item.created_at)}`])} />
      <Text style={styles.heading}>Referenced Entities</Text>
      <Register headers={["Entity", "Type", "Verification", "Confidence"]} widths={["38%", "22%", "22%", "18%"]} rows={snapshot.entities.map((entity) => [entity.name || entity.value || entity.id, entity.entity_type || "ENTITY", entity.verification_status || "unreviewed", entity.confidence_score == null ? "Not scored" : `${entity.confidence_score}%`])} />
      <Text style={styles.heading}>Investigation Timeline</Text>
      <Register headers={["Date", "Record", "Detail"]} widths={["24%", "24%", "52%"]} rows={[...snapshot.timeline.map((item) => [date(item.event_date || item.created_at), item.title || "Investigation timeline", item.description || ""]), ...snapshot.updates.map((item) => [date(item.created_at), item.title || item.update_type || "Case update", item.content || ""])].sort((a, b) => a[0].localeCompare(b[0]))} />
      <View style={styles.notice}><Text>Integrity notice: SHA-256 identifies the exact exported PDF bytes recorded by ShadowNode. It does not make a PDF impossible to alter; verification requires comparing a later file’s hash with the recorded artifact hash.</Text></View>
    </Page>
    {graphSources.slice(1).map((source, index) => <Page key={`graph-page-${index + 2}`} size="A4" style={styles.page}>
      <HeaderFooter reportId={report.id} classification={report.classification} />
      <Text style={styles.heading}>Investigation Graph - Detail Page {index + 2}</Text>
      <Image src={source} style={styles.graph} />
      <Text style={styles.caption}>{input.graphTitle || "Investigation graph"}. Detail page {index + 2} of {graphSources.length}. The relationship register identifies every recorded relationship, including those that span detailed pages.</Text>
    </Page>)}
  </Document>
  const output = await pdf(document).toBuffer()
  const chunks: Uint8Array[] = []
  for await (const chunk of output as unknown as AsyncIterable<Uint8Array>) chunks.push(chunk)
  return Buffer.concat(chunks)
}
