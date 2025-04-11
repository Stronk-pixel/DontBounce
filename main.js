const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const coinCounter = document.getElementById('coinCounter');
const music = new Audio('assets/music/Pixel-Art-Boss-Fight.mp3');
music.loop = true;
music.volume = 0.05;
const soundCoin = new Audio('assets/sounds/coin.mp3');
soundCoin.volume = 0.1;
const soundHit = new Audio('assets/sounds/hit.mp3');
soundHit.volume = 0.1;
let isMusicPlaying = false;

function resizeCanvas() {
    const size = Math.min(window.innerWidth, window.innerHeight, 600);
    canvas.width = size;
    canvas.height = size;
  }
  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

// Masquer les cheats au démarrage
document.getElementById('leftButtons').style.display = 'none';
document.getElementById('rightButtons').style.display = 'none';

// Lancer la musique après le 1er clic utilisateur
window.addEventListener('click', () => {
    if (!isMusicPlaying) {
        music.play();
        isMusicPlaying = true;
        document.getElementById('toggleMusic').textContent = 'Couper la musique';
    }
}, { once: true });

// Proportions du carré
const squareWidthFactor = 0.1;
const squareHeightFactor = 0.1;

let square = {
    x: 400,
    y: 400,
    width: 40,
    height: 40,
    speed: 5,
    depth: 0,
    velocity: 0,
    horizontalVelocity: 0
};

let rotatingObstacle = {
    radius: 20,
    orbitRadius: 150,
    angle: 0,
    speed: 0.02,
    x: 0,
    y: 0
};

let ghostObstacle = {
    x: canvas.width / 2 - 40,
    y: canvas.height / 2 - 40,
    width: 80,
    height: 80,
    dx: 2,
    dy: 2,
    visible: false,
    range: 200
};

// Palette de couleurs centralisée
let colorSquare = '#00eaff';          // Carré joueur
let colorCoin = 'yellow';             // Pièce normale
let colorShadowCoin = 'red'
let colorTrappedCoin = 'darkorange';  // Pièce piégée
let colorGhost = 'rgba(150, 150, 255, 0.5)';
let colorObstacleStroke = 'black';
let colorSparks = {
    default: 'orange',
    hit: '#ff00cc',
    trap: 'orange',
    ghost: 'purple',
    success: '#39ff14'
};
let colorBlackHoleCore = 'black';
let colorBlackHoleShadow = 'purple';
let colorBlackHoleParticles = 'rgba(255, 255, 255, 0.7)';
let colorRotatingObstacleAura = 'rgba(100, 100, 255, 0.2)';
let colorLevelUpText = 'white';
let colorPauseOverlay = 'rgba(0, 0, 0, 0.5)';
let colorPauseText = '#fff';
let colorFakeBoss = {
    start: '#00eaff',
    final: '#f00'
};


let isBossIntro = false;
let bossPhase = 0;
let bossTimer = 0;
let blackHole = { x: canvas.width / 2, y: canvas.height / 2, radius: 0 };

// Paramètres du jeu
let currentLevel = 1;
const maxLevel = 50;
let maxCoins = 5;
let suckedCoins = []; // Pièces aspirées dans le trou noir
let bossCoinCount = null;

// Variables graphiques
let particles = [];
let trail = [];
let obstacles = [];
let blackHoleParticles = [];
let customLevelUpMessage = '';
let levelUpOpacity = 0;


// Différents états du jeu
let isGameWon = false; 
let isFlashing = false;
let moveCoinsEnabled = false;
let showLevelUpText = false; 
let levelUpTextTimer = 0;
let isPaused = false;
let tryAgain = false;
let bounce = -0.8;      // Facteur de rebond

// A supprimer
let SizeUpgrades = 0;
const maxSizeUpgrades = 100;    // Limite maximale pour l'amélioration de la vitesse à gauche


// Gérer la pause avec la touche "Espace"
document.addEventListener('keydown', function(event) {
    if (event.key === ' ') { // ' ' correspond à la touche Espace
        event.preventDefault(); // Empêche le comportement par défaut (comme le scroll)
        isPaused = !isPaused; // Basculer l'état de la pause
    }
});

function isColliding(rect1, rect2) {
    return (
        rect1.x < rect2.x + rect2.width &&
        rect1.x + rect1.width > rect2.x &&
        rect1.y < rect2.y + rect2.height &&
        rect1.y + rect1.height > rect2.y
    );
}



// Gérer les particules
function createSparksOnEdge(square, edge, color = colorSparks.hit, amount = 15) {
    for (let i = 0; i < amount; i++) {
        let x, y;

        switch (edge) {
            case 'top':
                x = square.x + Math.random() * square.width;
                y = square.y;
                break;
            case 'bottom':
                x = square.x + Math.random() * square.width;
                y = square.y + square.height;
                break;
            case 'left':
                x = square.x;
                y = square.y + Math.random() * square.height;
                break;
            case 'right':
                x = square.x + square.width;
                y = square.y + Math.random() * square.height;
                break;
        }

        particles.push({
            x: x,
            y: y,
            radius: Math.random() * 2 + 1,
            alpha: 1,
            dx: (Math.random() - 0.5) * 4,
            dy: (Math.random() - 0.5) * 4,
            color: color
        });
    }
}

// Génération de particules
function updateParticles() {
        particles = particles.filter(p => p.alpha > 0);
        particles.forEach(p => {
            p.x += p.dx;
            p.y += p.dy;
            p.alpha -= 0.02;
        });
    }
