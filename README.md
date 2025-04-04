# FileShare
FileShare ist eine App, mit der Teilnehmer Dateien direkt miteinander teilen können, ohne dass ein Server die Daten speichert. 
Die Anwendung nutzt WebRTC für Peer-to-Peer-Verbindungen und Socket.IO für die Echtzeit-Kommunikation.

## Ablauf

1. **Raum erstellen**: 
   - Öffnen Sie die Anwendung und klicken Sie auf "Create New Room".
   - Ein eindeutiger Raum-ID wird generiert, den Sie mit anderen teilen können.

2. **Raum beitreten**:
   - Klicken Sie auf "Join Existing Room" und geben Sie die Raum-ID ein, die Sie erhalten haben.

3. **Dateien senden**:
   - Wählen Sie eine Datei aus, indem Sie auf "Choose File" klicken.
   - Sobald die Verbindung hergestellt ist, können Sie die Datei an andere Teilnehmer im Raum senden.

4. **Dateien empfangen**:
   - Empfangen Sie Dateien von anderen Teilnehmern im Raum.
   - Klicken Sie auf die empfangenen Dateien, um sie herunterzuladen.

## Features

- **WebRTC-basierte Peer-to-Peer-Dateiübertragung**: Dateien werden direkt zwischen den Teilnehmern übertragen, ohne dass ein Server die Daten speichert.
- **Echtzeit-Kommunikation**: Verwendet `socket.io`, um Benutzer in Echtzeit zu verbinden.
- **Fortschrittsanzeige**: Zeigt den Fortschritt des Datei-Uploads und -Downloads an.

## Technologien

- **Frontend**: React, simple-peer
- **Backend**: Node.js, Express, Socket.IO

## Bekannte Probleme

- **Maximale Teilnehmeranzahl**: Der Raum unterstützt derzeit nur zwei Teilnehmer gleichzeitig.
- **Dateigröße**: Große Dateien können aufgrund von Speicherbeschränkungen des Browsers Probleme verursachen.

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

