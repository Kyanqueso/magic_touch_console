import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Pencil,
  Plus,
  RotateCcw,
  Save,
  Search,
  Trash2,
  UserRound,
} from 'lucide-react'
import AppHeader from '../components/AppHeader.jsx'
import Select from '../components/Select.jsx'
import Alert from '../components/Alert.jsx'
import Button from '../components/Button.jsx'
import Pagination from '../components/Pagination.jsx'
import SegmentedTabs from '../components/SegmentedTabs.jsx'
import ConfirmDialog from '../components/ConfirmDialog.jsx'
import ActionConfirmDialog, { actionAlert } from '../components/ActionConfirmDialog.jsx'
import EmptyState from '../components/EmptyState.jsx'
import Loading from '../components/Loading.jsx'
import LeaveEditDialog from '../components/LeaveEditDialog.jsx'
import ResetPasswordModal from '../components/ResetPasswordModal.jsx'
import AddUserModal from '../components/AddUserModal.jsx'
import AccessToggle from '../components/AccessToggle.jsx'
import useAutoAlert from '../hooks/useAutoAlert.js'
import { useAuth } from '../lib/auth.jsx'
import { maskPhone, sanitizeEmail } from '../lib/masks.js'
import {
  listModules,
  getUser,
  listUsers,
  createUser,
  deleteUser as apiDeleteUser,
  getUserMatrix,
  setUserMatrix,
  updateUserProfile,
} from '../api/users.js'

const fullName = (u) => `${u.lastName}, ${u.firstName}`

function errMessage(e) {
  if (e?.fields) return Object.values(e.fields).join(' ')
  return e?.message || 'Something went wrong.'
}

const SORT_OPTIONS = [
  { value: 'lastName', label: 'Name: A to Z' },
  { value: '-lastName', label: 'Name: Z to A' },
  { value: 'employeeNo', label: 'ID: ascending' },
  { value: '-employeeNo', label: 'ID: descending' },
]
const PROFILE_TABS = [
  { value: 'profile', label: 'Profile' },
  { value: 'users', label: 'Manage Users' },
]

