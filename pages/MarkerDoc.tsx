import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { findMarkerDoc } from './MarkerContent';

const MarkerDoc: React.FC = () => {
  const { slug = '' } = useParams();
  const doc = findMarkerDoc(slug);

  if (!doc) {
    return (
      <section className="max-w-3xl mx-auto px-4 py-12">
        <h1 className="text-2xl font-display font-bold text-slate-900">Sidan finns inte</h1>
        <p className="text-sm text-slate-600 mt-2">
          Vi kunde inte hitta någon artikel med denna URL.
        </p>
        <Link to="/artiklar" className="inline-block mt-4 text-sm font-bold text-slate-900">
          Tillbaka till artiklar
        </Link>
      </section>
    );
  }

  return (
    <section className="max-w-3xl mx-auto px-4 py-12">
      <div className="text-xs text-slate-500 mb-3">
        <Link to="/artiklar" className="hover:text-slate-900">Artiklar</Link> / {doc.slug}
      </div>
      <article
        className="prose prose-slate max-w-none bg-white rounded-2xl ring-1 ring-slate-200 p-6"
        dangerouslySetInnerHTML={{ __html: doc.html }}
      />
    </section>
  );
};

export default MarkerDoc;
