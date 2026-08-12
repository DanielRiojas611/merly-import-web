# Panel Administrativo Merly Import

El panel de Merly Import usa sesion firmada y rutas no indexables para gestionar catalogo, precios y contenido de portada.

## Modulos

- Productos: edicion, activacion, desactivacion, CSV y borradores.
- Precios: escalas por volumen.
- Contenido: banners principales, banners laterales, botones, Facebook y TikTok.
- Leads: el formulario de distribuidores guarda registros en `distributor_leads`.

## Imagenes

Las imagenes nuevas deben almacenarse con el `BLOB_READ_WRITE_TOKEN` del proyecto propio de Merly. No reutilizar tokens ni buckets de otros proyectos.
