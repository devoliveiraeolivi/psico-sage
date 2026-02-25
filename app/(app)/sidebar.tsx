'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const pathname = usePathname()

  return (
    <aside
      className={`${
        collapsed ? 'w-[72px]' : 'w-60'
      } bg-gradient-to-br from-[hsl(222,47%,11%)] via-[hsl(222,47%,18%)] to-[hsl(221,83%,40%)] flex flex-col relative overflow-hidden transition-all duration-300`}
    >
      {/* Decorative circles */}
      <div className="absolute -bottom-24 -right-24 w-96 h-96 rounded-full border border-white/10 pointer-events-none" />
      <div className="absolute -bottom-12 -right-12 w-72 h-72 rounded-full border border-white/[0.06] pointer-events-none" />
      <div className="absolute top-1/2 -left-8 w-32 h-32 rounded-full bg-white/[0.03] pointer-events-none" />

      {/* Brand + collapse toggle */}
      <div className={`${collapsed ? 'p-4 flex flex-col items-center gap-3' : 'p-6 flex items-center justify-between'} relative z-10`}>
        <Link href="/dashboard" className="flex items-center gap-2.5" title="PsicoApp">
          <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
            <svg className="w-4.5 h-4.5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
            </svg>
          </div>
          {!collapsed && <span className="text-base font-bold text-white whitespace-nowrap">PsicoApp</span>}
        </Link>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors"
          title={collapsed ? 'Expandir menu' : 'Recolher menu'}
          aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
        >
          <svg
            className={`w-4 h-4 transition-transform duration-300 ${collapsed ? 'rotate-180' : ''}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M18.75 19.5l-7.5-7.5 7.5-7.5m-6 15L5.25 12l7.5-7.5" />
          </svg>
        </button>
      </div>

      {/* Nav */}
      <nav id="sidebar-nav" className="flex-1 px-3 relative z-10">
        <div className="space-y-1">
          <NavItem href="/dashboard" icon={<InicioIcon />} collapsed={collapsed} active={pathname === '/dashboard'}>Início</NavItem>
          <NavItem href="/pacientes" icon={<PacientesIcon />} collapsed={collapsed} active={pathname.startsWith('/pacientes')}>Pacientes</NavItem>
          <NavItem href="/agenda" icon={<AgendaIcon />} collapsed={collapsed} active={pathname.startsWith('/agenda')}>Agenda</NavItem>
          <NavItem href="/sessoes" icon={<SessoesIcon />} collapsed={collapsed} active={pathname.startsWith('/sessoes')}>Sessões</NavItem>
        </div>
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-white/10 space-y-1 relative z-10">
        <NavItem href="/configuracoes" icon={<ConfigIcon />} collapsed={collapsed} active={pathname.startsWith('/configuracoes')}>Configurações</NavItem>
        <NavItem href="/ajuda" icon={<AjudaIcon />} collapsed={collapsed} active={pathname.startsWith('/ajuda')}>Ajuda</NavItem>
        <LogoutButton collapsed={collapsed} />
      </div>
    </aside>
  )
}

/* ---------- NavItem ---------- */

function NavItem({
  href, icon, children, collapsed, active,
}: {
  href: string; icon: React.ReactNode; children: React.ReactNode; collapsed: boolean; active: boolean
}) {
  return (
    <Link
      href={href}
      title={collapsed ? String(children) : undefined}
      aria-label={collapsed ? String(children) : undefined}
      aria-current={active ? 'page' : undefined}
      className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3 px-3'} py-2.5 rounded-lg text-sm transition-colors ${
        active
          ? 'text-white bg-white/15'
          : 'text-white/60 hover:text-white hover:bg-white/10'
      }`}
    >
      <span className={`shrink-0 ${active ? 'text-white/80' : 'text-white/40'}`}>{icon}</span>
      {!collapsed && <span className="whitespace-nowrap">{children}</span>}
    </Link>
  )
}

/* ---------- LogoutButton (inline) ---------- */

function LogoutButton({ collapsed }: { collapsed: boolean }) {
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <button
      onClick={handleLogout}
      title={collapsed ? 'Sair' : undefined}
      aria-label="Sair"
      className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3 px-3'} py-2.5 rounded-lg text-sm text-white/60 hover:text-red-400 hover:bg-white/10 transition-colors w-full`}
    >
      <span className="text-white/40 shrink-0">
        <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
        </svg>
      </span>
      {!collapsed && <span className="whitespace-nowrap">Sair</span>}
    </button>
  )
}

/* ---------- Icons ---------- */

function InicioIcon() {
  return (
    <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
    </svg>
  )
}

function PacientesIcon() {
  return (
    <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
    </svg>
  )
}

function AgendaIcon() {
  return (
    <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
    </svg>
  )
}

function SessoesIcon() {
  return (
    <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
    </svg>
  )
}

function AjudaIcon() {
  return (
    <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
    </svg>
  )
}

function ConfigIcon() {
  return (
    <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )
}
