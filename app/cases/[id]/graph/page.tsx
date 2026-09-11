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
  Fingerprint,
  GitBranch,
  Globe,
  Loader2,
  MapPin,
  Network,
  Plus,
  RefreshCw,
  Save,
  ShieldCheck,
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

const nodeStyle = {
  background: "#06110f",
  color: "#20dc73",
  border: "1px solid #20dc73",
  padding: "15px",
  borderRadius: "8px",
  whiteSpace: "pre-line" as const,
}

const ENTITY_TYPES = [
  {
    value: "PERSON",
    label: "PERSON",
  },
  {
    value: "ORGANIZATION",
    label: "ORGANIZATION",
  },
  {
    value: "LOCATION",
    label: "LOCATION",
  },
  {
    value: "EMAIL",
    label: "EMAIL",
  },
  {
    value: "PHONE",
    label: "PHONE",
  },
  {
    value: "USERNAME",
    label: "USERNAME",
  },
  {
    value: "SOCIAL_MEDIA_PROFILE",
    label: "SOCIAL MEDIA PROFILE",
  },
  {
    value: "WEBSITE",
    label: "WEBSITE",
  },
  {
    value: "DOMAIN",
    label: "DOMAIN",
  },
  {
    value: "IP_ADDRESS",
    label: "IP ADDRESS",
  },
  {
    value: "DOCUMENT",
    label: "DOCUMENT",
  },
  {
    value: "VEHICLE",
    label: "VEHICLE",
  },
  {
    value: "CRYPTOCURRENCY_WALLET",
    label: "CRYPTOCURRENCY WALLET",
  },
] as const

const RELATIONSHIP_TYPES = [
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
  entity_type: string
  description?: string | null
  confidence_score?: number | null
  verification_status?: string | null
}

type GraphRelationship = {
  id: string
  source_entity_id: string
  target_entity_id: string
  relationship_type: string
  description?: string | null
  confidence_score?: number | null
  verification_status?: string | null
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

  const loadGraph = useCallback(
    async (refresh = false) => {
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
        ])

        const entityPayload =
          (await entityResponse.json()) as
            | GraphEntity[]
            | GraphErrorResponse

        const relationshipPayload =
          (await relationshipResponse.json()) as
            | GraphRelationship[]
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
                  150 +
                  (index % 4) *
                    220,

                y:
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
    [caseId],
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
                    "unverified",
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
                entityType,

              name:
                trimmedName,

              description:
                description.trim() ||
                null,

              confidence_score:
                Number(
                  confidence,
                ),

              verification_status:
                "unverified",
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
      setDescription("")
      setConfidence(50)
      setEntityType("PERSON")
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
                "unverified",
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

      <div className="h-[calc(100vh-130px)]">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onConnect={onConnect}
          fitView
        >
          <Background />
          <Controls />
          <MiniMap />
        </ReactFlow>
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
              {ENTITY_TYPES.map(
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