// Nota / callout / empty state — §3.9 do guia.
export default function Callout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 rounded-[10px] border border-card border-l-[3px] border-l-accent bg-[rgba(83,166,104,0.05)] px-[18px] py-3.5">
      <span className="w-[7px] h-[7px] rounded-full bg-accent flex-shrink-0" />
      <p className="text-sm text-ink-60">{children}</p>
    </div>
  )
}
