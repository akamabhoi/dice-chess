# 🎲 Dice Chess ♟️

Welcome to **Dice Chess**, a real-time multiplayer take on the classic game of chess.

**[🕹️ PLAY THE GAME HERE!](https://dice-chess-nine.vercel.app)** 

---

## 🚀 How to Play Multiplayer
1. Open the [Live Website](https://dice-chess-nine.vercel.app).
2. Click **Create Game**.
3. You will be placed into a Lobby and assigned the White pieces.
4. An invite link will automatically appear in your URL bar. **Copy that link and send it to a friend!**
5. As soon as your friend opens the link, the game will automatically connect you both and start immediately!

---

## 🛠️ Technology Stack
This project is built using a modern, scalable split-stack architecture:

- **Frontend:** React, Vite (Hosted on Vercel)
- **Backend:** Node.js, Express, Socket.IO (Hosted on Railway)
- **Game Logic:** chess.js

---

## 💻 Running it Locally

If you'd like to run the game and server on your own machine:

1. **Clone the repository:**
   ```bash
   git clone https://github.com/akamabhoi/dice-chess.git
   cd dice-chess
   ```

2. **Install all dependencies:**
   ```bash
   # Install root dependencies
   npm install
   
   # Install backend dependencies
   cd server && npm install && cd ..
   
   # Install frontend dependencies
   cd client && npm install && cd ..
   ```

3. **Start the Development Servers:**
   ```bash
   npm run dev
   ```
   *(This instantly spins up the Node.js backend on Port 3000 and the Vite frontend on Port 5173).*

4. **Play!**
   Open `http://localhost:5173` in your browser. Open a second tab to test multiplayer joining!
