import Link from "next/link";

export default function NavBar({ crumbs }: { crumbs: { label: string; href?: string }[] }) {
  return (
    <header className="border-b border-white/10 px-6 py-3 flex items-center gap-2 text-sm">
      <Link href="/" className="font-semibold text-cyan-400 hover:text-cyan-300">
        HandRehab AI
      </Link>
      {crumbs.map((c, i) => (
        <span key={i} className="flex items-center gap-2 text-slate-400">
          <span>/</span>
          {c.href ? (
            <Link href={c.href} className="hover:text-slate-200">
              {c.label}
            </Link>
          ) : (
            <span className="text-slate-200">{c.label}</span>
          )}
        </span>
      ))}
    </header>
  );
}
