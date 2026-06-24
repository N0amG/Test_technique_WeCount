// ============================================================================
// script.js — Logique frontend du simulateur de tennis
// Vanilla JavaScript, aucun framework.
// ============================================================================

// --- Configuration ---
const API_BASE_URL = "http://localhost:3000";
const POINTS_PER_GENERATION = 150;

// --- État global côté frontend ---
// C'est le frontend qui conserve la mémoire du match (architecture stateless côté API)
let currentMatchState = null; // État du match renvoyé par l'API (null = pas de match en cours)
let currentPoints = [];       // Tableau des points générés (["J1", "J2", ...])
let player1 = null;           // Infos du joueur 1 { name, level }
let player2 = null;           // Infos du joueur 2 { name, level }

// ============================================================================
// Références DOM
// ============================================================================
const playerForm = document.getElementById("player-form");
const inputNameJ1 = document.getElementById("input-name-j1");
const inputLevelJ1 = document.getElementById("input-level-j1");
const inputNameJ2 = document.getElementById("input-name-j2");
const inputLevelJ2 = document.getElementById("input-level-j2");
const btnGenerate = document.getElementById("btn-generate");
const btnSend = document.getElementById("btn-send");
const formError = document.getElementById("form-error");

const eloStats = document.getElementById("elo-stats");
const eloProbJ1 = document.getElementById("elo-prob-j1");
const eloProbJ2 = document.getElementById("elo-prob-j2");

const sectionPoints = document.getElementById("section-points");
const pointsCount = document.getElementById("points-count");
const pointsList = document.getElementById("points-list");

const sectionResult = document.getElementById("section-result");
const statusMessage = document.getElementById("status-message");
const scoreThead = document.getElementById("score-thead");
const scoreTbody = document.getElementById("score-tbody");

// ============================================================================
// Calcul de probabilité Elo
// ============================================================================

/**
 * Calcule la probabilité de victoire du joueur A sur un point donné,
 * en utilisant le système Elo avec un diviseur de 10.
 *
 * Formule : P(A) = 1 / (1 + 10^((NiveauB - NiveauA) / 10))
 *
 * @param {number} levelA - Niveau du joueur A (1 à 10)
 * @param {number} levelB - Niveau du joueur B (1 à 10)
 * @returns {number} Probabilité que A gagne le point (entre 0 et 1)
 */
function calculateEloProbability(levelA, levelB) {
  return 1 / (1 + Math.pow(10, (levelB - levelA) / 10));
}

// ============================================================================
// Génération aléatoire des points
// ============================================================================

/**
 * Génère un tableau de N points aléatoires en utilisant la probabilité Elo.
 * Chaque entrée est "J1" ou "J2" selon qui remporte le point.
 *
 * @param {number} levelJ1 - Niveau du joueur 1
 * @param {number} levelJ2 - Niveau du joueur 2
 * @param {number} count - Nombre de points à générer
 * @returns {string[]} Tableau des vainqueurs de chaque point (["J1", "J2", ...])
 */
function generateRandomPoints(levelJ1, levelJ2, count) {
  const probJ1 = calculateEloProbability(levelJ1, levelJ2);
  const points = [];

  for (let i = 0; i < count; i++) {
    // Tirage aléatoire : si le nombre est inférieur à la probabilité de J1, J1 gagne
    const random = Math.random();
    points.push(random < probJ1 ? "J1" : "J2");
  }

  return points;
}

// ============================================================================
// Validation du formulaire
// ============================================================================

/**
 * Valide les champs du formulaire et retourne les données ou null en cas d'erreur.
 *
 * @returns {{ nameJ1: string, levelJ1: number, nameJ2: string, levelJ2: number } | null}
 */
