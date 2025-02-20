import React, { useEffect, useState } from 'react';
import './App.css';
import MapComponent from "./components/Map";
import { set } from 'ol/transform';

function App() {
  const [capitalsData, setCapitalsData] = useState(null);
  const [currentCapital, setCurrentCapital] = useState(null);
  const [currentCountry, setCurrentCountry] = useState(null);
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [guesses, setGuesses] = useState([]);
  const [round, setRound] = useState(1);
  const [score, setScore] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [gameState, setGameState] = useState('menu'); // menu, inGame, results
  const [hideCapital, setHideCapital] = useState(false);
  const [showNextButton, setShowNextButton] = useState(false);
  const [showAnswer, setShowAnswer] = useState(false);
  // multiplayer
  const [ws, setWs] = useState(null);
  const [lobbyId, setLobbyId] = useState(null);
  const [playerRole, setPlayerRole] = useState(null); // host, guest
  const [opponentGuesses, setOpponentGuesses] = useState([]);
  const [opponentCorrect, setOpponentCorrect] = useState(false);
  const [gameMode, setGameMode] = useState('single');
  const [opponentScore, setOpponentScore] = useState(0);

  // Fetch capitals data
  useEffect(() => {
    const fetchData = async () => {
      const capitalsResponse = await fetch(`${process.env.PUBLIC_URL}/countries_capitals_flags.json`);
      const capitals = await capitalsResponse.json();
      setCapitalsData(capitals);
    };
    fetchData();
  }, []);

  // Setup current round for singleplayer mode
  useEffect(() => {
    // Set the current capital and country for the round
    if (gameMode === 'single' && capitalsData && gameState === 'inGame') {
      const countries = Object.keys(capitalsData);
      const randomCountry = countries[Math.floor(Math.random() * countries.length)];
      setCurrentCountry(randomCountry);
      setCurrentCapital(capitalsData[randomCountry].capital);
      setHideCapital(true);
      setGuesses([]);
    }
  }, [capitalsData, gameState, round, gameMode]);

  // Singleplayer guess handler
  const handleGuessSingle = (guessedCountry) => {
    if (guesses.length < 3) {
      const correct = guessedCountry === currentCountry;
      setGuesses([...guesses, { guessedCountry, correct }]);
      if (correct) {
        setScore(score + 1);
        setShowNextButton(true);
      } else if (guesses.length === 2) {
        setShowAnswer(true);
        setShowNextButton(true);
      }
    }
  };

  // Singleplayer next round
  const nextRoundSingle = () => {
    setShowNextButton(false);
    setShowAnswer(false);
    if (round < 6) {
      setRound(round + 1);
    } else {
      setGameState('results');
      setShowResults(true);
    }
  };

  const nextRound = () => {
    setShowNextButton(false);
    setShowAnswer(false);
    if (round < 6) {
      setRound(round + 1);
    } else {
      setGameState('results');
      setShowResults(true);
    }
  };

  const startGame = () => {
    setGameMode('single');
    setGameState('inGame');
    setRound(1);
    setScore(0);
    setShowResults(false);
    setShowAnswer(false);
    setShowNextButton(false);
  };

  const startMultiplayerGame = () => {
    setGameMode('multi');
    setGameState('multiplayer');
    setRound(1);
    setScore(0);
    setShowResults(false);
    setShowAnswer(false);
    setShowNextButton(false);
  };

  const quitGame = () => {
    setGameState('menu');
    setShowResults(false);
    setRound(1);
    setScore(0);
    setShowAnswer(false);
  };

  const renderResults = () => (
    <div className="results">
      <h1>Game Over</h1>
      <h2>Your Score: {score}</h2>
      <button onClick={quitGame}>Back to Menu</button>
    </div>
  );

  // multiplayer
  // Multiplayer WebSocket setup
  useEffect(() => {
    const socket = new WebSocket("ws://localhost:3001");
    socket.onopen = () => console.log("Connected to WebSocket server");
    socket.onmessage = (message) => {
      const data = JSON.parse(message.data);
      console.log("Message from server:", data);

      

      if (data.type === 'lobbyCreated') {
        setLobbyId(data.lobbyId);
        setPlayerRole("host");
      } else if (data.type === 'newRound') {
        setCurrentCapital(data.capital);
        setCurrentCountry(data.country);
        console.log("New round data:", data);
        console.log("Current country:", data.country);
        setHideCapital(true);
        setGameState("multiInGame");
        setGuesses([]);
        setOpponentGuesses([]);
        setRound(prev => prev + 1);
        setShowNextButton(false);
        setShowAnswer(false);
        setOpponentCorrect(false);
      } else if (data.type === 'opponentGuess') {
        if (data.correct) {
          setOpponentScore(prev => prev + 1);
          setOpponentCorrect(true);
        } else {
          setOpponentGuesses(prev => [...prev, data.guessedCountry]);
        }
      } else if (data.type === 'nextRoundAvailable') {
        setShowNextButton(true);
      } else if (data.type === 'lobbyError') {
        alert(data.message);
      } else if (data.type === 'opponentDisconnected') {
        alert("Opponent disconnected");
        setGameState('menu');
        setLobbyId(null);
        setPlayerRole(null);
      }
      
    };
    setWs(socket);
    return () => socket.close();
  }, []);

  // Multiplayer guess handler
  const handleGuessMulti = (guessedCountry) => {
    if (guesses.length < 3) {
      const correct = guessedCountry === currentCountry;
      const newGuess = { guessedCountry, correct };
      const updatedGuesses = [...guesses, newGuess];
      setGuesses(updatedGuesses);

      if (ws) {
        ws.send(JSON.stringify({ type: 'playerGuess', guessedCountry, correct }));
      }
      if (correct || updatedGuesses.length === 3) {
        setShowNextButton(true);
        if (correct) {
          setScore(prev => prev + 1);
        }
        if (ws) {
          ws.send(JSON.stringify({ type: 'roundFinished' }));
          setShowAnswer(true);
        }
      }
    }
  };


  const nextRoundMulti = () => {
    setShowNextButton(false);
    setShowAnswer(false);
    // Let the server trigger the next round via 'newRound' message.
  };

  const createLobby = () => {
    if (ws) {
      ws.send(JSON.stringify({ type: 'createLobby', rounds: 6 }));
    }
  };

  const joinLobby = () => {
    const id = prompt("Enter lobby ID:");
    if (ws && id) {
      ws.send(JSON.stringify({ type: 'joinLobby', lobbyId: id }));
      setLobbyId(id);
      setPlayerRole("guest");
    }
  };

  const renderOpponentGuesses = () => (
    <div className="info-panel-guesses">
      <h3>Opponent's Guesses</h3>
      <div className="guesses-list">
        {opponentGuesses.map((guess, index) => (
          <div className="guess" key={index}>
            <img src={`https://flagcdn.com/48x36/${capitalsData[guess]?.flag.toLowerCase()}.webp`} alt={guess} />
            <p key={index} style={{ color: 'red', fontWeight: 'bold' }}>{guess}</p>
          </div>
        ))}
      </div>
      {opponentCorrect && <p style={{ color: 'green', fontWeight: 'bold' }}>✔ Opponent guessed correctly!</p>}
    </div>
  );

  return (
    <div className="app-container">

      {/* Map Section */}
      <div className="map-container">
        <MapComponent onCountrySelect={setSelectedCountry} hideCapital={hideCapital} />
      </div>
      {/* Right Panel Section */}
      <div className="info-panel">
        {gameState === 'results' && renderResults()}
        {gameState === 'menu' && (
          <div className="menu">
            <h1>Choose Game Mode</h1>
            <button className="sp-button" onClick={startGame}>Start Singleplayer</button>
            <button className="mp-button" onClick={startMultiplayerGame}>Start Multiplayer</button>
          </div>
        )}

        {/* Singleplayer Game */}
        {gameState === 'inGame' && (
          <div className='info-panel-inGame'>
            {!showNextButton && (
              <button className="guess-button" onClick={() => handleGuessSingle(selectedCountry)}>Make Guess</button>
            )}
            <h1>Round {round}/6</h1>
            <div className="info-panel-guesses">
              <h2>Guesses</h2>
              <div className="guesses-list">
                {guesses.map((guess, index) => (
                  <div className='guess' key={index}>
                    <img src={`https://flagcdn.com/48x36/${capitalsData[guess.guessedCountry]?.flag.toLowerCase()}.webp`} alt={guess.guessedCountry} />
                    <h3 style={{ color: guess.correct ? 'green' : 'red' }}>
                      {guess.correct ? 'Correct' : 'Wrong'}
                    </h3>
                  </div>
                ))}
              </div>
            </div>

            <div className="guesses-capital">
              <h3>In Which Country Is:</h3>
              <h2><i>{currentCapital}</i></h2>
            </div>

            {showAnswer && (
              <div className="answer">
                <h2>Correct Answer:</h2>
                <img src={`https://flagcdn.com/48x36/${capitalsData[currentCountry]?.flag.toLowerCase()}.webp`} alt={currentCountry} />
                <h3>{currentCountry}</h3>
              </div>
            )}

            <div className="button-next">
              {showNextButton && (
                <button onClick={nextRound}>Next</button>
              )}
            </div>

            <div className="button-quit">
              <button onClick={quitGame}>Quit</button>
            </div>
          </div>
        )}

        {gameState === 'multiInGame' && (
          <div className="info-panel-inGame">

            <div className='score-panel'>
              <div style={{ fontWeight: 'bold' }} className='score-info'>
                <p>Your score: </p>
                <p className='score'>{score}</p>
              </div>
              <div className='score-info'>
                <p>Opponent's score: </p>
                <p className='score'>{opponentScore}</p>
              </div>
            </div>
            <hr />
            {renderOpponentGuesses()}
            <hr />
            <div className="info-panel-guesses">
              <h3>Your Guesses</h3>
              <div className="guesses-list">
                {guesses.map((guess, index) => (
                  <div className="guess" key={index}>
                    <img src={`https://flagcdn.com/48x36/${capitalsData[guess.guessedCountry]?.flag.toLowerCase()}.webp`} alt={guess.guessedCountry} />
                    <h3 style={{ color: guess.correct ? 'green' : 'red' }}>
                      {guess.correct ? 'Correct' : 'Wrong'}
                    </h3>
                  </div>
                ))}
              </div>
            </div>
            <hr />
            <div className="guesses-capital">
              <h3>In Which Country Is:</h3>
              <h2><i>{currentCapital}</i></h2>
            </div>

            {showAnswer && (
              <div className="answer">
                <h2>Correct Answer:</h2>
                <img src={`https://flagcdn.com/48x36/${capitalsData[currentCountry]?.flag.toLowerCase()}.webp`} alt={currentCountry} />
                <h3>{currentCountry}</h3>
              </div>
            )}

            {/* guess button */}
            {!showNextButton && (
              <button className="guess-button" onClick={() => handleGuessMulti(selectedCountry)}>Make Guess</button>
            )}

            <div className="button-quit">
              <button onClick={quitGame}>Quit</button>
            </div>
          </div>
        )}

        {/* Multiplayer Game */}
        {gameState === 'multiplayer' && (
          <div className='multiplayer-lobby'>
            <h1>Multiplayer Lobby</h1>
            {lobbyId ? (
              <h2>Lobby ID: {lobbyId}</h2>
            ) : (
              <div className='lobby-buttons'>
                <button onClick={createLobby}>Create Lobby</button>
                <button onClick={joinLobby}>Join Lobby</button>
              </div>
            )}
            <div className="button-quit">
              <button onClick={quitGame}>Quit</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
