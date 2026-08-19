import { FileText, LockKeyhole } from 'lucide-react';
import ReportForm from './components/ReportForm';
import AdminPage from './components/AdminPage';

export default function App() {
  if (window.location.pathname === '/admin') return <AdminPage />;

  return (
    <main className="app-shell">
      <header className="topbar"><div className="brand-mark"><FileText size={22} /><span>Pulse / equipo</span></div><span className="date-chip">Reporte diario</span></header>
      <section className="hero"><p className="eyebrow">OPERACIONES INTERNAS</p><h1>Cuéntanos cómo avanzó tu día.</h1><p className="intro">Un reporte breve mantiene al equipo sincronizado y permite despejar bloqueos a tiempo.</p></section>
      <section className="content-panel"><div className="panel-heading"><div><p className="eyebrow">CIERRE DEL DÍA</p><h2>Tu reporte</h2></div><span className="required-note">Todos los campos son obligatorios</span></div><ReportForm /></section>
      <section className="admin-section"><a className="admin-toggle" href="/admin"><LockKeyhole size={15} />Administrador</a></section>
      <footer>Uso interno · Los reportes se almacenan localmente</footer>
    </main>
  );
}
