'use client'
import { ChevronDown } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'

// Botão outline do header — §3.1 do guia.
interface LancamentoFilterProps {
  options: Array<{ lancamento: string; total: number }>
  value: string | null
  onChange: (v: string | null) => void
}

export default function LancamentoFilter({ options, value, onChange }: LancamentoFilterProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const label = value ?? 'Todos os lançamentos'

  const itemClass = (active: boolean) =>
    `w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
      active
        ? 'bg-[rgba(83,166,104,0.18)] text-accent-bright font-medium'
        : 'text-ink-60 hover:bg-[rgba(83,166,104,0.08)] hover:text-ink'
    }`

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 rounded-xl border border-strong bg-[rgba(83,166,104,0.08)] hover:bg-[rgba(83,166,104,0.18)] hover:border-accent px-4 py-2.5 text-sm text-accent-bright transition-colors min-w-[200px]"
      >
        <span className="flex-1 text-left truncate">{label}</span>
        <ChevronDown size={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-64 bg-surface border border-strong rounded-xl z-50 overflow-hidden">
          <div className="p-1 max-h-80 overflow-y-auto">
            <button onClick={() => { onChange(null); setOpen(false) }} className={itemClass(!value)}>
              <span>Todos os lançamentos</span>
            </button>
            {options.map(opt => (
              <button
                key={opt.lancamento}
                onClick={() => { onChange(opt.lancamento); setOpen(false) }}
                className={itemClass(value === opt.lancamento)}
              >
                <span className="truncate">{opt.lancamento}</span>
                <span className="text-xs text-ink-40 flex-shrink-0">
                  {opt.total.toLocaleString('pt-BR')}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
