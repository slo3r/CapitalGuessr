const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 3001;  // Cloud Run will set PORT to 8080

// Create an HTTP server and attach Express
const server = http.createServer(app);

// Create a WebSocket server that shares the same HTTP server
const wss = new WebSocket.Server({ server });

let lobbies = {}; // Stores lobbies { lobbyId: { players: [], capital, currentRound, readyPlayers } }

// Express routes if needed
app.get('/', (req, res) => {
  res.send("Hello from CapitalGuessr backend!");
});

wss.on('connection', (ws) => {
  console.log("New player connected");

  ws.on('message', (message) => {
    const data = JSON.parse(message);

    if (data.type === 'createLobby') {
      const lobbyId = uuidv4().slice(0, 6); // Shorter ID
      lobbies[lobbyId] = {
        players: [{ ws, score: 0 }],
        capital: null,
        currentRound: 1,
        readyPlayers: 0
      };
      ws.lobbyId = lobbyId;
      ws.send(JSON.stringify({ type: 'lobbyCreated', lobbyId }));
    }

    if (data.type === 'joinLobby') {
      const { lobbyId } = data;
      if (!lobbies[lobbyId] || lobbies[lobbyId].players.length >= 2) {
        return ws.send(JSON.stringify({ type: 'lobbyError', message: 'Lobby full or does not exist' }));
      }
      lobbies[lobbyId].players.push({ ws, score: 0 });
      ws.lobbyId = lobbyId;

      if (lobbies[lobbyId].players.length === 2) {
        startGame(lobbyId);
      }
    }

    if (data.type === 'playerGuess') {
      const { guessedCountry, correct } = data;
      const lobby = lobbies[ws.lobbyId];

      if (lobby) {
        // Update score if correct
        const playerObj = lobby.players.find(player => player.ws === ws);
        if (playerObj && correct) {
          playerObj.score += 1;
        }
        const otherPlayerObj = lobby.players.find(player => player.ws !== ws);
        if (otherPlayerObj) {
          otherPlayerObj.ws.send(JSON.stringify({ type: 'opponentGuess', guessedCountry, correct }));
        }
      }
    }

    if (data.type === 'roundFinished') {
      const lobby = lobbies[ws.lobbyId];
      if (lobby) {
        lobby.readyPlayers += 1;
        if (lobby.readyPlayers === 2) {
          lobby.readyPlayers = 0;
          lobby.currentRound += 1;
          setTimeout(() => startRound(lobby), 3000);
        }
      }
    }
  });

  ws.on('close', () => {
    console.log("Player disconnected");
    // You cannot send a message on close, so remove the lobby if needed
    if (ws.lobbyId && lobbies[ws.lobbyId]) {
      delete lobbies[ws.lobbyId];
    }
  });
});

function startGame(lobbyId) {
  const lobby = lobbies[lobbyId];
  if (lobby) {
    startRound(lobby);
  }
}

function startRound(lobby) {
  const jsonPath = path.join(__dirname, 'public', 'countries_capitals_flags.json');
  const capitalsData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

  const countries = Object.keys(capitalsData);
  const randomCountry = countries[Math.floor(Math.random() * countries.length)];

  lobby.capital = capitalsData[randomCountry].capital;
  console.log("Starting round with capital:", lobby.capital);

  lobby.players.forEach(playerObj => {
    playerObj.ws.send(JSON.stringify({
      type: 'newRound',
      capital: lobby.capital,
      country: randomCountry,
      scores: lobby.players.map((p, i) => ({ player: i === 0 ? "host" : "guest", score: p.score }))
    }));
  });
}

// Start the HTTP server (both Express and WebSocket will share this)
server.listen(port, '0.0.0.0', () => {
  console.log(`Server listening on port ${port}`);
});
