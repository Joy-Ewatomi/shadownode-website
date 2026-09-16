"use client"

import { useEffect, useMemo, useState } from "react"

type User = {
  id: string
  username: string
  email: string
  role: string
  status: string
  display_name?: string
  created_at: string
}

type CurrentUser = {
  id: string
  username: string
  email: string
  role: string
}

const STATUS_OPTIONS = [
  "active",
  "inactive",
  "disabled",
  "suspended",
]

function isSuperAdminRole(role: string | null | undefined) {
  return (
    role === "super_administrator" ||
    role === "super-administrator"
  )
}

function isProtectedRole(role: string) {
  return [
    "client",
    "super_administrator",
    "super-administrator",
    "investigator",
    "analyst",
  ].includes(role)
}

function roleLabel(role: string) {
  return role
    .replace(/_/g, " ")
    .replace(/-/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

export default function UsersAdminPage() {
  const [users, setUsers] = useState<User[]>([])
  const [currentUser, setCurrentUser] =
    useState<CurrentUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    role: "staff",
  })

  const callerIsSuperAdmin =
    isSuperAdminRole(currentUser?.role)

  const createRoleOptions = useMemo(
    () =>
      callerIsSuperAdmin
        ? [
            { value: "staff", label: "Staff" },
            {
              value: "administrator",
              label: "Administrator",
            },
          ]
        : [{ value: "staff", label: "Staff" }],
    [callerIsSuperAdmin],
  )

  async function loadCurrentUser() {
    const res = await fetch("/api/auth/me")
    const data = await res.json()

    if (!res.ok) {
      throw new Error(data.error || "Unable to load current user")
    }

    setCurrentUser(data.user)
  }

  async function loadUsers() {
    try {
      setError(null)

      const res = await fetch("/api/admin/user")
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Failed loading users")
      }

      setUsers(data)
    } catch (loadError) {
      const message =
        loadError instanceof Error
          ? loadError.message
          : "Failed loading users"
      setError(message)
    }
  }

  useEffect(() => {
    async function load() {
      try {
        await loadCurrentUser()
        await loadUsers()
      } catch (loadError) {
        const message =
          loadError instanceof Error
            ? loadError.message
            : "Unable to load employee management"
        setError(message)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  useEffect(() => {
    if (
      !createRoleOptions.some(
        (option) => option.value === form.role,
      )
    ) {
      setForm((current) => ({
        ...current,
        role: createRoleOptions[0]?.value || "staff",
      }))
    }
  }, [createRoleOptions, form.role])

  function getEditableRoleOptions(user: User) {
    if (!currentUser) return []
    if (user.id === currentUser.id) return []
    if (isProtectedRole(user.role)) return []
    if (user.role === "administrator" && !callerIsSuperAdmin) return []

    return callerIsSuperAdmin
      ? [
          { value: "staff", label: "Staff" },
          {
            value: "administrator",
            label: "Administrator",
          },
        ]
      : [{ value: "staff", label: "Staff" }]
  }

  function canEditUser(user: User) {
    return getEditableRoleOptions(user).length > 0
  }

  async function createUser() {
    setError(null)

    const res = await fetch("/api/admin/user", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(form),
    })

    const data = await res.json()

    if (!res.ok) {
      setError(data.error || "Failed creating employee")
      return
    }

    setForm({
      username: "",
      email: "",
      password: "",
      role: createRoleOptions[0]?.value || "staff",
    })

    await loadUsers()
  }

  async function updateUser(
    id: string,
    role: string,
    status: string,
  ) {
    setError(null)

    const res = await fetch("/api/admin/user", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        user_id: id,
        role,
        status,
      }),
    })

    const data = await res.json()

    if (!res.ok) {
      setError(data.error || "Failed updating employee")
      await loadUsers()
      return
    }

    await loadUsers()
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#020604] text-[#20dc73]">
        Loading Users...
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#020604] p-8 text-white">
      <h1 className="text-3xl font-bold text-[#20dc73]">
        Employee Management
      </h1>

      <p className="mt-2 text-white/50">
        Create and manage ShadowNode personnel
      </p>

      {error ? (
        <div className="mt-5 rounded border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
          {error}
        </div>
      ) : null}

      <div className="mt-8 rounded-xl border border-[#143b28] bg-[#06110f] p-6">
        <h2 className="mb-5 text-xl font-bold">
          Create Employee
        </h2>

        <div className="grid gap-4 lg:grid-cols-4">
          <input
            placeholder="Username"
            className="rounded border border-[#143b28] bg-black p-3"
            value={form.username}
            onChange={(event) =>
              setForm({
                ...form,
                username: event.target.value,
              })
            }
          />

          <input
            placeholder="Email"
            className="rounded border border-[#143b28] bg-black p-3"
            value={form.email}
            onChange={(event) =>
              setForm({
                ...form,
                email: event.target.value,
              })
            }
          />

          <input
            placeholder="Password"
            type="password"
            className="rounded border border-[#143b28] bg-black p-3"
            value={form.password}
            onChange={(event) =>
              setForm({
                ...form,
                password: event.target.value,
              })
            }
          />

          <select
            className="rounded border border-[#143b28] bg-black p-3"
            value={form.role}
            onChange={(event) =>
              setForm({
                ...form,
                role: event.target.value,
              })
            }
          >
            {createRoleOptions.map((option) => (
              <option
                key={option.value}
                value={option.value}
              >
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={createUser}
          className="mt-5 rounded bg-[#20dc73] px-6 py-3 font-bold text-black"
        >
          Create Employee
        </button>
      </div>

      <div className="mt-8 space-y-4">
        {users.map((user) => {
          const roleOptions = getEditableRoleOptions(user)
          const editable = canEditUser(user)

          return (
            <div
              key={user.id}
              className="flex items-center justify-between rounded-xl border border-[#143b28] bg-[#06110f] p-5"
            >
              <div>
                <h3 className="font-bold text-[#20dc73]">
                  {user.username}
                </h3>

                <p className="text-white/50">
                  {user.email}
                </p>

                <p className="mt-2 text-sm">
                  Role: {roleLabel(user.role)}
                </p>

                <p className="text-sm">
                  Status: {user.status}
                </p>
              </div>

              {editable ? (
                <div className="flex gap-3">
                  <select
                    className="rounded border border-[#143b28] bg-black p-2"
                    value={user.role}
                    onChange={(event) =>
                      updateUser(
                        user.id,
                        event.target.value,
                        user.status,
                      )
                    }
                  >
                    {roleOptions.map((option) => (
                      <option
                        key={option.value}
                        value={option.value}
                      >
                        {option.label}
                      </option>
                    ))}
                  </select>

                  <select
                    className="rounded border border-[#143b28] bg-black p-2"
                    value={user.status}
                    onChange={(event) =>
                      updateUser(
                        user.id,
                        user.role,
                        event.target.value,
                      )
                    }
                  >
                    {STATUS_OPTIONS.map((status) => (
                      <option
                        key={status}
                        value={status}
                      >
                        {status}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="max-w-xs rounded border border-white/10 bg-black/30 px-3 py-2 text-xs text-white/45">
                  Protected account
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
