import Layout from '../layout/Layout';

/**
 * Contenedor estándar de página estilo Cloud Gestion.
 * Aplica el marco (Layout + breadcrumb por ruta) y el padding del contenido.
 */
export default function PageShell({ title, actions, children }) {
  return (
    <Layout title={title}>
      <div className="space-y-4 p-5">
        {(title || actions) && (
          <div className="flex flex-wrap items-center justify-between gap-3">
            {title && (
              <h1 className="text-xl font-bold text-cg-ink dark:text-slate-100">{title}</h1>
            )}
            {actions && <div className="flex items-center gap-2">{actions}</div>}
          </div>
        )}
        {children}
      </div>
    </Layout>
  );
}
