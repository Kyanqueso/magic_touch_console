import { useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { LogOut, Menu, X } from 'lucide-react'
import ConfirmDialog from './ConfirmDialog.jsx'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../lib/auth.jsx'
import { useNavigationGuard } from '../lib/unsavedChanges.jsx'

// `moduleKey` matches modules.key and gates the item; My Profile has none.
export const NAV_ITEMS = [
  { label: 'Corporate Profiles', to: '/corporate-profiles', moduleKey: 'corporate_profiles' },
  { label: 'Chart of Accounts', to: '/chart-of-accounts', moduleKey: 'chart_of_accounts' },
  { label: 'Customers', to: '/customers', moduleKey: 'customers' },
  { label: 'Suppliers', to: '/suppliers', moduleKey: 'suppliers' },
  { label: 'Materials', to: '/materials', moduleKey: 'materials' },
  { label: 'My Profile', to: '/my-profile' },
]

const linkClass = (active) =>
  `border-b-2 pb-1 text-base font-medium transition-colors ${
    active ? 'border-white' : 'border-transparent text-white/80 hover:text-white'
  }`
const mobileLinkClass = (active) =>
  `w-fit border-b-2 py-1 text-base font-medium ${
    active ? 'border-white' : 'border-transparent text-white/80'
  }`

// `items` (optional): [{ label, onClick, active }] renders a scoped nav of
// buttons instead of the default route links. `title` overrides the mobile title.
export default function AppHeader({ items, title }) {
  const [open, setOpen] = useState(false)
  const [confirmLogout, setConfirmLogout] = useState(false)
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { hasModule } = useAuth()
  const guard = useNavigationGuard()

  // Every link goes through the guard, so leaving a half-edited table asks first.
  const go = (to) => (e) => {
    e.preventDefault()
    setOpen(false)
    guard(() => navigate(to))
  }

  const scoped = Array.isArray(items)
  // Hides dead links. Not security - the API enforces the same matrix.
  const navItems = NAV_ITEMS.filter((item) => hasModule(item.moduleKey))
  const current = NAV_ITEMS.find((item) => pathname.startsWith(item.to))
  const headerTitle = title || (current ? current.label : 'Magic Touch Console')

  function requestLogout() {
    setOpen(false)
    setConfirmLogout(true)
  }

  async function doLogout() {
    await supabase.auth.signOut()
    navigate('/login', { replace: true })
  }

  const logoutBtn =
    'items-center gap-1.5 rounded-lg bg-danger px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-danger-hover'

  return (
    <header className="bg-purple text-white">
      <div className="flex items-center justify-between gap-6 px-6 py-4">
        <span className="text-xl font-extrabold tracking-tight md:hidden">{headerTitle}</span>

        <nav className="hidden md:flex md:items-center md:gap-6">
          {scoped
            ? items.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => guard(() => item.onClick?.())}
                  className={linkClass(item.active)}
                >
                  {item.label}
                </button>
              ))
            : navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={go(item.to)}
                  className={({ isActive }) => linkClass(isActive)}
                >
                  {item.label}
                </NavLink>
              ))}
        </nav>

        <button
          type="button"
          onClick={requestLogout}
          className={`hidden md:inline-flex ${logoutBtn}`}
        >
          Logout
          <LogOut className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label="Menu"
          aria-expanded={open}
          className="md:hidden"
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {open && (
        <nav className="flex flex-col gap-2 px-6 pb-4 md:hidden">
          {scoped
            ? items.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => {
                    setOpen(false)
                    guard(() => item.onClick?.())
                  }}
                  className={mobileLinkClass(item.active)}
                >
                  {item.label}
                </button>
              ))
            : navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={go(item.to)}
                  className={({ isActive }) => mobileLinkClass(isActive)}
                >
                  {item.label}
                </NavLink>
              ))}
          <button
            type="button"
            onClick={requestLogout}
            className={`mt-2 inline-flex w-fit ${logoutBtn}`}
          >
            Logout
            <LogOut className="h-4 w-4" />
          </button>
        </nav>
      )}

      <ConfirmDialog
        open={confirmLogout}
        onClose={() => setConfirmLogout(false)}
        title="Log Out"
        confirmLabel="Yes"
        cancelLabel="No"
        loadingLabel="Logging out..."
        confirmVariant="danger"
        confirmIcon={<LogOut className="h-4 w-4" />}
        hideConfirmIcon
        onConfirm={doLogout}
      >
        <p>Are you sure you want to log out?</p>
      </ConfirmDialog>
    </header>
  )
}
