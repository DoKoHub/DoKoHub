# Dokumentation 4. Meilenstein vom 12.11.2025 – 27.11.2025

## 16.11.2025 – Teammeeting

**Ziel des Meetings:**  
Aufgabenverteilung für Meilenstein 4, offene Issues aus Meilenstein 3 klären und Verantwortlichkeiten festlegen.

**Besprochene Punkte:**
- Überblick über Zeitraum und Umfang von Meilenstein 4
- Sammeln und Durchgehen aller offenen Issues aus Meilenstein 3
- Aufteilung der Backend- und Frontend-Issues aus Meilenstein 4 auf die Teammitglieder
- Klärung offener Fragen zu ER-Modell, Datenbank, DTOs, REST-API und UI

**Ergebnis:**  
Zuerst wurde der Stand der Aufgaben aus Meilenstein 3 festgehalten:

- UI Spieleingabe: Melanie und Konstantin (MS3)
- Anbindung Frontend an API – SMART für First_Time_Login, Group_Overview, Group_Games,
  Group_Stats, Group_Members: Konstantin (MS3)
- Erstellung der CI/CD-Pipeline: Taron (MS3)

Anschließend wurden die Aufgaben für Meilenstein 4 verteilt:

- ER-Modell überarbeiten: Leen  
- Datenbankstruktur anpassen: Taron  
- DTO-Struktur an neues ER-Modell angleichen: Taron  
- REST-API Endpunkte für Rounds und Tests fixen: Taron  
- REST-API Endpunkte für Sessions und Tests fixen: Larin und Taron  
- REST-API Endpunkte für Sitzungen und Runden (neu): Taron  
- CI/CD-Pipeline erweitern: Larin und Taron  
- npm-Befehle überarbeiten: Larin  
- Tabbar navigiert nicht korrekt zur entsprechenden Zielseite: Melanie  
- Logik für Verwendung von Top AppBar / Bottom AppBar anpassen: Konstantin  
- UI: neue Seiten STATS_OVERVIEW, PROFILE, GAME_ROUNDS und GAME_STATS (weitere je nach Fortschritt): Laila  
- Anbindung Frontend ↔ Backend für Spielergebnisse: Melanie, Konstantin und Laila  


## 18.11.2025 – Meeting mit Betreuern: ER-Modell-Anpassungen

**Ziel des Meetings:**  
Vorstellung und Abstimmung der von mir erarbeiteten ER-Modell-Anpassungen mit den Betreuern sowie Klärung offener Fragen von uns und von den Betreuern.

**Besprochene Punkte:**
- Präsentation des überarbeiteten ER-Modells  
- Diskussion der Auswirkungen auf Gruppen, Sessions, Rounds und Ergebnisse  
- Offene Fragen der Betreuer zum Modell (Sonderfälle, Geschäftslogik, Relationen)  
- Unsere Fragen zu Modellierungsvarianten und Sonderspielregeln  

**Ergebnis:**
- Die Betreuer haben fachliches Feedback zum ER-Modell gegeben (Vereinfachungen, Präzisierungen, Ergänzungen).
- Mehrere Grenzfälle und Geschäftsregeln im Modell wurden geklärt.
- Es wurde vereinbart:
  - Leen überarbeitet das ER-Modell auf Basis des Feedbacks final.
  - Anschließend werden Datenbank und DTOs an das finale Modell angepasst.
  - Die REST-API-Endpunkte für Sessions und Rounds werden an das neue Modell angeglichen und getestet.
  - Zusätzlich soll ein Programm geschrieben werden, das die Ergebnisse des Spiels berechnet und getestet werden kann.


## 24.11.2025 – Teammeeting: Zwischenstände besprechen

**Ziel des Meetings:**  
Den aktuellen Zwischenstand aller Aufgaben in Backend und Frontend besprechen, insbesondere der aus Meilenstein 3 übernommenen Issues, und die Schwerpunkte für die restliche Zeit des Meilensteins festlegen.

**Besprochene Punkte:**
- Status der Backend-Aufgaben (Datenbankstruktur, DTOs, REST-API, Tests, npm-Befehle)
- Status der Frontend-Aufgaben (Navigation, AppBars, neue UI-Seiten, Anbindung an Backend)
- Überblick über die noch offenen bzw. teilweise fertigen Aufgaben
- Besprechung, dass Lailas UI-Seiten künftig einheitlich mit Svelte Material UI gestaltet werden sollen
- Festlegung, dass Taron und Larin die Arbeit an Tests und Code-Fixes priorisieren

