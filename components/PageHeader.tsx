// Header da página — §3.1 do guia.
interface PageHeaderProps {
  /** H1 da página. A parte em `accent` sai destacada em verde. */
  title: string
  accent: string
  /** Label do subtítulo, antes do valor de contexto. */
  contextLabel: string
  contextValue: string
  children?: React.ReactNode
}

export default function PageHeader({
  title, accent, contextLabel, contextValue, children,
}: PageHeaderProps) {
  return (
    <div className="sticky top-0 z-20 border-b border-[rgba(83,166,104,0.16)] bg-[rgba(2,16,16,0.85)] backdrop-blur px-6 lg:px-10 py-5">
      <div className="flex items-center justify-between gap-6 flex-wrap">
        <div>
          <p className="marker text-[15px] text-accent -rotate-2 inline-block mb-1">
            mete marcha
          </p>
          <h1 className="text-[clamp(22px,3vw,32px)] font-extrabold uppercase tracking-[-0.01em] text-ink leading-none">
            {title} <span className="text-accent">{accent}</span>
          </h1>
          <p className="flex items-center gap-2 mt-2 text-[13px] text-ink-45">
            <span
              className="w-1.5 h-1.5 rounded-full bg-accent flex-shrink-0"
              style={{ boxShadow: '0 0 10px #53a668' }}
            />
            {contextLabel} <span className="font-bold text-ink">{contextValue}</span>
          </p>
        </div>
        <div className="flex items-center gap-2.5">{children}</div>
      </div>
    </div>
  )
}

/** Botão outline do header (§3.1), usado para ações com ícone. */
export function HeaderButton({
  onClick, children, title,
}: { onClick: () => void; children: React.ReactNode; title?: string }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="p-3 rounded-xl border border-strong bg-[rgba(83,166,104,0.08)] hover:bg-[rgba(83,166,104,0.18)] hover:border-accent text-accent-bright transition-colors"
    >
      {children}
    </button>
  )
}
