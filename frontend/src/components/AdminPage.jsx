import { useEffect, useState } from 'react';
import { ArrowLeft, Calendar, CheckCircle2, Clock, Download, FileText, LockKeyhole, AlertCircle } from 'lucide-react';

export default function AdminPage() {
  const [password, setPassword] = useState('');
  const [token, setToken] = useState('');
  const [status, setStatus] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [dashboardData, setDashboardData] = useState({ fecha: '', areas: [] });

  const login = async (event) => {
    event.preventDefault();
    setStatus('');
    const response = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    const data = await response.json();
    if (!response.ok) return setStatus(data.error || 'No fue posible iniciar sesión.');
    setToken(data.token);
    setPassword('');
  };

  useEffect(() => {
    if (!token) return;
    fetch(`/api/admin/dashboard?fecha=${selectedDate}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then(setDashboardData)
      .catch(() => setStatus('No fue posible cargar el estado del dashboard.'));
  }, [token, selectedDate]);

  const downloadPdf = async () => {
    setDownloading(true);
    try {
      const response = await fetch(`/api/reportes/pdf?fecha=${selectedDate}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('No fue posible generar el PDF para la fecha seleccionada.');
      const arrayBuffer = await response.arrayBuffer();
      const blob = new Blob([arrayBuffer], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `reporte-${selectedDate}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch (error) {
      setStatus(error.message);
    } finally {
      setDownloading(false);
    }
  };

  const sentCount = dashboardData.areas.filter((a) => a.enviado).length;
  const totalCount = dashboardData.areas.length;

  return (
    <main className="app-shell admin-page">
      <header className="topbar">
        <a className="brand-mark" href="/">
          <FileText size={22} />
          <span>Pulse / equipo</span>
        </a>
        <a className="date-chip" href="/">Volver al reporte</a>
      </header>

      <section className="hero">
        <p className="eyebrow">ÁREA RESTRINGIDA</p>
        <h1>Consolidado y Cumplimiento.</h1>
        <p className="intro">Monitorea la entrega de reportes por área en tiempo real y descarga el documento consolidado de cualquier fecha.</p>
      </section>

      {!token ? (
        <section className="content-panel admin-login">
          <div className="login-icon">
            <LockKeyhole size={22} />
          </div>
          <div className="panel-heading">
            <div>
              <p className="eyebrow">ADMINISTRADOR</p>
              <h2>Iniciar sesión</h2>
            </div>
          </div>
          <form onSubmit={login} className="space-y-6">
            <label className="field-label" htmlFor="admin-password">
              Contraseña
              <input
                id="admin-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="input-control"
                placeholder="Escribe la contraseña"
                required
              />
            </label>
            {status && <p className="status error" role="alert">{status}</p>}
            <button className="primary-button" type="submit">
              <LockKeyhole size={17} />
              Entrar al administrador
            </button>
          </form>
        </section>
      ) : (
        <section className="content-panel space-y-8">
          {/* Controls Bar */}
          <div className="admin-controls-bar">
            <div className="date-picker-group">
              <label htmlFor="select-date" className="date-picker-label">
                <Calendar size={18} />
                <span>Fecha de reporte:</span>
              </label>
              <input
                id="select-date"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="input-control date-input"
              />
            </div>
            <button type="button" onClick={downloadPdf} disabled={downloading} className="primary-button">
              <Download size={17} />
              {downloading ? 'Generando PDF...' : `Descargar PDF (${selectedDate})`}
            </button>
          </div>

          {/* Compliance Summary */}
          <div className="dashboard-summary">
            <div>
              <h3>Dashboard de Cumplimiento</h3>
              <p className="summary-sub">
                {totalCount > 0
                  ? `${sentCount} de ${totalCount} áreas han enviado su reporte para la fecha seleccionada.`
                  : 'Cargando áreas...'}
              </p>
            </div>
            <span className={`compliance-badge ${sentCount === totalCount && totalCount > 0 ? 'full' : 'partial'}`}>
              {sentCount} / {totalCount} Completados
            </span>
          </div>

          {/* Compliance Grid */}
          <div className="grid gap-4 md:grid-cols-2">
            {dashboardData.areas.map((area) => (
              <div key={area.area_id} className={`area-card ${area.enviado ? 'submitted' : 'pending'}`}>
                <div className="area-card-header">
                  <span className="area-title">{area.area}</span>
                  {area.enviado ? (
                    <span className="badge badge-success">
                      <CheckCircle2 size={14} /> Entregado
                    </span>
                  ) : (
                    <span className="badge badge-warning">
                      <AlertCircle size={14} /> Pendiente
                    </span>
                  )}
                </div>
                {area.enviado ? (
                  <div className="area-card-body">
                    <p className="timestamp">
                      <Clock size={13} /> Registrado: {new Date(area.creado_en).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    <div className="preview-snippet">
                      <strong>Progreso:</strong> {area.progreso}
                    </div>
                  </div>
                ) : (
                  <p className="empty-note">El líder de esta área aún no ha enviado el reporte correspondiente.</p>
                )}
              </div>
            ))}
          </div>

          {status && <p className="status error" role="alert">{status}</p>}

          <button type="button" className="admin-toggle logout-button" onClick={() => setToken('')}>
            <ArrowLeft size={15} />
            Cerrar sesión
          </button>
        </section>
      )}
      <footer>Uso interno · Acceso protegido por contraseña</footer>
    </main>
  );
}