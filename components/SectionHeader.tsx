// Header de seção — §3.2 do guia.
interface SectionHeaderProps {
  /** Letra ou símbolo do badge quadrado. */
  badge: string
  title: string
  /** Qualificador ao lado do título (variante padrão). */
  qualifier?: string
  /** Subtítulo abaixo do título (variante "grupo"). */
  sub?: string
  /** Variante "grupo": badge 40px, H2 24px, subtítulo abaixo. */
  group?: boolean
}

export default function SectionHeader({ badge, title, qualifier, sub, group }: SectionHeaderProps) {
  return (
    <div className="flex items-center gap-3 mb-[22px]">
      <div
        className={`flex-shrink-0 flex items-center justify-center border border-strong bg-[rgba(83,166,104,0.14)] text-accent-bright font-extrabold ${
          group ? 'w-10 h-10 rounded-[11px] text-xl' : 'w-[34px] h-[34px] rounded-[10px] text-base'
        }`}
      >
        {badge}
      </div>
      <div>
        <div className="flex items-baseline gap-2.5 flex-wrap">
          <h2 className={`font-bold text-ink ${group ? 'text-2xl' : 'text-[22px]'}`}>{title}</h2>
          {qualifier && <span className="text-base font-medium text-ink-45">{qualifier}</span>}
        </div>
        {sub && <p className="text-sm text-ink-45 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

/** Alternativa leve, para uso dentro de painel — §3.2. */
export function PanelHeading({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-1 h-5 rounded-[3px] bg-accent flex-shrink-0" />
      <h3 className="text-[19px] font-bold text-ink">{children}</h3>
    </div>
  )
}
