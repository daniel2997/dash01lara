'use client'
import { ChevronDown } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'

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

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 bg-zinc-900 border border-zinc-700/60 hover:border-zinc-600 rounded-lg px-3 py-2 text-sm text-zinc-300 transition-colors min-w-[180px]"
      >
        <span className="flex-1 text-left truncate">{label}</span>
        <ChevronDown size={14} className={`text-zinc-500 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 mt-1 w-64 bg-zinc-900 border border-zinc-700/60 rounded-xl shadow-2xl shadow-black/50 z-50 overflow-hidden">
          <div className="p-1">
            <button
              onClick={() => { onChange(null); setOpen(false) }}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${!value ? 'bg-indigo-500/20 text-indigo-300' : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200'}`}
            >
              <span>Todos os lançamentos</span>
            </button>
            {options.map(opt => (
              <button
                key={opt.lancamento}
                onClick={() => { onChange(opt.lancamento); setOpen(false) }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${value === opt.lancamento ? 'bg-indigo-500/20 text-indigo-300' : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200'}`}
              >
                <span className="truncate">{opt.lancamento}</span>
                <span className="text-xs text-zinc-600 ml-2">{opt.total.toLocaleString('pt-BR')}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
