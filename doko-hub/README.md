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
>
> 1.  Neues z.B CMD Fenster als Administrator starten
> 2.  ODER `Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned` ausführen und erneut versuchen.

Falls in dem Ordner "doko-hub" die Datei ".env" nicht existiert, diese erstellen.
Dann den Text aus ".env.example" kopieren und "<passwort>" zu dem bei PostgreSQL gewählten Passwort ändern.

```bash
npm run db:push
```

Dann `Yes, I want to execute all statements` auswählen mit den Pfeiltasten und `Enter` drücken.

> Um die Datenbank zu initialisieren.

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

API Tests mit logs ausgeben: `npm run test:api`
API Tests ohne logs ausgeben: `npm run test:apisilent`
