# 🎮 MAZE DOOM — Multijoueur Web FPS

Jeu de tir à la première personne (style Doom) dans un labyrinthe, multijoueur en réseau, conçu pour mobile.

## 🚀 Démarrage rapide

```bash
# 1. Installer les dépendances
npm install ws

# 2. Lancer le serveur
node server.js

# 3. Ouvrir dans le navigateur
http://localhost:8080
# ou sur votre réseau local :
http://VOTRE_IP:8080
```

## 🎮 Contrôles

### Mobile (recommandé en mode paysage)
| Contrôle | Action |
|---|---|
| Joystick gauche | Avancer / Reculer / Tourner |
| Glisser zone droite | Tourner la vue |
| Bouton FIRE | Tirer |

### Clavier (PC)
| Touche | Action |
|---|---|
| W / ↑ | Avancer |
| S / ↓ | Reculer |
| A / ← | Tourner gauche |
| D / → | Tourner droite |
| Espace / F | Tirer |

## 🗺️ Maps disponibles

| Map | Description |
|---|---|
| **Bunker** | Bunker militaire — couleurs vert kaki, couloirs étroits |
| **Labyrinthe** | Labyrinthe médiéval — tons brun/orange, très dense |
| **Arène** | Arène futuriste — bleu nuit, plus ouverte avec piliers |

## 🌐 Multijoueur

1. **Créer une partie** : Choisissez une map → "Créer la salle" → partagez le code 5 lettres
2. **Rejoindre** : "Rejoindre" → entrez le code → "Jouer"
3. **Lancer** : N'importe quel joueur peut appuyer sur "JOUER"

## ⚙️ Configuration

```bash
# Changer le port
PORT=3000 node server.js

# En production (avec reverse proxy nginx/caddy pour HTTPS)
# Le jeu utilise automatiquement wss:// si servi en HTTPS
```

## 📦 Stack technique
- **Serveur** : Node.js + ws (WebSocket)
- **Client** : HTML5 Canvas + Web Audio API (sons procéduraux)
- **Rendu** : Raycasting DDA (style Wolfenstein/Doom) en 320×200 pixels upscalés
- **Réseau** : WebSocket JSON (20Hz de sync de position)
- **Touches** : Multi-touch avec joystick virtuel

## 🎯 Mécaniques de jeu
- 25 PV par balle, 100 PV max
- Cadence de tir : ~2.6 coups/sec
- Respawn automatique après 3 secondes
- Détection de collision avec vérification de ligne de vue
- Minimap temps réel
- Kill feed avec scores
