
import React, { useMemo, useState } from "react";
import TermsModal from "./TermsModal";
import { Logo } from "./Logo";

const cx = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(" ");

interface LandingPageProps {
  onStart: () => void;
  onLogin: () => void;
}

const Check = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 6 9 17l-5-5" />
  </svg>
);

const Spark = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 2l1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8L12 2z"
    />
  </svg>
);

const Shield = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 2 20 6v6c0 5-3.4 9.4-8 10-4.6-.6-8-5-8-10V6l8-4z"
    />
  </svg>
);

const Arrow = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h12m-5-5 5 5-5 5" />
  </svg>
);

const FeatureIcon: React.FC<{ kind: "spark" | "shield" | "check" }> = ({ kind }) => {
  const Icon = kind === "spark" ? Spark : kind === "shield" ? Shield : Check;
  return (
    <div className="w-10 h-10 rounded-2xl bg-white/70 ring-1 ring-slate-900/10 flex items-center justify-center">
      <Icon className="w-5 h-5 text-slate-700" />
    </div>
  );
};

const MockDashboard: React.FC = () => {
  return (
    <div className="relative">
      <div className="pointer-events-none absolute -inset-6 rounded-[2rem] bg-gradient-to-br from-emerald-200/40 to-cyan-200/20 blur-2xl" />
      <div className="relative rounded-[2rem] bg-white/80 backdrop-blur-sm ring-1 ring-slate-900/5 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-200/70">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-bold text-slate-900 tracking-tight">Översikt</div>
              <div className="text-xs text-slate-500 mt-1">Status • trender • fokus</div>
            </div>
            <div className="rounded-full px-3 py-1.5 text-xs font-semibold bg-slate-900 text-white">
              Behöver uppföljning: 3
            </div>
          </div>

          <div className="mt-4 flex gap-2 overflow-hidden">
            {["🫀 Hjärt-kärl", "⚡ Metabolism", "🩸 Blod", "🧠 Hormoner"].map((t, i) => (
              <div
                key={i}
                className={cx(
                  "shrink-0 px-3 py-2 rounded-full text-xs font-semibold ring-1",
                  i === 0
                    ? "bg-amber-50 text-amber-900 ring-amber-900/10"
                    : "bg-white text-slate-700 ring-slate-900/10"
                )}
              >
                {t}
              </div>
            ))}
          </div>
        </div>

        <div className="p-5 space-y-3">
          {[
            { name: "ApoB", status: "Avvikande", badge: "⚠", bar: 42, tint: "amber" },
            { name: "HbA1c", status: "Inom ref", badge: "✓", bar: 86, tint: "emerald" },
            { name: "Ferritin", status: "Avvikande", badge: "⚠", bar: 55, tint: "amber" },
          ].map((m) => (
            <div key={m.name} className="rounded-3xl bg-white ring-1 ring-slate-900/5 shadow-sm p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-bold text-slate-900 tracking-tight">{m.name}</div>
                  <div className="text-xs text-slate-500 mt-1">Senast: 2026-02-01 • Trend: 90 dagar</div>
                </div>
                <div
                  className={cx(
                    "shrink-0 text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5",
                    m.tint === "emerald" ? "bg-emerald-100 text-emerald-900" : "bg-amber-100 text-amber-900"
                  )}
                >
                  <span>{m.badge}</span>
                  {m.status}
                </div>
              </div>
              <div className="mt-3 h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                <div
                  className={cx(
                    "h-full rounded-full transition-all bg-gradient-to-r",
                    m.tint === "emerald" ? "from-emerald-500 to-cyan-500" : "from-amber-500 to-rose-500"
                  )}
                  style={{ width: `${m.bar}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="px-5 pb-5">
          <div className="rounded-3xl bg-slate-50 ring-1 ring-slate-900/5 p-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-2xl bg-white ring-1 ring-slate-900/10 flex items-center justify-center">
                <Spark className="w-5 h-5 text-slate-700" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-bold text-slate-900 tracking-tight">Senaste milstolpe</div>
                <div className="text-xs text-slate-600 mt-1">
                  “När ett värde går från avvikande → inom ref loggar vi det som en tydlig händelse i din historik.”
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute -bottom-4 -right-4 w-28 h-28 rounded-full bg-gradient-to-br from-indigo-200/50 to-violet-200/35 blur-2xl pointer-events-none" />
    </div>
  );
};

const PricingCard: React.FC<{
  title: string;
  price: string;
  desc: string;
  bullets: string[];
  highlight?: boolean;
  cta: string;
  onClick?: () => void;
}> = ({ title, price, desc, bullets, highlight, cta, onClick }) => (
  <div
    className={cx(
      "rounded-[2rem] p-6 ring-1 shadow-sm transition-all hover:-translate-y-1",
      highlight
        ? "bg-slate-900 text-white ring-slate-900 shadow-slate-900/15"
        : "bg-white/80 backdrop-blur-sm text-slate-900 ring-slate-900/5"
    )}
  >
    <div className="flex items-start justify-between gap-3">
      <div>
        <div className={cx("text-sm font-bold tracking-tight", highlight ? "text-white" : "text-slate-900")}>
          {title}
        </div>
        <div className={cx("text-xs mt-1", highlight ? "text-slate-200" : "text-slate-500")}>{desc}</div>
      </div>
      {highlight && (
        <div className="rounded-full px-3 py-1.5 text-[11px] font-extrabold bg-white/10 ring-1 ring-white/15">
          Mest populär
        </div>
      )}
    </div>

    <div className="mt-5 flex items-end gap-2">
      <div className={cx("text-3xl font-extrabold tracking-tight", highlight ? "text-white" : "text-slate-900")}>
        {price}
      </div>
      <div className={cx("text-xs pb-1", highlight ? "text-slate-200" : "text-slate-500")}>/ månad</div>
    </div>

    <div className="mt-5 space-y-2">
      {bullets.map((b) => (
        <div key={b} className="flex items-start gap-2">
          <Check className={cx("w-4 h-4 mt-0.5", highlight ? "text-emerald-300" : "text-emerald-600")} />
          <div className={cx("text-sm", highlight ? "text-slate-100" : "text-slate-700")}>{b}</div>
        </div>
      ))}
    </div>

    <button
      onClick={onClick}
      className={cx(
        "mt-6 w-full rounded-full px-5 py-3 text-sm font-semibold transition-colors",
        highlight
          ? "bg-white text-slate-900 hover:bg-slate-100"
          : "bg-slate-900 text-white hover:bg-slate-800 shadow-sm shadow-slate-900/10"
      )}
    >
      {cta}
    </button>

    <div className={cx("mt-3 text-xs", highlight ? "text-slate-200" : "text-slate-500")}>
      minablodprov.se ger struktur och uppföljning – inte medicinsk rådgivning.
    </div>
  </div>
);

export const LandingPage: React.FC<LandingPageProps> = ({ onStart, onLogin }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isTermsOpen, setIsTermsOpen] = useState(false);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleNavClick =
    (id: string) =>
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      e.preventDefault();
      setIsMobileMenuOpen(false);
      scrollToSection(id);
    };

  const features = useMemo(
    () => [
      {
        icon: "spark" as const,
        title: "Fokusområden som gör det lätt att prioritera",
        desc: "Se vilka system som oftast påverkas av dina avvikelser – och börja där det ger mest effekt.",
      },
      {
        icon: "check" as const,
        title: "Tydlig status per biomarkör",
        desc: "Avvikande vs inom referens, samlat i en vy. Mindre letande. Mer beslut.",
      },
      {
        icon: "spark" as const,
        title: "Mål & anteckningar per markör",
        desc: "Spara rutiner, protokoll och mål. När du tar om provet vet du exakt vad du gjort emellan.",
      },
      {
        icon: "check" as const,
        title: "Historik som går att förstå",
        desc: "Följ utveckling över tid och jämför provtagningar utan att bläddra i pdf:er eller kalkylark.",
      },
      {
        icon: "spark" as const,
        title: "Milstolpar som håller motivationen uppe",
        desc: "När ett värde förbättras loggas det som en tydlig händelse – så du ser att arbetet faktiskt ger resultat.",
      },
      {
        icon: "shield" as const,
        title: "Privat, säkert och under din kontroll",
        desc: "Säker inloggning och möjlighet att exportera och radera din data när du vill.",
      },
    ],
    []
  );

  const faqs = useMemo(
    () => [
      {
        q: "Är minablodprov.se medicinsk rådgivning?",
        a: "Nej. minablodprov.se är ett verktyg för struktur och uppföljning av labbvärden. Vid symtom, oro eller frågor – kontakta legitimerad vårdpersonal.",
      },
      {
        q: "Hur tolkar jag “inom ref” och “avvikande”?",
        a: "Appen visar status utifrån referensintervall. Referenser kan skilja mellan labb och sammanhang – använd informationen som underlag, inte som diagnos.",
      },
      {
        q: "Kan jag följa många markörer samtidigt?",
        a: "Ja. Du kan organisera per kategori, filtrera på fokusområden och snabbt se var avvikelserna klustrar.",
      },
      {
        q: "Hur snabbt kommer jag igång?",
        a: "Skapa konto och lägg in dina värden från senaste provtagningen. Du kan alltid komplettera med fler markörer eller historik senare.",
      },
    ],
    []
  );

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-emerald-100 selection:text-emerald-900">
      {/* HEADER */}
      <header className="fixed top-0 inset-x-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200/50">
        <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
          {/* Logo */}
          <a
            href="#top"
            onClick={handleNavClick("top")}
            className="flex items-center gap-2"
            aria-label="Gå till toppen"
          >
            {/* Mobile Icon (Increased size h-9 -> h-10) */}
            <Logo variant="icon" className="h-10 w-10 text-slate-900 md:hidden" />
            {/* Desktop Full Logo (Increased size h-8 -> h-9) */}
            <Logo variant="full" className="h-9 w-auto text-slate-900 hidden md:block" />
          </a>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
            <a href="#hur" onClick={handleNavClick("hur")} className="hover:text-slate-900 transition-colors">
              Hur det funkar
            </a>
            <a
              href="#funktioner"
              onClick={handleNavClick("funktioner")}
              className="hover:text-slate-900 transition-colors">
              Funktioner
            </a>
            <a href="#pris" onClick={handleNavClick("pris")} className="hover:text-slate-900 transition-colors">
              Pris
            </a>
            <a href="#faq" onClick={handleNavClick("faq")} className="hover:text-slate-900 transition-colors">
              FAQ
            </a>
          </nav>

          {/* Actions */}
          <div className="hidden md:flex items-center gap-3">
            <button
              onClick={onLogin}
              className="text-sm font-bold text-slate-700 hover:text-slate-900 transition-colors"
            >
              Logga in
            </button>
            <button
              onClick={onStart}
              className="px-4 py-2 rounded-full bg-slate-900 text-white text-sm font-bold hover:bg-slate-800 transition-colors shadow-sm shadow-slate-900/10"
            >
              Skapa konto gratis
            </button>
          </div>

          {/* Mobile Toggle */}
          <button className="md:hidden p-2 text-slate-600" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d={isMobileMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"}
              />
            </svg>
          </button>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-white border-b border-slate-200 p-5 space-y-4">
            <nav className="flex flex-col gap-4 text-sm font-medium text-slate-600">
              <a href="#hur" onClick={handleNavClick("hur")}>
                Hur det funkar
              </a>
              <a href="#funktioner" onClick={handleNavClick("funktioner")}>
                Funktioner
              </a>
              <a href="#pris" onClick={handleNavClick("pris")}>
                Pris
              </a>
              <a href="#faq" onClick={handleNavClick("faq")}>
                FAQ
              </a>
            </nav>
            <div className="pt-4 border-t border-slate-100 flex flex-col gap-3">
              <button
                onClick={onLogin}
                className="w-full py-2.5 text-center font-bold text-slate-700 bg-slate-50 rounded-xl"
              >
                Logga in
              </button>
              <button onClick={onStart} className="w-full py-2.5 text-center font-bold text-white bg-slate-900 rounded-xl">
                Skapa konto gratis
              </button>
            </div>
          </div>
        )}
      </header>

      <main className="pt-20">
        {/* TOP ANCHOR */}
        <div id="top" className="scroll-mt-20" />

        {/* Hero */}
        <section className="max-w-6xl mx-auto px-5 pt-12 pb-10 animate-in fade-in slide-in-from-bottom-2 duration-500">
          <div className="grid lg:grid-cols-2 gap-10 items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/70 ring-1 ring-slate-900/10 px-3 py-1.5 text-xs font-semibold text-slate-700">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Data that works • från provsvar till plan
              </div>

              <h1 className="mt-4 text-4xl sm:text-5xl font-display font-extrabold tracking-tight text-slate-900 leading-[1.05]">
                Ta kontroll över dina blodvärden –{" "}
                <span className="text-slate-600">bygg förutsättningar för mer energi, fokus och långsiktig hälsa.</span>
              </h1>

              <p className="mt-4 text-slate-600 text-lg max-w-xl">
                Samla dina blodprov och provsvar på ett ställe, följ biomarkörer över tid och se vad som faktiskt förändras
                mellan provtagningar. Med mål och anteckningar per markör blir uppföljning något du fortsätter med – inte
                något du börjar om med.
              </p>

              <div className="mt-6 flex flex-col sm:flex-row gap-3">
                <button
                  onClick={onStart}
                  className="rounded-full px-6 py-3 text-sm font-semibold bg-slate-900 text-white hover:bg-slate-800 shadow-sm shadow-slate-900/10 inline-flex items-center justify-center gap-2"
                >
                  Skapa konto gratis
                  <Arrow className="w-4 h-4" />
                </button>
                <a
                  href="#hur"
                  onClick={handleNavClick("hur")}
                  className="rounded-full px-6 py-3 text-sm font-semibold bg-white/80 ring-1 ring-slate-900/10 hover:bg-white inline-flex items-center justify-center gap-2"
                >
                  Se hur det funkar
                  <Arrow className="w-4 h-4" />
                </a>
              </div>

              <div className="mt-6 grid sm:grid-cols-3 gap-3 max-w-xl">
                {[
                  { t: "Fokusområden", d: "Se var det tar mest" },
                  { t: "Status & filter", d: "Avvikande / inom ref" },
                  { t: "Mål & anteckningar", d: "Bygg din uppföljning" },
                ].map((x) => (
                  <div key={x.t} className="rounded-3xl bg-white/80 backdrop-blur-sm ring-1 ring-slate-900/5 shadow-sm p-4">
                    <div className="text-sm font-bold text-slate-900 tracking-tight">{x.t}</div>
                    <div className="text-xs text-slate-500 mt-1">{x.d}</div>
                  </div>
                ))}
              </div>

              <div className="mt-6 flex flex-wrap gap-2">
                {[
                  { icon: <Shield className="w-4 h-4" />, txt: "Säker inloggning" },
                  { icon: <Spark className="w-4 h-4" />, txt: "Snabb överblick" },
                  { icon: <Check className="w-4 h-4" />, txt: "Tydlig historik" },
                ].map((c) => (
                  <div
                    key={c.txt}
                    className="inline-flex items-center gap-2 rounded-full bg-slate-50 ring-1 ring-slate-900/5 px-3 py-2 text-xs font-semibold text-slate-700"
                  >
                    <span className="text-slate-600">{c.icon}</span>
                    {c.txt}
                  </div>
                ))}
              </div>

              <p className="mt-6 text-xs text-slate-500 max-w-xl">
                minablodprov.se ger struktur och uppföljning – inte medicinsk rådgivning. Vid frågor om hälsa: kontakta vården.
              </p>
            </div>

            <div className="lg:pl-6">
              <MockDashboard />
            </div>
          </div>
        </section>

        {/* Social proof */}
        <section className="max-w-6xl mx-auto px-5 pb-12">
          <div className="grid md:grid-cols-3 gap-4">
            {[
              {
                quote:
                  "Jag hade provsvar utspridda i pdf:er och anteckningar. Nu ser jag direkt vad som är avvikande och vad jag vill följa upp nästa gång.",
                name: "Erik, 41",
                meta: "Tränar • följer lipider",
              },
              {
                quote:
                  "Anteckningar per markör gör enorm skillnad. Jag slipper gissa vad jag ändrade mellan provtagningar – det blir en röd tråd.",
                name: "Sara, 34",
                meta: "Datadriven • vill ha struktur",
              },
              {
                quote:
                  "Det bästa är trenderna. Jag kan koppla ihop provtagningar med vad jag gjorde i vardagen och få ett lugn i uppföljningen.",
                name: "Johan, 38",
                meta: "Tar prover regelbundet",
              },
            ].map((t) => (
              <div key={t.name} className="rounded-[2rem] bg-white/80 backdrop-blur-sm ring-1 ring-slate-900/5 shadow-sm p-6">
                <div className="text-sm text-slate-700 leading-relaxed">“{t.quote}”</div>
                <div className="mt-4 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-bold text-slate-900 tracking-tight">{t.name}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{t.meta}</div>
                  </div>
                  <div className="rounded-full px-3 py-1.5 text-[11px] font-extrabold bg-emerald-50 text-emerald-900 ring-1 ring-emerald-900/10">
                    Medlem
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section id="hur" className="max-w-6xl mx-auto px-5 pb-14 scroll-mt-20">
          <div className="rounded-[2.5rem] bg-white/70 backdrop-blur-sm ring-1 ring-slate-900/5 shadow-sm p-8 md:p-10">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
              <div>
                <h2 className="text-2xl sm:text-3xl font-display font-extrabold tracking-tight text-slate-900">
                  Så funkar det
                </h2>
                <p className="mt-2 text-slate-600 max-w-2xl">
                  Tre steg som gör uppföljningen enkel: in med värden, få status och fokus, följ trender och förbättringar över tid.
                </p>
              </div>
              <button
                onClick={onStart}
                className="rounded-full px-5 py-3 text-sm font-semibold bg-slate-900 text-white hover:bg-slate-800 inline-flex items-center justify-center gap-2"
              >
                Kom igång
                <Arrow className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-8 grid md:grid-cols-3 gap-4">
              {[
                {
                  step: "01",
                  title: "Lägg in dina provsvar",
                  desc: "Skriv in biomarkörer du bryr dig om (t.ex. HbA1c, ApoB, ferritin) och bygg din egen översikt.",
                },
                {
                  step: "02",
                  title: "Se status och vad som sticker ut",
                  desc: "Tydlig markering av avvikande vs inom ref – och ett fokusfilter som hjälper dig prioritera.",
                },
                {
                  step: "03",
                  title: "Följ utveckling, mål och anteckningar",
                  desc: "Jämför provtagningar och spara vad du gjorde mellan gångerna – så uppföljningen blir konsekvent.",
                },
              ].map((s) => (
                <div key={s.step} className="rounded-[2rem] bg-white ring-1 ring-slate-900/5 p-6 shadow-sm">
                  <div className="text-xs font-extrabold text-slate-500">{s.step}</div>
                  <div className="mt-2 text-lg font-bold text-slate-900 tracking-tight">{s.title}</div>
                  <div className="mt-2 text-sm text-slate-600">{s.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="funktioner" className="max-w-6xl mx-auto px-5 pb-14 scroll-mt-20">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl sm:text-3xl font-display font-extrabold tracking-tight text-slate-900">
                Funktioner som gör jobbet
              </h2>
              <p className="mt-2 text-slate-600 max-w-2xl">
                Snabbt, tydligt och byggt för att kännas premium – utan att bli krångligt.
              </p>
            </div>
          </div>

          <div className="mt-8 grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((f) => (
              <div key={f.title} className="rounded-[2rem] bg-white/80 backdrop-blur-sm ring-1 ring-slate-900/5 shadow-sm p-6">
                <FeatureIcon kind={f.icon} />
                <div className="mt-4 text-lg font-bold text-slate-900 tracking-tight">{f.title}</div>
                <div className="mt-2 text-sm text-slate-600">{f.desc}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Pricing */}
        <section id="pris" className="max-w-6xl mx-auto px-5 pb-14 scroll-mt-20">
          <div className="rounded-[2.5rem] bg-gradient-to-br from-slate-900 to-slate-800 text-white ring-1 ring-slate-900 shadow-sm p-8 md:p-10">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
              <div>
                <h2 className="text-2xl sm:text-3xl font-display font-extrabold tracking-tight">
                  Välj nivå som passar din uppföljning
                </h2>
                <p className="mt-2 text-slate-200 max-w-2xl">
                  Börja gratis. Uppgradera när du vill ha mer struktur, fokus och djupare historik.
                </p>
              </div>
            </div>

            <div className="mt-8 grid md:grid-cols-2 gap-4">
              <PricingCard
                title="Starter"
                price="0 kr"
                desc="För dig som vill samla och få överblick"
                bullets={[
                  "Dashboard med status per markör",
                  "Sök, filter och kategorier",
                  "Historik & trendvy",
                ]}
                cta="Skapa konto gratis"
                onClick={onStart}
              />

              <PricingCard
                title="Pro"
                price="99 kr"
                desc="För dig som följer över tid och vill optimera"
                bullets={[
                  "Fokusområden och prioritering",
                  "Mål + anteckningar per markör",
                  "Milstolpar när värden förbättras",
                  "Avancerad uppföljning över tid",
                ]}
                highlight
                cta="Starta Pro"
                onClick={onStart}
              />
            </div>

            <div className="mt-6 text-xs text-slate-300">
              Månadsvis • ingen bindning • uppgradera eller nedgradera när du vill.
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="max-w-6xl mx-auto px-5 pb-14 scroll-mt-20">
          <h2 className="text-2xl sm:text-3xl font-display font-extrabold tracking-tight text-slate-900">
            Vanliga frågor
          </h2>
          <div className="mt-6 grid md:grid-cols-2 gap-4">
            {faqs.map((x) => (
              <div key={x.q} className="rounded-[2rem] bg-white/80 backdrop-blur-sm ring-1 ring-slate-900/5 shadow-sm p-6">
                <div className="text-base font-bold text-slate-900 tracking-tight">{x.q}</div>
                <div className="mt-2 text-sm text-slate-600 leading-relaxed">{x.a}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Privacy / Data / Terms (lower down) */}
        <section id="integritet" className="max-w-6xl mx-auto px-5 pb-14 scroll-mt-20">
          <div className="rounded-[2.5rem] bg-white/80 backdrop-blur-sm ring-1 ring-slate-900/5 shadow-sm p-8 md:p-10 overflow-hidden relative">
            <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-gradient-to-br from-emerald-200/45 to-cyan-200/30 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-gradient-to-tr from-indigo-200/35 to-violet-200/30 blur-3xl" />

            <div className="relative">
              <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
                <div>
                  <h2 className="text-2xl sm:text-3xl font-display font-extrabold tracking-tight text-slate-900">
                    Integritet & data
                  </h2>
                  <p className="mt-2 text-slate-600 max-w-2xl">
                    Hälsodata är personligt. Därför är minablodprov.se byggt för tydlighet, kontroll och förtroende – så att du
                    kan fokusera på din uppföljning.
                  </p>
                </div>
              </div>

              <div className="mt-8 grid md:grid-cols-3 gap-4">
                <div className="rounded-[2rem] bg-white ring-1 ring-slate-900/5 p-6 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-2xl bg-slate-50 ring-1 ring-slate-900/10 flex items-center justify-center">
                      <Shield className="w-5 h-5 text-slate-700" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-base font-bold text-slate-900 tracking-tight">Din data är din</div>
                      <div className="mt-2 text-sm text-slate-600 leading-relaxed">
                        Du kan exportera dina värden och behålla översikten på dina villkor. När du vill kan du även rensa
                        eller ta bort data kopplat till ditt konto.
                      </div>
                    </div>
                  </div>
                </div>

                <div id="villkor" className="rounded-[2rem] bg-white ring-1 ring-slate-900/5 p-6 shadow-sm scroll-mt-20">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-2xl bg-slate-50 ring-1 ring-slate-900/10 flex items-center justify-center">
                      <Check className="w-5 h-5 text-slate-700" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-base font-bold text-slate-900 tracking-tight">Villkor i korthet</div>
                      <div className="mt-2 text-sm text-slate-600 leading-relaxed">
                        minablodprov.se är ett uppföljningsverktyg och ersätter inte vården. Vi visar status mot referensintervall
                        och hjälper dig strukturera historik, mål och anteckningar.
                      </div>
                    </div>
                  </div>
                </div>

                <div id="kontakt" className="rounded-[2rem] bg-white ring-1 ring-slate-900/5 p-6 shadow-sm scroll-mt-20">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-2xl bg-slate-50 ring-1 ring-slate-900/10 flex items-center justify-center">
                      <Spark className="w-5 h-5 text-slate-700" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-base font-bold text-slate-900 tracking-tight">Kontakt</div>
                      <div className="mt-2 text-sm text-slate-600 leading-relaxed">
                        Har du frågor om konto, data eller funktioner? Hör av dig så hjälper vi dig snabbt.
                      </div>
                      <div className="mt-3 text-sm font-semibold text-slate-900">
                        support@minablodprov.se
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        Svarstid normalt inom 24 timmar (vardagar).
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 text-xs text-slate-500">
                minablodprov.se är ett uppföljningsverktyg – inte medicinsk rådgivning.
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="max-w-6xl mx-auto px-5 pb-16">
          <div className="rounded-[2.5rem] bg-white/80 backdrop-blur-sm ring-1 ring-slate-900/5 shadow-sm p-8 md:p-10 overflow-hidden relative">
            <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-gradient-to-br from-emerald-200/55 to-cyan-200/35 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-gradient-to-tr from-indigo-200/45 to-violet-200/35 blur-3xl" />

            <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div>
                <div className="text-2xl font-display font-extrabold tracking-tight text-slate-900">
                  Gör nästa provtagning enklare.
                </div>
                <div className="mt-2 text-slate-600 max-w-2xl">
                  Samla dina värden, se vad som sticker ut och följ utvecklingen över tid – på ett sätt som är lätt att fortsätta med.
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {["2 min att komma igång", "Tydlig status", "Anteckningar & mål"].map((t) => (
                    <div key={t} className="rounded-full px-3 py-2 text-xs font-semibold bg-white ring-1 ring-slate-900/10">
                      {t}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <button
                  onClick={onStart}
                  className="rounded-full px-6 py-3 text-sm font-semibold bg-slate-900 text-white hover:bg-slate-800 shadow-sm shadow-slate-900/10 inline-flex items-center justify-center gap-2"
                >
                  Skapa konto gratis
                  <Arrow className="w-4 h-4" />
                </button>
                <button
                  onClick={onLogin}
                  className="rounded-full px-6 py-3 text-sm font-semibold bg-white ring-1 ring-slate-900/10 hover:bg-slate-50 inline-flex items-center justify-center gap-2"
                >
                  Jag har redan konto
                  <Arrow className="w-4 h-4" />
                </button>
                <div className="text-[11px] text-slate-500 text-center">
                  Uppföljningsverktyg – inte medicinsk rådgivning.
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="bg-white border-t border-slate-200 py-12">
        <div className="max-w-6xl mx-auto px-5 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-sm text-slate-500">© 2026 minablodprov.se. Alla rättigheter förbehållna.</div>
          <div className="flex gap-6 text-sm font-medium text-slate-600">
            <button
              onClick={() => setIsTermsOpen(true)}
              className="hover:text-slate-900 transition-colors"
            >
              Villkor & Integritet
            </button>
            <a href="#kontakt" onClick={handleNavClick("kontakt")} className="hover:text-slate-900">
              Kontakt
            </a>
          </div>
        </div>
      </footer>

      {/* Modal */}
      <TermsModal isOpen={isTermsOpen} onClose={() => setIsTermsOpen(false)} />
    </div>
  );
};

export default LandingPage;