// Dessiner les particules    
function drawParticles() {
        particles.forEach(p => {
            ctx.globalAlpha = p.alpha;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1.0; // Réinitialiser
        });
    }

    
// Génerer les obstacles
function generateObstacles() {
    obstacles = []; // Reset à chaque nouveau niveau si tu veux
    let obstacleCount = 5 //+ Math.floor(currentLevel / 10); // Optionnel : plus de niveaux = plus d'obstacles
    let speed = 1; // Vitesse de base des obstacles mobiles
  
    for (let i = 0; i < obstacleCount; i++) {
      let width = 80;
      let height = 80;
      let x = Math.random() * (canvas.width - width);
      let y = Math.random() * (canvas.height - height);
  
      // Évite de spawn sur le joueur au début
      if (
        x < square.x + square.width + 50 &&
        x + width > square.x - 50 &&
        y < square.y + square.height + 50 &&
        y + height > square.y - 50
      ) {
        i--; // Refaire cette boucle
        continue;
      }
  
      // Ajout du mouvement à partir du niveau 15
      let dx = 0;
      let dy = 0;
      if (currentLevel >= 15) {
        dx = Math.random() < 0.5 ? speed : -speed;
        dy = Math.random() < 0.5 ? speed : -speed;
      }
  
      obstacles.push({
        x: x,
        y: y,
        width: width,
        height: height,
        dx: dx,
        dy: dy
      });
    }
  }

// Dessiner les obstacles
function drawObstacles() {
    ctx.strokeStyle = '#ff00cc'; // Rose néon
    ctx.shadowColor = '#ff00cc';
    ctx.shadowBlur = 12;
    ctx.lineWidth = 2;
    
    for (const obs of obstacles) {
        ctx.strokeRect(obs.x, obs.y, obs.width, obs.height);
    }
    
    // Reset les effets pour éviter de flinguer les autres dessins
    ctx.shadowBlur = 0;
    }

// Bouger les obstacles
function updateObstacles() {
        if (currentLevel >= 15 && currentLevel < 50) {
          for (let obs of obstacles) {
            obs.x += obs.dx;
            obs.y += obs.dy;
      
            // Rebonds sur les bords de l'écran
            if (obs.x <= 0 || obs.x + obs.width >= canvas.width) {
              obs.dx *= -1;
            }
            if (obs.y <= 0 || obs.y + obs.height >= canvas.height) {
              obs.dy *= -1;
            }
          }
        }
      }

// Gérer l'affichage du niveau
function updateLevelDisplay() {
    const levelDisplay = document.getElementById('levelDisplay');
    levelDisplay.textContent = `Niveau : ${currentLevel} / ${maxLevel}`;
}

// Bouger les pièces
function moveCoins() {
    if (currentLevel >= 5) { // Les pièces commencent à bouger à partir du niveau 5
        coins.forEach(coin => {
            let speedMultiplier = 1 + (Math.max(currentLevel - 10, 0)) * 0.2;  // Augmente de 5% par niveau à partir du niveau 10
            coin.x += coin.speedX * speedMultiplier;
            coin.y += coin.speedY * speedMultiplier;

            // Gérer les rebonds des pièces sur les bords
            if (coin.x <= 0 || coin.x + coin.size >= canvas.width) {
                coin.speedX *= -1; // Inverser la direction x
            }
            if (coin.y <= 0 || coin.y + coin.size >= canvas.height) {
                coin.speedY *= -1; // Inverser la direction y
            }
        });
    }
}



// Boutons DEBUG
    // Sauter les niveaux
    function jumpToLevel(targetLevel) {
        currentLevel = targetLevel;
        updateLevelDisplay();

        // Réinitialise tout ce qu'il faut pour le niveau
        coins = [];
        for (let i = 0; i < 5; i++) {
            createCoin();
        }

        generateObstacles(); // Recrée les obstacles si besoin
        if (currentLevel >= 25 && currentLevel <= 50) {
            createCoin(true);
        }

        if (targetLevel === 50) {
            collectedCoins = 200;
            if (bossCoinCount === null) {
                bossCoinCount = collectedCoins;
                console.log(bossCoinCount);
            }
        
            // 👇 Forcer les bonnes conditions pour l'intro du boss
            isBossIntro = true;
            bossPhase = 1;
            bossTimer = 0;
        
            coins = [];
            obstacles = [];
            particles = [];
            trail = [];
        }
        
        updateCoinCounter();

        if (currentLevel === 50 && !tryAgain) {
            customLevelUpMessage = `Bravo, tu as collecté ${collectedCoins} pièces...\nRécupères les \navant que je ne t'attrape!`;
            levelUpTextTimer = 500;
        } 
        else if (currentLevel === 50 && tryAgain) {
            customLevelUpMessage = `Essaie encore!`;
            levelUpTextTimer = 500;
        } else {
            customLevelUpMessage = `Niveau ${currentLevel}`;
            levelUpTextTimer = 90;
        }

        showLevelUpText = true;
    }

    // Augmenter le niveau de 1
    document.getElementById('increaseLevel').addEventListener('click', function() {
        currentLevel++;
        updateLevelDisplay();

        // Réinitialise tout ce qu'il faut pour le niveau
        coins = [];
        for (let i = 0; i < 5; i++) {
            createCoin();
        }
        
        generateObstacles(); // Recrée les obstacles si besoin
        if (currentLevel >= 25 && currentLevel <= 50) {
            createCoin(true);
        }

        generateObstacles(); // Recrée les obstacles si besoin
        if (currentLevel === 50) {
            customLevelUpMessage = `Bravo, tu as collecté ${collectedCoins} pièces...\nRécupères les \navant que je ne t'attrape!`;
            levelUpTextTimer = 400;
        } else {
            customLevelUpMessage = `Niveau ${currentLevel}`;
            levelUpTextTimer = 90;
        }
        levelUpTextTimer = 90;
    });

    // Augmenter la taille
    document.getElementById('increaseSize').addEventListener('click', function() {
        if (square.width < 200 && square.height < 200) {
            square.width += 25;
            square.height += 25;
        } else {
            square.width = 200;
            square.height = 200;
        }
    });
    // Diminuer la taille
    document.getElementById('decreaseSize').addEventListener('click', function() {
        if (square.width > 5 && square.height > 5) {
            square.width -= 25;
            square.height -= 25;
        } else {
            square.width = 5;
            square.height = 5;
        }
    });

    // Ajouter 50 pièces
    document.getElementById('add50Coins').addEventListener('click', function() {
        collectedCoins += 50;
        updateCoinCounter();
    });

    // Ajouter 100 pièces
    document.getElementById('add100Coins').addEventListener('click', function() {
        collectedCoins += 100;
        updateCoinCounter();
    });



