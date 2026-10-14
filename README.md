# Mesa de ayuda

Aplicación sencilla para registrar casos y enviarlos a un correo específico según el departamento o destinatario configurado.

## Requisitos

- Node.js 18 o superior
- Un servidor SMTP real para envío de correos (opcional en este proyecto, si no se configura, los correos se muestran en consola)

## Instalación

1. Entra a la carpeta del proyecto.
2. Instala dependencias:
   ```bash
   npm install
   ```
3. Configura tu archivo `.env` con los datos reales del correo.

## Ejecutar

```bash
npm start
```

La aplicación quedará disponible en:

```text
http://localhost:3000
```

## Cómo funciona

- El usuario llena el formulario con nombre, correo, departamento, asunto y descripción.
- El caso se guarda en SQLite.
- Se dirige al correo correspondiente al departamento seleccionado.
- Si no configuras SMTP, el sistema simula el envío y muestra el destinatario en consola.

## Variables de entorno importantes

- `MAIL_USER`
- `MAIL_PASS`
- `MAIL_HOST`
- `MAIL_PORT`
- `MAIL_FROM`
- `MAIL_SUPPORT` = brayanverdugo274@gmail.com
- `MAIL_RRHH` = brayanverdugo274@gmail.com
- `MAIL_FINANZAS` = brayanverdugo274@gmail.com
- `MAIL_LOGISTICA` = brayanverdugo274@gmail.com
- `MAIL_GENERAL` = brayanverdugo274@gmail.com
