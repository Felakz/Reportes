import express from 'express';
import helmet from 'helmet';
import pg from 'pg';
import puppeteer from 'puppeteer';
import crypto from 'node:crypto';

const { Pool } = pg;
const app = express();
const port = Number(process.env.PORT || 3000);
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
const adminSessions = new Set();

app.use(helmet());
app.use(express.json({ limit: '1mb' }));

app.post('/api/admin/login', (req, res) => {
  if (req.body?.password !== adminPassword) {
    return res.status(401).json({ error: 'Contraseña incorrecta.' });
  }

  const token = crypto.randomBytes(32).toString('hex');
  adminSessions.add(token);
  res.json({ token });
});

const requireAdmin = (req, res, next) => {
  const token = req.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token || !adminSessions.has(token)) {
    return res.status(401).json({ error: 'Autenticación de administrador requerida.' });
  }
  next();
};

const escapeHtml = (value = '') => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;')
  .replaceAll('\n', '<br>');

app.get('/api/areas', async (_req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT id, nombre FROM areas ORDER BY id');
    res.json(rows);
  } catch (error) {
    next(error);
  }
});

app.get('/api/reportes/check', async (req, res, next) => {
  const { areaId, fecha } = req.query;
  if (!areaId) return res.status(400).json({ error: 'areaId es requerido.' });
  const targetDate = fecha || new Date().toISOString().slice(0, 10);
  try {
    const query = `
      SELECT id, area_id, progreso, plan, bloqueos, fecha, creado_en
      FROM reportes_diarios
      WHERE area_id = $1 AND fecha = $2::date
    `;
    const { rows } = await pool.query(query, [areaId, targetDate]);
    res.json(rows[0] || null);
  } catch (error) {
    next(error);
  }
});

app.post('/api/reportes', async (req, res, next) => {
  const { areaId, progreso, plan, bloqueos, fecha } = req.body;
  if (!areaId || !progreso?.trim() || !plan?.trim() || !bloqueos?.trim()) {
    return res.status(400).json({ error: 'Todos los campos son obligatorios.' });
  }

  const targetDate = fecha || new Date().toISOString().slice(0, 10);

  try {
    const query = `
      INSERT INTO reportes_diarios (area_id, fecha, progreso, plan, bloqueos)
      VALUES ($1, $2::date, $3, $4, $5)
      ON CONFLICT (area_id, fecha)
      DO UPDATE SET
        progreso = EXCLUDED.progreso,
        plan = EXCLUDED.plan,
        bloqueos = EXCLUDED.bloqueos,
        creado_en = NOW()
      RETURNING id, fecha
    `;
    const { rows } = await pool.query(query, [areaId, targetDate, progreso.trim(), plan.trim(), bloqueos.trim()]);
    res.status(201).json({ message: 'Reporte guardado correctamente.', reporte: rows[0] });
  } catch (error) {
    if (error.code === '23503') {
      return res.status(400).json({ error: 'El área seleccionada no existe.' });
    }
    next(error);
  }
});

app.get('/api/admin/dashboard', requireAdmin, async (req, res, next) => {
  const targetDate = req.query.fecha || new Date().toISOString().slice(0, 10);
  try {
    const query = `
      SELECT 
        a.id AS area_id,
        a.nombre AS area,
        (r.id IS NOT NULL) AS enviado,
        r.id AS reporte_id,
        r.progreso,
        r.plan,
        r.bloqueos,
        r.creado_en
      FROM areas a
      LEFT JOIN reportes_diarios r ON r.area_id = a.id AND r.fecha = $1::date
      ORDER BY a.id
    `;
    const { rows } = await pool.query(query, [targetDate]);
    res.json({ fecha: targetDate, areas: rows });
  } catch (error) {
    next(error);
  }
});

