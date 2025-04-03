const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const coinCounter = document.getElementById('coinCounter');

// Proportions du carré
const squareWidthFactor = 0.1; // 10% de la largeur du canvas
const squareHeightFactor = 0.1; // 10% de la hauteur du canvas

let square = {
    x: 400,
    y: 400,  // position initiale en haut du canvas
    width: 10,
    height: 10,
    speed: 5,
    depth: 0,
    velocity: 0, // Vitesse de descente
    horizontalVelocity: 0 // Vitesse horizontale initiale
};
let isGameWon = false; // Indiquer si le joueur a gagné

let squareColor = '#00f'; // Couleur par défaut du carré
let isFlashing = false;
let maxCoins = 5;

let SizeCost = 0;       // Coût de l'amélioration de la vitesse gauche
let bounceCost = 0;     // Coût de l'amélioration du rebond
let bounce = -0.8;      // Facteur de rebond

let SizeUpgrades = 0;
let bounceUpgrades = 0;
const maxSizeUpgrades = 100;    // Limite maximale pour l'amélioration de la vitesse à gauche
const maxBounceUpgrades = 21;   // Limite maximale pour l'amélioration du rebond

document.getElementById('increaseSize').addEventListener('click', function() {
    if (collectedCoins >= SizeCost && SizeUpgrades < maxSizeUpgrades) {
        square.width += 25;
        square.height += 25;
        collectedCoins -= SizeCost; // Déduit le coût
        updateCoinCounter(); // Met à jour l'affichage du compteur
    } else {
        alert("Taille maximum atteinte");
    }
});

document.getElementById('decreaseSize').addEventListener('click', function() {
    if (collectedCoins >= SizeCost && SizeUpgrades < maxSizeUpgrades && square.width > 5 && square.height > 5) {
        square.width -= 5;
        square.height -= 5;
        collectedCoins -= SizeCost; // Déduit le coût
        updateCoinCounter(); // Met à jour l'affichage du compteur
    } else {
        alert("Taille minimum atteinte");
    }
});

document.getElementById('increaseBounce').addEventListener('click', function() {
    if (collectedCoins >= bounceCost && bounceUpgrades < maxBounceUpgrades) {
        bounce *= 1.01;         // Augmente la force du rebond
        collectedCoins -= bounceCost;      // Déduit le coût
        bounceUpgrades++;                  // Incrémente le compteur d'amélioration
        updateCoinCounter();               // Met à jour l'affichage du compteur
    } else {
        alert("Rebond maximum atteint");
    }
});

// Pour suivre l'état des touches et les pièces d'or
let keysPressed = {};
let coins = [];
let collectedCoins = 0; // Compteur de pièces récoltées

// Fonction pour dessiner le carré
function drawsquare() {
    ctx.fillStyle = squareColor; // Utiliser la variable de couleur actuelle
    ctx.fillRect(square.x, square.y, square.width, square.height); // Dessiner le carré
}

// Fonction pour dessiner les pièces d'or
function drawCoins() {
    ctx.fillStyle = 'yellow';
    coins.forEach(coin => {
        ctx.fillRect(coin.x, coin.y, coin.size, coin.size);
    });
}

// Générer une nouvelle pièce d'or à une position aléatoire
function createCoin() {
    if (coins.length < maxCoins && !isGameWon) {
    const size = 10; // Taille de la pièce
    const x = Math.random() * (canvas.width - size);
    const y = Math.random() * (canvas.height - size);
    coins.push({ x: x, y: y, size: size });
}
}

// Vérifier les collisions entre le carré et les pièces d'or
function checkCoinCollision() {
    coins = coins.filter(coin => {
        if (
            square.x < coin.x + coin.size && 
            square.x + square.width > coin.x && 
            square.y < coin.y + coin.size && 
            square.y + square.height > coin.y
        ) {
             flash('green')  // Collision détectée, change temporairement la couleur
             collectedCoins++; // Incrémenter le compteur de pièces récoltées
             updateCoinCounter(); // Mettre à jour l'affichage du compteur
             return false; // Retire la pièce collectée
         }
        return true; // Garde la pièce
    });
}

// Fonction flash pour changer la couleur
function flash(color) {
    if (!isFlashing) {
        isFlashing = true;
        squareColor = color; // Changer la couleur pour le clignotement
        setTimeout(() => {
            squareColor = '#00f'; // Revenir à la couleur d'origine
            isFlashing = false;
        }, 200); // Durée du clignotement en millisecondes
    }  
}

