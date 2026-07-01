# Chatbot CEE-FIIS-UNI

Chatbot de WhatsApp para el Centro de Especialización Ejecutiva de la FIIS-UNI.

## Documentación

- [Documentación completa para desarrolladores](docs/PROJECT.md)
- [Reglas para agentes de IA](AGENTS.md)
- [Developer A — Flujos e IA](DEVELOPER_A.md)
- [Developer B — Servicios de inteligencia](DEVELOPER_B.md)

## Requisitos

Cero. El bot instala todo automáticamente.

## Cómo usar

### Windows
Doble clic en `start.bat`

### Linux / Mac
```bash
chmod +x start.sh
./start.sh
```

### ¿Qué hace?
1. Detecta si tienes Node.js 18+. Si no, lo descarga automáticamente.
2. Instala las dependencias (`npm install`).
3. Muestra un QR. Escanéalo con WhatsApp.
4. Escribe `hola` y el bot responde.

El dashboard del operador está en `http://localhost:3008/dashboard`.

## Configuración de IA (opcional)

El bot funciona sin IA. Para activar respuestas con Gemini:

1. Obtén una API key gratis en https://aistudio.google.com/apikey
2. Edita `.env.local` y pega tu key: `GEMINI_API_KEY=tu-key`

Sin API key, el bot usa respuestas predefinidas.
