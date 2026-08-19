import { useEffect, useState } from 'react';
import { CheckCircle2, Edit3, Send } from 'lucide-react';

const initialForm = { areaId: '', progreso: '', plan: '', bloqueos: '' };

export default function ReportForm() {
  const [areas, setAreas] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [status, setStatus] = useState({ type: '', message: '' });
  const [sending, setSending] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    fetch('/api/areas')
      .then((response) => response.json())
      .then(setAreas)
      .catch(() => setStatus({ type: 'error', message: 'No fue posible cargar las áreas.' }));
  }, []);

  const handleAreaChange = async (event) => {
    const areaId = event.target.value;
    setForm((current) => ({ ...current, areaId, progreso: '', plan: '', bloqueos: '' }));
    setStatus({ type: '', message: '' });
    setIsEditing(false);

    if (!areaId) return;

    try {
      const response = await fetch(`/api/reportes/check?areaId=${areaId}`);
      if (response.ok) {
        const existing = await response.json();
        if (existing) {
          setForm({
            areaId,
            progreso: existing.progreso || '',
            plan: existing.plan || '',
            bloqueos: existing.bloqueos || '',
          });
          setIsEditing(true);
          setStatus({
            type: 'info',
            message: 'Se cargó el reporte guardado de hoy para esta área. Puedes actualizarlo.',
          });
        }
      }
    } catch {
      // Ignorar fallo de comprobación previa
    }
  };

  const updateField = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
    setStatus({ type: '', message: '' });
  };

  const submit = async (event) => {
    event.preventDefault();
    setSending(true);
    setStatus({ type: '', message: '' });
    try {
      const response = await fetch('/api/reportes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'No fue posible guardar el reporte.');
      setStatus({
        type: 'success',
        message: isEditing ? 'Reporte actualizado correctamente.' : 'Reporte guardado correctamente.',
      });
      setIsEditing(true);
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    } finally {
      setSending(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-6">
      <div>
        <label className="field-label" htmlFor="areaId">Área</label>
        <select id="areaId" name="areaId" value={form.areaId} onChange={handleAreaChange} required className="input-control">
          <option value="">Selecciona tu área</option>
          {areas.map((area) => <option key={area.id} value={area.id}>{area.nombre}</option>)}
        </select>
      </div>
      <div className="grid gap-6 md:grid-cols-3">
        {[
          ['progreso', 'Progreso', '¿Qué lograste hoy?'],
          ['plan', 'Plan', '¿Qué harás mañana?'],
          ['bloqueos', 'Bloqueos', '¿Qué necesita atención?'],
        ].map(([name, label, placeholder]) => (
          <label key={name} className="field-label" htmlFor={name}>
            {label}
            <textarea id={name} name={name} value={form[name]} onChange={updateField} placeholder={placeholder} required className="input-control textarea-control" />
          </label>
        ))}
      </div>
      {status.message && (
        <p className={`status ${status.type}`} role="status">
          {status.type === 'success' && <CheckCircle2 size={17} />}
          {status.type === 'info' && <Edit3 size={17} />}
          {status.message}
        </p>
      )}
      <button type="submit" disabled={sending} className="primary-button">
        {isEditing ? <Edit3 size={17} /> : <Send size={17} />}
        {sending ? 'Guardando...' : (isEditing ? 'Actualizar reporte' : 'Guardar reporte')}
      </button>
    </form>
  );
}
