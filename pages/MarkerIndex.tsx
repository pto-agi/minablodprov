import React from 'react';
import { Link } from 'react-router-dom';
import { markerDocs } from './MarkerContent';

const MarkerIndex: React.FC = () => {
  return (
    <section className="max-w-6xl mx-auto px-4 py-10">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-display font-bold text-slate-900">Markörer</h1>
        <p className="text-sm text-slate-600 mt-2">
          Utforska våra informationssidor för varje markör. Nya sidor kan läggas till som filer i
          `content/markers`.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {markerDocs.map((doc) => (
          <Link
            key={doc.slug}
            to={`/${doc.slug}`}
            className="rounded-2xl bg-white ring-1 ring-slate-200 p-5 hover:ring-slate-300 transition-shadow"
          >
            <div className="text-sm font-bold text-slate-900">{doc.title}</div>
            <div className="text-xs text-slate-500 mt-1">/{doc.slug}</div>
          </Link>
        ))}
      </div>
    </section>
  );
};

export default MarkerIndex;
