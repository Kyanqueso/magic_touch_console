import { useEffect, useState } from 'react'
import { Archive, Loader2, Plus, RotateCcw, Search, Trash2 } from 'lucide-react'
import AppHeader from '../components/AppHeader.jsx'
import Select from '../components/Select.jsx'
import Alert from '../components/Alert.jsx'
import Pagination from '../components/Pagination.jsx'
import SegmentedTabs from '../components/SegmentedTabs.jsx'
import AddCorporateProfileModal from '../components/AddCorporateProfileModal.jsx'
import ConfirmDialog from '../components/ConfirmDialog.jsx'
import CorporateProfileDetail from '../components/CorporateProfileDetail.jsx'
import Loading from '../components/Loading.jsx'
import useAutoAlert from '../hooks/useAutoAlert.js'
import { formatDate } from '../lib/format.js'
import {
  listProfiles,
  getProfile,
  createProfile,
  saveProfileDetails,
  archiveProfile,
  restoreProfile,
  deleteProfile,
} from '../api/profiles.js'

const SORT_OPTIONS = [
  { value: 'latest', label: 'Latest added' },
  { value: 'earliest', label: 'Earliest added' },
  { value: 'az', label: 'Name: A to Z' },
  { value: 'za', label: 'Name: Z to A' },
]

const TABS = [
  { value: 'active', label: 'Active' },
  { value: 'archive', label: 'Archive' },
]

function errMessage(e) {
  if (e?.fields) return Object.values(e.fields).join(' ')
  return e?.message || 'Something went wrong.'
}

