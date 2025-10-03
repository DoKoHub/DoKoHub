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

Falls in dem Ordner "src" die Datei ".env" nicht existiert, diese erstellen.
Dann den Text aus ".env.example" kopieren und "<passwort>" zu dem bei PostgreSQL gewählten Passwort ändern.

```bash
npm run db:push
```
Um die Datenbank zu initialisieren.

# Nützliche Infos

## Ordner Aufteilung

- Datei für die Datenbank: `doko-hub/src/lib/server/db`
- Ordner für das Backend: `doko-hub/src/routes/api`
- Ordner für das Frontend: `doko-hub/src/routes/app`

## Wichtige Befehle

Projekt starten: `npm run dev`
Änderungen der Datenbank: `npm run db:push`
> Nicht für `INSERT`, sondern wenn zum Beispiel Tabellen angepasst/hinzugefügt/... werden.
