"use client"

import {
  Background,
  Controls,
  MiniMap,
  type Connection,
  type Edge,
  type Node,
  ReactFlow,
} from "reactflow"

import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  CircleDot,
  Fingerprint,
  FileText,
  GitBranch,
  Globe,
  Loader2,
  MapPin,
  Network,
  Plus,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  Sparkles,
  User,
  Wallet,
  X,
} from "lucide-react"

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react"

import { useParams } from "next/navigation"

import "reactflow/dist/style.css"
import {
  ENTITY_PALETTE,
  OSINT_TRANSFORMS,
  RELATIONSHIP_TYPES as OSINT_RELATIONSHIP_TYPES,
  VERIFICATION_STATES,
} from "@/lib/osint-workspace"

const nodeStyle = {
  background: "#06110f",
  color: "#20dc73",
  border: "1px solid #20dc73",
  padding: "15px",
  borderRadius: "8px",
  whiteSpace: "pre-line" as const,
}

const RELATIONSHIP_TYPES = [
  ...OSINT_RELATIONSHIP_TYPES.map(
    (value) => ({
      value,
      label: value.replace(
        /_/g,
        " ",
      ),
    }),
  ),
  {
    value: "associated_with",
    label: "Associated With",
  },
  {
    value: "works_for",
    label: "Works For",
  },
  {
    value: "director_of",
    label: "Director Of",
  },
  {
    value: "owner_of",
    label: "Owner Of",
  },
  {
    value: "owns",
    label: "Owns",
  },
  {
    value: "has_profile_on",
    label: "Has Profile On",
  },
  {
    value: "uses_username",
    label: "Uses Username",
  },
  {
    value: "uses_email",
    label: "Uses Email",
  },
  {
    value: "uses_phone",
    label: "Uses Phone",
  },
  {
    value: "registered_at",
    label: "Registered At",
  },
  {
    value: "located_at",
    label: "Located At",
  },
  {
    value: "hosts",
    label: "Hosts",
  },
  {
    value: "resolves_to",
    label: "Resolves To",
  },
  {
    value: "alias_of",
    label: "Alias Of",
  },
  {
    value: "formerly_known_as",
    label: "Formerly Known As",
  },
  {
    value: "linked_to",
    label: "Linked To",
  },
  {
    value: "communicated_with",
    label: "Communicated With",
  },
  {
    value: "financial_connection",
    label: "Financial Connection",
  },
  {
    value: "references",
    label: "References",
  },
] as const

type GraphEntity = {
  id: string
  name: string
  value?: string | null
  entity_type: string
  description?: string | null
  aliases?: string[] | null
  source_provider?: string | null
  source_reference?: string | null
  retrieved_at?: string | null
  confidence_score?: number | null
  verification_status?: string | null
  classification?: string | null
  client_visible?: boolean | null
  notes?: string | null
  last_verified_at?: string | null
  stale_at?: string | null
  position_x?: number | string | null
  position_y?: number | string | null
}

type GraphRelationship = {
  id: string
  source_entity_id: string
  target_entity_id: string
  relationship_type: string
  direction?: string | null
  description?: string | null
  source_reference?: string | null
  client_visible?: boolean | null
  confidence_score?: number | null
  verification_status?: string | null
}

type StagedOsintResult = {
  id: string
  query_entity_id?: string | null
  exact_query_value: string
  query_type: string
  provider: string
  transform: string
  title: string
  entity_type: string
  value: string
  description?: string | null
  source_url?: string | null
  retrieved_at: string
  search_time_ms?: number | null
  import_decision: string
  confidence?: number | string | null
  verification_status: string
  terms_classification: string
  imported_entity_id?: string | null
  imported_relationship_id?: string | null
}

type ReviewTargetType =
  | "entity"
  | "relationship"

type ProvenanceSource = {
  id: string
  source_type: string
  title: string
  url?: string | null
  reliability_score?: number | string | null
}

type ProvenanceEvidence = {
  id: string
  file_name: string
  file_hash?: string | null
  evidence_type?: string | null
}

type OsintPagination = {
  page: number
  page_size: number
  total: number
  total_pages: number
}

function numberOrNull(value: unknown) {
  const numeric = Number(value)
  return Number.isFinite(numeric)
    ? numeric
    : null
}

type GraphErrorResponse = {
  error?: string
}

function entityTypeLabel(value: string) {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase(),
    )
}

function entityNodeLabel(
  entity: GraphEntity,
) {
  return `${entity.name}\n${entityTypeLabel(
    entity.entity_type,
  )}`
}

function relationshipLabel(
  value: string,
) {
  return value.replace(
    /_/g,
    " ",
  )
}

function entityIcon(
  entityType: string,
) {
  switch (entityType) {
    case "PERSON":
      return User

    case "LOCATION":
      return MapPin

    case "DOMAIN":
    case "WEBSITE":
    case "IP_ADDRESS":
      return Globe

    case "CRYPTOCURRENCY_WALLET":
      return Wallet

    case "SOCIAL_MEDIA_PROFILE":
    case "USERNAME":
    case "EMAIL":
    case "PHONE":
    case "DOCUMENT":
    case "VEHICLE":
    case "ORGANIZATION":
    default:
      return Fingerprint
  }
}

function paletteIcon(name: string) {
  switch (name) {
    case "user":
      return User
    case "globe":
      return Globe
    case "building":
      return Building2
    case "map":
      return MapPin
    case "wallet":
      return Wallet
    case "file":
      return FileText
    default:
      return Fingerprint
  }
}

