'use client'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { TrendingUp, BarChart2 } from 'lucide-react'

const nav = [
  { href: '/funil', label: 'Funil', icon: TrendingUp },
  { href: '/midia', label: 'Mídia Paga', icon: BarChart2 },
]

export default function Sidebar() {
  const path = usePathname()

  return (
    <aside className="w-56 flex-shrink-0 flex flex-col border-r border-chrome bg-obsidian">
      {/* Logo — centralizado verticalmente com o texto (§3.1) */}
      <div className="px-4 py-5 border-b border-chrome">
        <div className="flex items-center gap-3">
          <Image
            src="/logo-tile.png"
            alt="Mete Marcha"
            width={44}
            height={44}
            className="block rounded-[11px] flex-shrink-0"
            style={{ boxShadow: '0 0 24px rgba(83,166,104,0.3)' }}
            priority
          />
          <div className="min-w-0">
            <p className="marker text-[13px] text-accent -rotate-2 leading-none mb-1.5">
              mete marcha
            </p>
            <p className="text-sm font-bold uppercase tracking-tight text-ink leading-none">
              Dash<span className="text-accent">lara</span>
            </p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-2 space-y-1">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = path === href || path.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                active
                  ? 'bg-[rgba(83,166,104,0.15)] text-accent-bright font-semibold'
                  : 'text-ink-60 hover:text-ink hover:bg-[rgba(83,166,104,0.07)]'
              }`}
            >
              <Icon size={15} className={active ? 'text-accent-bright' : 'text-ink-40'} />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Rodapé */}
      <div className="p-3 border-t border-chrome">
        <div className="flex items-center gap-2.5 px-2 py-1.5">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-extrabold text-[#041008] flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #53a668, #86e0a3)' }}
          >
            AL
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-ink-70 leading-none truncate">Ana Lisboa</p>
            <p className="text-[10px] text-ink-40 mt-1">eventolaracastilho</p>
          </div>
        </div>
      </div>
    </aside>
  )
}