// Pour suivre l'état des touches et les pièces d'or
let keysPressed = {};
let coins = [];
let collectedCoins = 0; // Compteur de pièces récoltées

// Fonction pour dessiner le carré
function drawsquare() {
    ctx.fillStyle = colorSquare; // Utiliser la variable de couleur actuelle
    ctx.fillRect(square.x, square.y, square.width, square.height); // Dessiner le carré
}

// Fonction pour dessiner les pièces d'or
function drawCoins() {
    coins.forEach(coin => {
        if (coin.isTrapped) {
            // Style pièce piégée
            ctx.fillStyle = colorTrappedCoin;
            ctx.shadowColor = colorShadowCoin;
            ctx.shadowBlur = 10;
        } else {
            ctx.fillStyle = colorCoin;
            ctx.shadowColor = 'white';
            ctx.shadowBlur = 10;
        }
        ctx.fillRect(coin.x, coin.y, coin.size, coin.size);
    });

    // Reset les effets
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
}

// Générer une nouvelle pièce d'or à une position aléatoire
function createCoin(isTrapped = false) {
    if (!isTrapped && (coins.length >= maxCoins || isGameWon)) return;
    
    const size = 10; // Taille de la pièce
    const x = Math.random() * (canvas.width - size);
    const y = Math.random() * (canvas.height - size);
    const speedX = Math.random() * 2 - 1; // Vitesse aléatoire entre -1 et 1
    const speedY = Math.random() * 2 - 1; // Vitesse aléatoire entre -1 et 1

    coins.push({ x, y, size, speedX, speedY, isTrapped });    
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
            if (coin.isTrapped) {
                // 🚀 Jet aléatoire
                let angle = Math.random() * 2 * Math.PI;
                let force = 10;
                square.horizontalVelocity = Math.cos(angle) * force;
                square.velocity = Math.sin(angle) * force;
                flash(colorSparks.trap); // Couleur spéciale
                soundCoin.currentTime = 0;
                soundCoin.play();
            } else {
                collectedCoins++;
                updateCoinCounter();
                flash(colorSparks.success);
                soundCoin.currentTime = 0;
                soundCoin.play();
            }
            return false; // Retirer la pièce
        }
        return true;
    });
}

// Vérifier les collisions avec les obstacles
function checkObstacleCollision() {
    for (const obs of obstacles) {
        if (isColliding(square, obs)) {
            const dx = (square.x + square.width / 2) - (obs.x + obs.width / 2);
            const dy = (square.y + square.height / 2) - (obs.y + obs.height / 2);
            const width = (square.width + obs.width) / 2;
            const height = (square.height + obs.height) / 2;

            const crossWidth = width * dy;
            const crossHeight = height * dx;
        
            if (Math.abs(dx) > Math.abs(dy)) {
                // Collision horizontale
                if (dx > 0) {
                    // Collision à droite
                    square.x = obs.x + obs.width;
                    square.horizontalVelocity *= -1;
                    createSparksOnEdge(square, 'left');
                } else {
                    // Collision à gauche
                    square.x = obs.x - square.width;
                    square.horizontalVelocity *= -1;
                    createSparksOnEdge(square, 'right');
                }
            } else {
                // Collision verticale
                if (dy > 0) {
                    // Collision en bas
                    square.y = obs.y + obs.height;
                    square.velocity *= -1;
                    createSparksOnEdge(square, 'top');
                } else {
                    // Collision en haut
                    square.y = obs.y - square.height;
                    square.velocity *= -1;
                    createSparksOnEdge(square, 'bottom');
                }
            }
            soundHit.currentTime = 0;
            soundHit.play();
            flash(colorSparks.hit);
        }
    }
        // Collision avec le fantôme (si visible)
        if (ghostObstacle && ghostObstacle.visible && currentLevel >= 30 && currentLevel < 50 && ghostObstacle.visible && isColliding(square, ghostObstacle)) {
            const dx = (square.x + square.width / 2) - (ghostObstacle.x + ghostObstacle.width / 2);
            const dy = (square.y + square.height / 2) - (ghostObstacle.y + ghostObstacle.height / 2);
    
            // Effet de rebond
            square.horizontalVelocity += Math.sign(dx) * 5;
            square.velocity += Math.sign(dy) * 5;
    
            createSparksOnEdge(square, 'top'); // Tu peux varier selon le sens
            soundHit.currentTime = 0;
            soundHit.play();
            flash(colorSparks.ghost);
        }
}

