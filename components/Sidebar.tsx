'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { TrendingUp, BarChart2, Users, ShoppingBag } from 'lucide-react'

const nav = [
  { href: '/funil', label: 'Funil', icon: TrendingUp },
  { href: '/midia', label: 'Mídia Paga', icon: BarChart2 },
]

export default function Sidebar() {
  const path = usePathname()

  return (
    <aside className="w-52 flex-shrink-0 flex flex-col border-r border-zinc-800/60 bg-zinc-950">
      {/* Logo */}
      <div className="px-4 py-4 border-b border-zinc-800/60">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <BarChart2 size={13} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white leading-none">Dashlara</p>
            <p className="text-[10px] text-zinc-500 mt-0.5">eventolaracastilho</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-2 space-y-0.5">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = path === href || path.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all ${
                active
                  ? 'bg-indigo-500/15 text-indigo-400 font-medium'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
              }`}
            >
              <Icon size={15} className={active ? 'text-indigo-400' : 'text-zinc-500'} />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-zinc-800/60">
        <div className="flex items-center gap-2.5 px-2 py-1.5">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xs font-semibold text-white shadow">
            AL
          </div>
          <div>
            <p className="text-xs font-medium text-zinc-300 leading-none">Ana Lisboa</p>
            <p className="text-[10px] text-zinc-500 mt-0.5">Admin</p>
          </div>
        </div>
      </div>
    </aside>
  )
}