// Mettre à jour l'affichage du compteur de pièces récoltées
function updateCoinCounter() {
    coinCounter.textContent = `Pièces récoltées : ${collectedCoins}`;
}

function update() {
    // Appliquer la gravité pour simuler la descente
    square.velocity += 0.1; // Ajoute de la gravité
    square.y += square.velocity; // Mouvement vertical

    // Vérifier les collisions avec les bords du canvas
    // Collision avec le bas
    if (square.y + square.height > canvas.height) {
        square.y = canvas.height - square.height; // Réinitialiser la position au bas
        square.velocity *= bounce; // Inverser la direction et atténuer la vitesse pour un effet de rebond
        flash('red');
        createCoin();
    }

    // Collision avec le haut
    if (square.y < 0) {
        square.y = 0; // Réinitialiser la position en haut
        square.velocity *= bounce; // Inverser la direction et atténuer la vitesse
        flash('red');
        createCoin();
    }

    // Vérification des collisions avec les côtés    
    // Collision avec le côté gauche
    if (square.x < 0) {
        square.x = 0; // Réinitialiser la position à gauche
        square.horizontalVelocity *= bounce; // Inverser la direction de la vitesse horizontale (optionnel)
        flash('red');
        createCoin();
    }

    // Collision avec le côté droit
    if (square.x + square.width > canvas.width) {
        square.x = canvas.width - square.width; // Réinitialiser la position à droite
        square.horizontalVelocity *= bounce; // Inverser la direction de la vitesse horizontale (optionnel)
        flash('red');
        createCoin();
    }

// Gérer les mouvements à gauche et à droite
if (keysPressed['a']) { // Aller à gauche
    square.horizontalVelocity -= 0.5;
} else if (keysPressed['d']) { // Aller à droite
    square.horizontalVelocity += 0.5;
}

//Gérer la montée / descente
if (keysPressed['w']) { // Aller à gauche
    square.velocity -= 0.2;
} else if (keysPressed['s']) { // Aller à droite
    square.velocity += 0.5;
}

// Appliquer la vitesse horizontale pour déplacer le carré
square.x += square.horizontalVelocity; // Déplace le carré

// Diminuer progressivement la vitesse horizontale
square.horizontalVelocity *= 0.95; // Réduit la vitesse horizontale de 5% chaque cycle


    // Vérifiez les collisions avec les pièces d'or
    checkCoinCollision(); // Vérifie les collisions avec les pièces d'or
    // Vérifier si le carré a atteint la taille du canvas
    if (!isGameWon && square.width >= canvas.width && square.height >= canvas.height) {
        // Afficher le message de victoire
        isGameWon = true;
        alert("Félicitations ! Vous avez gagné !");
    } else if (coins.length === 0 && !isGameWon) {// Drapeau pour indiquer si le joueur a gagné
    // Vérifiez si toutes les pièces ont été collectées
        square.width += 10;
        square.height +=10;
        for (let i = 0; i < 5; i++) { // Changer ce nombre pour le nombre souhaité de pièces
            createCoin();
        }
    }
};

// Gérer les événements des touches
document.addEventListener('keydown', function(event) {
    keysPressed[event.key] = true; // Marquer la touche comme enfoncée
});

document.addEventListener('keyup', function(event) {
    keysPressed[event.key] = false; // Marquer la touche comme relâchée
});

// Ajouter la fonctionnalité de réinitialisation du jeu
document.getElementById('resetGame').addEventListener('click', function() {
    // Réinitialiser le carré
    square.x = 400;
    square.y = 400;
    square.width = 10;
    square.height = 10;
    square.depth = 0;
    square.velocity = 0;
    square.horizontalVelocity = 0;
    bounce = -0.8;
    isGameWon = false;
    
    // Réinitialiser le compteur de pièces récoltées
    collectedCoins = 0;
    updateCoinCounter(); // Mettre à jour l'affichage du compteur

    // Réinitialiser les pièces
    coins = []; // Vider le tableau des pièces
    for (let i = 0; i < 5; i++) { // Créer 5 nouvelles pièces d'or
        createCoin();
    }
});

// Boucle du jeu
function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    update();
    drawsquare();
    drawCoins(); // Dessiner les pièces d'or
    requestAnimationFrame(gameLoop);
}

// Créer des pièces d'or initiales
for (let i = 0; i < 5; i++) {
    createCoin(); // Créer 5 pièces d'or au démarrage
}

gameLoop();