export default function InvestigationGraphPage() {
  const params = useParams()

  const caseId = String(params.id)

  const [nodes, setNodes] =
    useState<Node[]>([])

  const [edges, setEdges] =
    useState<Edge[]>([])

  const [loading, setLoading] =
    useState(true)

  const [refreshing, setRefreshing] =
    useState(false)

  const [savingConnection, setSavingConnection] =
    useState(false)

  const [error, setError] =
    useState<string | null>(null)

  const [actionError, setActionError] =
    useState<string | null>(null)

  const [showEntityPanel, setShowEntityPanel] =
    useState(false)

  const [
    showRelationshipPanel,
    setShowRelationshipPanel,
  ] = useState(false)

  const [creatingEntity, setCreatingEntity] =
    useState(false)

  const [
    creatingRelationship,
    setCreatingRelationship,
  ] = useState(false)

  const [entityName, setEntityName] =
    useState("")

  const [entityType, setEntityType] =
    useState("PERSON")

  const [description, setDescription] =
    useState("")

  const [confidence, setConfidence] =
    useState(50)

  const [source, setSource] =
    useState("")

  const [target, setTarget] =
    useState("")

  const [
    relationshipType,
    setRelationshipType,
  ] = useState("")

  const [
    relationshipDescription,
    setRelationshipDescription,
  ] = useState("")

  const [paletteQuery, setPaletteQuery] =
    useState("")

  const [paletteCategory, setPaletteCategory] =
    useState("All")

  const [customEntityType, setCustomEntityType] =
    useState("")

  const [value, setValue] =
    useState("")

  const [aliases, setAliases] =
    useState("")

  const [verificationStatus, setVerificationStatus] =
    useState("unreviewed")

  const [classification, setClassification] =
    useState("confidential")

  const [clientVisible, setClientVisible] =
    useState(false)

  const [sourceProvider, setSourceProvider] =
    useState("")

  const [sourceReference, setSourceReference] =
    useState("")

  const [notes, setNotes] =
    useState("")

  const [queryEntityId, setQueryEntityId] =
    useState("")

  const [searchQuery, setSearchQuery] =
    useState("")

  const [searchSourceUrl, setSearchSourceUrl] =
    useState("")

  const [searchNotes, setSearchNotes] =
    useState("")

  const [queryType, setQueryType] =
    useState("LEAD")

  const [selectedTransform, setSelectedTransform] =
    useState("manual_open_source_review")

  const [searching, setSearching] =
    useState(false)

  const [stagedResults, setStagedResults] =
    useState<StagedOsintResult[]>([])

  const [
    osintPagination,
    setOsintPagination,
  ] = useState<OsintPagination>({
    page: 1,
    page_size: 25,
    total: 0,
    total_pages: 1,
  })

  const [osintError, setOsintError] =
    useState<string | null>(null)

  const [selectedPivotEntity, setSelectedPivotEntity] =
    useState("")

  const [sources, setSources] =
    useState<ProvenanceSource[]>([])

  const [evidence, setEvidence] =
    useState<ProvenanceEvidence[]>([])

  const [
    provenanceTargetType,
    setProvenanceTargetType,
  ] = useState<"entity" | "relationship">(
    "entity",
  )

  const [
    provenanceTargetId,
    setProvenanceTargetId,
  ] = useState("")

  const [
    provenanceSourceId,
    setProvenanceSourceId,
  ] = useState("")

  const [
    provenanceEvidenceId,
    setProvenanceEvidenceId,
  ] = useState("")

  const [
    provenanceNotes,
    setProvenanceNotes,
  ] = useState("")

  const [
    linkingProvenance,
    setLinkingProvenance,
  ] = useState(false)

  const [
    runningAutomation,
    setRunningAutomation,
  ] = useState(false)

  const [
    automationMessage,
    setAutomationMessage,
  ] = useState<string | null>(null)

  const [
    reviewTargetType,
    setReviewTargetType,
  ] = useState<ReviewTargetType>(
    "entity",
  )

  const [reviewTargetId, setReviewTargetId] =
    useState("")

  const [
    reviewVerificationStatus,
    setReviewVerificationStatus,
  ] = useState("unreviewed")

  const [
    reviewConfidence,
    setReviewConfidence,
  ] = useState(50)

  const [
    reviewSourceReference,
    setReviewSourceReference,
  ] = useState("")

  const [
    reviewNotes,
    setReviewNotes,
  ] = useState("")

  const [updatingReview, setUpdatingReview] =
    useState(false)

  const loadGraph = useCallback(
    async (
      refresh = false,
      osintPage =
        osintPagination.page,
    ) => {
      if (!caseId) {
        return
      }

      try {
        if (refresh) {
          setRefreshing(true)
        } else {
          setLoading(true)
        }

        setError(null)

        const [
          entityResponse,
          relationshipResponse,
          osintResponse,
          provenanceResponse,
        ] = await Promise.all([
          fetch(
            `/api/cases/${encodeURIComponent(
              caseId,
            )}/graph/entities`,
            {
              credentials:
                "include",
              cache: "no-store",
            },
          ),

          fetch(
            `/api/cases/${encodeURIComponent(
              caseId,
            )}/graph/relationships`,
            {
              credentials:
                "include",
              cache: "no-store",
            },
          ),

          fetch(
            `/api/cases/${encodeURIComponent(
              caseId,
            )}/graph/osint?page=${encodeURIComponent(
              String(osintPage),
            )}&page_size=${encodeURIComponent(
              String(
                osintPagination.page_size,
              ),
            )}`,
            {
              credentials:
                "include",
              cache: "no-store",
            },
          ),

          fetch(
            `/api/cases/${encodeURIComponent(
              caseId,
            )}/graph/provenance`,
            {
              credentials:
                "include",
              cache: "no-store",
            },
          ),
        ])

        const entityPayload =
          (await entityResponse.json()) as
            | GraphEntity[]
            | GraphErrorResponse

        const relationshipPayload =
          (await relationshipResponse.json()) as
            | GraphRelationship[]
            | GraphErrorResponse

        const osintPayload =
          (await osintResponse.json()) as
            | {
                results?: StagedOsintResult[]
                pagination?: OsintPagination
              }
            | GraphErrorResponse

        const provenancePayload =
          (await provenanceResponse.json()) as
            | {
                sources?: ProvenanceSource[]
                evidence?: ProvenanceEvidence[]
              }
            | GraphErrorResponse

        if (!entityResponse.ok) {
          throw new Error(
            !Array.isArray(
              entityPayload,
            ) &&
              entityPayload.error
              ? entityPayload.error
              : "Failed to load graph entities",
          )
        }

        if (!relationshipResponse.ok) {
          throw new Error(
            !Array.isArray(
              relationshipPayload,
            ) &&
              relationshipPayload.error
              ? relationshipPayload.error
              : "Failed to load graph relationships",
          )
        }

        if (osintResponse.ok) {
          setStagedResults(
            "results" in osintPayload &&
              Array.isArray(
                osintPayload.results,
              )
              ? osintPayload.results
              : [],
          )
          setOsintError(null)
          if (
            "pagination" in
              osintPayload &&
            osintPayload.pagination
          ) {
            setOsintPagination(
              osintPayload.pagination,
            )
          }
        } else {
          setOsintError(
            "error" in osintPayload &&
              osintPayload.error
              ? osintPayload.error
              : "OSINT staging is not available",
          )
        }

        if (provenanceResponse.ok) {
          setSources(
            "sources" in
              provenancePayload &&
              Array.isArray(
                provenancePayload.sources,
              )
              ? provenancePayload.sources
              : [],
          )

          setEvidence(
            "evidence" in
              provenancePayload &&
              Array.isArray(
                provenancePayload.evidence,
              )
              ? provenancePayload.evidence
              : [],
          )
        }

        const entities =
          Array.isArray(
            entityPayload,
          )
            ? entityPayload
            : []

        const relationships =
          Array.isArray(
            relationshipPayload,
          )
            ? relationshipPayload
            : []

        const graphNodes: Node[] =
          entities.map(
            (
              entity,
              index,
            ) => ({
              id: String(
                entity.id,
              ),

              position: {
                x:
                  numberOrNull(
                    entity.position_x,
                  ) ??
                  150 +
                    (index % 4) *
                      220,

                y:
                  numberOrNull(
                    entity.position_y,
                  ) ??
                  120 +
                    Math.floor(
                      index / 4,
                    ) *
                      170,
              },

              data: {
                label:
                  entityNodeLabel(
                    entity,
                  ),
                entity,
              },

              style: nodeStyle,
            }),
          )

        const graphEdges: Edge[] =
          relationships.map(
            (
              relationship,
              index,
            ) => ({
              id: String(
                relationship.id ??
                  `edge-${index}`,
              ),

              source: String(
                relationship.source_entity_id,
              ),

              target: String(
                relationship.target_entity_id,
              ),

              label:
                relationshipLabel(
                  relationship.relationship_type,
                ),

              data: {
                relationship,
              },

              animated:
                false,
            }),
          )

        setNodes(
          graphNodes,
        )

        setEdges(
          graphEdges,
        )
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load investigation graph",
        )

        setNodes([])
        setEdges([])
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [
      caseId,
      osintPagination.page,
      osintPagination.page_size,
    ],
  )

  useEffect(() => {
    loadGraph()
  }, [loadGraph])

  const entityOptions =
    useMemo(
      () =>
        nodes.map(
          (node) => ({
            id: node.id,
            label: String(
              node.data?.label ||
                node.id,
            ),
          }),
        ),
      [nodes],
    )

  const paletteCategories =
    useMemo(
      () => [
        "All",
        ...Array.from(
          new Set(
            ENTITY_PALETTE.map(
              (item) =>
                item.category,
            ),
          ),
        ),
      ],
      [],
    )

  const filteredPalette =
    useMemo(() => {
      const query =
        paletteQuery
          .trim()
          .toLowerCase()

      return ENTITY_PALETTE.filter(
        (item) =>
          (paletteCategory === "All" ||
            item.category ===
              paletteCategory) &&
          (!query ||
            item.label
              .toLowerCase()
              .includes(query) ||
            item.type
              .toLowerCase()
              .includes(query)),
      )
    }, [
      paletteCategory,
      paletteQuery,
    ])

  const selectedQueryEntity =
    useMemo(
      () =>
        nodes.find(
          (node) =>
            node.id ===
            queryEntityId,
        ),
      [nodes, queryEntityId],
    )

  const selectedTransformMeta =
    OSINT_TRANSFORMS.find(
      (transform) =>
        transform.id ===
        selectedTransform,
    )

  const pivotEdges =
    useMemo(
      () =>
        selectedPivotEntity
          ? edges.filter(
              (edge) =>
                edge.source ===
                  selectedPivotEntity ||
                edge.target ===
                  selectedPivotEntity,
            )
          : edges,
      [edges, selectedPivotEntity],
    )

  const relationshipOptions =
    useMemo(
      () =>
        edges.map((edge) => ({
          id: edge.id,
          label: `${edge.source} ${String(
            edge.label || "linked to",
          )} ${edge.target}`,
        })),
      [edges],
    )

  function selectReviewTarget(
    type: ReviewTargetType,
    id: string,
  ) {
    setReviewTargetType(type)
    setReviewTargetId(id)

    if (type === "entity") {
      const entity = nodes.find(
        (node) => node.id === id,
      )?.data?.entity as
        | GraphEntity
        | undefined

      setReviewVerificationStatus(
        entity?.verification_status ||
          "unreviewed",
      )
      setReviewConfidence(
        Number(
          entity?.confidence_score ??
            50,
        ),
      )
      setReviewSourceReference(
        entity?.source_reference ||
          "",
      )
      setReviewNotes(
        entity?.notes || "",
      )
      return
    }

    const relationship = edges.find(
      (edge) => edge.id === id,
    )?.data?.relationship as
      | GraphRelationship
      | undefined

    setReviewVerificationStatus(
      relationship?.verification_status ||
        "unreviewed",
    )
    setReviewConfidence(
      Number(
        relationship?.confidence_score ??
          50,
      ),
    )
    setReviewSourceReference(
      relationship?.source_reference ||
        "",
    )
    setReviewNotes(
      relationship?.description || "",
    )
  }

  function openEntityFromPalette(
    type: string,
  ) {
    setEntityType(type)
    setEntityName("")
    setDescription("")
    setValue("")
    setAliases("")
    setVerificationStatus("unreviewed")
    setConfidence(50)
    setShowEntityPanel(true)
    setShowRelationshipPanel(false)
  }

  async function savePositions(
    nextNodes: Node[],
  ) {
    await fetch(
      `/api/cases/${encodeURIComponent(
        caseId,
      )}/graph/positions`,
      {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify({
          positions: nextNodes.map(
            (node) => ({
              id: node.id,
              x: node.position.x,
              y: node.position.y,
            }),
          ),
        }),
      },
    ).catch(() => undefined)
  }

  async function runOsintSearch() {
    const queryValue =
      searchQuery.trim() ||
      String(
        selectedQueryEntity?.data
          ?.entity?.value ||
          selectedQueryEntity?.data
            ?.entity?.name ||
          "",
      ).trim()

    if (!queryValue) {
      setOsintError(
        "Enter a query or select a query entity.",
      )
      return
    }

    try {
      setSearching(true)
      setOsintError(null)

      const response = await fetch(
        `/api/cases/${encodeURIComponent(
          caseId,
        )}/graph/osint`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            query: queryValue,
            query_entity_id:
              queryEntityId || null,
            query_type: queryType,
            transform:
              selectedTransform,
            source_url:
              searchSourceUrl.trim() ||
              null,
            notes:
              searchNotes.trim() ||
              null,
          }),
        },
      )

      const payload =
        (await response.json()) as
          | { result?: StagedOsintResult }
          | GraphErrorResponse

      if (!response.ok) {
        throw new Error(
          "error" in payload &&
            payload.error
            ? payload.error
            : "Search failed",
        )
      }

      if (
        "result" in payload &&
        payload.result
      ) {
        setSearchSourceUrl("")
        setSearchNotes("")
        await loadGraph(true, 1)
      }
    } catch (err) {
      setOsintError(
        err instanceof Error
          ? err.message
          : "Search failed",
      )
    } finally {
      setSearching(false)
    }
  }

  async function updateStagedResult(
    resultId: string,
    decision: string,
  ) {
    try {
      setOsintError(null)

      const response = await fetch(
        `/api/cases/${encodeURIComponent(
          caseId,
        )}/graph/osint`,
        {
          method: "PATCH",
          credentials: "include",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            result_id: resultId,
            decision,
            query_entity_id:
              queryEntityId || null,
            relationship_type:
              "derived_from",
            verification_status:
              "candidate",
          }),
        },
      )

      const payload =
        (await response.json()) as
          | StagedOsintResult
          | GraphErrorResponse

      if (!response.ok) {
        throw new Error(
          "error" in payload &&
            payload.error
            ? payload.error
            : "Result update failed",
        )
      }

      await loadGraph(true)
    } catch (err) {
      setOsintError(
        err instanceof Error
          ? err.message
          : "Result update failed",
      )
    }
  }

  async function linkProvenance() {
    if (
      !provenanceTargetId ||
      (!provenanceSourceId &&
        !provenanceEvidenceId)
    ) {
      setOsintError(
        "Choose a graph target and at least one source or evidence item.",
      )
      return
    }

    try {
      setLinkingProvenance(true)
      setOsintError(null)

      const response = await fetch(
        `/api/cases/${encodeURIComponent(
          caseId,
        )}/graph/provenance`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            target_type:
              provenanceTargetType,
            target_id:
              provenanceTargetId,
            source_id:
              provenanceSourceId || null,
            evidence_id:
              provenanceEvidenceId || null,
            analyst_notes:
              provenanceNotes.trim() ||
              null,
          }),
        },
      )

      const payload =
        (await response.json()) as
          | { ok?: boolean }
          | GraphErrorResponse

      if (!response.ok) {
        throw new Error(
          "error" in payload &&
            payload.error
            ? payload.error
            : "Provenance link failed",
        )
      }

      setProvenanceSourceId("")
      setProvenanceEvidenceId("")
      setProvenanceNotes("")
    } catch (err) {
      setOsintError(
        err instanceof Error
          ? err.message
          : "Provenance link failed",
      )
    } finally {
      setLinkingProvenance(false)
    }
  }

  async function updateReviewState() {
    if (!reviewTargetId) {
      setActionError(
        "Select a graph entity or relationship to review.",
      )
      return
    }

    try {
      setUpdatingReview(true)
      setActionError(null)

      const endpoint =
        reviewTargetType ===
        "entity"
          ? "entities"
          : "relationships"

      const response = await fetch(
        `/api/cases/${encodeURIComponent(
          caseId,
        )}/graph/${endpoint}`,
        {
          method: "PATCH",
          credentials: "include",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify(
            reviewTargetType ===
              "entity"
              ? {
                  id: reviewTargetId,
                  verification_status:
                    reviewVerificationStatus,
                  confidence_score:
                    reviewConfidence,
                  source_reference:
                    reviewSourceReference.trim() ||
                    null,
                  notes:
                    reviewNotes.trim() ||
                    null,
                }
              : {
                  id: reviewTargetId,
                  verification_status:
                    reviewVerificationStatus,
                  confidence_score:
                    reviewConfidence,
                  source_reference:
                    reviewSourceReference.trim() ||
                    null,
                  description:
                    reviewNotes.trim() ||
                    null,
                },
          ),
        },
      )

      const payload =
        (await response.json()) as
          | GraphEntity
          | GraphRelationship
          | GraphErrorResponse

      if (!response.ok) {
        throw new Error(
          "error" in payload &&
            payload.error
            ? payload.error
            : "Review update failed",
        )
      }

      await loadGraph(true)
    } catch (err) {
      setActionError(
        err instanceof Error
          ? err.message
          : "Review update failed",
      )
    } finally {
      setUpdatingReview(false)
    }
  }

  async function runGraphAutomation() {
    try {
      setRunningAutomation(true)
      setActionError(null)
      setAutomationMessage(null)

      const response = await fetch(
        `/api/cases/${encodeURIComponent(
          caseId,
        )}/graph/automation`,
        {
          method: "POST",
          credentials: "include",
        },
      )

      const payload =
        (await response.json()) as
          | {
              created?: number
              inspected?: {
                entities?: number
                relationships?: number
              }
            }
          | GraphErrorResponse

      if (!response.ok) {
        throw new Error(
          "error" in payload &&
            payload.error
            ? payload.error
            : "Graph automation failed",
        )
      }

      const created =
        "created" in payload
          ? payload.created ?? 0
          : 0

      setAutomationMessage(
        `Created ${created} review task${created === 1 ? "" : "s"}.`,
      )
    } catch (err) {
      setActionError(
        err instanceof Error
          ? err.message
          : "Graph automation failed",
      )
    } finally {
      setRunningAutomation(false)
    }
  }

  const onConnect =
    useCallback(
      async (
        connection: Connection,
      ) => {
        if (
          !connection.source ||
          !connection.target ||
          savingConnection
        ) {
          return
        }

        if (
          connection.source ===
          connection.target
        ) {
          setActionError(
            "An entity cannot be related to itself.",
          )
          return
        }

        try {
          setSavingConnection(
            true,
          )

          setActionError(null)

          const response =
            await fetch(
              `/api/cases/${encodeURIComponent(
                caseId,
              )}/graph/relationships`,
              {
                method:
                  "POST",

                credentials:
                  "include",

                headers: {
                  "Content-Type":
                    "application/json",
                },

                body: JSON.stringify({
                  source_entity_id:
                    connection.source,

                  target_entity_id:
                    connection.target,

                  relationship_type:
                    "associated_with",

                  description:
                    "Relationship created from the investigation graph.",

                  confidence_score: 50,

                  verification_status:
                    "unreviewed",
                }),
              },
            )

          const result =
            (await response.json()) as
              | GraphRelationship
              | GraphErrorResponse

          if (!response.ok) {
            throw new Error(
              "error" in result &&
                result.error
                ? result.error
                : "Failed to save relationship",
            )
          }

          await loadGraph(
            true,
          )
        } catch (err) {
          setActionError(
            err instanceof Error
              ? err.message
              : "Failed to save relationship",
          )
        } finally {
          setSavingConnection(
            false,
          )
        }
      },
      [
        caseId,
        loadGraph,
        savingConnection,
      ],
    )

  async function createEntity() {
    const trimmedName =
      entityName.trim()

    if (!trimmedName) {
      setActionError(
        "Entity name is required.",
      )
      return
    }

    if (creatingEntity) {
      return
    }

    try {
      setCreatingEntity(
        true,
      )

      setActionError(null)

      const response =
        await fetch(
          `/api/cases/${encodeURIComponent(
            caseId,
          )}/graph/entities`,
          {
            method:
              "POST",

            credentials:
              "include",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              entity_type:
                customEntityType.trim()
                  ? customEntityType
                  : entityType,

              name:
                trimmedName,

              value:
                value.trim() ||
                null,

              description:
                description.trim() ||
                null,

              aliases,

              source_provider:
                sourceProvider.trim() ||
                null,

              source_reference:
                sourceReference.trim() ||
                null,

              confidence_score:
                Number(
                  confidence,
                ),

              verification_status:
                verificationStatus,

              classification,

              client_visible:
                clientVisible,

              notes:
                notes.trim() ||
                null,
            }),
          },
        )

      const result =
        (await response.json()) as
          | GraphEntity
          | GraphErrorResponse

      if (!response.ok) {
        throw new Error(
          "error" in result &&
            result.error
            ? result.error
            : "Entity creation failed",
        )
      }

      setEntityName("")
      setValue("")
      setAliases("")
      setDescription("")
      setConfidence(50)
      setEntityType("PERSON")
      setCustomEntityType("")
      setVerificationStatus("unreviewed")
      setClassification("confidential")
      setClientVisible(false)
      setSourceProvider("")
      setSourceReference("")
      setNotes("")
      setShowEntityPanel(
        false,
      )

      await loadGraph(true)
    } catch (err) {
      setActionError(
        err instanceof Error
          ? err.message
          : "Entity creation failed",
      )
    } finally {
      setCreatingEntity(
        false,
      )
    }
  }

  async function createRelationship() {
    if (
      !source ||
      !target ||
      !relationshipType
    ) {
      setActionError(
        "Complete the relationship information first.",
      )
      return
    }

    if (source === target) {
      setActionError(
        "An entity cannot be related to itself.",
      )
      return
    }

    if (
      creatingRelationship
    ) {
      return
    }

    try {
      setCreatingRelationship(
        true,
      )

      setActionError(null)

      const response =
        await fetch(
          `/api/cases/${encodeURIComponent(
            caseId,
          )}/graph/relationships`,
          {
            method:
              "POST",

            credentials:
              "include",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              source_entity_id:
                source,

              target_entity_id:
                target,

              relationship_type:
                relationshipType,

              description:
                relationshipDescription.trim() ||
                null,

              confidence_score: 50,

              verification_status:
                "unreviewed",
            }),
          },
        )

      const result =
        (await response.json()) as
          | GraphRelationship
          | GraphErrorResponse

      if (!response.ok) {
        throw new Error(
          "error" in result &&
            result.error
            ? result.error
            : "Relationship creation failed",
        )
      }

      setSource("")
      setTarget("")
      setRelationshipType("")
      setRelationshipDescription("")
      setShowRelationshipPanel(
        false,
      )

      await loadGraph(true)
    } catch (err) {
      setActionError(
        err instanceof Error
          ? err.message
          : "Relationship creation failed",
      )
    } finally {
      setCreatingRelationship(
        false,
      )
    }
  }

  function closeEntityPanel() {
    if (creatingEntity) {
      return
    }

    setShowEntityPanel(false)
    setActionError(null)
  }

  function closeRelationshipPanel() {
    if (
      creatingRelationship
    ) {
      return
    }

    setShowRelationshipPanel(
      false,
    )

    setActionError(null)
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#000604] text-[#20dc73]">
        <div className="flex items-center gap-3 text-sm">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading Investigation Graph...
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen bg-[#000604] text-white">
      <header className="flex flex-col gap-4 border-b border-[#123a2d] p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Network className="h-5 w-5 text-[#20dc73]" />

            <p className="font-mono text-xs uppercase tracking-[0.18em] text-[#20dc73]">
              Investigation Intelligence
            </p>
          </div>

          <h1 className="mt-2 text-xl font-bold text-white">
            Investigation Graph
          </h1>

          <p className="mt-1 text-sm text-white/45">
            Case-linked entity and relationship intelligence.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() =>
              loadGraph(true)
            }
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-md border border-[#254936] px-3 py-2 text-sm font-medium text-white/65 transition hover:bg-white/5 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            <RefreshCw
              className={`h-4 w-4 ${
                refreshing
                  ? "animate-spin"
                  : ""
              }`}
            />

            Refresh
          </button>

          <button
            type="button"
            onClick={() => {
              setActionError(null)
              setShowEntityPanel(
                true,
              )
              setShowRelationshipPanel(
                false,
              )
            }}
            className="inline-flex items-center gap-2 rounded-md bg-[#20dc73] px-4 py-2 text-sm font-bold text-black transition hover:bg-[#3aee89]"
          >
            <Plus className="h-4 w-4" />
            Entity
          </button>

          <button
            type="button"
            onClick={() => {
              setActionError(null)
              setShowRelationshipPanel(
                true,
              )
              setShowEntityPanel(
                false,
              )
            }}
            className="inline-flex items-center gap-2 rounded-md border border-[#20dc73] px-4 py-2 text-sm font-semibold text-[#20dc73] transition hover:bg-[#20dc73]/5"
          >
            <GitBranch className="h-4 w-4" />
            Relationship
          </button>

          <button
            type="button"
            onClick={runGraphAutomation}
            disabled={runningAutomation}
            className="inline-flex items-center gap-2 rounded-md border border-[#254936] px-4 py-2 text-sm font-semibold text-white/70 transition hover:bg-white/5 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            {runningAutomation ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            Automate
          </button>
        </div>
      </header>

      {error || actionError ? (
        <div className="mx-4 mt-4 flex items-start gap-3 rounded-lg border border-[#5f2828] bg-[#220d0d] px-4 py-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#ff8989]" />

          <div className="min-w-0">
            <p className="text-sm text-[#ff8989]">
              {actionError ||
                error}
            </p>

            {error ? (
              <button
                type="button"
                onClick={() =>
                  loadGraph()
                }
                className="mt-2 text-xs font-semibold text-[#ffb0b0] underline underline-offset-2"
              >
                Retry
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {automationMessage ? (
        <div className="mx-4 mt-4 flex items-start gap-3 rounded-lg border border-[#1c5a3b] bg-[#082016] px-4 py-3">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#20dc73]" />
          <p className="text-sm text-[#94f8bd]">
            {automationMessage}
          </p>
        </div>
      ) : null}

      <div className="border-b border-[#123a2d] px-4 py-3">
        <div className="flex flex-wrap gap-4 text-xs text-white/35">
          <span>
            <strong className="text-white/65">
              {nodes.length}
            </strong>{" "}
            entities
          </span>

          <span>
            <strong className="text-white/65">
              {edges.length}
            </strong>{" "}
            relationships
          </span>

          {savingConnection ? (
            <span className="inline-flex items-center gap-2 text-[#20dc73]">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Saving relationship...
            </span>
          ) : null}
        </div>
      </div>

      <div className="grid h-[calc(100vh-130px)] grid-cols-1 lg:grid-cols-[320px_minmax(0,1fr)_360px]">
        <aside className="overflow-y-auto border-b border-[#123a2d] bg-[#030a07] p-4 lg:border-b-0 lg:border-r">
          <div className="mb-4">
            <div className="flex items-center gap-2 text-[#20dc73]">
              <CircleDot className="h-4 w-4" />
              <p className="font-mono text-xs uppercase tracking-[0.14em]">
                Entity Palette
              </p>
            </div>

            <div className="mt-3 flex items-center gap-2 rounded-md border border-[#143b28] bg-black px-3">
              <Search className="h-4 w-4 text-white/30" />
              <input
                value={paletteQuery}
                onChange={(event) =>
                  setPaletteQuery(
                    event.target.value,
                  )
                }
                placeholder="Search entity types"
                className="h-10 min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/25"
              />
            </div>

            <select
              value={paletteCategory}
              onChange={(event) =>
                setPaletteCategory(
                  event.target.value,
                )
              }
              className="mt-3 h-10 w-full rounded-md border border-[#143b28] bg-black px-3 text-sm text-white outline-none"
            >
              {paletteCategories.map(
                (category) => (
                  <option
                    key={category}
                    value={category}
                  >
                    {category}
                  </option>
                ),
              )}
            </select>
          </div>

          <div className="space-y-2">
            {filteredPalette.map(
              (item) => {
                const Icon =
                  paletteIcon(
                    item.icon,
                  )

                return (
                  <button
                    key={item.type}
                    type="button"
                    draggable
                    onDragStart={(
                      event,
                    ) => {
                      event.dataTransfer.setData(
                        "application/x-shadownode-entity-type",
                        item.type,
                      )
                    }}
                    onClick={() =>
                      openEntityFromPalette(
                        item.type,
                      )
                    }
                    className="flex w-full items-center gap-3 rounded-md border border-[#123a2d] bg-[#06110f] px-3 py-2 text-left transition hover:border-[#20dc73]/60 hover:bg-[#0a1812]"
                  >
                    <span
                      className="grid h-8 w-8 shrink-0 place-items-center rounded-md border"
                      style={{
                        borderColor:
                          item.color,
                        color: item.color,
                      }}
                    >
                      <Icon className="h-4 w-4" />
                    </span>

                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-white">
                        {item.label}
                      </span>
                      <span className="block truncate text-xs text-white/35">
                        {item.category}
                      </span>
                    </span>
                  </button>
                )
              },
            )}
          </div>
        </aside>

        <main
          className="min-h-[520px]"
          onDragOver={(event) =>
            event.preventDefault()
          }
          onDrop={(event) => {
            const droppedType =
              event.dataTransfer.getData(
                "application/x-shadownode-entity-type",
              )
            if (droppedType) {
              openEntityFromPalette(
                droppedType,
              )
            }
          }}
        >
          <ReactFlow
            nodes={nodes}
            edges={pivotEdges}
            onConnect={onConnect}
            onNodeClick={(
              _event,
              node,
            ) =>
              selectReviewTarget(
                "entity",
                node.id,
              )
            }
            onEdgeClick={(
              _event,
              edge,
            ) =>
              selectReviewTarget(
                "relationship",
                edge.id,
              )
            }
            onNodeDragStop={() =>
              savePositions(nodes)
            }
            fitView
          >
            <Background />
            <Controls />
            <MiniMap />
          </ReactFlow>
        </main>

        <aside className="overflow-y-auto border-t border-[#123a2d] bg-[#030a07] p-4 lg:border-l lg:border-t-0">
          <div className="flex items-center gap-2 text-[#20dc73]">
            <Sparkles className="h-4 w-4" />
            <p className="font-mono text-xs uppercase tracking-[0.14em]">
              Search & Review
            </p>
          </div>

          <div className="mt-4 space-y-3">
            <select
              value={queryEntityId}
              onChange={(event) =>
                setQueryEntityId(
                  event.target.value,
                )
              }
              className="h-10 w-full rounded-md border border-[#143b28] bg-black px-3 text-sm text-white outline-none"
            >
              <option value="">
                Query entity
              </option>
              {entityOptions.map(
                (entity) => (
                  <option
                    key={entity.id}
                    value={entity.id}
                  >
                    {entity.label}
                  </option>
                ),
              )}
            </select>

            <input
              value={searchQuery}
              onChange={(event) =>
                setSearchQuery(
                  event.target.value,
                )
              }
              placeholder="Or enter exact query value"
              className="h-10 w-full rounded-md border border-[#143b28] bg-black px-3 text-sm text-white outline-none placeholder:text-white/25"
            />

            <input
              value={searchSourceUrl}
              onChange={(event) =>
                setSearchSourceUrl(
                  event.target.value,
                )
              }
              placeholder="Source URL/reference, optional"
              className="h-10 w-full rounded-md border border-[#143b28] bg-black px-3 text-sm text-white outline-none placeholder:text-white/25"
            />

            <textarea
              value={searchNotes}
              onChange={(event) =>
                setSearchNotes(
                  event.target.value,
                )
              }
              placeholder="Result preview or analyst notes"
              className="min-h-16 w-full resize-y rounded-md border border-[#143b28] bg-black px-3 py-2 text-sm text-white outline-none placeholder:text-white/25"
            />

            <select
              value={queryType}
              onChange={(event) =>
                setQueryType(
                  event.target.value,
                )
              }
              className="h-10 w-full rounded-md border border-[#143b28] bg-black px-3 text-sm text-white outline-none"
            >
              {ENTITY_PALETTE.map(
                (item) => (
                  <option
                    key={item.type}
                    value={item.type}
                  >
                    {item.label}
                  </option>
                ),
              )}
            </select>

            <select
              value={selectedTransform}
              onChange={(event) =>
                setSelectedTransform(
                  event.target.value,
                )
              }
              className="h-10 w-full rounded-md border border-[#143b28] bg-black px-3 text-sm text-white outline-none"
            >
              {OSINT_TRANSFORMS.map(
                (transform) => (
                  <option
                    key={transform.id}
                    value={transform.id}
                  >
                    {transform.label}
                  </option>
                ),
              )}
            </select>

            {selectedTransformMeta ? (
              <div className="rounded-md border border-[#143b28] bg-black/50 p-3 text-xs text-white/45">
                <div className="flex items-center justify-between gap-3">
                  <span>
                    {selectedTransformMeta.provider}
                  </span>
                  <span className={selectedTransformMeta.configured ? "text-[#20dc73]" : "text-[#f8c14a]"}>
                    {selectedTransformMeta.status}
                  </span>
                </div>
                <p className="mt-2">
                  Cost:{" "}
                  {selectedTransformMeta.estimatedCost}
                </p>
              </div>
            ) : null}

            <button
              type="button"
              onClick={runOsintSearch}
              disabled={searching}
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-[#20dc73] text-sm font-bold text-black transition hover:bg-[#3aee89] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {searching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              Stage Search Result
            </button>
          </div>

          <div className="mt-5">
            <label className="mb-2 block text-xs text-white/40">
              Graph pivot
            </label>
            <select
              value={selectedPivotEntity}
              onChange={(event) =>
                setSelectedPivotEntity(
                  event.target.value,
                )
              }
              className="h-10 w-full rounded-md border border-[#143b28] bg-black px-3 text-sm text-white outline-none"
            >
              <option value="">
                Show all relationships
              </option>
              {entityOptions.map(
                (entity) => (
                  <option
                    key={entity.id}
                    value={entity.id}
                  >
                    {entity.label}
                  </option>
                ),
              )}
            </select>
          </div>

          <div className="mt-5 rounded-md border border-[#123a2d] bg-[#06110f] p-3">
            <div className="flex items-center gap-2 text-[#20dc73]">
              <ShieldCheck className="h-4 w-4" />
              <p className="font-mono text-xs uppercase tracking-[0.14em]">
                Review State
              </p>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setReviewTargetType(
                    "entity",
                  )
                  setReviewTargetId("")
                }}
                className={`rounded-md border px-2 py-2 text-xs font-semibold transition ${
                  reviewTargetType ===
                  "entity"
                    ? "border-[#20dc73] text-[#20dc73]"
                    : "border-[#254936] text-white/50 hover:bg-white/5"
                }`}
              >
                Entity
              </button>
              <button
                type="button"
                onClick={() => {
                  setReviewTargetType(
                    "relationship",
                  )
                  setReviewTargetId("")
                }}
                className={`rounded-md border px-2 py-2 text-xs font-semibold transition ${
                  reviewTargetType ===
                  "relationship"
                    ? "border-[#20dc73] text-[#20dc73]"
                    : "border-[#254936] text-white/50 hover:bg-white/5"
                }`}
              >
                Relationship
              </button>
            </div>

            <select
              value={reviewTargetId}
              onChange={(event) =>
                selectReviewTarget(
                  reviewTargetType,
                  event.target.value,
                )
              }
              className="mt-3 h-10 w-full rounded-md border border-[#143b28] bg-black px-3 text-sm text-white outline-none"
            >
              <option value="">
                Select graph record
              </option>
              {reviewTargetType === "entity"
                ? entityOptions.map(
                    (entity) => (
                      <option
                        key={entity.id}
                        value={entity.id}
                      >
                        {entity.label}
                      </option>
                    ),
                  )
                : relationshipOptions.map(
                    (
                      relationship,
                    ) => (
                      <option
                        key={
                          relationship.id
                        }
                        value={
                          relationship.id
                        }
                      >
                        {relationship.label}
                      </option>
                    ),
                  )}
            </select>

            <select
              value={reviewVerificationStatus}
              onChange={(event) =>
                setReviewVerificationStatus(
                  event.target.value,
                )
              }
              className="mt-3 h-10 w-full rounded-md border border-[#143b28] bg-black px-3 text-sm text-white outline-none"
            >
              {VERIFICATION_STATES.map(
                (state) => (
                  <option
                    key={state}
                    value={state}
                  >
                    {state.replace(
                      /_/g,
                      " ",
                    )}
                  </option>
                ),
              )}
            </select>

            <label className="mt-3 block text-xs text-white/40">
              Confidence:{" "}
              {reviewConfidence}%
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={reviewConfidence}
              onChange={(event) =>
                setReviewConfidence(
                  Number(
                    event.target.value,
                  ),
                )
              }
              className="mt-2 w-full accent-[#20dc73]"
            />

            <input
              value={reviewSourceReference}
              onChange={(event) =>
                setReviewSourceReference(
                  event.target.value,
                )
              }
              placeholder="Source URL/reference"
              className="mt-3 h-10 w-full rounded-md border border-[#143b28] bg-black px-3 text-sm text-white outline-none placeholder:text-white/25"
            />

            <textarea
              value={reviewNotes}
              onChange={(event) =>
                setReviewNotes(
                  event.target.value,
                )
              }
              placeholder={
                reviewTargetType ===
                "entity"
                  ? "Entity review notes"
                  : "Relationship description or review notes"
              }
              className="mt-3 min-h-16 w-full resize-y rounded-md border border-[#143b28] bg-black px-3 py-2 text-sm text-white outline-none placeholder:text-white/25"
            />

            <button
              type="button"
              onClick={updateReviewState}
              disabled={
                updatingReview ||
                !reviewTargetId
              }
              className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-[#20dc73] text-xs font-bold text-black transition hover:bg-[#3aee89] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {updatingReview ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save review
            </button>
          </div>

          <div className="mt-5 rounded-md border border-[#123a2d] bg-[#06110f] p-3">
            <div className="flex items-center gap-2 text-[#20dc73]">
              <CheckCircle2 className="h-4 w-4" />
              <p className="font-mono text-xs uppercase tracking-[0.14em]">
                Provenance Linker
              </p>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setProvenanceTargetType(
                    "entity",
                  )
                  setProvenanceTargetId("")
                }}
                className={`rounded-md border px-2 py-2 text-xs font-semibold transition ${
                  provenanceTargetType ===
                  "entity"
                    ? "border-[#20dc73] text-[#20dc73]"
                    : "border-[#254936] text-white/50 hover:bg-white/5"
                }`}
              >
                Entity
              </button>
              <button
                type="button"
                onClick={() => {
                  setProvenanceTargetType(
                    "relationship",
                  )
                  setProvenanceTargetId("")
                }}
                className={`rounded-md border px-2 py-2 text-xs font-semibold transition ${
                  provenanceTargetType ===
                  "relationship"
                    ? "border-[#20dc73] text-[#20dc73]"
                    : "border-[#254936] text-white/50 hover:bg-white/5"
                }`}
              >
                Relationship
              </button>
            </div>

            <select
              value={provenanceTargetId}
              onChange={(event) =>
                setProvenanceTargetId(
                  event.target.value,
                )
              }
              className="mt-3 h-10 w-full rounded-md border border-[#143b28] bg-black px-3 text-sm text-white outline-none"
            >
              <option value="">
                Graph target
              </option>
              {provenanceTargetType ===
              "entity"
                ? entityOptions.map(
                    (entity) => (
                      <option
                        key={entity.id}
                        value={entity.id}
                      >
                        {entity.label}
                      </option>
                    ),
                  )
                : relationshipOptions.map(
                    (
                      relationship,
                    ) => (
                      <option
                        key={
                          relationship.id
                        }
                        value={
                          relationship.id
                        }
                      >
                        {relationship.label}
                      </option>
                    ),
                  )}
            </select>

            <select
              value={provenanceSourceId}
              onChange={(event) =>
                setProvenanceSourceId(
                  event.target.value,
                )
              }
              className="mt-3 h-10 w-full rounded-md border border-[#143b28] bg-black px-3 text-sm text-white outline-none"
            >
              <option value="">
                Source record
              </option>
              {sources.map((sourceItem) => (
                <option
                  key={sourceItem.id}
                  value={sourceItem.id}
                >
                  {sourceItem.title}
                </option>
              ))}
            </select>

            <select
              value={provenanceEvidenceId}
              onChange={(event) =>
                setProvenanceEvidenceId(
                  event.target.value,
                )
              }
              className="mt-3 h-10 w-full rounded-md border border-[#143b28] bg-black px-3 text-sm text-white outline-none"
            >
              <option value="">
                Evidence item
              </option>
              {evidence.map(
                (evidenceItem) => (
                  <option
                    key={evidenceItem.id}
                    value={evidenceItem.id}
                  >
                    {evidenceItem.file_name}
                  </option>
                ),
              )}
            </select>

            <textarea
              value={provenanceNotes}
              onChange={(event) =>
                setProvenanceNotes(
                  event.target.value,
                )
              }
              placeholder="Link notes"
              className="mt-3 min-h-16 w-full resize-y rounded-md border border-[#143b28] bg-black px-3 py-2 text-sm text-white outline-none placeholder:text-white/25"
            />

            <button
              type="button"
              onClick={linkProvenance}
              disabled={
                linkingProvenance ||
                !provenanceTargetId ||
                (!provenanceSourceId &&
                  !provenanceEvidenceId)
              }
              className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-[#20dc73]/50 px-2 text-xs font-semibold text-[#20dc73] transition hover:bg-[#20dc73]/10 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {linkingProvenance ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              Link provenance
            </button>
          </div>

          {osintError ? (
            <p className="mt-4 rounded-md border border-[#5f2828] bg-[#220d0d] px-3 py-2 text-xs text-[#ff8989]">
              {osintError}
            </p>
          ) : null}

          <div className="mt-5 space-y-3">
            <div className="flex items-center justify-between gap-3 text-xs text-white/40">
              <span>
                {osintPagination.total} staged results
              </span>
              <span>
                Page {osintPagination.page} of{" "}
                {osintPagination.total_pages}
              </span>
            </div>

            {stagedResults.length ? (
              stagedResults.map(
                (result) => {
                  const canReview =
                    result.import_decision ===
                      "staged" ||
                    result.import_decision ===
                      "marked_for_review"

                  return (
                    <div
                      key={result.id}
                      className="rounded-md border border-[#123a2d] bg-[#06110f] p-3"
                    >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-white">
                          {result.title}
                        </p>
                        <p className="mt-1 text-xs text-white/40">
                          {result.provider} / {result.transform}
                        </p>
                      </div>
                      <span className="rounded border border-[#254936] px-2 py-1 text-[11px] text-white/45">
                        {result.import_decision}
                      </span>
                    </div>
                    <p className="mt-2 line-clamp-3 text-xs text-white/50">
                      {result.description ||
                        result.value}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-white/35">
                      <span>
                        {result.entity_type}
                      </span>
                      <span>
                        Confidence {result.confidence ?? 0}%
                      </span>
                      <span>
                        {result.verification_status}
                      </span>
                      {typeof result.search_time_ms ===
                      "number" ? (
                        <span>
                          {result.search_time_ms}ms
                        </span>
                      ) : null}
                    </div>
                    {canReview ? (
                      <div className="mt-3 grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          updateStagedResult(
                            result.id,
                            "add_entity",
                          )
                        }
                        className="rounded-md border border-[#20dc73]/50 px-2 py-2 text-xs font-semibold text-[#20dc73] transition hover:bg-[#20dc73]/10"
                      >
                        Add entity
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          updateStagedResult(
                            result.id,
                            "add_with_relationship",
                          )
                        }
                        disabled={!queryEntityId}
                        className="rounded-md border border-[#20dc73]/50 px-2 py-2 text-xs font-semibold text-[#20dc73] transition hover:bg-[#20dc73]/10 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Add + link
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          updateStagedResult(
                            result.id,
                            "review",
                          )
                        }
                        className="rounded-md border border-[#254936] px-2 py-2 text-xs text-white/60 transition hover:bg-white/5"
                      >
                        Mark review
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          updateStagedResult(
                            result.id,
                            "ignore",
                          )
                        }
                        className="rounded-md border border-[#254936] px-2 py-2 text-xs text-white/60 transition hover:bg-white/5"
                      >
                        Ignore
                      </button>
                      </div>
                    ) : null}
                    {result.source_url ? (
                      <a
                        href={result.source_url}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-3 block truncate text-xs font-semibold text-[#38bdf8] underline underline-offset-2"
                      >
                        Open source
                      </a>
                    ) : null}
                    </div>
                  )
                },
              )
            ) : (
              <p className="rounded-md border border-[#123a2d] bg-[#06110f] p-4 text-sm text-white/40">
                Search results are staged here for review before graph import.
              </p>
            )}

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() =>
                  loadGraph(
                    true,
                    Math.max(
                      1,
                      osintPagination.page -
                        1,
                    ),
                  )
                }
                disabled={
                  osintPagination.page <= 1
                }
                className="rounded-md border border-[#254936] px-2 py-2 text-xs text-white/60 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={() =>
                  loadGraph(
                    true,
                    Math.min(
                      osintPagination.total_pages,
                      osintPagination.page +
                        1,
                    ),
                  )
                }
                disabled={
                  osintPagination.page >=
                  osintPagination.total_pages
                }
                className="rounded-md border border-[#254936] px-2 py-2 text-xs text-white/60 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        </aside>
      </div>

      {showEntityPanel ? (
        <div className="absolute right-5 top-24 z-20 w-[min(28rem,calc(100vw-2.5rem))] rounded-xl border border-[#123a2d] bg-[#06110f] p-5 shadow-2xl shadow-black/50">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Fingerprint className="h-4 w-4 text-[#20dc73]" />

                <p className="font-mono text-xs uppercase tracking-[0.14em] text-[#20dc73]">
                  Graph Entity
                </p>
              </div>

              <h2 className="mt-2 font-bold text-white">
                Create Entity
              </h2>
            </div>

            <button
              type="button"
              onClick={
                closeEntityPanel
              }
              disabled={
                creatingEntity
              }
              className="rounded-md p-2 text-white/35 transition hover:bg-white/5 hover:text-white disabled:opacity-40"
              aria-label="Close entity panel"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-3">
            <input
              value={entityName}
              onChange={(event) =>
                setEntityName(
                  event.target.value,
                )
              }
              placeholder="Entity name"
              disabled={
                creatingEntity
              }
              className="h-11 w-full rounded-md border border-[#143b28] bg-black px-3 text-sm text-white outline-none placeholder:text-white/25 focus:border-[#20dc73]/60"
            />

            <input
              value={value}
              onChange={(event) =>
                setValue(
                  event.target.value,
                )
              }
              placeholder="Value or identifier"
              disabled={
                creatingEntity
              }
              className="h-11 w-full rounded-md border border-[#143b28] bg-black px-3 text-sm text-white outline-none placeholder:text-white/25 focus:border-[#20dc73]/60"
            />

            <select
              value={entityType}
              onChange={(event) =>
                setEntityType(
                  event.target.value,
                )
              }
              disabled={
                creatingEntity
              }
              className="h-11 w-full rounded-md border border-[#143b28] bg-black px-3 text-sm text-white outline-none focus:border-[#20dc73]/60"
            >
              {ENTITY_PALETTE.map(
                (type) => (
                  <option
                    key={
                      type.type
                    }
                    value={
                      type.type
                    }
                  >
                    {type.label}
                  </option>
                ),
              )}
            </select>

            <input
              value={customEntityType}
              onChange={(event) =>
                setCustomEntityType(
                  event.target.value,
                )
              }
              placeholder="Custom entity type, optional"
              disabled={
                creatingEntity
              }
              className="h-11 w-full rounded-md border border-[#143b28] bg-black px-3 text-sm text-white outline-none placeholder:text-white/25 focus:border-[#20dc73]/60"
            />

            <input
              value={aliases}
              onChange={(event) =>
                setAliases(
                  event.target.value,
                )
              }
              placeholder="Aliases, comma separated"
              disabled={
                creatingEntity
              }
              className="h-11 w-full rounded-md border border-[#143b28] bg-black px-3 text-sm text-white outline-none placeholder:text-white/25 focus:border-[#20dc73]/60"
            />

            <textarea
              value={
                description
              }
              onChange={(event) =>
                setDescription(
                  event.target.value,
                )
              }
              placeholder="Description or reasoning"
              disabled={
                creatingEntity
              }
              className="min-h-28 w-full resize-y rounded-md border border-[#143b28] bg-black px-3 py-3 text-sm text-white outline-none placeholder:text-white/25 focus:border-[#20dc73]/60"
            />

            <div>
              <label className="mb-2 block text-xs text-white/40">
                Confidence:{" "}
                {confidence}%
              </label>

              <input
                type="range"
                min="0"
                max="100"
                value={
                  confidence
                }
                onChange={(event) =>
                  setConfidence(
                    Number(
                      event.target
                        .value,
                    ),
                  )
                }
                disabled={
                  creatingEntity
                }
                className="w-full accent-[#20dc73]"
              />
            </div>

            <select
              value={verificationStatus}
              onChange={(event) =>
                setVerificationStatus(
                  event.target.value,
                )
              }
              disabled={
                creatingEntity
              }
              className="h-11 w-full rounded-md border border-[#143b28] bg-black px-3 text-sm text-white outline-none focus:border-[#20dc73]/60"
            >
              {VERIFICATION_STATES.map(
                (state) => (
                  <option
                    key={state}
                    value={state}
                  >
                    {state.replace(
                      /_/g,
                      " ",
                    )}
                  </option>
                ),
              )}
            </select>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <input
                value={sourceProvider}
                onChange={(event) =>
                  setSourceProvider(
                    event.target.value,
                  )
                }
                placeholder="Source/provider"
                disabled={
                  creatingEntity
                }
                className="h-11 rounded-md border border-[#143b28] bg-black px-3 text-sm text-white outline-none placeholder:text-white/25 focus:border-[#20dc73]/60"
              />
              <input
                value={sourceReference}
                onChange={(event) =>
                  setSourceReference(
                    event.target.value,
                  )
                }
                placeholder="Source URL/reference"
                disabled={
                  creatingEntity
                }
                className="h-11 rounded-md border border-[#143b28] bg-black px-3 text-sm text-white outline-none placeholder:text-white/25 focus:border-[#20dc73]/60"
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <select
                value={classification}
                onChange={(event) =>
                  setClassification(
                    event.target.value,
                  )
                }
                disabled={
                  creatingEntity
                }
                className="h-11 rounded-md border border-[#143b28] bg-black px-3 text-sm text-white outline-none focus:border-[#20dc73]/60"
              >
                <option value="confidential">
                  Confidential
                </option>
                <option value="restricted">
                  Restricted
                </option>
                <option value="internal">
                  Internal
                </option>
                <option value="client_shareable">
                  Client shareable
                </option>
              </select>

              <label className="flex h-11 items-center gap-2 rounded-md border border-[#143b28] bg-black px-3 text-sm text-white/65">
                <input
                  type="checkbox"
                  checked={clientVisible}
                  onChange={(event) =>
                    setClientVisible(
                      event.target
                        .checked,
                    )
                  }
                  disabled={
                    creatingEntity
                  }
                  className="accent-[#20dc73]"
                />
                Client visible
              </label>
            </div>

            <textarea
              value={notes}
              onChange={(event) =>
                setNotes(
                  event.target.value,
                )
              }
              placeholder="Analyst notes"
              disabled={
                creatingEntity
              }
              className="min-h-20 w-full resize-y rounded-md border border-[#143b28] bg-black px-3 py-3 text-sm text-white outline-none placeholder:text-white/25 focus:border-[#20dc73]/60"
            />

            <button
              type="button"
              onClick={
                createEntity
              }
              disabled={
                creatingEntity ||
                !entityName.trim()
              }
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-[#20dc73] text-sm font-bold text-black transition hover:bg-[#3aee89] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {creatingEntity ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save Entity
                </>
              )}
            </button>
          </div>
        </div>
      ) : null}

      {showRelationshipPanel ? (
        <div className="absolute right-5 top-24 z-20 w-[min(28rem,calc(100vw-2.5rem))] rounded-xl border border-[#123a2d] bg-[#06110f] p-5 shadow-2xl shadow-black/50">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-[#20dc73]" />

                <p className="font-mono text-xs uppercase tracking-[0.14em] text-[#20dc73]">
                  Graph Relationship
                </p>
              </div>

              <h2 className="mt-2 font-bold text-white">
                Create Relationship
              </h2>
            </div>

            <button
              type="button"
              onClick={
                closeRelationshipPanel
              }
              disabled={
                creatingRelationship
              }
              className="rounded-md p-2 text-white/35 transition hover:bg-white/5 hover:text-white disabled:opacity-40"
              aria-label="Close relationship panel"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-3">
            <select
              value={source}
              onChange={(event) =>
                setSource(
                  event.target.value,
                )
              }
              disabled={
                creatingRelationship
              }
              className="h-11 w-full rounded-md border border-[#143b28] bg-black px-3 text-sm text-white outline-none focus:border-[#20dc73]/60"
            >
              <option value="">
                Source Entity
              </option>

              {entityOptions.map(
                (entity) => (
                  <option
                    key={entity.id}
                    value={entity.id}
                  >
                    {entity.label}
                  </option>
                ),
              )}
            </select>

            <select
              value={target}
              onChange={(event) =>
                setTarget(
                  event.target.value,
                )
              }
              disabled={
                creatingRelationship
              }
              className="h-11 w-full rounded-md border border-[#143b28] bg-black px-3 text-sm text-white outline-none focus:border-[#20dc73]/60"
            >
              <option value="">
                Target Entity
              </option>

              {entityOptions.map(
                (entity) => (
                  <option
                    key={entity.id}
                    value={entity.id}
                  >
                    {entity.label}
                  </option>
                ),
              )}
            </select>

            <select
              value={
                relationshipType
              }
              onChange={(event) =>
                setRelationshipType(
                  event.target.value,
                )
              }
              disabled={
                creatingRelationship
              }
              className="h-11 w-full rounded-md border border-[#143b28] bg-black px-3 text-sm text-white outline-none focus:border-[#20dc73]/60"
            >
              <option value="">
                Relationship
              </option>

              {RELATIONSHIP_TYPES.map(
                (type) => (
                  <option
                    key={
                      type.value
                    }
                    value={
                      type.value
                    }
                  >
                    {type.label}
                  </option>
                ),
              )}
            </select>

            <textarea
              value={
                relationshipDescription
              }
              onChange={(event) =>
                setRelationshipDescription(
                  event.target.value,
                )
              }
              placeholder="Analyst reasoning or notes"
              disabled={
                creatingRelationship
              }
              className="min-h-24 w-full resize-y rounded-md border border-[#143b28] bg-black px-3 py-3 text-sm text-white outline-none placeholder:text-white/25 focus:border-[#20dc73]/60"
            />

            <button
              type="button"
              onClick={
                createRelationship
              }
              disabled={
                creatingRelationship ||
                !source ||
                !target ||
                !relationshipType
              }
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-[#20dc73] text-sm font-bold text-black transition hover:bg-[#3aee89] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {creatingRelationship ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save Relationship
                </>
              )}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