function validateForm() {
  const nameJ1 = inputNameJ1.value.trim();
  const nameJ2 = inputNameJ2.value.trim();
  const levelJ1 = parseInt(inputLevelJ1.value, 10);
  const levelJ2 = parseInt(inputLevelJ2.value, 10);

  // Vérification des noms
  if (nameJ1 === "" || nameJ2 === "") {
    showError("Veuillez renseigner le nom des deux joueurs.");
    return null;
  }

  // Vérification des niveaux
  if (isNaN(levelJ1) || levelJ1 < 1 || levelJ1 > 10) {
    showError("Le niveau du joueur 1 doit être un nombre entre 1 et 10.");
    return null;
  }
  if (isNaN(levelJ2) || levelJ2 < 1 || levelJ2 > 10) {
    showError("Le niveau du joueur 2 doit être un nombre entre 1 et 10.");
    return null;
  }

  hideError();
  return { nameJ1, levelJ1, nameJ2, levelJ2 };
}

// ============================================================================
// Affichage des erreurs
// ============================================================================

/**
 * Affiche un message d'erreur sous le formulaire.
 * @param {string} message
 */
function showError(message) {
  formError.textContent = message;
  formError.classList.remove("hidden");
}

/**
 * Cache le message d'erreur.
 */
function hideError() {
  formError.textContent = "";
  formError.classList.add("hidden");
}

// ============================================================================
// Rendu de la liste des points
// ============================================================================

/**
 * Affiche la liste des points générés dans le DOM.
 * Chaque point est affiché sous la forme : "Point X : remporté par [Nom]"
 *
 * @param {string[]} points - Tableau des vainqueurs (["J1", "J2", ...])
 * @param {string} nameJ1 - Nom du joueur 1
 * @param {string} nameJ2 - Nom du joueur 2
 */
function renderPointsList(points, nameJ1, nameJ2) {
  // Vider la liste existante
  pointsList.innerHTML = "";
  pointsCount.textContent = String(points.length);

  // Créer un fragment pour des performances optimales
  const fragment = document.createDocumentFragment();

  points.forEach(function (winner, index) {
    const winnerName = winner === "J1" ? nameJ1 : nameJ2;

    const item = document.createElement("div");
    item.className = "points-list-item";
    item.innerHTML =
      '<span class="point-number">Point ' +
      (index + 1) +
      "</span> : remporté par " +
      '<span class="winner-name">' +
      escapeHtml(winnerName) +
      "</span>";

    fragment.appendChild(item);
  });

  pointsList.appendChild(fragment);

  // Afficher la section
  sectionPoints.classList.remove("hidden");
}

// ============================================================================
// Rendu du tableau de scores
// ============================================================================

/**
 * Construit et affiche le tableau de scores à partir des données d'affichage
 * renvoyées par l'API.
 *
 * @param {object} display - Objet MatchDisplay renvoyé par l'API
 */
function renderScoreTable(display) {
  // --- En-tête du tableau ---
  // Colonnes : [Joueur] [Set 1] [Set 2] ... [Set N] [Jeu en cours]
  let theadHtml = "<tr><th></th>";
  display.sets.forEach(function (_set, index) {
    theadHtml += "<th>Set " + (index + 1) + "</th>";
  });
  theadHtml += "<th>Jeu en cours</th></tr>";
  scoreThead.innerHTML = theadHtml;

  // --- Lignes des joueurs ---
  let tbodyHtml = "";

  // Ligne Joueur 1
  tbodyHtml += "<tr><td>" + escapeHtml(display.player1Name) + "</td>";
  display.sets.forEach(function (set) {
    tbodyHtml += '<td class="score-highlight">' + set[0] + "</td>";
  });
  tbodyHtml +=
    '<td class="score-highlight">' +
    escapeHtml(display.currentGame.scoreJ1) +
    "</td></tr>";

  // Ligne Joueur 2
  tbodyHtml += "<tr><td>" + escapeHtml(display.player2Name) + "</td>";
  display.sets.forEach(function (set) {
    tbodyHtml += '<td class="score-highlight">' + set[1] + "</td>";
  });
  tbodyHtml +=
    '<td class="score-highlight">' +
    escapeHtml(display.currentGame.scoreJ2) +
    "</td></tr>";

  scoreTbody.innerHTML = tbodyHtml;

  // --- Message de statut ---
  statusMessage.textContent = display.statusMessage;
  if (display.winnerName !== null) {
    statusMessage.className = "status-message status-finished";
  } else {
    statusMessage.className = "status-message status-in-progress";
  }

  // Afficher la section
  sectionResult.classList.remove("hidden");
}