// Fonction flash pour changer la couleur
function flash(color) {
    if (!isFlashing) {
        isFlashing = true;
        colorSquare = color; // Changer la couleur pour le clignotement    
        setTimeout(() => {
            colorSquare = '#00eaff'; // Revenir à la couleur d'origine
            isFlashing = false;
        }, 200); // Durée du clignotement en millisecondes
    }  
}

// Mettre à jour l'affichage du compteur de pièces récoltées
function updateCoinCounter() {
    coinCounter.textContent = `Pièces récoltées : ${collectedCoins}`;
}

function drawTrail() {
    trail.forEach(t => {
        ctx.globalAlpha = t.alpha;
        ctx.fillStyle = colorSquare;
        ctx.fillRect(t.x, t.y, t.width, t.height);
    });
    ctx.globalAlpha = 1;
}

// Dessiner l'obstacle tournant
function drawRotatingObstacle() {
    if (currentLevel >= 20 && currentLevel < 45) {
        const gradient = ctx.createRadialGradient(
            rotatingObstacle.x,
            rotatingObstacle.y,
            5,
            rotatingObstacle.x,
            rotatingObstacle.y,
            rotatingObstacle.radius * 2
        );
        
        gradient.addColorStop(0, colorBlackHoleCore);         // cœur très sombre
        gradient.addColorStop(0.4, 'rgba(0, 0, 0, 0.8)');
        gradient.addColorStop(0.7, colorBlackHoleShadow); // zone de distorsion bleutée
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');         // bord transparent

        ctx.beginPath();
        ctx.arc(rotatingObstacle.x, rotatingObstacle.y, rotatingObstacle.radius * 2, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();

        // Petite aura qui pulse autour (optionnel mais stylé)
        ctx.beginPath();
        ctx.arc(rotatingObstacle.x, rotatingObstacle.y, rotatingObstacle.radius + Math.sin(Date.now() / 300) * 2, 0, Math.PI * 2);
        ctx.strokeStyle = colorRotatingObstacleAura;
        ctx.lineWidth = 2;
        ctx.stroke();
    }
}

function drawBlackHoleParticles() {
    ctx.fillStyle = colorBlackHoleParticles;
    blackHoleParticles.forEach(p => {
        const x = rotatingObstacle.x + Math.cos(p.angle) * p.radius;
        const y = rotatingObstacle.y + Math.sin(p.angle) * p.radius;
        ctx.beginPath();
        ctx.arc(x, y, p.size, 0, Math.PI * 2);
        ctx.fill();
    });
}


// Dessiner l'obstacle fantôme
function drawGhostObstacle() {
    if (currentLevel >= 30 && currentLevel < 50 && ghostObstacle.visible) {
        ctx.strokeStyle = colorGhost;
        ctx.lineWidth = 2;
        ctx.strokeRect(ghostObstacle.x, ghostObstacle.y, ghostObstacle.width, ghostObstacle.height);
    }
}

function updateGhostObstacle() {
    if (currentLevel >= 35 && currentLevel <= 50) {
        // Déplacement aléatoire rebondissant
        ghostObstacle.x += ghostObstacle.dx;
        ghostObstacle.y += ghostObstacle.dy;

        if (ghostObstacle.x <= 0 || ghostObstacle.x + ghostObstacle.width >= canvas.width) {
            ghostObstacle.dx *= -1;
        }
        if (ghostObstacle.y <= 0 || ghostObstacle.y + ghostObstacle.height >= canvas.height) {
            ghostObstacle.dy *= -1;
        }
    }

    if (currentLevel >= 40 && currentLevel <= 50) {
        // Le fantôme suit le carré !
        const targetX = square.x + square.width / 2;
        const targetY = square.y + square.height / 2;

        const centerX = ghostObstacle.x + ghostObstacle.width / 2;
        const centerY = ghostObstacle.y + ghostObstacle.height / 2;

        const dx = targetX - centerX;
        const dy = targetY - centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        const speed = 2;

        if (distance > 1) {
            ghostObstacle.x += (dx / distance) * speed;
            ghostObstacle.y += (dy / distance) * speed;
        }
    }
}

////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////// BOSS //////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////

function runBossIntro() {
    bossTimer++;
    if (tryAgain) {
        blackHole.radius = 50;
    }

    if (bossPhase === 1) {
        const targetX = canvas.width / 2 - square.width / 2;
        const targetY = canvas.height - square.height - 40;

        const dx = targetX - square.x;
        const dy = targetY - square.y;

        square.x += dx * 0.1;
        square.y += dy * 0.1;

        trail.push({ x: square.x, y: square.y, width: square.width, height: square.height, alpha: 0.1 });
        if (trail.length > 10) trail.shift();

        if (Math.abs(dx) < 1 && Math.abs(dy) < 1) {
            bossPhase = 2;
            bossTimer = 0;
        }
    }

    else if (bossPhase === 2) {
        if (!tryAgain && blackHole.radius < 50) {
            blackHole.radius += 2;
        }
    
        // Une fois le trou noir visible, on génère les pièces aspirées
        if (bossTimer === 60) {
                     
            for (let i = 0; i < bossCoinCount; i++) {
                const angle = Math.random() * Math.PI * 2;
                const distance = 10 + Math.random() * 20;
        
                suckedCoins.push({
                    angle,
                    radius: distance,
                    maxRadius: square.width * 2,
                    size: 6,
                    speed: 2 + Math.random() * 1.5,
                    phase: 1,
                    centerX: square.x + square.width / 2,
                    centerY: square.y + square.height / 2
                });
            }
        }
    
        // Animation d'aspiration en spirale
        suckedCoins.forEach(coin => {
            if (coin.phase === 1) {
                // Spirale qui grossit jusqu'à maxRadius
                if (coin.radius < coin.maxRadius) {
                    coin.radius += coin.speed;
                } else {
                    coin.phase = 2;
                }
        
                // centre reste le carré
                coin.centerX += 0; 
                coin.centerY += 0;
            }
        
            if (coin.phase === 2) {
                // On calcule la distance entre la pièce et le trou noir
                    const dx = blackHole.x - coin.centerX;
                    const dy = blackHole.y - coin.centerY;
                    const distance = Math.sqrt(dx * dx + dy * dy);

                    // On avance le centre de la pièce vers le trou noir
                    coin.centerX += dx * 0.05;
                    coin.centerY += dy * 0.05;

                    // On réduit le rayon en fonction de cette distance
                    // pour que le rayon arrive à 0 quand le centre est au bon endroit
                    const shrinkFactor = 0.1;
                    coin.radius = distance * shrinkFactor;
            }
        
            coin.angle += 0.2;
        
            coin.x = coin.centerX + Math.cos(coin.angle) * coin.radius;
            coin.y = coin.centerY + Math.sin(coin.angle) * coin.radius;
        });
    
        // Une fois que tout est "aspiré", on passe à la phase suivante
        if (bossTimer > 180) {
            bossPhase = 3;
            bossTimer = 0;
        }
    
    }

    else if (bossPhase === 3) {
        if (!window.fakeBoss) {
            window.fakeBoss = {
                x: blackHole.x,
                y: blackHole.y,
                size: 0,
                rotation: 0,
                color: colorFakeBoss.start,
                flashing: false,
                dx: 0,
                dy: 0
            };
        }

        if (fakeBoss.size < 50) {
            fakeBoss.size += 1.5;
        } else {
            bossPhase = 4;
            bossTimer = 0;
            suckedCoins = [];
        }
    }

    else if (bossPhase === 4) {
        fakeBoss.rotation += 0.3;

        if (bossTimer > 60 && bossTimer % 15 < 8) {
            fakeBoss.color = bossTimer % 30 < 15 ? colorFakeBoss.start : colorFakeBoss.final;
        }

        if (bossTimer > 90) {
            bossPhase = 5;
            bossTimer = 0;
        }
    }

    else if (bossPhase === 5) {
        fakeBoss.color = colorFakeBoss.final;
        coins = [];
        for (let i = 0; i < bossCoinCount; i++) {
            const angle = i * 0.3; // décalage d’angle progressif
            const speed = 2 + i * 0.05; // augmente un peu la vitesse à chaque pièce
            const size = 10;
            coins.push({
                x: fakeBoss.x,
                y: fakeBoss.y,
                size: size,
                speedX: Math.cos(angle) * speed,
                speedY: Math.sin(angle) * speed,
                isTrapped: false
            });
        }

        bossPhase = 6;
        bossTimer = 0;
        // Laisse isBossIntro à true pour que le black hole continue d'être dessiné
    }

    else if (bossPhase === 6) {
        isBossIntro = false;
        const targetX = square.x + square.width / 2;
        const targetY = square.y + square.height / 2;
        const dx = targetX - fakeBoss.x;
        const dy = targetY - fakeBoss.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > 1) {
            fakeBoss.dx = (dx / dist) * 2;
            fakeBoss.dy = (dy / dist) * 2;
            fakeBoss.x += fakeBoss.dx;
            fakeBoss.y += fakeBoss.dy;
        }

        // Met à jour la position du trou noir pour qu'il suive le boss
        blackHole.x = fakeBoss.x;
        blackHole.y = fakeBoss.y;

        moveCoins();
    }
}

