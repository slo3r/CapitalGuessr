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
  const [gameOver, setGameOver] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [gameState, setGameState] = useState('menu'); // menu, inGame, results
  const [hideCapital, setHideCapital] = useState(false);
  const [showNextButton, setShowNextButton] = useState(false);
  const [showAnswer, setShowAnswer] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      const capitalsResponse = await fetch(`${process.env.PUBLIC_URL}/countries_capitals_flags.json`);
      const capitals = await capitalsResponse.json();
      setCapitalsData(capitals);
    };
    fetchData();
  }, []);

  useEffect(() => {
    // Set the current capital and country for the round
    if (capitalsData && gameState === 'inGame') {
      const countries = Object.keys(capitalsData);
      const randomCountry = countries[Math.floor(Math.random() * countries.length)];
      setCurrentCountry(randomCountry);
      setCurrentCapital(capitalsData[randomCountry].capital);
      setHideCapital(true);
      console.log(gameState);
      setGuesses([]);
    } else {
      setHideCapital(false);
    }
  }, [capitalsData, gameState, round]);

  const handleGuess = (guessedCountry) => {
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
    setGameState('inGame');
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
            <button className="mp-button" >Start Multiplayer</button>
          </div>
        )}
        {gameState === 'inGame' && (
          <div className='info-panel-inGame'>
            {!showNextButton && (
              <button className="guess-button" onClick={() => handleGuess(selectedCountry)}>Make Guess</button>
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
      </div>


    </div>
  );
}

export default App;
