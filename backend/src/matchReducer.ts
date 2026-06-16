// ============================================================================
// matchReducer.ts — Cœur fonctionnel du simulateur de tennis
// Toute la logique est purement fonctionnelle : aucune mutation d'état.
// ============================================================================

import {
  MatchState,
  GameState,
  SetScore,
  PlayerId,
  PointAction,
  MatchDisplay,
  Player,
} from "./types";

// ============================================================================
// Fonctions utilitaires de création d'état
// ============================================================================

/**
 * Crée un état de jeu vierge (nouveau jeu).
 * @param isTieBreak - true si le jeu est un tie-break
 */
function createInitialGameState(isTieBreak: boolean = false): GameState {
  return {
    pointsJ1: 0,
    pointsJ2: 0,
    isTieBreak,
  };
}

/**
 * Crée un score de set vierge.
 */
function createInitialSetScore(): SetScore {
  return {
    gamesJ1: 0,
    gamesJ2: 0,
  };
}

/**
 * Crée l'état initial d'un match (début de partie).
 */
export function createInitialMatchState(): MatchState {
  return {
    sets: [createInitialSetScore()],
    currentSetIndex: 0,
    currentGame: createInitialGameState(false),
    setsWonJ1: 0,
    setsWonJ2: 0,
    winner: null,
    pointsPlayed: 0,
  };
}

// ============================================================================
// Logique du jeu classique
// ============================================================================

/**
 * Détermine si un jeu classique (non tie-break) est gagné.
 * Règle : au moins 4 points, avec 2 points d'écart.
 */
function isClassicGameWon(game: GameState): PlayerId | null {
  const { pointsJ1, pointsJ2 } = game;
  const diff = pointsJ1 - pointsJ2;

  // Il faut au moins 4 points pour gagner un jeu
  if (pointsJ1 >= 4 && diff >= 2) return "J1";
  if (pointsJ2 >= 4 && diff <= -2) return "J2";

  return null;
}

/**
 * Détermine si un tie-break est gagné.
 * Règle : au moins 7 points, avec 2 points d'écart.
 */
function isTieBreakWon(game: GameState): PlayerId | null {
  const { pointsJ1, pointsJ2 } = game;
  const diff = pointsJ1 - pointsJ2;

  if (pointsJ1 >= 7 && diff >= 2) return "J1";
  if (pointsJ2 >= 7 && diff <= -2) return "J2";

  return null;
}

/**
 * Vérifie si un jeu (classique ou tie-break) est gagné et retourne le vainqueur.
 */
function getGameWinner(game: GameState): PlayerId | null {
  if (game.isTieBreak) {
    return isTieBreakWon(game);
  }
  return isClassicGameWon(game);
}

// ============================================================================
// Logique du set
// ============================================================================

/**
 * Détermine si un set est gagné après l'ajout d'un jeu.
 * Règles :
 * - Gagné à 6 jeux avec au moins 2 jeux d'écart (6-0, 6-1, 6-2, 6-3, 6-4).
 * - Gagné à 7-5.
 * - À 6-6, on joue un tie-break. Le vainqueur du tie-break gagne le set 7-6.
 */
function getSetWinner(set: SetScore): PlayerId | null {
  const { gamesJ1, gamesJ2 } = set;
  const diff = gamesJ1 - gamesJ2;

  // Victoire classique : 6 jeux avec 2 d'écart (6-0 à 6-4) ou 7-5
  if (gamesJ1 >= 6 && diff >= 2) return "J1";
  if (gamesJ2 >= 6 && diff <= -2) return "J2";

  // Victoire après tie-break : 7-6
  if (gamesJ1 === 7 && gamesJ2 === 6) return "J1";
  if (gamesJ2 === 7 && gamesJ1 === 6) return "J2";

  return null;
}

/**
 * Vérifie si le score du set est à 6-6, ce qui déclenche un tie-break.
 */
function isTieBreakSituation(set: SetScore): boolean {
  return set.gamesJ1 === 6 && set.gamesJ2 === 6;
}

// ============================================================================
// Logique du match
// ============================================================================

/**
 * Vérifie si le match est gagné (premier à 3 sets, meilleur des 5).
 */
function getMatchWinner(setsWonJ1: number, setsWonJ2: number): PlayerId | null {
  if (setsWonJ1 >= 3) return "J1";
  if (setsWonJ2 >= 3) return "J2";
  return null;
}