export default function MyProfilePage() {
  const navigate = useNavigate()
  const { session } = useAuth()
  const myId = session?.user?.id

  const [me, setMe] = useState(null)
  const [loading, setLoading] = useState(true)
  const [modules, setModules] = useState([])
  const [tab, setTab] = useState('profile')
  const [selectedId, setSelectedId] = useState(null)
  const [resetOpen, setResetOpen] = useState(false)
  const [alert, setAlert] = useAutoAlert()

  useEffect(() => {
    if (!myId) return
    let cancelled = false
    setLoading(true)
    Promise.all([getUser(myId), listModules().catch(() => [])])
      .then(([u, mods]) => {
        if (cancelled) return
        setMe(u)
        setModules(mods)
      })
      .catch((e) => {
        if (cancelled) return
        setAlert({ variant: 'danger', title: 'Could not load your profile', message: errMessage(e) })
      })
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [myId, setAlert])

  const isAdmin = me?.role === 'admin'

  async function saveProfile(next) {
    try {
      const updated = await updateUserProfile(me.id, { ...me, ...next, role: me.role })
      setMe((m) => ({ ...m, ...updated }))
      setAlert({ variant: 'success', title: 'Profile updated.' })
    } catch (e) {
      setAlert({ variant: 'danger', title: 'Update failed', message: errMessage(e) })
      throw e
    }
  }

  if (loading || !me) {
    return (
      <div className="min-h-full bg-component-bg">
        <AppHeader />
        <Loading label="Loading your profile..." className="mt-16" />
      </div>
    )
  }

  return (
    <div className="min-h-full bg-component-bg">
      <AppHeader />

      <main className="mx-auto max-w-5xl px-6 py-8">
        {!selectedId && (
          <div className="mb-6 flex items-center gap-4">
            <button
              type="button"
              onClick={() => navigate(-1)}
              aria-label="Back"
              className="shrink-0 rounded-md p-1 text-content transition-colors hover:bg-white"
            >
              <ArrowLeft className="h-6 w-6" />
            </button>

            {isAdmin && (
              <SegmentedTabs
                full
                size="lg"
                value={tab}
                options={PROFILE_TABS}
                onChange={setTab}
                className="flex-1"
              />
            )}
          </div>
        )}

        {alert && (
          <div className="mb-4">
            <Alert variant={alert.variant} title={alert.title} onDismiss={() => setAlert(null)}>
              {alert.message}
            </Alert>
          </div>
        )}

        {selectedId ? (
          <UserAccessPanel
            key={selectedId}
            userId={selectedId}
            onBack={() => setSelectedId(null)}
            onError={(e) =>
              setAlert({ variant: 'danger', title: 'Access update failed', message: errMessage(e) })
            }
            onSaved={() => setAlert({ variant: 'success', title: 'Access updated.' })}
          />
        ) : !isAdmin || tab === 'profile' ? (
          <ProfileView user={me} onSave={saveProfile} onReset={() => setResetOpen(true)} />
        ) : (
          <ManageUsers
            modules={modules}
            onOpen={setSelectedId}
            onNotify={(a) => setAlert(a)}
          />
        )}
      </main>

      <ResetPasswordModal open={resetOpen} onClose={() => setResetOpen(false)} />
    </div>
  )
}

function ProfileView({ user, onSave, onReset }) {
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState(user)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setForm(user)
  }, [user])

  async function save() {
    setSaving(true)
    try {
      await onSave({
        firstName: form.firstName,
        lastName: form.lastName,
        contactNo: form.contactNo,
        email: form.email,
      })
      setEditing(false)
    } catch {
      /* alert shown by caller */
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-purple-light bg-white">
      <div className="flex flex-wrap items-center gap-4 border-b border-purple-light bg-component-bg/50 px-6 py-5 sm:px-8">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-extrabold text-content">
              {user.firstName} {user.lastName}
            </h2>
            {user.role === 'admin' && (
              <span className="rounded-full bg-purple-light px-2 py-0.5 text-xs font-bold text-purple">
                Admin
              </span>
            )}
          </div>
          <p className="truncate text-sm text-content-muted">{user.email}</p>
        </div>
        {editing ? (
          <div className="flex gap-2">
            <Button
              variant="dark"
              size="sm"
              onClick={() => {
                setForm(user)
                setEditing(false)
              }}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button variant="info" size="sm" onClick={save} loading={saving} disabled={saving}>
              Save
            </Button>
          </div>
        ) : (
          <Button variant="info" size="sm" onClick={() => setEditing(true)}>
            <Pencil className="h-4 w-4" />
            Edit
          </Button>
        )}
      </div>

      <div className="px-6 py-6 sm:px-8">
        {editing ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <TextInput label="First Name" value={form.firstName} disabled={saving} maxLength={50} onChange={(v) => setForm((f) => ({ ...f, firstName: v }))} />
            <TextInput label="Last Name" value={form.lastName} disabled={saving} maxLength={50} onChange={(v) => setForm((f) => ({ ...f, lastName: v }))} />
            <TextInput label="Contact No." value={form.contactNo} disabled={saving} inputMode="tel" onChange={(v) => setForm((f) => ({ ...f, contactNo: maskPhone(v) }))} />
            <TextInput label="Email" value={form.email} disabled={saving} inputMode="email" onChange={(v) => setForm((f) => ({ ...f, email: sanitizeEmail(v) }))} />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-x-10 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
            <Detail label="Employee No." value={user.employeeNo} />
            <Detail label="First Name" value={user.firstName} />
            <Detail label="Last Name" value={user.lastName} />
            <Detail label="Contact No." value={user.contactNo} />
            <Detail label="Email" value={user.email} />
          </div>
        )}
      </div>

      <div className="flex justify-center border-t border-purple-light px-6 py-5 sm:px-8">
        <Button onClick={onReset} className="w-full sm:w-auto sm:px-12">
          Reset Password
        </Button>
      </div>
    </div>
  )
}

function Detail({ label, value }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-content-muted">{label}</p>
      <p className="mt-1 text-base font-medium text-content">{value || '—'}</p>
    </div>
  )
}

function TextInput({ label, value, onChange, disabled, ...props }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-bold text-content">{label}</span>
      <input
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="block w-full rounded-lg border border-purple-light bg-white px-3 py-2 text-sm text-content outline-none transition-colors focus:border-purple focus:ring-2 focus:ring-purple-light"
        {...props}
      />
    </label>
  )
}

