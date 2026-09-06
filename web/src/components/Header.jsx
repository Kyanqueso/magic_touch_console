export default function Header({ title = 'Magic Touch Console', right = null }) {
  return (
    <header className="flex items-center justify-between bg-purple px-8 py-4 text-white">
      <span className="text-2xl font-extrabold tracking-tight">{title}</span>
      {right}
    </header>
  )
}
