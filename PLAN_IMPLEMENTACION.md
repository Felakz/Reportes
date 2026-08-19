# Plan de implementación

## Objetivo

Construir una plataforma local para que cada área registre su reporte diario y para que un administrador genere un PDF consolidado con el formato corporativo acordado.

## Fase 1: Base local y persistencia

- PostgreSQL almacena las áreas y los reportes diarios.
- `docker-compose.yml` conecta base de datos, backend y frontend.
- El volumen `postgres_data` conserva la información aunque se reinicien los contenedores.
- `POST /api/reportes` valida y guarda progreso, plan y bloqueos.

## Fase 2: Registro de reportes

- La página principal `/` carga las áreas desde la API.
- El líder selecciona su área y completa los tres campos obligatorios.
- Al enviar, el backend responde con confirmación y el reporte queda guardado con la fecha actual.

## Fase 3: Administración protegida

- La página `/admin` está separada de la pantalla de captura.
- El administrador introduce una contraseña básica configurada mediante `ADMIN_PASSWORD`.
- El backend entrega un token temporal en memoria después del login.
- El endpoint del PDF rechaza solicitudes sin un token válido.
- La contraseña por defecto es `admin123`; debe cambiarse en un archivo `.env` local.

## Fase 4: PDF consolidado

- `GET /api/reportes/pdf` consulta únicamente los reportes de la fecha actual.
- Los datos se escapan antes de insertarse en HTML.
- Puppeteer convierte la plantilla HTML a PDF.
- El documento incluye título, fecha de emisión, introducción, área y los campos Progreso, Plan y Bloqueos.
- Cada área se mantiene agrupada y los bloques pueden continuar en una página siguiente sin cortarse.

## Flujo operativo

1. Levantar la plataforma con `docker compose up --build`.
2. Los líderes entran en `http://localhost:8080` y guardan sus reportes.
3. El administrador entra en `http://localhost:8080/admin`.
4. Introduce la contraseña configurada.
5. Selecciona “Generar y descargar PDF del día”.
6. El PDF se descarga con los reportes existentes de ese día.

## Siguientes mejoras recomendadas

- Sustituir la contraseña compartida por usuarios y roles individuales.
- Guardar sesiones en Redis o PostgreSQL si se ejecutan varias instancias del backend.
- Añadir edición, eliminación y consulta histórica por fecha.
- Incorporar validación de longitud y auditoría de cambios.
- Añadir pruebas automatizadas para login, guardado y PDF.
- Configurar copias de seguridad del volumen PostgreSQL.
