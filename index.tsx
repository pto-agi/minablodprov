import React from 'react';
import ReactDOM from 'react-dom/client';

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

const bootstrap = async () => {
  try {
    const { default: App } = await import('./App');
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    root.render(<ErrorScreen error={err} />);
  }
};

bootstrap();