// ============================================================================
// Appel API
// ============================================================================

/**
 * Envoie les points au backend et récupère le score calculé.
 * Gère la continuité du match : si un match est en cours, on envoie le currentState.
 * Si le match est terminé, on réinitialise (currentState = null).
 */
async function sendPointsToApi() {
  // Désactiver le bouton pendant le chargement
  btnSend.disabled = true;
  btnSend.textContent = "Calcul en cours...";

  try {
    // Si le match précédent est terminé, on repart de zéro
    if (currentMatchState !== null && currentMatchState.winner !== null) {
      currentMatchState = null;
    }

    // Construire le payload
    const payload = {
      player1: player1,
      player2: player2,
      points: currentPoints,
      currentState: currentMatchState,
    };

    // Appel API
    const response = await fetch(API_BASE_URL + "/api/score", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Erreur serveur inconnue.");
    }

    const data = await response.json();

    // Sauvegarder le nouvel état du match côté frontend
    currentMatchState = data.matchState;
    console.log(currentMatchState);
    // Afficher le tableau des scores
    renderScoreTable(data.display);

  } catch (error) {
    showError("Erreur lors de l'appel API : " + error.message);
    console.error("Erreur API :", error);
  } finally {
    // Réactiver le bouton
    btnSend.disabled = false;
    btnSend.textContent = "Calculer le score";
  }
}

// ============================================================================
// Utilitaires
// ============================================================================

/**
 * Échappe les caractères HTML spéciaux pour éviter les injections XSS.
 * @param {string} text
 * @returns {string}
 */
function escapeHtml(text) {
  const div = document.createElement("div");
  div.appendChild(document.createTextNode(text));
  return div.innerHTML;
}

// ============================================================================
// Événements
// ============================================================================

/**
 * Gestion du formulaire : valide les données, génère les points et les affiche.
 */
playerForm.addEventListener("submit", function (event) {
  event.preventDefault();

  // Valider le formulaire
  const formData = validateForm();
  if (formData === null) return;

  // Sauvegarder les joueurs
  player1 = { name: formData.nameJ1, level: formData.levelJ1 };
  player2 = { name: formData.nameJ2, level: formData.levelJ2 };

  // Calculer et afficher les probabilités Elo
  const probJ1 = calculateEloProbability(formData.levelJ1, formData.levelJ2);
  const probJ2 = 1 - probJ1;
  eloProbJ1.textContent =
    escapeHtml(formData.nameJ1) + " " + (probJ1 * 100).toFixed(1) + "%";
  eloProbJ2.textContent =
    escapeHtml(formData.nameJ2) + " " + (probJ2 * 100).toFixed(1) + "%";
  eloStats.classList.remove("hidden");

  // Générer les points aléatoires
  currentPoints = generateRandomPoints(
    formData.levelJ1,
    formData.levelJ2,
    POINTS_PER_GENERATION
  );

  // Afficher la liste des points
  renderPointsList(currentPoints, formData.nameJ1, formData.nameJ2);

  // Si le match précédent était terminé, on réinitialise
  if (currentMatchState !== null && currentMatchState.winner !== null) {
    currentMatchState = null;
    sectionResult.classList.add("hidden");
  }
});

/**
 * Gestion du bouton "Calculer le score" : envoie les points à l'API.
 */
btnSend.addEventListener("click", function () {
  if (currentPoints.length === 0) {
    showError("Veuillez d'abord générer des points.");
    return;
  }
  sendPointsToApi();
});