function drawFakeBoss() {
    if (window.fakeBoss) {
        // Redessine le trou noir derrière le boss si on est en phase 5 ou plus
        if (bossPhase >= 5 || tryAgain) {
            ctx.beginPath();
            ctx.arc(blackHole.x, blackHole.y, blackHole.radius, 0, Math.PI * 2);
            ctx.fillStyle = colorBlackHoleCore;
            ctx.shadowColor = colorBlackHoleShadow;
            ctx.shadowBlur = 20;
            ctx.fill();
            ctx.shadowBlur = 0;
        }
        
        suckedCoins.forEach(coin => {
            ctx.fillStyle = colorCoin;
            ctx.beginPath();
            ctx.arc(coin.x, coin.y, coin.size, 0, Math.PI * 2);
            ctx.fill();
        });

        ctx.save();
        ctx.translate(fakeBoss.x, fakeBoss.y);
        ctx.rotate(fakeBoss.rotation);
        ctx.fillStyle = fakeBoss.color;
        ctx.beginPath();

        if (bossPhase < 5) {
            ctx.fillRect(-fakeBoss.size / 2, -fakeBoss.size / 2, fakeBoss.size, fakeBoss.size);
        } else {
            ctx.arc(0, 0, fakeBoss.size / 2, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }
}


// Afficher le texte level up !
function drawLevelUpText() {
    if (showLevelUpText && levelUpTextTimer > 0) {
        // Gère le fade in / out
        if (levelUpTextTimer > 60) {
            levelUpOpacity = Math.min(levelUpOpacity + 0.05, 1); // fade in
        } else {
            levelUpOpacity = Math.max(levelUpOpacity - 0.05, 0); // fade out
        }

        ctx.globalAlpha = levelUpOpacity;
        ctx.font = 'bold 30px "Orbitron", sans-serif'; // 👈 police synthwave
        ctx.fillStyle = colorLevelUpText;
        ctx.textAlign = 'center';

        const lines = customLevelUpMessage.split('\n');
        lines.forEach((line, i) => {
            ctx.fillText(line, canvas.width / 2, canvas.height / 3 - 30 + i * 40);
        });

        ctx.globalAlpha = 1; // reset alpha
        levelUpTextTimer--;

        if (levelUpTextTimer === 0) {
            showLevelUpText = false;
            customLevelUpMessage = '';
            levelUpOpacity = 0; // reset opacité
        }
    }
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////// FONCTION UPDATE //////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

function update() {
    if (currentLevel === 50) {
        if (!isBossIntro && bossPhase < 6) {
            isBossIntro = true;
            bossPhase = 1;
            bossTimer = 0;
        
            keysPressed = {};
            coins = [];
            obstacles = [];
            particles = [];
            trail = [];
        }
    
        if (isBossIntro || bossPhase >= 6) {
            runBossIntro();
        
            // Attraction magnétique du boss (phase finale)
        if (bossPhase >= 6 && window.fakeBoss) {
            const dx = (fakeBoss.x) - (square.x + square.width / 2);
            const dy = (fakeBoss.y) - (square.y + square.height / 2);
            const distance = Math.sqrt(dx * dx + dy * dy);
            const attractionRadius = fakeBoss.size / 2;
            const attractionStrength = 0.8;

        if (distance < attractionRadius) {
            const angle = Math.atan2(dy, dx);
            square.horizontalVelocity += Math.cos(angle) * attractionStrength;
            square.velocity += Math.sin(angle) * attractionStrength;

        // Si le centre du carré est au centre du boss -> RESET
        if (distance < 5) {
            tryAgain = true;
            
            // Recentrer le boss
            if (window.fakeBoss) { 
                fakeBoss.x = canvas.width / 2;
                fakeBoss.y = canvas.height / 2;
            }
            // Recentrer le trou noir
            blackHole.x = canvas.width / 2;
            blackHole.y = canvas.height / 2;
            
            jumpToLevel(50);
            
        }
    }
}
            if (bossPhase < 6) return; // Stoppe le reste du update normal seulement pendant les phases d'intro
        }
    }

    // Appliquer la gravité pour simuler la descente
    square.velocity += 0.1; // Ajoute de la gravité
    square.y += square.velocity; // Mouvement vertical

    // Vérifier les collisions avec les bords du canvas
    // Collision avec le bas
    if (square.y + square.height > canvas.height) {
        square.y = canvas.height - square.height; // Réinitialiser la position au bas
        square.velocity *= bounce; // Inverser la direction et atténuer la vitesse pour un effet de rebond
        soundHit.currentTime = 0;
        soundHit.play();
        flash(colorSparks.hit);
        createSparksOnEdge(square, 'bottom');
        createCoin();
    }
    // Collision avec le haut
    if (square.y < 0) {
        square.y = 0; // Réinitialiser la position en haut
        square.velocity *= bounce; // Inverser la direction et atténuer la vitesse
        soundHit.currentTime = 0;
        soundHit.play();
        flash(colorSparks.hit);
        createSparksOnEdge(square, 'top'); 
        createCoin();
    }  
    // Collision avec le côté gauche
    if (square.x < 0) {
        square.x = 0; // Réinitialiser la position à gauche
        square.horizontalVelocity *= bounce; // Inverser la direction de la vitesse horizontale (optionnel)
        soundHit.currentTime = 0;
        soundHit.play();
        flash(colorSparks.hit);
        createSparksOnEdge(square, 'left');
        createCoin();
    }
    // Collision avec le côté droit
    if (square.x + square.width > canvas.width) {
        square.x = canvas.width - square.width; // Réinitialiser la position à droite
        square.horizontalVelocity *= bounce; // Inverser la direction de la vitesse horizontale (optionnel)
        soundHit.currentTime = 0;
        soundHit.play();
        flash(colorSparks.hit);
        createSparksOnEdge(square, 'right');
        createCoin();
    }

    // Déplacer les pièces si le mouvement est activé
    if (moveCoinsEnabled || currentLevel >= 5 ) {
    moveCoins();
    }
    
    // Gestion de la trainée
    trail.push({
        x: square.x,
        y: square.y,
        width: square.width,
        height: square.height,
        alpha: 0.1
    });
        if (trail.length > 10) trail.shift(); // Supprime les plus vieux

    // Gérer les mouvements à gauche et à droite
        if (keysPressed['a']) { // Aller à gauche
            square.horizontalVelocity -= 0.5;
        } 
            else if (keysPressed['d']) { // Aller à droite
            square.horizontalVelocity += 0.5;
        }

    //Gérer la montée / descente
        if (keysPressed['w']) { // Aller à gauche
            square.velocity -= 0.2;
        } 
            else if (keysPressed['s']) { // Aller à droite
            square.velocity += 0.5;
        }

    // Appliquer la vitesse horizontale pour déplacer le carré
        square.x += square.horizontalVelocity; 

    // Diminuer progressivement la vitesse horizontale de 5% chaque cycle
        square.horizontalVelocity *= 0.95;

    // Vérifiez les collisions avec les pièces d'or
        let coinsBefore = coins.length;
        checkCoinCollision();

    // Si on vient de collecter la dernière pièce
        if (coinsBefore > 0 && coins.length === 0 && !isGameWon) {
            if (currentLevel === 50 && bossPhase >= 6) {
                // Fin du niveau 50, boss vaincu
                isGameWon = true;
            } else {
                currentLevel++;
        
                if (currentLevel === 50) {
                    if (bossCoinCount === null) {
                        bossCoinCount = collectedCoins;
                        console.log(bossCoinCount);
                    }
                    showLevelUpText = true;
                    levelUpTextTimer = 400;
                    customLevelUpMessage = `Bravo, tu as collecté ${collectedCoins} pièces...\nRécupères les \navant que je ne t'attrape`;
                } else {
                    customLevelUpMessage = `Niveau ${currentLevel}`;
                    levelUpTextTimer = 90;
                }
        
                showLevelUpText = true;
                updateLevelDisplay();
        
                for (let i = 0; i < 5; i++) {
                    createCoin();
                }
        
                if (currentLevel >= 10) {
                    generateObstacles();
                }
        
                if (currentLevel >= 25 && currentLevel < 50) {
                    createCoin(true);
                }
            }
        }

    // Vérifier si le carré a atteint la taille du canvas
    if (isGameWon) {
        // Afficher le message de victoire
        isPaused = true;
        const endScreen = document.getElementById("endScreen");
        if (endScreen) endScreen.style.display = "flex";
    }
    
    // Générer les obstacles à partir du niveau 15 et check collision
    if (currentLevel >= 10 && currentLevel < 50) {
        if (currentLevel >= 15) {
            updateObstacles(); // Bouge les obstacles
        }

        if (currentLevel >= 45 && currentLevel <= 49) {
            obstacles = []; // vide les obstacles
            ghostObstacle.visible = false; // désactive le fantôme
            ghostObstacle.range = 0;
        }
        drawObstacles(); // Les affiche
        checkObstacleCollision(); // Et check les collisions
        if (currentLevel >= 35 && currentLevel <= 50) {
            updateGhostObstacle();
        }
    }

    // Générer l'obstacle tournant magnétique à partir du niveau 20
    if (currentLevel >= 20 && currentLevel < 45) {
        rotatingObstacle.angle += rotatingObstacle.speed;
    
        // Position autour du centre du canvas
        rotatingObstacle.x = canvas.width / 2 + rotatingObstacle.orbitRadius * Math.cos(rotatingObstacle.angle);
        rotatingObstacle.y = canvas.height / 2 + rotatingObstacle.orbitRadius * Math.sin(rotatingObstacle.angle);

        const dx = rotatingObstacle.x - (square.x + square.width / 2);
        const dy = rotatingObstacle.y - (square.y + square.height / 2);
        const distance = Math.sqrt(dx * dx + dy * dy);
    
        // Si on est dans une zone d'influence
        if (distance < 100) {
            const attractionStrength = 0.5; // ajuste la force
            const angle = Math.atan2(dy, dx);
    
            square.horizontalVelocity += Math.cos(angle) * attractionStrength;
            square.velocity += Math.sin(angle) * attractionStrength;
        }
    }

    // Générer l'obstacle fantome à partir du niveau 30
    if (currentLevel >= 30 && currentLevel < 50) {
        const dx = (square.x + square.width / 2) - (ghostObstacle.x + ghostObstacle.width / 2);
        const dy = (square.y + square.height / 2) - (ghostObstacle.y + ghostObstacle.height / 2);
        const distance = Math.sqrt(dx * dx + dy * dy);
        ghostObstacle.visible = distance < ghostObstacle.range;
    }

    if (currentLevel === 45) {
        const targetSize = 100;
        const growRate = 0.5;
    
        if (square.width < targetSize || square.height < targetSize) {
            square.width = Math.min(targetSize, square.width + growRate);
            square.height = Math.min(targetSize, square.height + growRate);
        }
    } else if (currentLevel >= 48 && currentLevel <= 49) {
        const minSize = 30;
        const shrinkRate = 0.05;
    
        if (square.width > minSize && square.height > minSize) {
            square.width -= shrinkRate;
            square.height -= shrinkRate;
        }
    }

    function updateBlackHoleParticles() {
        // Ajouter une nouvelle particule de temps en temps
        if (Math.random() < 0.5) {
            const angle = Math.random() * Math.PI * 2;
            const radius = 80 + Math.random() * 40; // plus large que l’obstacle
            blackHoleParticles.push({
                angle: angle,
                radius: radius,
                speed: 0.03 + Math.random() * 0.02,
                shrinkSpeed: 0.5 + Math.random() * 0.5,
                size: Math.random() * 2 + 1
            });
        }
    
        // Mise à jour des particules
        blackHoleParticles = blackHoleParticles.filter(p => p.radius > 5);
        blackHoleParticles.forEach(p => {
            p.angle += p.speed;
            p.radius -= p.shrinkSpeed;
        });
    }
    
    if (currentLevel >= 20 && currentLevel < 45) {
        updateBlackHoleParticles();
    }
        else {
            blackHoleParticles = [];
        }
};

////////////////// FIN UPDATE /////////////


// Gérer les événements des touches
document.addEventListener('keydown', function(event) {
    keysPressed[event.key] = true; // Marquer la touche comme enfoncée
});

document.addEventListener('keyup', function(event) {
    keysPressed[event.key] = false; // Marquer la touche comme relâchée
});

// Fonction de réinitialisation du jeu
document.getElementById('resetGame').addEventListener('click', function() {
    // Réinitialiser le carré
    square = {
        x: 400,
        y: 400,
        width: 40,
        height: 40,
        speed: 5,
        depth: 0,
        velocity: 0,
        horizontalVelocity: 0
    };

    // Reset des obstacles classiques
        rotatingObstacle = {
        radius: 20,
        orbitRadius: 150,
        angle: 0,
        speed: 0.02,
        x: 0,
        y: 0
    };

    // Reset de l'obstacle fantôme
        ghostObstacle = {
        x: canvas.width / 2 - 40,
        y: canvas.height / 2 - 40,
        width: 80,
        height: 80,
        dx: 2,
        dy: 2,
        visible: false,
        range: 200
    };

    // Reset complet du jeu
        isGameWon = false;
        isPaused = false;
        isBossIntro = false;
        tryAgain = false;
        bossPhase = 0;
        bossTimer = 0;
        blackHole = { x: canvas.width / 2, y: canvas.height / 2, radius: 0 };
        window.fakeBoss = null;
        suckedCoins = [];
        blackHoleParticles = [];

        currentLevel = 1;
        collectedCoins = 0;
        bossCoinCount = null;
        coins = [];
        trail = [];
        obstacles = [];
        particles = [];

    // Texte de niveau
        showLevelUpText = false;
        levelUpTextTimer = 0;
        customLevelUpMessage = '';
        levelUpOpacity = 0;

    // Affichage
        updateLevelDisplay();
        updateCoinCounter();

    for (let i = 0; i < 5; i++) {
        createCoin();
    }

    // Réactiver l'écran
        const endScreen = document.getElementById("endScreen");
        if (endScreen) endScreen.style.display = "none";
});

    function drawSuckedCoins() {
        if (bossPhase !== 2) return; // 👈 que pendant la phase d'aspiration
    
        suckedCoins.forEach(coin => {
            ctx.fillStyle = 'yellow';
            ctx.beginPath();
            ctx.arc(coin.x, coin.y, coin.size, 0, Math.PI * 2);
            ctx.fill();
        });
    }



// Boucle du jeu
function gameLoop() {
   
    // Fond dégradé
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#0f0c29');  // violet foncé
    gradient.addColorStop(0.5, '#302b63'); // indigo
    gradient.addColorStop(1, '#24243e');  // bleu foncé
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    drawTrail();
    drawSuckedCoins();
    drawsquare();
    drawCoins();
    drawLevelUpText();
    updateParticles();
    drawParticles();
    

    // Affiche le trou noir si on est en phase d’intro boss
    if (currentLevel === 50 && isBossIntro && bossPhase >= 2) {
        // Le trou noir reste affiché pendant toutes les phases après son apparition
        ctx.beginPath();
        ctx.arc(blackHole.x, blackHole.y, blackHole.radius, 0, Math.PI * 2);
        ctx.fillStyle = colorBlackHoleCore;
        ctx.shadowColor = colorBlackHoleShadow;
        ctx.shadowBlur = 20;
        ctx.fill();
        ctx.shadowBlur = 0;
    
        drawBlackHoleParticles(); // Garde les particules autour
    }

    // Particules autour du trou noir
    drawBlackHoleParticles();

    // Affiche le fake boss s’il est en train d’apparaître
    drawFakeBoss();

    // Affiche les éléments de gameplay normaux
    drawRotatingObstacle();
    drawGhostObstacle();

    if (!isPaused) {
        update();
    } else {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#fff';
        ctx.font = '48px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('PAUSE', canvas.width / 2, canvas.height / 2);
    }
        
    // Bordures néon synthwave
        ctx.strokeStyle = '#ff00cc'; // rose néon
        ctx.shadowColor = '#ff00cc';
        ctx.shadowBlur = 15;
        ctx.lineWidth = 4;
        ctx.strokeRect(0, 0, canvas.width, canvas.height);
    
        // Reset du shadow pour pas que ça bug les autres dessins
        ctx.shadowBlur = 0;
    requestAnimationFrame(gameLoop);
}

// Créer des pièces d'or initiales
for (let i = 0; i < 5; i++) {
    createCoin(); // Créer 5 pièces d'or au démarrage
    updateLevelDisplay();
}
// Écran de démarrage
document.getElementById('startBtn').addEventListener('click', () => {
    document.getElementById('startScreen').style.display = 'none';

    if (!isMusicPlaying) {
        music.play();
        isMusicPlaying = true;
        document.getElementById('toggleMusic').textContent = 'Couper la musique';
    }

    gameLoop(); // On lance ici seulement après le clic
});

document.getElementById("playAgainBtn").addEventListener("click", () => {
    document.getElementById("endScreen").style.display = "none";
    isPaused = false; 
    document.getElementById("resetGame").click(); // Clique sur le bouton restart
});

document.getElementById('toggleMusic').addEventListener('click', () => {
    if (isMusicPlaying) {
        music.pause();
        document.getElementById('toggleMusic').textContent = 'Reprendre la musique';
    } else {
        music.play();
        document.getElementById('toggleMusic').textContent = 'Couper la musique';
    }
    isMusicPlaying = !isMusicPlaying;
});

document.getElementById('toggleCheats').addEventListener('click', () => {
    const debugButtons = document.getElementById('leftButtons');
    const skipButtons = document.getElementById('rightButtons');
  
    const isVisible = debugButtons.style.display !== 'none';
    debugButtons.style.display = isVisible ? 'none' : 'flex';
    skipButtons.style.display = isVisible ? 'none' : 'flex';
  });