# Chatbot CEE-FIIS-UNI

Chatbot de WhatsApp para el Centro de Especialización Ejecutiva de la FIIS-UNI.

## Stack

BuilderBot 1.4.2 + Baileys (WhatsApp) + **RAG (LanceDB + Transformers.js)** + SQLite

## Documentación

- [Documentación completa para desarrolladores](docs/PROJECT.md)
- [Reglas para agentes de IA](AGENTS.md)
- [Arquitectura del proyecto](docs/ARCHITECTURE.md)

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

## RAG (búsqueda semántica)

El bot usa RAG local para responder preguntas sobre los programas del CEE. No necesita APIs externas.

### Primera vez
```bash
npm run rag:ingest
```

Esto carga los documentos de `docs/cee/` en LanceDB y descarga el modelo de embeddings (23 MB, solo la primera vez).

### Actualizar conocimiento
Edita los archivos en `docs/cee/` y vuelve a ejecutar:
```bash
npm run rag:ingest
```

## Configuración

Crea `.env.local` con:
```
DASHBOARD_SECRET=tu-secret
```