**Ergebnis:**

Backend – Taron  
- Die Datenbankstruktur wurde an das neue ER-Modell angepasst (fertig).  
- Die DTO-Struktur wurde an das neue ER-Modell angeglichen (fertig).  
- Die REST-API-Endpunkte für Rounds und die dazugehörigen Tests wurden überarbeitet; ein Teil der Tests schlägt noch fehl, daher werden Code und Tests schrittweise weiter angepasst (teilweise fertig).

Backend – Larin  
- Die REST-API-Endpunkte für Sessions und die dazugehörigen Tests wurden verbessert und erweitert. Von rund 82 Tests funktioniert zu diesem Zeitpunkt nur ein Teil; Code und Tests werden laufend aneinander angepasst (teilweise fertig).  
- Die npm-Befehle wurden überarbeitet, bereinigt und vereinheitlicht (fertig).

Frontend – Melanie  
- Die Tabbar wurde so angepasst, dass sie jetzt korrekt zur jeweiligen Zielseite navigiert (fertig).
- Neue UI Seite: GAME_ROUNDS (fertig). 
- einheitliches Layout für die beiden UI Seiten: GAME_ROUNDS und GAME_STATS.

Frontend – Konstantin  
- Die Logik für die Verwendung von Top AppBar und Bottom AppBar wurde angepasst:  
  - Top AppBar für interne Gruppenseiten  
  - Bottom AppBar für allgemeine Seiten und Navigation (fertig).

Frontend – Laila  
- Neue UI-Seiten wurden umgesetzt: STATS_OVERVIEW, PROFILE und GAME_STATS (fertig).  
- Im Team wurde vereinbart, dass alle von Laila erstellten UI-Seiten auf Svelte Material UI umgestellt werden sollen, um einheitliche Farben und ein konsistentes Styling über alle Meilensteine hinweg zu erreichen.

Frontend ↔ Backend – Konstantin  und Melanie
- Die Anbindung Frontend ↔ Backend für Spielergebnisse wurde begonnen. Einige Seiten sind bereits an das Backend angebunden, die vollständige Anbindung aller relevanten Seiten ist zu diesem Zeitpunkt noch nicht abgeschlossen (teilweise fertig).

Übernommene offene Tasks aus Meilenstein 3  
- Alle drei offenen Aufgaben, die aus Meilenstein 3 in Meilenstein 4 übernommen wurden, sind bis zu diesem Zeitpunkt abgeschlossen.

## 27.11.2025 – Meeting mit Betreuern: Präsentation des aktuellen Stands

**Ziel des Meetings:**  
- Aktuellen Stand aus Meilenstein 4 vorstellen (Backend & Frontend)
- Zeigen, wie offene Issues aus Meilenstein 3 weitergeführt wurden
- Rückmeldung/Feedback von Betreuern einholen
- Offene Fragen und nächste Schritte für den nächsten Meilenstein klären und den nächsten Meatungs termin klären 

**Ergebnis:**
- CI/CD-Pipelines werden vorerst weggelassen,
weil wir sie in diesem Sprint nicht geschafft haben
und wir am Projektende den Nutzen nicht mehr richtig ausschöpfen können.
→ Stattdessen konzentrieren wir uns auf Features, die direkt für die Benutzer:innen wichtig sind.

- Das Backend ist fast fertig, aber:
es schlagen noch einige Tests fehl, diese sollen bis zum nächsten Sprint behoben werden
aktuell sind bereits ca. 95 % der Tests grün

- Larin soll bis zum nächsten Meeting
die Ergebnisberechnung im Backend optimieren,
damit wir diese im nächsten Meeting gemeinsam testen können.

**Ziel bis zum nächsten (letzten) Meilenstein**

- Die Anwendung soll bis zum nächsten und letzten Sprint so weit sein,
dass Benutzer:innen sie wirklich benutzen können.

- Es sind  keine Statistiken nötig, aber:
alle wichtigen Seiten sollen angebunden und im Flow nutzbar sein
man soll Ergebnisse eintragen können
man soll Gruppen erstellen können
man soll Personen in Gruppen einladen können

- Fokus liegt auf der funktionierenden Kern-Funktionalität für den End-User.

**ER-Modell Link : 
[Hier klicken, um das ER-Modell zu öffnen](https://dbdiagram.io/d/68e037d1d2b621e42233f6d1)
