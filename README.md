# FileShare
FileShare ist eine App, mit der Teilnehmer Dateien direkt miteinander teilen können, ohne dass ein Server die Daten speichert.
Die Anwendung nutzt WebRTC für Peer-to-Peer-Verbindungen und Socket.IO für die Echtzeit-Kommunikation.

## Ablauf

1. **Raum erstellen**:
   - Öffnen Sie die Anwendung und klicken Sie auf "Create New Room".
   - Ein eindeutiger Raum-ID wird generiert, den Sie mit anderen teilen können.

2. **Raum beitreten**:
   - Klicken Sie auf "Join Existing Room" und geben Sie die Raum-ID in das Eingabefeld ein.
   - Alternativ können Sie einen geteilten Raum-Link direkt im Browser öffnen oder den QR-Code scannen.

3. **Dateien senden**:
   - Wählen Sie eine oder mehrere Dateien aus, indem Sie auf "Choose File" klicken oder Dateien per Drag & Drop in den Upload-Bereich ziehen.
   - Sobald die Verbindung hergestellt ist, können Sie die Dateien an andere Teilnehmer im Raum senden.

4. **Dateien empfangen**:
   - Empfangen Sie Dateien von anderen Teilnehmern im Raum.
   - Bilddateien werden mit einer Vorschau angezeigt.
   - Klicken Sie auf die empfangenen Dateien, um sie herunterzuladen.

5. **Chat**:
   - Nutzen Sie den integrierten Chat, um Textnachrichten direkt über die Peer-to-Peer-Verbindung zu senden.

## Features

- **WebRTC-basierte Peer-to-Peer-Dateiübertragung**: Dateien werden direkt zwischen den Teilnehmern übertragen, ohne dass ein Server die Daten speichert.
- **End-to-End-Verschlüsselung**: Alle Übertragungen sind durch WebRTC DTLS verschlüsselt.
- **Echtzeit-Kommunikation**: Verwendet `socket.io`, um Benutzer in Echtzeit zu verbinden.
- **Text-Chat**: Nachrichten werden direkt über den WebRTC-Datenkanal übertragen.
- **Mehrere Dateien gleichzeitig**: Unterstützung für die Auswahl und den Versand mehrerer Dateien.
- **Drag & Drop**: Dateien können per Drag & Drop in den Upload-Bereich gezogen werden.
- **Bildvorschau**: Empfangene Bilddateien werden mit einer Vorschau angezeigt.
- **Fortschrittsanzeige mit Geschwindigkeit**: Zeigt den Fortschritt und die Übertragungsgeschwindigkeit an.
- **QR-Code**: Raum-Link als QR-Code teilen, ideal für mobile Geräte.
- **Raum-Link kopieren**: Kompletter Link statt nur der Raum-ID wird kopiert.
- **Automatische Wiederverbindung**: Bei Verbindungsabbruch wird automatisch neu verbunden.
- **TURN-Server-Fallback**: Verbindungen funktionieren auch hinter restriktiven NATs und Firewalls.

## Technologien

- **Frontend**: React, simple-peer, qrcode.react
- **Backend**: Node.js, Express, Socket.IO

## Bekannte Probleme

- **Maximale Teilnehmeranzahl**: Der Raum unterstützt derzeit bis zu 10 Teilnehmer gleichzeitig.
- **Dateigröße**: Große Dateien können aufgrund von Speicherbeschränkungen des Browsers Probleme verursachen.

## Umgebungsvariablen

| Variable | Beschreibung | Standard |
|---|---|---|
| `PORT` | Port des Backend-Servers | `8000` |
| `CORS_ORIGIN` | Erlaubte CORS-Origin (Backend) | `*` |
| `REACT_APP_SERVER_URL` | URL des Signaling-Servers (Frontend) | `window.location.origin` |

## Setup - Production

To build and run the application in a production environment using Docker:

### Prerequisites
- Docker installed on your system
- Local copy of the repository

### Steps

**Build and Start the Services**: Run the following command in the root directory of the project:

```zsh
docker compose up --build
```

**Access the Application**:
- Frontend: Open http://localhost:3000 in your browser.
- Backend: The backend API will be available at http://localhost:8000.



## Setup - Development
Requirements:
- Lokale Kopie des Repositories
- Node.js (mit npm), empfohlen: v22.13.1


### Backend/Server
Alle Schritte gehen davon aus, dass im Root Verzeichnis des Projekts gestartet wird.

#### Initialisierung
```zsh
npm i
```

#### Starten des Backend/Server
```zsh
node server.js
```

### Frontend

#### Initialisierung
1 - Navigation in das frontend/client Verzeichnis
```zsh
cd client/
```
2 - Initialisierung
```zsh
npm i
```

#### Starten des Frontends/Client

1 - Navigation in das frontend/client Verzeichnis
```zsh
cd client/
```

2 - Projekt Starten
```zsh
npm start
```
