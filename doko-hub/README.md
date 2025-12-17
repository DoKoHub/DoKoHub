# Quickguide für das Projekt Setup

Ein kurzer Guide wie man das Projekt lokal auf dem Rechner initialisiert und zum Laufen bringt.

## Nötige Tools herunterladen

Für das Projekt benötigte Tools.

### Docker

[Docker Download Seite](https://www.docker.com/products/docker-desktop/) installieren.

## Projekt initialisieren

Im Ordner `doko-hub` eine `.env` Datei anlegen und den Inhalt der `.env.example` kopieren und anpassen.

Ein Terminal (CMD / Powershell) öffnen und in den Unterordner `doko-hub` navigieren.

```bash
docker compose up --build
```
ausführen um den Container zu starten.

# Nützliche Infos

## Ordner Aufteilung

- Datei für die Datenbank: `doko-hub/src/lib/server/db`
- Ordner für das Backend: `doko-hub/src/routes/api`
- Ordner für das Frontend: `doko-hub/src/routes/app`

## Dev-Container

In einer Dev-Container fähige IDE, den Ordner `DoKohub` als Dev-Container öffnen. 

## Wichtige Befehle

Projekt starten: `npm run dev`
Änderungen der Datenbank: `npm run db:push`

> Nicht für `INSERT`, sondern wenn zum Beispiel Tabellen angepasst/hinzugefügt/... werden.

## Tests ausführen

Tests mit logs ausgeben: `npm run test`
Tests ohne logs ausgeben: `npm run test:silent`

## Alle Befehle erklärt

```jsonc
{
  "scripts": {
    /* --- Entwicklung und Build --- */
    // Startet den Entwicklungsserver.
    "dev": "vite dev",
    // Erstellt die Assets des Projekts.
    "build": "vite build",
    // Startet einen lokalen Server, um das gebaute Projekt vor dem Deployment zu testen.
    "preview": "vite preview",

    /* --- Vorbereitung und Checks --- */
    // Synchronisiert SvelteKit-Dateien und führt dann SMUI-Vorbereitungen durch.
    "prepare": "svelte-kit sync; npm run smui-prepare",
    // Führt einen einmaligen Typ-Check über alle Svelte-Dateien durch.
    "check": "svelte-kit sync && svelte-check --tsconfig ./tsconfig.json",
    // Startet den Typ-Check und überwacht die Dateien auf Änderungen.
    "check:watch": "svelte-kit sync && svelte-check --tsconfig ./tsconfig.json --watch",

    /* --- Tests --- */
    // Führt die Tests ohne logs aus.
    "test:silent": "cross-env node -r dotenv/config node_modules/jest/bin/jest.js --runInBand --silent",
    // Führt die Tests mit Jest aus..
    "test": "cross-env node -r dotenv/config node_modules/jest/bin/jest.js --runInBand",

    /* --- Datenbank (Drizzle ORM) --- */
    // Startet die in docker-compose.yml definierte Datenbankumgebung.
    "db:start": "docker compose up",
    // Führt eine 'Push'-Operation durch: Aktualisiert das Datenbankschema direkt anhand der aktuellen Drizzle-Definitionen.
    "db:push": "drizzle-kit push",
    // Generiert neue Migrationsdateien basierend auf den Änderungen im Schema.
    "db:generate": "drizzle-kit generate",
    // Wendet die generierten Migrationsdateien auf die Datenbank an.
    "db:migrate": "drizzle-kit migrate",
    // Startet die Drizzle-Studio-Oberfläche zur visuellen Verwaltung der Datenbank.
    "db:studio": "drizzle-kit studio",

    /* --- SMUI Theming --- */
    // Führt die Kompilierung der SMUI-Themas durch.
    "smui-prepare": "npm run smui-theme-light && npm run smui-theme-dark",
    // Kompiliert das helle SMUI-Theme in die CSS-Datei static/smui.css.
    "smui-theme-light": "smui-theme compile static/smui.css -i src/theme",
    // Kompiliert das dunkle SMUI-Theme in die CSS-Datei static/smui-dark.css.
    "smui-theme-dark": "smui-theme compile static/smui-dark.css -i src/theme/dark"
  }
}
```

