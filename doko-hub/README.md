# Quickguide für das Projekt Setup

Ein kurzer Guide wie man das Projekt lokal auf dem Rechner initialisiert und zum Laufen bringt.

## Nötige Tools herunterladen

Für das Projekt benötigte Tools.

### NodeJS installieren

[NodeJS Installer](https://nodejs.org/en/download) (Version 22.20.0) installieren und ausführen.

### PostgreSQL installieren

[PostgreSQL Installer](https://www.enterprisedb.com/downloads/postgres-postgresql-downloads) installieren und ausführen.
Das erstellte Passwort merken.
Und den Port bitte auf dem Standard Wert lassen (5432).

## Projekt initialisieren

Ein Terminal (CMD / Powershell) öffnen und in den Ordner "doko-hub" navigieren.
```bash
npm install
```
Lädt alle nötigen Pakete runter.

> [!WARNING]
> Sollte der Error `Die Datei [...\npm.psi] kann nicht geladen werden, [...]` auftauchen
> 1.  Neues z.B CMD Fenster als Administrator starten
> 2.  ODER `Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned` ausführen und erneut versuchen.

Falls in dem Ordner "doko-hub" die Datei ".env" nicht existiert, diese erstellen.
Dann den Text aus ".env.example" kopieren und "<passwort>" zu dem bei PostgreSQL gewählten Passwort ändern.

```bash
npm run db:push
```
Dann `Yes, I want to execute all statements` auswählen mit den Pfeiltasten und `Enter` drücken.
>Um die Datenbank zu initialisieren.

```bash
npm run dev
```
> Startet das Projekt. Über den Browser [localhost](http://localhost:5173/) erreichbar.

# Test ob das Projekt funktioniert

Um zu testen ob alle Komponenten funktionieren, auf der Website in dem Nummern-Feld eine beliebige Zahl eingeben.

Als nächstes die Anwendung `pgAdmin` starten.
> `pgAdmin` ist ein Tool um Datenbanken zu verwalten.

1. Ordner ausklappen `servers`>`postgressql 18`>`databases>postgres`
2. Rechtsklick auf `schemas` > `Query Tool`
3. `SELECT * FROM nummer;` ausführen.
4. Wenn die eingegebene Zahl in der Tabelle eingertragen ist, funktioniert Alles.

# Nützliche Infos

## Ordner Aufteilung

- Datei für die Datenbank: `doko-hub/src/lib/server/db`
- Ordner für das Backend: `doko-hub/src/routes/api`
- Ordner für das Frontend: `doko-hub/src/routes/app`

## Wichtige Befehle

Projekt starten: `npm run dev`
Änderungen der Datenbank: `npm run db:push`
> Nicht für `INSERT`, sondern wenn zum Beispiel Tabellen angepasst/hinzugefügt/... werden.

## Tests ausführen

Tests mit logs ausgeben: `npm run test`
Tests ohne logs ausgeben: `npm run test:silent`

## Alle Befehle erklärt

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