import React from 'react';
import { Link } from 'react-router-dom';

const MarketingHome: React.FC = () => {
  return (
    <section className="max-w-6xl mx-auto px-4 py-12">
      <div className="rounded-[2.5rem] bg-white shadow-sm ring-1 ring-slate-200 p-8 md:p-12">
        <div className="max-w-2xl">
          <h1 className="text-3xl md:text-4xl font-display font-bold text-slate-900">
            Spåra dina biomarkörer och bygg en åtgärdsplan.
          </h1>
          <p className="mt-3 text-slate-600 text-sm md:text-base">
            Få tydlig översikt, historik och mål för varje markör. Utforska vårt växande
            kunskapsarkiv för att förstå vad värdena betyder.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/app" className="px-5 py-2.5 rounded-full bg-slate-900 text-white text-sm font-bold">
              Logga in
            </Link>
            <Link to="/markorer" className="px-5 py-2.5 rounded-full bg-slate-100 text-slate-900 text-sm font-bold">
              Utforska markörer
            </Link>
          </div>
        </div>
      </div>

      <div className="mt-10 grid md:grid-cols-3 gap-4">
        {[
          { title: 'Översikt', body: 'Se avvikelser, trender och optimeringsgrad i realtid.' },
          { title: 'Åtgärdsplan', body: 'Skapa mål, koppla markörer och följ upp.' },
          { title: 'Kunskapsarkiv', body: 'SEO‑vänliga sidor per markör med förklaringar.' },
        ].map((c) => (
          <div key={c.title} className="bg-white rounded-2xl p-6 ring-1 ring-slate-200">
            <div className="text-sm font-bold text-slate-900">{c.title}</div>
            <div className="text-sm text-slate-600 mt-2">{c.body}</div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default MarketingHome;
