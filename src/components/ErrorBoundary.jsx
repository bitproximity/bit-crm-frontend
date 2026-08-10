import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // Deja rastro en la consola del navegador con el stack completo, por si hace falta depurar más a fondo.
    console.error('Error atrapado por ErrorBoundary:', error, info?.componentStack);

    // Cuando se sube una actualización del CRM mientras alguien lo tiene abierto, el navegador
    // sigue con referencias a archivos JS de la versión anterior que el servidor ya no tiene
    // ("Failed to fetch dynamically imported module"). No es un error real de la app — solo
    // hace falta una recarga para tomar la versión nueva. Lo hacemos automático, una sola vez
    // por sesión para no entrar en bucle si el problema fuera otra cosa.
    const isStaleChunk = /Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed/i.test(error?.message || '');
    if (isStaleChunk && !sessionStorage.getItem('bitcrm-chunk-reload')) {
      sessionStorage.setItem('bitcrm-chunk-reload', '1');
      window.location.reload();
    }
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-brand-bg text-brand-white flex items-center justify-center p-6">
          <div className="max-w-lg w-full bg-brand-panel border border-red-500/30 rounded-2xl p-6">
            <h1 className="font-headline text-lg font-semibold text-red-300 mb-2">Algo se rompió en esta pantalla</h1>
            <p className="text-brand-muted text-sm mb-4">
              Copia este mensaje y compártelo — así se arregla la causa exacta en vez de solo recargar.
            </p>
            <pre className="bg-brand-bg border border-brand-border rounded-lg p-3 text-xs text-red-300 overflow-x-auto whitespace-pre-wrap mb-4">
              {this.state.error?.message || String(this.state.error)}
            </pre>
            <div className="flex gap-2">
              <button
                onClick={() => { this.setState({ error: null }); window.location.href = '/'; }}
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-brand-violet to-brand-magenta text-sm font-medium"
              >
                Volver al inicio
              </button>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 rounded-lg bg-brand-bg border border-brand-border text-sm"
              >
                Recargar página
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