// ============================================================================
// Le Reducer principal — fonction pure
// ============================================================================

/**
 * Reducer principal : traite un point et retourne le nouvel état du match.
 * Cette fonction est purement fonctionnelle : elle ne mute jamais l'état reçu.
 *
 * Flux :
 * 1. Ajouter le point au jeu en cours
 * 2. Vérifier si le jeu est gagné
 * 3. Si oui, mettre à jour le set
 * 4. Vérifier si le set est gagné
 * 5. Si oui, vérifier si le match est gagné
 * 6. Sinon, préparer le jeu/set suivant
 */
function matchReducer(state: MatchState, action: PointAction): MatchState {
  // Si le match est déjà terminé, on ne traite plus de points
  if (state.winner !== null) {
    return state;
  }

  const { winner: pointWinner } = action;

  // --- Étape 1 : Ajouter le point au jeu en cours ---
  const updatedGame: GameState = {
    ...state.currentGame,
    pointsJ1:
      state.currentGame.pointsJ1 + (pointWinner === "J1" ? 1 : 0),
    pointsJ2:
      state.currentGame.pointsJ2 + (pointWinner === "J2" ? 1 : 0),
  };

  const updatedPointsPlayed = state.pointsPlayed + 1;

  // --- Étape 2 : Vérifier si le jeu en cours est gagné ---
  const gameWinner = getGameWinner(updatedGame);

  if (gameWinner === null) {
    // Le jeu continue, on retourne l'état mis à jour
    return {
      ...state,
      currentGame: updatedGame,
      pointsPlayed: updatedPointsPlayed,
    };
  }

  // --- Étape 3 : Le jeu est gagné, mettre à jour le set ---
  const currentSet = state.sets[state.currentSetIndex];
  const updatedSet: SetScore = {
    gamesJ1: currentSet.gamesJ1 + (gameWinner === "J1" ? 1 : 0),
    gamesJ2: currentSet.gamesJ2 + (gameWinner === "J2" ? 1 : 0),
  };

  // Mettre à jour le tableau des sets (copie immuable)
  const updatedSets = state.sets.map((set, index) =>
    index === state.currentSetIndex ? updatedSet : set
  );

  // --- Étape 4 : Vérifier si le set est gagné ---
  const setWinner = getSetWinner(updatedSet);

  if (setWinner === null) {
    // Le set continue — vérifier si on doit lancer un tie-break
    const shouldStartTieBreak = isTieBreakSituation(updatedSet);

    return {
      ...state,
      sets: updatedSets,
      currentGame: createInitialGameState(shouldStartTieBreak),
      pointsPlayed: updatedPointsPlayed,
    };
  }

  // --- Étape 5 : Le set est gagné, mettre à jour le compteur de sets ---
  const updatedSetsWonJ1 =
    state.setsWonJ1 + (setWinner === "J1" ? 1 : 0);
  const updatedSetsWonJ2 =
    state.setsWonJ2 + (setWinner === "J2" ? 1 : 0);

  // --- Étape 6 : Vérifier si le match est gagné ---
  const matchWinner = getMatchWinner(updatedSetsWonJ1, updatedSetsWonJ2);

  if (matchWinner !== null) {
    // Match terminé !
    return {
      ...state,
      sets: updatedSets,
      currentGame: createInitialGameState(false),
      setsWonJ1: updatedSetsWonJ1,
      setsWonJ2: updatedSetsWonJ2,
      winner: matchWinner,
      pointsPlayed: updatedPointsPlayed,
    };
  }

  // --- Étape 7 : Nouveau set, on prépare le jeu suivant ---
  return {
    ...state,
    sets: [...updatedSets, createInitialSetScore()],
    currentSetIndex: state.currentSetIndex + 1,
    currentGame: createInitialGameState(false),
    setsWonJ1: updatedSetsWonJ1,
    setsWonJ2: updatedSetsWonJ2,
    pointsPlayed: updatedPointsPlayed,
  };
}

// ============================================================================
// Fonction d'orchestration — itère sur tous les points
// ============================================================================

/**
 * Traite une liste de points en les passant un par un au reducer.
 * S'arrête dès que le match est gagné (3 sets).
 *
 * @param initialState - L'état du match au départ (null = nouveau match)
 * @param points - Le tableau des vainqueurs de chaque point (["J1", "J2", ...])
 * @returns L'état final du match après traitement de tous les points
 */