app.get('/api/reportes/pdf', requireAdmin, async (req, res, next) => {
  let browser;
  const targetDate = req.query.fecha || new Date().toISOString().slice(0, 10);
  try {
    const query = `
      SELECT r.fecha, r.progreso, r.plan, r.bloqueos, a.nombre AS area
      FROM reportes_diarios r
      JOIN areas a ON a.id = r.area_id
      WHERE r.fecha = $1::date
      ORDER BY a.id, r.creado_en
    `;
    const { rows } = await pool.query(query, [targetDate]);
    const dateObj = new Date(`${targetDate}T12:00:00`);
    const dateStr = new Intl.DateTimeFormat('es-ES', { dateStyle: 'full' }).format(dateObj);
    const colors = ['#8b5cf6', '#f97316', '#10b981', '#0f766e', '#3b82f6'];
    const reportsHtml = rows.length
      ? rows.map((report, idx) => {
          const borderColor = colors[idx % colors.length];
          return `
        <article class="report" style="border-left-color: ${borderColor};">
          <h2>${idx + 1}. ${escapeHtml(report.area)}</h2>
          <div class="item"><h3 class="lbl-progreso">Progreso:</h3><span>${escapeHtml(report.progreso)}</span></div>
          <div class="item"><h3 class="lbl-plan">Plan:</h3><span>${escapeHtml(report.plan)}</span></div>
          <div class="item"><h3 class="lbl-bloqueos">Bloqueos:</h3><span>${escapeHtml(report.bloqueos)}</span></div>
        </article>`;
        }).join('')
      : `<p class="empty">No hay reportes registrados para la fecha ${escapeHtml(targetDate)}.</p>`;

    const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><style>
      @page { size: A4; margin: 18mm; } * { box-sizing: border-box; }
      body { font-family: Arial, sans-serif; color: #1f2937; margin: 0; }
      header { border-bottom: 3px solid #1e293b; padding-bottom: 14px; margin-bottom: 24px; }
      h1 { color: #1e293b; font-size: 26px; font-weight: 700; margin: 0 0 6px; } .date { color: #64748b; font-size: 14px; text-transform: capitalize; }
      .intro { font-size: 13px; color: #475569; line-height: 1.5; margin: 0 0 24px; }
      .report { border: 1px solid #f1f5f9; border-left: 8px solid #0f766e; background: #ffffff; padding: 18px 20px; margin-bottom: 20px; border-radius: 4px; break-inside: avoid; }
      h2 { color: #1e293b; font-size: 18px; font-weight: 700; margin: 0 0 14px; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px; }
      h3 { display: inline-block; width: 110px; vertical-align: top; font-size: 13px; font-weight: 700; margin: 0 0 10px; }
      .lbl-progreso { color: #0284c7; }
      .lbl-plan { color: #8b5cf6; }
      .lbl-bloqueos { color: #dc2626; }
      .item { font-size: 13px; line-height: 1.6; margin: 0 0 10px; color: #334155; }
      .item span { display: inline-block; width: calc(100% - 120px); }
      .empty { padding: 32px; text-align: center; color: #64748b; font-size: 14px; }
    </style></head><body><header><h1>Reporte Diario de Avances</h1><div class="date">Fecha de Emisión: ${escapeHtml(dateStr)}</div></header><p class="intro">Documento consolidado generado automáticamente a partir de los registros ingresados por los líderes de cada área en la plataforma local.</p>${reportsHtml}</body></html>`;

    browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdf = await page.pdf({ format: 'A4', printBackground: true });
    const pdfBuffer = Buffer.from(pdf);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="reporte-${targetDate}.pdf"`,
      'Content-Length': pdfBuffer.length
    });
    res.send(pdfBuffer);
  } catch (error) {
    next(error);
  } finally {
    await browser?.close();
  }
});

app.get('/health', async (_req, res) => {
  try { await pool.query('SELECT 1'); res.json({ status: 'ok' }); }
  catch { res.status(503).json({ status: 'unavailable' }); }
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ error: 'Error interno del servidor.' });
});

app.listen(port, () => console.log(`Backend escuchando en el puerto ${port}`));