export default function CorporateProfilesPage() {
  const [rows, setRows] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [reloadKey, setReloadKey] = useState(0)

  const [query, setQuery] = useState('')
  const [sort, setSort] = useState('')
  const [tab, setTab] = useState('active')
  const [pageSize, setPageSize] = useState(20)
  const [page, setPage] = useState(1)

  const [alert, setAlert] = useAutoAlert()
  const [addOpen, setAddOpen] = useState(false)
  const [archiveTarget, setArchiveTarget] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [restoringId, setRestoringId] = useState(null)
  const [selectedId, setSelectedId] = useState(null)
  const [selected, setSelected] = useState(null)
  const [profileSection, setProfileSection] = useState('details')

  const reload = () => setReloadKey((k) => k + 1)

  // list
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    const t = setTimeout(() => {
      listProfiles({ tab, q: query.trim(), sort, page, size: pageSize })
        .then((res) => {
          if (cancelled) return
          setRows(res.items)
          setTotal(res.total)
        })
        .catch((e) => {
          if (cancelled) return
          setRows([])
          setTotal(0)
          setAlert({ variant: 'danger', title: 'Could not load corporate profiles', message: errMessage(e) })
        })
        .finally(() => !cancelled && setLoading(false))
    }, 250)
    return () => {
      cancelled = true
      clearTimeout(t)
    }
  }, [tab, query, sort, page, pageSize, reloadKey, setAlert])

  // selected profile detail
  useEffect(() => {
    if (!selectedId) {
      setSelected(null)
      return undefined
    }
    let cancelled = false
    getProfile(selectedId)
      .then((p) => !cancelled && setSelected(p))
      .catch((e) => {
        if (cancelled) return
        setAlert({ variant: 'danger', title: 'Could not open profile', message: errMessage(e) })
        setSelectedId(null)
      })
    return () => {
      cancelled = true
    }
  }, [selectedId, reloadKey, setAlert])

  function openProfile(id) {
    setSelectedId(id)
    setProfileSection('details')
  }

  const profileNav = selected
    ? [
        { label: 'Corporate Profiles', onClick: () => setSelectedId(null) },
        {
          label: 'Customers',
          onClick: () => setProfileSection('customers'),
          active: profileSection === 'customers',
        },
        {
          label: 'Suppliers',
          onClick: () => setProfileSection('suppliers'),
          active: profileSection === 'suppliers',
        },
        ...(selected.jobOrdersEnabled
          ? [
              {
                label: 'Job Orders',
                onClick: () => setProfileSection('job-orders'),
                active: profileSection === 'job-orders',
              },
            ]
          : []),
      ]
    : null

  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  const safePage = Math.min(page, pageCount)
  const pageItems = rows

  function resetTo(setter) {
    return (value) => {
      setter(value)
      setPage(1)
    }
  }

  async function handleAdd(name) {
    try {
      await createProfile(name)
    } catch (e) {
      setAlert({ variant: 'danger', title: 'Could not add profile', message: errMessage(e) })
      throw e // keep the modal open
    }
    setAlert({ variant: 'success', title: `${name} added successfully!` })
    setTab('active')
    setPage(1)
    reload()
  }

  async function handleArchive(profile) {
    try {
      await archiveProfile(profile.id)
      setSelectedId(null)
      setAlert({
        variant: 'neutral',
        title: 'Archive Successful',
        message: `${profile.name} can now be found on the archive tab.`,
      })
      reload()
    } catch (e) {
      setAlert({ variant: 'danger', title: 'Archive failed', message: errMessage(e) })
    }
  }

  async function handleSaveDetails(id, data) {
    const updated = await saveProfileDetails(id, data) // let errors bubble to keep the form editing
    setSelected(updated)
    setAlert({ variant: 'success', title: `${data.name} profile saved.` })
    reload()
  }

  async function handleRestore(profile) {
    setRestoringId(profile.id)
    try {
      await restoreProfile(profile.id)
      setAlert({
        variant: 'success',
        title: 'Restore Successful',
        message: `${profile.name} is back on the active tab.`,
      })
      reload()
    } catch (e) {
      setAlert({ variant: 'danger', title: 'Restore failed', message: errMessage(e) })
    } finally {
      setRestoringId(null)
    }
  }

  async function handleDelete(profile) {
    try {
      await deleteProfile(profile.id)
      setAlert({
        variant: 'neutral',
        title: 'Delete Successful',
        message: `${profile.name} has now been permanently deleted.`,
      })
      reload()
    } catch (e) {
      setAlert({ variant: 'danger', title: 'Delete failed', message: errMessage(e) })
    }
  }

  return (
    <div className="min-h-full bg-component-bg">
      {selected ? <AppHeader items={profileNav} title={selected.name} /> : <AppHeader />}

      <main className="mx-auto max-w-6xl px-6 py-8">
       {alert && (
         <div className="mb-4">
           <Alert
             variant={alert.variant}
             title={alert.title}
             onDismiss={() => setAlert(null)}
           >
             {alert.message}
           </Alert>
         </div>
       )}

       {selectedId && !selected ? (
        <Loading label="Loading corporate profile..." />
       ) : selected ? (
        <CorporateProfileDetail
          profile={selected}
          section={profileSection}
          onBack={() => setSelectedId(null)}
          onExitSection={() => setProfileSection('details')}
          onSave={(data) => handleSaveDetails(selected.id, data)}
          onArchive={() => setArchiveTarget(selected)}
        />
       ) : (
        <>
        {/* Controls */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-content-muted" />
            <input
              type="search"
              value={query}
              onChange={(e) => resetTo(setQuery)(e.target.value)}
              placeholder="Search Corporate Profile..."
              className="w-full rounded-lg border border-purple-light bg-white py-3 pl-10 pr-4 text-base text-content outline-none transition-colors placeholder:text-content-muted focus:border-purple focus:ring-2 focus:ring-purple-light"
            />
          </div>

          <Select
            wrapperClassName="w-full md:w-56"
            placeholder="Sort By"
            value={sort}
            onChange={(v) => resetTo(setSort)(v)}
            options={SORT_OPTIONS}
          />

          {tab === 'active' && (
            <button
              type="button"
              onClick={() => setAddOpen(true)}
              className="hidden items-center gap-2 rounded-lg border border-transparent bg-success px-4 py-3 text-base font-bold text-white transition-colors hover:bg-success-hover md:ml-auto md:inline-flex"
            >
              <Plus className="h-4 w-4" />
              Add Corporate Profile
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <SegmentedTabs value={tab} options={TABS} onChange={(v) => resetTo(setTab)(v)} />

          {tab === 'active' && (
            <button
              type="button"
              onClick={() => setAddOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-success px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-success-hover md:hidden"
            >
              <Plus className="h-4 w-4" />
              Add Corporate Profile
            </button>
          )}
        </div>

        {/* Cards */}
        {loading ? (
          <Loading label="Loading corporate profiles..." />
        ) : pageItems.length === 0 ? (
          <p className="mt-10 text-center text-base text-content-muted">
            {tab === 'archive'
              ? 'No Archived Corporate Profiles.'
              : 'No corporate profiles found.'}
          </p>
        ) : (
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {pageItems.map((profile) => (
              <ProfileCard
                key={profile.id}
                profile={profile}
                restoring={restoringId === profile.id}
                onOpen={() => openProfile(profile.id)}
                onArchive={() => setArchiveTarget(profile)}
                onRestore={() => handleRestore(profile)}
                onDelete={() => setDeleteTarget(profile)}
              />
            ))}
          </div>
        )}

        {/* Footer */}
        <Pagination
          page={safePage}
          pageCount={pageCount}
          total={total}
          pageSize={pageSize}
          onPage={setPage}
          onPageSize={(v) => resetTo(setPageSize)(Number(v))}
        />
        </>
       )}
      </main>

      <AddCorporateProfileModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onAdd={handleAdd}
      />

      <ConfirmDialog
        open={Boolean(archiveTarget)}
        onClose={() => setArchiveTarget(null)}
        title="Archive Corporate Profile"
        confirmLabel="Archive"
        loadingLabel="Archiving..."
        confirmVariant="warning"
        confirmIcon={<Archive className="h-4 w-4" />}
        onConfirm={() => handleArchive(archiveTarget)}
      >
        <p>
          Are you sure you want to archive{' '}
          <span className="font-bold">{archiveTarget?.name}</span>?
        </p>
        <p className="mt-2">All data inside will also be archived.</p>
      </ConfirmDialog>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Delete Corporate Profile"
        confirmLabel="Delete"
        loadingLabel="Deleting..."
        confirmVariant="danger"
        confirmIcon={<Trash2 className="h-4 w-4" />}
        onConfirm={() => handleDelete(deleteTarget)}
      >
        <p>
          Permanently delete <span className="font-bold">{deleteTarget?.name}</span>?
        </p>
        <p className="mt-2">All data inside will also be permanently deleted as well.</p>
      </ConfirmDialog>
    </div>
  )
}

function ProfileCard({ profile, restoring, onOpen, onArchive, onRestore, onDelete }) {
  const isArchived = profile.archived

  return (
    <div
      onClick={onOpen}
      className="cursor-pointer rounded-xl border border-purple-light bg-white p-8 shadow-sm transition-all hover:-translate-y-0.5 hover:border-purple hover:shadow-md"
    >
      <div
        className="flex items-start justify-end gap-3"
        onClick={(e) => e.stopPropagation()}
      >
        {isArchived ? (
          <>
            <button
              type="button"
              onClick={onRestore}
              disabled={restoring}
              className="inline-flex items-center gap-1.5 rounded-md bg-warning px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-warning-hover disabled:bg-purple-disabled"
            >
              {restoring ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RotateCcw className="h-4 w-4" />
              )}
              {restoring ? 'Restoring...' : 'Restore'}
            </button>
            <button
              type="button"
              onClick={onDelete}
              aria-label="Delete profile"
              className="inline-flex items-center justify-center rounded-md bg-danger px-2.5 py-1.5 text-white transition-colors hover:bg-danger-hover"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </>
        ) : (
          <>
            <StatusBadge status={profile.status} />
            <button
              type="button"
              onClick={onArchive}
              aria-label="Archive profile"
              className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-warning text-white transition-colors hover:bg-warning-hover"
            >
              <Archive className="h-4 w-4" />
            </button>
          </>
        )}
      </div>

      <h3 className="mt-8 text-center text-xl font-extrabold text-content">
        {profile.name}
      </h3>

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Tag>Added {formatDate(profile.addedAt)}</Tag>
        {!isArchived && <Tag>{profile.customers} customers</Tag>}
        {!isArchived && <Tag>{profile.jobOrders} Job Orders</Tag>}
      </div>
    </div>
  )
}

function StatusBadge({ status }) {
  const color = status === 'Filled Up' ? 'bg-success' : 'bg-info'
  return (
    <span
      className={`inline-flex h-7 items-center rounded-md px-2 text-xs font-bold text-white ${color}`}
    >
      {status}
    </span>
  )
}

function Tag({ children }) {
  return (
    <span className="rounded-full border border-purple-light bg-component-bg px-3 py-1 text-xs font-medium text-content-muted">
      {children}
    </span>
  )
}