export function processPoints(
  initialState: MatchState | null,
  points: PlayerId[]
): MatchState {
  // Si pas d'état initial, on part d'un match vierge (si on envoi un match encore en cours, on le prend comme état de départ)
  const startState = initialState ?? createInitialMatchState();

  // Réduction fonctionnelle : on itère sur chaque point
  return points.reduce((currentState, pointWinner) => {
    // Si le match est déjà gagné, on skip les points restants
    if (currentState.winner !== null) {
      return currentState;
    }

    const action: PointAction = {
      type: "POINT",
      winner: pointWinner,
    };

    return matchReducer(currentState, action);
  }, startState);
}

// ============================================================================
// Fonctions d'affichage — transforme l'état brut en données lisibles
// ============================================================================

/**
 * Convertit le score brut d'un jeu classique en affichage tennis.
 * Gère les cas spéciaux : 40-40 (deuce), avantage.
 */
function formatClassicGameScore(game: GameState): {
  scoreJ1: string;
  scoreJ2: string;
} {
  const scoreLabels = ["0", "15", "30", "40"];
  const { pointsJ1, pointsJ2 } = game;

  // Cas simple : aucun des deux n'a atteint 3 points (40)
  if (pointsJ1 < 4 && pointsJ2 < 4) {
    // Avant 40, on ne peut pas avoir d'égalité spéciale
    return {
      scoreJ1: scoreLabels[pointsJ1],
      scoreJ2: scoreLabels[pointsJ2],
    };
  }

  // Les deux joueurs ont au moins 3 points (situation de deuce / avantage)
  if (pointsJ1 >= 3 && pointsJ2 >= 3) {
    const diff = pointsJ1 - pointsJ2;

    if (diff === 0) {
      // Égalité à 40-40 (deuce)
      return { scoreJ1: "40", scoreJ2: "40" };
    } else if (diff === 1) {
      // Avantage J1
      return { scoreJ1: "AV", scoreJ2: "-" };
    } else if (diff === -1) {
      // Avantage J2
      return { scoreJ1: "-", scoreJ2: "AV" };
    }
  }

  // Un joueur à 40, l'autre en dessous
  return {
    scoreJ1: pointsJ1 >= 4 ? "40" : scoreLabels[pointsJ1],
    scoreJ2: pointsJ2 >= 4 ? "40" : scoreLabels[pointsJ2],
  };
}

/**
 * Convertit le score d'un tie-break en affichage numérique (1, 2, 3...).
 */
function formatTieBreakScore(game: GameState): {
  scoreJ1: string;
  scoreJ2: string;
} {
  return {
    scoreJ1: String(game.pointsJ1),
    scoreJ2: String(game.pointsJ2),
  };
}

/**
 * Génère les données d'affichage complètes du match.
 * Transforme l'état brut (MatchState) en un objet lisible (MatchDisplay).
 */
export function buildMatchDisplay(
  state: MatchState,
  player1: Player,
  player2: Player
): MatchDisplay {
  // Construire le tableau des scores de sets [J1, J2]
  const setsDisplay: [number, number][] = state.sets.map((set) => [
    set.gamesJ1,
    set.gamesJ2,
  ]);

  // Formater le score du jeu en cours
  const currentGameDisplay = state.currentGame.isTieBreak
    ? formatTieBreakScore(state.currentGame)
    : formatClassicGameScore(state.currentGame);

  // Déterminer le nom du vainqueur
  const winnerName =
    state.winner === "J1"
      ? player1.name
      : state.winner === "J2"
      ? player2.name
      : null;

  // Construire le message de statut
  let statusMessage: string;
  if (state.winner !== null) {
    statusMessage = `🏆 Match terminé ! Victoire de ${winnerName} (${state.setsWonJ1} - ${state.setsWonJ2})`;
  } else {
    const setInfo = `Set ${state.currentSetIndex + 1}`;
    const tieBreakInfo = state.currentGame.isTieBreak ? " (Tie-break)" : "";
    statusMessage = `🎾 Jeu en cours — ${setInfo}${tieBreakInfo}, pas de vainqueur`;
  }

  return {
    player1Name: player1.name,
    player2Name: player2.name,
    sets: setsDisplay,
    currentGame: currentGameDisplay,
    winnerName,
    statusMessage,
  };
}
