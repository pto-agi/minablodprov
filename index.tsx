import React, { Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import SiteLayout from './pages/SiteLayout';
import MarketingHome from './pages/MarketingHome';
import MarkerIndex from './pages/MarkerIndex';
import MarkerDoc from './pages/MarkerDoc';
import NotFound from './pages/NotFound';

const App = React.lazy(() => import('./App'));

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);

const ErrorScreen = ({ error }: { error: unknown }) => (
  <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
    <div className="max-w-md w-full rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 p-6">
      <div className="text-sm font-bold text-rose-700">Appen kunde inte starta</div>
      <div className="text-xs text-slate-600 mt-2">
        Kontrollera miljövariabler och byggloggar.
      </div>
      <pre className="mt-4 text-[11px] whitespace-pre-wrap text-slate-500 bg-slate-50 border border-slate-200 rounded-lg p-3">
        {String((error as any)?.message || error)}
      </pre>
    </div>
  </div>
);

const AppRoute = () => (
  <Suspense fallback={<div className="min-h-screen bg-slate-50" />}>
    <App />
  </Suspense>
);

const bootstrap = async () => {
  try {
    root.render(
      <React.StrictMode>
        <BrowserRouter>
          <Routes>
            <Route element={<SiteLayout />}>
              <Route index element={<MarketingHome />} />
              <Route path="/markorer" element={<MarkerIndex />} />
              <Route path="/:slug" element={<MarkerDoc />} />
            </Route>
            <Route path="/app/*" element={<AppRoute />} />
            <Route path="*" element={<NotFound />} />
            <Route path="/home" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </React.StrictMode>
    );
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    root.render(<ErrorScreen error={err} />);
  }
};

bootstrap();
