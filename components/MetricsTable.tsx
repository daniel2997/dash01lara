'use client'
import { useState } from 'react'
import { ChevronUp, ChevronDown } from 'lucide-react'

export interface Column<T> {
  key: keyof T
  label: string
  format?: (v: any) => string
  align?: 'left' | 'right'
}

interface MetricsTableProps<T> {
  title: string
  columns: Column<T>[]
  data: T[]
  loading?: boolean
  maxRows?: number
}

export default function MetricsTable<T extends Record<string, any>>({
  title, columns, data, loading, maxRows = 10
}: MetricsTableProps<T>) {
  const [sort, setSort] = useState<{ key: keyof T; dir: 'asc' | 'desc' } | null>(null)
  const [expanded, setExpanded] = useState(false)

  const sorted = [...data].sort((a, b) => {
    if (!sort) return 0
    const av = a[sort.key], bv = b[sort.key]
    const diff = typeof av === 'number' ? av - bv : String(av).localeCompare(String(bv))
    return sort.dir === 'asc' ? diff : -diff
  })

  const visible = expanded ? sorted : sorted.slice(0, maxRows)

  const toggle = (key: keyof T) => {
    setSort(s => !s || s.key !== key ? { key, dir: 'desc' } : s.dir === 'desc' ? { key, dir: 'asc' } : null)
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800/60 rounded-xl overflow-hidden">
      <div className="px-5 py-3.5 border-b border-zinc-800/60 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-zinc-200">{title}</h3>
        {loading && <div className="w-4 h-4 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-zinc-800/40">
              {columns.map(col => (
                <th
                  key={String(col.key)}
                  onClick={() => toggle(col.key)}
                  className={`px-4 py-2.5 text-zinc-500 font-medium uppercase tracking-wide cursor-pointer select-none hover:text-zinc-300 transition-colors ${col.align === 'right' ? 'text-right' : 'text-left'}`}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.label}
                    {sort?.key === col.key ? (
                      sort.dir === 'desc' ? <ChevronDown size={11} className="text-indigo-400" /> : <ChevronUp size={11} className="text-indigo-400" />
                    ) : (
                      <ChevronDown size={11} className="text-zinc-700" />
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-zinc-800/20">
                  {columns.map((col, j) => (
                    <td key={j} className="px-4 py-2.5">
                      <div className="h-3 shimmer rounded w-20" />
                    </td>
                  ))}
                </tr>
              ))
            ) : visible.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-8 text-center text-zinc-600">
                  Nenhum dado encontrado
                </td>
              </tr>
            ) : (
              visible.map((row, i) => (
                <tr
                  key={i}
                  className="border-b border-zinc-800/20 hover:bg-white/[0.02] transition-colors"
                >
                  {columns.map(col => (
                    <td
                      key={String(col.key)}
                      className={`px-4 py-2.5 text-zinc-300 ${col.align === 'right' ? 'text-right font-medium tabular-nums' : ''}`}
                    >
                      {col.format ? col.format(row[col.key]) : String(row[col.key] ?? '—')}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {!loading && data.length > maxRows && (
        <button
          onClick={() => setExpanded(e => !e)}
          className="w-full py-2.5 text-xs text-zinc-500 hover:text-zinc-300 border-t border-zinc-800/40 transition-colors"
        >
          {expanded ? `Mostrar menos` : `Ver todos (${data.length})`}
        </button>
      )}
    </div>
  )
}
