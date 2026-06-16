// ============================================================================
// types.ts — Définition de tous les types du simulateur de tennis
// ============================================================================

/**
 * Représente un joueur avec son nom et son niveau (1 à 10).
 */
export interface Player {
  name: string;
  level: number;
}

/**
 * Identifiant d'un joueur dans le match : "J1" pour le joueur 1, "J2" pour le joueur 2.
 */
export type PlayerId = "J1" | "J2";

/**
 * Action représentant un point remporté par un joueur.
 * C'est l'entrée du Reducer.
 */
export interface PointAction {
  type: "POINT";
  winner: PlayerId;
}

/**
 * Score d'un jeu classique : 0, 15, 30, 40.
 * Les situations d'avantage sont gérées par un compteur interne de points.
 */
export type GameScoreDisplay = "0" | "15" | "30" | "40" | "AV" | "-";

/**
 * État du jeu en cours.
 * On utilise un compteur brut de points pour chaque joueur,
 * et on en déduit l'affichage (0, 15, 30, 40, AV, -).
 */
export interface GameState {
  /** Nombre de points bruts gagnés par J1 dans le jeu en cours */
  pointsJ1: number;
  /** Nombre de points bruts gagnés par J2 dans le jeu en cours */
  pointsJ2: number;
  /** Indique si le jeu en cours est un tie-break */
  isTieBreak: boolean;
}

/**
 * Score d'un set : nombre de jeux gagnés par chaque joueur.
 */
export interface SetScore {
  gamesJ1: number;
  gamesJ2: number;
}

/**
 * État complet du match, conservé côté frontend et envoyé à chaque requête.
 */
export interface MatchState {
  /** Scores de tous les sets joués (y compris le set en cours) */
  sets: SetScore[];
  /** Index du set en cours (0-based) */
  currentSetIndex: number;
  /** État du jeu en cours */
  currentGame: GameState;
  /** Nombre de sets gagnés par J1 */
  setsWonJ1: number;
  /** Nombre de sets gagnés par J2 */
  setsWonJ2: number;
  /** Vainqueur du match, null si le match est en cours */
  winner: PlayerId | null;
  /** Historique des points traités (pour le log) */
  pointsPlayed: number;
}

/**
 * Payload envoyé par le frontend à l'API POST /api/score.
 */
export interface ScoreRequest {
  player1: Player;
  player2: Player;
  points: PlayerId[];
  currentState: MatchState | null;
}

/**
 * Réponse renvoyée par l'API avec l'état mis à jour du match.
 */
export interface ScoreResponse {
  matchState: MatchState;
  /** Affichage lisible du score pour chaque set et le jeu en cours */
  display: MatchDisplay;
}

/**
 * Données d'affichage structurées pour le frontend.
 */
export interface MatchDisplay {
  player1Name: string;
  player2Name: string;
  /** Score de chaque set terminé ou en cours [J1, J2] */
  sets: [number, number][];
  /** Score du jeu en cours sous forme lisible */
  currentGame: {
    scoreJ1: string;
    scoreJ2: string;
  };
  /** Nom du vainqueur ou null */
  winnerName: string | null;
  /** Message descriptif de l'état du match */
  statusMessage: string;
}