function UserAccessPanel({ userId, onBack, onSaved, onError }) {
  const [user, setUser] = useState(null)
  const [rows, setRows] = useState([]) // [{ key, name, level }]
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState([])
  const [history, setHistory] = useState([])
  const [saving, setSaving] = useState(false)
  const [leaveTo, setLeaveTo] = useState(null)
  const [confirmUndo, setConfirmUndo] = useState(false)
  const [confirmSave, setConfirmSave] = useState(false)

  useEffect(() => {
    let cancelled = false
    Promise.all([getUser(userId), getUserMatrix(userId)])
      .then(([u, m]) => {
        if (cancelled) return
        setUser(u)
        setRows(m)
      })
      .catch((e) => onError?.(e))
    return () => {
      cancelled = true
    }
  }, [userId, onError])

  function undo() {
    if (!history.length) return
    setDraft(history[history.length - 1])
    setHistory(history.slice(0, -1))
  }

  useEffect(() => {
    if (!editing) return undefined
    function onKey(e) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        undo()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing, history])

  function startEdit() {
    setDraft(rows.map((r) => ({ ...r })))
    setHistory([])
    setEditing(true)
  }

  function exitEdit() {
    setEditing(false)
    setHistory([])
  }

  // Leaving mid-edit throws the draft away, so ask first.
  const dirty = editing && history.length > 0
  function guard(action) {
    if (dirty) setLeaveTo(() => action)
    else action()
  }
  function confirmLeave() {
    const action = leaveTo
    setLeaveTo(null)
    exitEdit()
    action?.()
  }

  function setLevel(key, level) {
    setHistory((h) => [...h, draft])
    setDraft((d) => d.map((r) => (r.key === key ? { ...r, level } : r)))
  }

  async function save() {
    setSaving(true)
    try {
      const saved = await setUserMatrix(userId, draft)
      setRows(saved)
      setEditing(false)
      setHistory([])
      onSaved?.()
    } catch (e) {
      onError?.(e)
    } finally {
      setSaving(false)
    }
  }

  if (!user) {
    return <Loading label="Loading user..." />
  }

  const view = editing ? draft : rows

  return (
    <div>
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={() => guard(onBack)}
          aria-label="Back"
          className="mt-1 rounded-md p-1 text-content transition-colors hover:bg-white"
        >
          <ArrowLeft className="h-6 w-6" />
        </button>
        <div>
          <h2 className="text-xl font-extrabold text-content">
            {user.employeeNo} - {fullName(user)}
          </h2>
          <p className="text-sm text-content-muted">
            {user.contactNo || '—'} | {user.email}
          </p>
        </div>
      </div>

      <div className="mt-6 flex items-center gap-3">
        <h3 className="flex-1 text-base font-bold text-content">Access per module</h3>
        {editing ? (
          <>
            <button
              type="button"
              onClick={() => setConfirmUndo(true)}
              className="rounded-md bg-danger px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-danger-hover"
            >
              Undo All
            </button>
            <button
              type="button"
              onClick={() => setConfirmSave(true)}
              disabled={saving}
              className="rounded-md bg-info px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-info-hover disabled:opacity-60"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={startEdit}
            aria-label="Edit access"
            className="rounded-md bg-info p-1.5 text-white transition-colors hover:bg-info-hover"
          >
            <Pencil className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="mt-4 space-y-3">
        {view.map((m) => (
          <div
            key={m.key}
            className="flex flex-col gap-2 rounded-xl border border-purple-light bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <span className="font-bold text-content">{m.name}</span>
            <AccessToggle value={m.level} editing={editing} onChange={(lvl) => setLevel(m.key, lvl)} />
          </div>
        ))}
      </div>

      {editing && (
        <p className="mt-4 text-sm text-content-muted">
          Editing — <span className="font-semibold">Ctrl&nbsp;+&nbsp;Z</span> undoes your last
          change, or use Undo&nbsp;All.
        </p>
      )}

      <LeaveEditDialog
        open={Boolean(leaveTo)}
        onClose={() => setLeaveTo(null)}
        onConfirm={confirmLeave}
      />

      <ConfirmDialog
        open={confirmUndo}
        onClose={() => setConfirmUndo(false)}
        title="Undo All Changes"
        confirmLabel="Undo All"
        cancelLabel="No"
        loadingLabel="Reverting..."
        confirmVariant="danger"
        confirmIcon={<RotateCcw className="h-4 w-4" />}
        onConfirm={exitEdit}
      >
        <p>Are you sure you want to undo all your changes?</p>
      </ConfirmDialog>

      <ConfirmDialog
        open={confirmSave}
        onClose={() => setConfirmSave(false)}
        title="Save Changes"
        confirmLabel="Save Changes"
        cancelLabel="Cancel"
        loadingLabel="Saving..."
        confirmVariant="info"
        confirmIcon={<Save className="h-4 w-4" />}
        onConfirm={save}
      >
        <p>Save the module access changes for this user?</p>
      </ConfirmDialog>
    </div>
  )
}

function ManageUsers({ modules, onOpen, onNotify }) {
  const [rows, setRows] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [reloadKey, setReloadKey] = useState(0)
  const reload = () => setReloadKey((k) => k + 1)

  const [query, setQuery] = useState('')
  const [sort, setSort] = useState('')
  const [pageSize, setPageSize] = useState(20)
  const [page, setPage] = useState(1)
  const [addOpen, setAddOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)

  const term = query.trim()

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    const t = setTimeout(() => {
      listUsers({ q: term, sort, page, size: pageSize })
        .then((res) => {
          if (cancelled) return
          setRows(res.items)
          setTotal(res.total)
        })
        .catch((e) => {
          if (cancelled) return
          setRows([])
          setTotal(0)
          onNotify({ variant: 'danger', title: 'Could not load users', message: errMessage(e) })
        })
        .finally(() => !cancelled && setLoading(false))
    }, 250)
    return () => {
      cancelled = true
      clearTimeout(t)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [term, sort, page, pageSize, reloadKey])

  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  const safePage = Math.min(page, pageCount)

  const sortOptions = useMemo(() => SORT_OPTIONS, [])

  async function addUser(data) {
    try {
      await createUser(data)
    } catch (e) {
      onNotify({ variant: 'danger', title: 'Could not add user', message: errMessage(e) })
      throw e
    }
    onNotify({ variant: 'success', title: `${data.lastName}, ${data.firstName} added successfully!` })
    reload()
  }

  async function removeUser(userId) {
    const u = rows.find((x) => x.id === userId)
    try {
      await apiDeleteUser(userId)
      onNotify(
        actionAlert(
          'delete',
          [{ id: userId, primary: u?.employeeNo || userId, secondary: u ? fullName(u) : '' }],
          'user',
        ),
      )
      reload()
    } catch (e) {
      onNotify({ variant: 'danger', title: 'Could not delete user', message: errMessage(e) })
    }
  }

  return (
    <div>
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-content-muted" />
          <input
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setPage(1)
            }}
            placeholder="Search User..."
            className="w-full rounded-lg border border-purple-light bg-white py-3 pl-10 pr-4 text-base text-content outline-none transition-colors placeholder:text-content-muted focus:border-purple focus:ring-2 focus:ring-purple-light"
          />
        </div>
        <Select
          wrapperClassName="w-full md:w-56"
          placeholder="Sort By"
          value={sort}
          onChange={(v) => {
            setSort(v)
            setPage(1)
          }}
          options={sortOptions}
        />
        <button
          type="button"
          onClick={() => setAddOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg border border-transparent bg-success px-4 py-3 text-base font-bold text-white transition-colors hover:bg-success-hover md:ml-auto"
        >
          <Plus className="h-4 w-4" />
          Add User
        </button>
      </div>

      {loading ? (
        <Loading label="Loading users..." />
      ) : rows.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            icon={UserRound}
            title={term ? `No users match "${term}"` : 'No users yet'}
            subtitle={term ? 'Try a different search term.' : 'Use "Add User" to create one.'}
          />
        </div>
      ) : (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((u) => (
            <div
              key={u.id}
              onClick={() => onOpen(u.id)}
              className="cursor-pointer rounded-xl border border-purple-light bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-purple hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-base font-extrabold text-content">#{u.employeeNo}</p>
                  <p className="mt-0.5 truncate text-sm font-semibold text-content">{fullName(u)}</p>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    setDeleteTarget(u)
                  }}
                  aria-label="Delete user"
                  className="shrink-0 rounded-md bg-danger p-1 text-white transition-colors hover:bg-danger-hover"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="mt-3 space-y-0.5 text-sm text-content-muted">
                <p className="truncate">{u.email}</p>
                <p>{u.contactNo || '—'}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <Pagination
        page={safePage}
        pageCount={pageCount}
        total={total}
        pageSize={pageSize}
        onPage={setPage}
        onPageSize={(v) => {
          setPageSize(Number(v))
          setPage(1)
        }}
      />

      <AddUserModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onAdd={addUser}
        modules={modules}
      />

      <ActionConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={async () => {
          await removeUser(deleteTarget.id)
        }}
        action="delete"
        entityLabel="User"
        items={
          deleteTarget
            ? [
                {
                  id: deleteTarget.id,
                  primary: deleteTarget.employeeNo || deleteTarget.id,
                  secondary: fullName(deleteTarget),
                },
              ]
            : []
        }
      />
    </div>
  )
}
