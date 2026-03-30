/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Shield, 
  Skull, 
  Eye, 
  CheckCircle2, 
  XCircle, 
  RotateCcw, 
  User, 
  Search, 
  Star, 
  Gavel,
  ChevronRight,
  Info,
  ExternalLink,
  X
} from 'lucide-react';
import { Player, Role, Policy, GamePhase, ExecutivePower, GameState } from './types';
import { ROLE_DISTRIBUTION, INITIAL_DECK, FASCIST_POWERS, CREDITS } from './constants';

const shuffle = <T,>(array: T[]): T[] => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

export default function App() {
  const [numPlayers, setNumPlayers] = useState<number | null>(null);
  const [playerNames, setPlayerNames] = useState<string[]>([]);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [revealIdx, setRevealIdx] = useState(0);
  const [showSecret, setShowSecret] = useState(false);
  const [investigationResult, setInvestigationResult] = useState<Role | null>(null);
  const [showCredits, setShowCredits] = useState(false);

  const initGame = () => {
    if (!numPlayers) return;
    const dist = ROLE_DISTRIBUTION[numPlayers];
    const roles: Role[] = [
      ...Array(dist.liberals).fill('Liberal'),
      ...Array(dist.fascists).fill('Fascist'),
      'Hitler'
    ];
    const shuffledRoles = shuffle(roles);
    
    const players: Player[] = Array.from({ length: numPlayers }).map((_, i) => ({
      id: `p-${i}`,
      name: playerNames[i] || `Player ${i + 1}`,
      role: shuffledRoles[i],
      isAlive: true,
      isInvestigated: false
    }));

    setGameState({
      players,
      phase: 'RoleReveal',
      liberalPolicies: 0,
      fascistPolicies: 0,
      electionTracker: 0,
      deck: shuffle(INITIAL_DECK),
      discard: [],
      presidentIdx: 0,
      chancellorIdx: null,
      nominatedChancellorIdx: null,
      lastPresidentIdx: null,
      lastChancellorIdx: null,
      drawnPolicies: [],
      activeExecutivePower: 'None',
      winner: null,
      logs: ['Game started.']
    });
    setRevealIdx(0);
    setShowSecret(false);
  };

  const getNextAlivePlayerIdx = (currentIdx: number, players: Player[]) => {
    let nextIdx = (currentIdx + 1) % players.length;
    while (!players[nextIdx].isAlive) {
      nextIdx = (nextIdx + 1) % players.length;
    }
    return nextIdx;
  };

  const reshuffleIfNeeded = (state: GameState): GameState => {
    if (state.deck.length >= 3) return state;
    const newDeck = shuffle([...state.deck, ...state.discard]);
    return {
      ...state,
      deck: newDeck,
      discard: [],
      logs: [...state.logs, 'Deck reshuffled.']
    };
  };

  const handleGovResult = (passed: boolean) => {
    if (!gameState) return;
    if (passed) {
      const stateWithReshuffle = reshuffleIfNeeded(gameState);
      setGameState({
        ...stateWithReshuffle,
        phase: 'Legislative',
        drawnPolicies: stateWithReshuffle.deck.slice(0, 3),
        deck: stateWithReshuffle.deck.slice(3),
        electionTracker: 0,
        logs: [...stateWithReshuffle.logs, `Government passed for President ${stateWithReshuffle.players[stateWithReshuffle.presidentIdx].name}.`]
      });
    } else {
      const newTracker = gameState.electionTracker + 1;
      if (newTracker === 3) {
        let currentState = reshuffleIfNeeded(gameState);
        const policy = currentState.deck[0];
        const isLiberal = policy === 'Liberal';
        
        setGameState(prev => {
          if (!prev) return null;
          const newLib = isLiberal ? prev.liberalPolicies + 1 : prev.liberalPolicies;
          const newFas = !isLiberal ? prev.fascistPolicies + 1 : prev.fascistPolicies;
          
          if (newLib >= 5) return { ...prev, liberalPolicies: newLib, fascistPolicies: newFas, winner: 'Liberals', phase: 'GameOver' };
          if (newFas >= 6) return { ...prev, liberalPolicies: newLib, fascistPolicies: newFas, winner: 'Fascists', phase: 'GameOver' };

          return {
            ...prev,
            liberalPolicies: newLib,
            fascistPolicies: newFas,
            deck: prev.deck.slice(1),
            electionTracker: 0,
            presidentIdx: getNextAlivePlayerIdx(prev.presidentIdx, prev.players),
            logs: [...prev.logs, `Chaos! Tracker at 3. ${policy} policy enacted.`]
          };
        });
      } else {
        setGameState(prev => ({
          ...prev!,
          electionTracker: newTracker,
          presidentIdx: getNextAlivePlayerIdx(prev!.presidentIdx, prev!.players),
          logs: [...prev!.logs, `Government failed. Tracker at ${newTracker}.`]
        }));
      }
    }
  };

  const enactPolicy = (policy: Policy) => {
    if (!gameState) return;
    
    setGameState(prev => {
      if (!prev) return null;
      
      const isLiberal = policy === 'Liberal';
      const newLib = isLiberal ? prev.liberalPolicies + 1 : prev.liberalPolicies;
      const newFas = !isLiberal ? prev.fascistPolicies + 1 : prev.fascistPolicies;

      // Check win conditions
      if (newLib >= 5) return { ...prev, liberalPolicies: newLib, fascistPolicies: newFas, winner: 'Liberals', phase: 'GameOver' };
      if (newFas >= 6) return { ...prev, liberalPolicies: newLib, fascistPolicies: newFas, winner: 'Fascists', phase: 'GameOver' };

      const discarded = prev.drawnPolicies.find(p => p !== policy) || prev.drawnPolicies[0];
      const newDiscard = [...prev.discard, discarded];

      let nextPhase: GamePhase = 'Election';
      let power: ExecutivePower = 'None';
      let nextPresidentIdx = getNextAlivePlayerIdx(prev.presidentIdx, prev.players);

      if (!isLiberal) {
        const powerName = FASCIST_POWERS[prev.players.length][newFas];
        if (powerName) {
          nextPhase = 'ExecutiveAction';
          power = powerName as ExecutivePower;
          // Don't increment presidentIdx yet, current president needs to act
          nextPresidentIdx = prev.presidentIdx;
        }
      }

      return {
        ...prev,
        liberalPolicies: newLib,
        fascistPolicies: newFas,
        discard: newDiscard,
        phase: nextPhase,
        activeExecutivePower: power,
        presidentIdx: nextPresidentIdx,
        drawnPolicies: [],
        logs: [...prev.logs, `${policy} policy enacted.`]
      };
    });
  };

  const handleAction = (targetIdx: number) => {
    setGameState(prev => {
      if (!prev) return null;
      const power = prev.activeExecutivePower;
      const target = prev.players[targetIdx];

      if (power === 'Execution') {
        if (target.role === 'Hitler') {
          return { ...prev, winner: 'Liberals', phase: 'GameOver' };
        } else {
          const newPlayers = [...prev.players];
          newPlayers[targetIdx].isAlive = false;
          return {
            ...prev,
            players: newPlayers,
            phase: 'Election',
            activeExecutivePower: 'None',
            presidentIdx: getNextAlivePlayerIdx(prev.presidentIdx, newPlayers),
            logs: [...prev.logs, `${target.name} was executed.`]
          };
        }
      } else if (power === 'Investigate') {
        setInvestigationResult(target.role === 'Liberal' ? 'Liberal' : 'Fascist');
        return {
          ...prev,
          logs: [...prev.logs, `President investigated ${target.name}.`]
        };
      } else if (power === 'SpecialElection') {
        return {
          ...prev,
          presidentIdx: targetIdx,
          phase: 'Election',
          activeExecutivePower: 'None',
          logs: [...prev.logs, `Special Election! ${target.name} is the new President.`]
        };
      }
      return prev;
    });
  };

  // --- UI Components ---

  if (!numPlayers) {
    return (
      <div className="h-[100dvh] flex flex-col items-center justify-center p-8 bg-bg-dark relative">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
          <h1 className="text-5xl font-serif mb-2 tracking-tighter uppercase text-white">SECRET HITLER</h1>
          <p className="text-text-muted mb-12 text-sm uppercase tracking-widest">Digital Companion</p>
          
          <div className="grid grid-cols-2 gap-4 w-full max-w-xs mx-auto">
            {[5, 6, 7, 8, 9, 10].map(n => (
              <button 
                key={n} 
                onClick={() => {
                  setNumPlayers(n);
                  setPlayerNames(Array(n).fill(''));
                }}
                className="aspect-square border border-white border-opacity-10 bg-card-dark rounded-2xl flex flex-col items-center justify-center hover:bg-white hover:text-bg-dark transition-all active:scale-95"
              >
                <span className="text-3xl font-serif font-bold">{n}</span>
                <span className="text-[10px] uppercase tracking-widest opacity-60">Players</span>
              </button>
            ))}
          </div>
        </motion.div>

        <button 
          onClick={() => setShowCredits(true)}
          className="absolute bottom-8 right-8 w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-text-muted hover:text-white transition-all"
        >
          <Info size={20} />
        </button>

        <AnimatePresence>
          {showCredits && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-bg-dark/95 backdrop-blur-sm z-50 flex items-center justify-center p-6"
            >
              <motion.div 
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="w-full max-w-sm bg-card-dark border border-white/10 rounded-3xl p-8 relative"
              >
                <button 
                  onClick={() => setShowCredits(false)}
                  className="absolute top-6 right-6 text-text-muted hover:text-white"
                >
                  <X size={20} />
                </button>

                <h2 className="text-2xl font-serif mb-6">Credits & License</h2>
                
                <div className="space-y-6 text-sm">
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-text-muted mb-2">Original Creators</p>
                    <p className="text-white">{CREDITS.creators.join(', ')}</p>
                  </div>
                  
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-text-muted mb-2">Illustrator</p>
                    <p className="text-white">{CREDITS.illustrator}</p>
                  </div>

                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-text-muted mb-2">Game License</p>
                    <p className="text-white leading-relaxed">{CREDITS.license}</p>
                    <a 
                      href={CREDITS.licenseUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-liberal-blue flex items-center gap-1 mt-2 hover:underline"
                    >
                      View License <ExternalLink size={12} />
                    </a>
                  </div>

                  <div className="pt-6 border-t border-white/10">
                    <p className="text-[10px] uppercase tracking-widest text-text-muted mb-2">Software License</p>
                    <p className="text-white">This digital implementation is licensed under the Apache License 2.0.</p>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  if (numPlayers && !gameState) {
    return (
      <div className="h-[100dvh] flex flex-col bg-bg-dark p-8 overflow-y-auto custom-scrollbar">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-sm mx-auto w-full pb-20">
          <button onClick={() => setNumPlayers(null)} className="text-text-muted text-xs uppercase tracking-widest mb-8 flex items-center gap-2">
            <RotateCcw size={14} /> Back
          </button>
          <h2 className="text-3xl font-serif mb-2">Name Players</h2>
          <p className="text-text-muted text-xs uppercase tracking-widest mb-8">{numPlayers} Players Selected</p>
          
          <div className="space-y-4 mb-12">
            {playerNames.map((name, i) => (
              <div key={i} className="space-y-1">
                <label className="text-[10px] uppercase tracking-widest text-text-muted ml-1">Player {i + 1}</label>
                <input 
                  type="text"
                  value={name}
                  onChange={(e) => {
                    const next = [...playerNames];
                    next[i] = e.target.value;
                    setPlayerNames(next);
                  }}
                  placeholder={`Enter name...`}
                  className="w-full bg-card-dark border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-white/30 outline-none transition-all"
                />
              </div>
            ))}
          </div>

          <button 
            onClick={initGame}
            className="w-full py-4 bg-white text-bg-dark rounded-2xl font-serif font-bold uppercase tracking-widest shadow-lg active:scale-95 transition-all"
          >
            Start Game
          </button>
        </motion.div>
      </div>
    );
  }

  if (gameState?.phase === 'RoleReveal') {
    const p = gameState.players[revealIdx];
    const isLast = revealIdx === gameState.players.length - 1;
    return (
      <div className="h-[100dvh] flex flex-col items-center justify-center p-8 bg-bg-dark">
        <AnimatePresence mode="wait">
          {!showSecret ? (
            <motion.div key="pass" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center">
              <p className="text-text-muted uppercase tracking-widest text-xs mb-4">Pass to</p>
              <h2 className="text-4xl font-serif mb-12">{p.name}</h2>
              <button onClick={() => setShowSecret(true)} className="mx-auto w-16 h-16 rounded-full border-2 border-white flex items-center justify-center hover:bg-white hover:text-bg-dark transition-all">
                <Eye size={24} />
              </button>
            </motion.div>
          ) : (
            <motion.div key="reveal" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="w-full max-w-sm text-center">
              <div className={`p-12 rounded-3xl border-2 mb-12 ${p.role === 'Liberal' ? 'border-liberal-blue bg-liberal-blue/10' : 'border-hitler-red bg-hitler-red/10'}`}>
                <p className="text-xs uppercase tracking-widest mb-4 opacity-60">Identity</p>
                <h2 className={`text-6xl font-serif mb-6 ${p.role === 'Liberal' ? 'text-liberal-blue' : 'text-hitler-red'}`}>{p.role}</h2>
                <div className="flex justify-center mb-8">
                  {p.role === 'Liberal' ? <Shield size={80} className="text-liberal-blue" /> : <Skull size={80} className="text-hitler-red" />}
                </div>
                
                {(p.role === 'Fascist' || (p.role === 'Hitler' && gameState.players.length <= 6)) && (
                  <div className="text-left border-t border-white/10 pt-6">
                    <p className="text-[10px] uppercase tracking-widest mb-3 opacity-40">Fascist Allies</p>
                    <div className="space-y-2">
                      {gameState.players.filter(pl => pl.id !== p.id && (pl.role === 'Fascist' || pl.role === 'Hitler')).map(pl => (
                        <div key={pl.id} className="flex justify-between text-sm">
                          <span>{pl.name}</span>
                          <span className="opacity-40">{pl.role}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <button 
                onClick={() => {
                  if (isLast) setGameState({ ...gameState, phase: 'Election' });
                  else { setRevealIdx(revealIdx + 1); setShowSecret(false); }
                }}
                className="w-full py-4 bg-white text-bg-dark rounded-2xl font-serif font-bold uppercase tracking-widest"
              >
                {isLast ? 'Start Game' : 'Next Player'}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  if (gameState?.phase === 'GameOver') {
    return (
      <div className={`h-[100dvh] flex flex-col items-center justify-center p-8 ${gameState.winner === 'Liberals' ? 'bg-liberal-blue' : 'bg-hitler-red'}`}>
        <h1 className="text-7xl font-serif mb-4 uppercase tracking-tighter">{gameState.winner} WIN</h1>
        <button onClick={() => setNumPlayers(null)} className="mt-12 px-8 py-4 bg-white text-bg-dark rounded-full font-serif font-bold uppercase tracking-widest">
          Play Again
        </button>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] flex flex-col bg-bg-dark overflow-hidden">
      {/* Policy Boards - Visual Focus */}
      <div className="p-6 space-y-6">
        <div className="space-y-2">
          <div className="flex justify-between items-end">
            <h3 className="text-[10px] uppercase tracking-widest text-liberal-blue font-bold">Liberal Policies</h3>
            <span className="text-2xl font-serif">{gameState?.liberalPolicies}/5</span>
          </div>
          <div className="flex gap-1.5">
            {[...Array(5)].map((_, i) => (
              <div key={i} className={`flex-1 h-14 rounded-lg border-2 border-liberal-blue transition-all ${i < (gameState?.liberalPolicies || 0) ? 'bg-liberal-blue shadow-[0_0_15px_rgba(0,122,255,0.4)]' : 'bg-liberal-blue/5'}`} />
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-end">
            <h3 className="text-[10px] uppercase tracking-widest text-hitler-red font-bold">Fascist Policies</h3>
            <span className="text-2xl font-serif">{gameState?.fascistPolicies}/6</span>
          </div>
          <div className="flex gap-1.5">
            {[...Array(6)].map((_, i) => {
              const power = FASCIST_POWERS[gameState?.players.length || 5][i + 1];
              return (
                <div key={i} className={`flex-1 h-14 rounded-lg border-2 border-hitler-red relative transition-all ${i < (gameState?.fascistPolicies || 0) ? 'bg-hitler-red shadow-[0_0_15px_rgba(255,59,48,0.4)]' : 'bg-hitler-red/5'}`}>
                  {power && i >= (gameState?.fascistPolicies || 0) && (
                    <div className="absolute inset-0 flex items-center justify-center opacity-40">
                      {power === 'Execution' && <Skull size={14} />}
                      {power === 'Investigate' && <Search size={14} />}
                      {power === 'PolicyPeek' && <Eye size={14} />}
                      {power === 'SpecialElection' && <Star size={14} />}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Action Area */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 relative">
        <AnimatePresence mode="wait">
          {gameState?.phase === 'Election' && (
            <motion.div key="election" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm text-center">
              <div className="mb-8">
                <p className="text-text-muted uppercase tracking-[0.3em] text-[10px] mb-2">Current President</p>
                <h2 className="text-5xl font-serif">{gameState.players[gameState.presidentIdx].name}</h2>
              </div>
              
              <div className="grid grid-cols-2 gap-4 w-full">
                <button 
                  onClick={() => handleGovResult(true)}
                  className="bg-white text-bg-dark py-6 rounded-3xl flex flex-col items-center gap-2 hover:bg-opacity-90 active:scale-95 transition-all"
                >
                  <CheckCircle2 size={32} />
                  <span className="font-serif font-bold uppercase tracking-widest">Passed</span>
                </button>
                <button 
                  onClick={() => handleGovResult(false)}
                  className="bg-card-dark border border-white/10 py-6 rounded-3xl flex flex-col items-center gap-2 hover:bg-white/5 active:scale-95 transition-all"
                >
                  <XCircle size={32} />
                  <span className="font-serif font-bold uppercase tracking-widest">Failed</span>
                </button>
              </div>

              <div className="mt-12 flex justify-center gap-3">
                {[0, 1, 2].map(i => (
                  <div key={i} className={`w-3 h-3 rounded-full border border-white/20 ${i < gameState.electionTracker ? 'bg-white' : ''}`} />
                ))}
              </div>
            </motion.div>
          )}

          {gameState?.phase === 'Legislative' && (
            <motion.div key="leg" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full max-w-sm">
              <div className="text-center mb-10">
                <h2 className="text-2xl font-serif mb-2">
                  {gameState.drawnPolicies.length === 3 ? 'President Discard' : 'Enact Policy'}
                </h2>
                <p className="text-text-muted text-xs">Tap a card to {gameState.drawnPolicies.length === 3 ? 'discard' : 'enact'}</p>
              </div>
              <div className="flex justify-center gap-4">
                {gameState.drawnPolicies.map((p, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      if (gameState.drawnPolicies.length === 3) {
                        const next = [...gameState.drawnPolicies];
                        const discarded = next.splice(i, 1)[0];
                        setGameState({ 
                          ...gameState, 
                          drawnPolicies: next,
                          discard: [...gameState.discard, discarded]
                        });
                      } else {
                        enactPolicy(p);
                      }
                    }}
                    className={`flex-1 aspect-[2/3] rounded-2xl border-2 flex flex-col items-center justify-center gap-3 transition-all active:scale-95 ${p === 'Liberal' ? 'border-liberal-blue bg-liberal-blue/10 text-liberal-blue' : 'border-hitler-red bg-hitler-red/10 text-hitler-red'}`}
                  >
                    {p === 'Liberal' ? <Shield size={32} /> : <Skull size={32} />}
                    <span className="font-serif font-bold uppercase tracking-widest text-sm">{p}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {gameState?.phase === 'ExecutiveAction' && (
            <motion.div key="exec" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full max-w-sm">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-serif mb-2">{gameState.activeExecutivePower}</h2>
                <p className="text-text-muted text-xs">President, choose your target</p>
              </div>

              {gameState.activeExecutivePower === 'PolicyPeek' ? (
                <div className="space-y-6">
                  <div className="flex justify-center gap-3">
                    {gameState.deck.slice(0, 3).map((p, i) => (
                      <div key={i} className={`w-16 h-24 rounded-xl border-2 flex items-center justify-center ${p === 'Liberal' ? 'border-liberal-blue text-liberal-blue' : 'border-hitler-red text-hitler-red'}`}>
                        {p === 'Liberal' ? <Shield size={24} /> : <Skull size={24} />}
                      </div>
                    ))}
                  </div>
                  <button 
                    onClick={() => setGameState(prev => prev ? ({ 
                      ...prev, 
                      phase: 'Election', 
                      activeExecutivePower: 'None', 
                      presidentIdx: getNextAlivePlayerIdx(prev.presidentIdx, prev.players) 
                    }) : null)} 
                    className="w-full py-4 bg-white text-bg-dark rounded-2xl font-serif font-bold uppercase tracking-widest"
                  >
                    Done
                  </button>
                </div>
              ) : investigationResult ? (
                <div className="text-center p-10 rounded-3xl bg-card-dark border border-white/10">
                  <p className="text-xs uppercase tracking-widest text-text-muted mb-4">Investigation Result</p>
                  <h3 className={`text-5xl font-serif ${investigationResult === 'Liberal' ? 'text-liberal-blue' : 'text-hitler-red'}`}>{investigationResult}</h3>
                  <button 
                    onClick={() => { 
                      setInvestigationResult(null); 
                      setGameState(prev => prev ? ({ 
                        ...prev, 
                        phase: 'Election', 
                        activeExecutivePower: 'None', 
                        presidentIdx: getNextAlivePlayerIdx(prev.presidentIdx, prev.players) 
                      }) : null); 
                    }} 
                    className="mt-10 w-full py-3 border border-white/20 rounded-xl text-sm uppercase tracking-widest"
                  >
                    Continue
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {gameState.players.map((p, i) => (
                    <button
                      key={p.id}
                      disabled={!p.isAlive || i === gameState.presidentIdx}
                      onClick={() => handleAction(i)}
                      className={`p-4 rounded-2xl border border-white/10 text-sm font-serif transition-all ${p.isAlive && i !== gameState.presidentIdx ? 'bg-card-dark hover:bg-white hover:text-bg-dark' : 'opacity-20'}`}
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom Status Bar */}
      <div className="p-6 bg-card-dark border-t border-white/5 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center">
            <Gavel size={18} className="text-text-muted" />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-text-muted">Status</p>
            <p className="text-xs font-medium">{gameState?.phase}</p>
          </div>
        </div>
        <button onClick={() => setNumPlayers(null)} className="text-text-muted hover:text-white transition-all">
          <RotateCcw size={20} />
        </button>
      </div>
    </div>
  );
}
