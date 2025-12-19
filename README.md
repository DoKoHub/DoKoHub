> [!WARNING]
> Dieses projekt ist ein Work In Progress (WIP)

# DoKoHub - Webapp zum Analysieren von Doppelkopf Spielergebnissen

Nach einem langen Abend Doppelkopf weiß eigentlich niemand wirklich wer jetzt wie viele Gesamtpunkte hat.
Darum wollen wir eine mobile-first webapp schreiben, die es jedem erlaubt,
Ergebnisse und Statistiken über mehrere Runden Doppelkopf aufzunehmen und auszuwerten.

> Dieses Projekt ist teil des Teamprojekts 2025 der Ostfalia Hochschule für angewandte Wissenschaften Wolfenbüttel

## Getting Started

Das Quick-Guide für das Projekt Setup befindet sich in dem Ordner `doko-hub`.
See [here](doko-hub/README.md)

## Nützliche Dokumentationen
- Das User Guide ist [hier](doc/user_guide/user_guide.md) zu finden.
- Die Devlogs sind [hier](doc/ProjectTimeline) zu finden.

## Aktuelle Einschränkungen
Spielergebnisse pro Runde werden noch nicht angezeigt

Status: Datenanbindung in der UI fehlt
Umsetzung:
- TODO: In `src/routes/app/game/[group]/[game]/overview/rounds/+page.ts` die Anbindung gemäß Code-Dokumentation ergänzen (Punkte pro Spieler)
- TODO: In `src/routes/app/game/[group]/[game]/overview/rounds/+page.svelte´ die Punkte pro Spieler aufrufen und Darstellung finalisieren
    - Zeilen: Runden
    - Spalten: Spieler
   
Buttons AppBar - Funktionalität sicherstellen

- Zurück-Button: Logik ist aktuell nicht konsistent
- TODO: Navigation zu `/group/[group]/games/+page.svelte`

- Summe: klappbar über visibility
  - aktuelle immer sichtbar, soll ein-/ausblendbar sein

- more_vert: aktuell vorhanden, aber Logik fehlt noch nach Anbindung
- TODO: In `src/routes/app/game/[group]/[game]/overview/+layout.svelte` die folgenden Funktionen erweitern: 
    - addFourRounds()
    - finishGameEarly()
    - deleteGame()
