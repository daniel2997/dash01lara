"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { LayoutDashboard, TrendingUp, BarChart2, Menu, X } from "lucide-react";
import { useLaunch } from "./LaunchContext";

const NAV = [
  { href: "/", label: "Visão Geral", icon: LayoutDashboard },
  { href: "/funil", label: "Funil", icon: TrendingUp },
  { href: "/midia", label: "Mídia Paga", icon: BarChart2 },
];

/** Marca — §3.1. O manuscrito rotacionado é assinatura, não decoração. */
function Marca({ compacto = false }: { compacto?: boolean }) {
  return (
    <div className="flex items-center gap-3 min-w-0">
      <Image
        src="/logo-tile.png"
        alt="Mete Marcha"
        width={compacto ? 30 : 44}
        height={compacto ? 30 : 44}
        className="block rounded-[11px] shrink-0"
        style={{ boxShadow: "0 0 24px rgba(83,166,104,0.3)" }}
        priority
      />
      <div className="min-w-0">
        {!compacto && (
          <p className="marker text-[13px] text-accent -rotate-2 leading-none mb-1.5">
            mete marcha
          </p>
        )}
        <p className="text-sm font-bold uppercase tracking-tight text-ink leading-none">
          Dash<span className="text-accent">lara</span>
        </p>
      </div>
    </div>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const { lancamento, setLancamento, lancamentos, dia, setDia, dias } = useLaunch();
  const [open, setOpen] = useState(false);

  const opcoes = lancamentos.length
    ? lancamentos
    : lancamento
    ? [lancamento]
    : [];

  const content = (
    <div className="flex flex-col h-full">
      <div className="px-5 pt-6 pb-4 border-b border-chrome">
        <Marca />
      </div>

      <div className="px-4 py-4 space-y-3">
        <div>
          <label className="text-[10px] text-ink-45 uppercase tracking-[0.09em] block mb-1.5">
            Lançamento
          </label>
          <select
            value={lancamento}
            onChange={(e) => setLancamento(e.target.value)}
            style={{ width: "100%" }}
          >
            {opcoes.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[10px] text-ink-45 uppercase tracking-[0.09em] block mb-1.5">
            Dia (20:30→20:30)
          </label>
          <select
            value={dia || ""}
            onChange={(e) => setDia(e.target.value || null)}
            style={{ width: "100%" }}
          >
            <option value="">Todos os dias</option>
            {dias.map((d) => (
              <option key={d.dia} value={d.dia}>
                {d.dia.split("-").reverse().slice(0, 2).join("/")} — {d.leads}L / {d.compras}V
              </option>
            ))}
          </select>
        </div>
      </div>

      <nav className="flex-1 px-3 space-y-1">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className={`sidebar-link ${active ? "active" : ""}`}
            >
              <Icon size={16} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="px-5 py-4 text-[10px] text-ink-40 uppercase tracking-[0.12em]">
        Lara Castilho · {new Date().getFullYear()}
      </div>
    </div>
  );

  return (
    <>
      {/* Topbar mobile */}
      <div className="lg:hidden flex items-center justify-between px-4 py-3 border-b border-chrome sticky top-0 z-30 bg-obsidian">
        <Marca compacto />
        <button
          onClick={() => setOpen((o) => !o)}
          className="text-ink-60"
          aria-label={open ? "Fechar menu" : "Abrir menu"}
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Sidebar desktop */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-60 border-r border-chrome bg-obsidian z-20">
        {content}
      </aside>

      {/* Drawer mobile */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 w-64 border-r border-chrome bg-obsidian">
            {content}
          </aside>
        </div>
      )}
    </>
  );
}
