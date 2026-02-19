import React from 'react';
import { Link } from 'react-router-dom';

const NotFound: React.FC = () => {
  return (
    <section className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-display font-bold text-slate-900">404</h1>
      <p className="text-sm text-slate-600 mt-2">Sidan du söker finns inte.</p>
      <Link to="/" className="inline-block mt-4 text-sm font-bold text-slate-900">
        Till startsidan
      </Link>
    </section>
  );
};

export default NotFound;
