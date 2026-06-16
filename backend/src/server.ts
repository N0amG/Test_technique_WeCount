// ============================================================================
// server.ts — Serveur Express pour l'API du simulateur de tennis
// Point d'entrée du backend, 100% stateless.
// ============================================================================

import express, { Request, Response } from "express";
import cors from "cors";
import path from "path";
import {
  ScoreRequest,
  ScoreResponse,
  PlayerId,
  MatchState,
} from "./types";
import { processPoints, buildMatchDisplay } from "./matchReducer";

const app = express();
const PORT = process.env.PORT || 3000;

// --- Middlewares ---
// Activation du CORS pour permettre les requêtes depuis le frontend
app.use(cors());
// Parsing du body JSON
app.use(express.json());
// Servir les fichiers statiques du frontend (index.html, style.css, script.js)
const frontendPath = path.join(__dirname, "..", "..", "frontend");
app.use(express.static(frontendPath));

// ============================================================================
// Validation des données entrantes
// ============================================================================

/**
 * Valide le payload envoyé par le frontend.
 * Retourne un message d'erreur si les données sont invalides, null sinon.
 */
function validateScoreRequest(body: unknown): string | null {
  const data = body as Partial<ScoreRequest>;

  // Vérification de la présence des joueurs
  if (!data.player1 || !data.player2) {
    return "Les informations des deux joueurs (player1 et player2) sont requises.";
  }

  // Vérification des noms
  if (
    typeof data.player1.name !== "string" ||
    data.player1.name.trim() === ""
  ) {
    return "Le nom du joueur 1 est requis.";
  }
  if (
    typeof data.player2.name !== "string" ||
    data.player2.name.trim() === ""
  ) {
    return "Le nom du joueur 2 est requis.";
  }

  // Vérification des niveaux (1 à 10)
  if (
    typeof data.player1.level !== "number" ||
    data.player1.level < 1 ||
    data.player1.level > 10
  ) {
    return "Le niveau du joueur 1 doit être un nombre entre 1 et 10.";
  }
  if (
    typeof data.player2.level !== "number" ||
    data.player2.level < 1 ||
    data.player2.level > 10
  ) {
    return "Le niveau du joueur 2 doit être un nombre entre 1 et 10.";
  }

  // Vérification du tableau de points
  if (!Array.isArray(data.points) || data.points.length === 0) {
    return "Le tableau de points est requis et ne peut pas être vide.";
  }

  // Vérification que chaque point est "J1" ou "J2"
  const validIds: PlayerId[] = ["J1", "J2"];
  const invalidPoint = data.points.find(
    (p: unknown) => !validIds.includes(p as PlayerId)
  );
  if (invalidPoint !== undefined) {
    return `Valeur de point invalide : "${invalidPoint}". Les valeurs autorisées sont "J1" et "J2".`;
  }

  // currentState peut être null (premier appel) ou un objet MatchState
  // On ne valide pas en profondeur sa structure pour rester simple,
  // mais on vérifie le type de base
  if (
    data.currentState !== null &&
    data.currentState !== undefined &&
    typeof data.currentState !== "object"
  ) {
    return "currentState doit être null ou un objet MatchState valide.";
  }

  return null;
}

// ============================================================================
// Routes
// ============================================================================

/**
 * POST /api/score
 *
 * Reçoit les informations des joueurs, le tableau de points et l'état actuel.
 * Traite les points via le reducer et renvoie l'état mis à jour + l'affichage.
 *
 * Body attendu : ScoreRequest
 * Réponse : ScoreResponse
 */
app.post("/api/score", (req: Request, res: Response): void => {
  // --- Validation ---
  const validationError = validateScoreRequest(req.body);
  if (validationError !== null) {
    res.status(400).json({
      error: validationError,
    });
    return;
  }

  const { player1, player2, points, currentState } =
    req.body as ScoreRequest;

  // --- Traitement des points via le reducer fonctionnel ---
  const finalState: MatchState = processPoints(
    currentState,
    points as PlayerId[]
  );

  // --- Construction de l'affichage lisible ---
  const display = buildMatchDisplay(finalState, player1, player2);

  // --- Réponse ---
  const response: ScoreResponse = {
    matchState: finalState,
    display,
  };

  res.json(response);
});

/**
 * GET /api/health
 * Route de vérification que le serveur est en ligne.
 */
app.get("/api/health", (_req: Request, res: Response): void => {
  res.json({
    status: "ok",
    message: "Le serveur du simulateur de tennis est opérationnel.",
    timestamp: new Date().toISOString(),
  });
});

// ============================================================================
// Démarrage du serveur
// ============================================================================

app.listen(PORT, () => {
  console.log(`\nServeur Tennis démarré sur http://localhost:${PORT}`);
  console.log(`   → POST /api/score  — Calculer le score`);
  console.log(`   → GET  /api/health — Vérifier l'état du serveur\n`);
});

export default app;
