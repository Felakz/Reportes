# Reportes diarios

Plataforma local para recopilar reportes diarios y generar un PDF consolidado.

## Puesta en marcha

Requiere Docker Desktop con Compose.

```bash
docker compose up --build
```

Abrir http://localhost:8080. El usuario puede enviar reportes seleccionando un área. La página de administración está en http://localhost:8080/admin y solicita la contraseña configurada en `ADMIN_PASSWORD` (por defecto: `admin123`).

Para cambiar la contraseña, crear un archivo `.env` junto a `docker-compose.yml`:

```env
ADMIN_PASSWORD=una-clave-local
```

Para detener los servicios:

```bash
docker compose down
```

Los datos de PostgreSQL persisten en el volumen `postgres_data`. Para reinicializar completamente la base local, detener los servicios y ejecutar `docker compose down -v`.
