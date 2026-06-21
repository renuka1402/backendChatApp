# ChatApp — React Native Assignment

Real-time chat application built with React Native (Expo) + Node.js + Socket.io + MongoDB.

---

##  Folder Structure

```
chatapp/
├── backend/          ← Node.js server
│   ├── server.js
│   ├── package.json
│   └── .env.example
└── mobile/           ← Expo React Native app
    ├── App.js
    ├── app.json
    ├── src/
    │   ├── screens/        ← LoginScreen, RegisterScreen, ChatScreen
    │   ├── components/     ← MessageBubble, SocketStatusBar
    │   ├── hooks/          ← useChat, useAuth
    │   ├── services/       ← auth.js, socket.js, database.js
    │   ├── utils/          ← constants.js
    │   └── navigation/     ← AppNavigator.js
    └── package.json
```

---

##  Chat History Approach

**Option A — expo-sqlite (Local Device Storage)**

Messages are saved to a local SQLite database on the device. On app reopen, history loads from SQLite. On logout, database is cleared.

---

##  Backend Setup & Deployment

### Step 1 — MongoDB Atlas (Free)
1. Go to [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas) → Create free account
2. Create a free cluster → Click **Connect** → **Drivers** → Copy the URI
3. It looks like: `mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/chatapp`

### Step 2 — Deploy to Railway (Free)
1. Go to [railway.app](https://railway.app) → Sign up with GitHub
2. Click **New Project** → **Deploy from GitHub repo** → Select your repo → choose `backend/` folder
3. Go to **Variables** tab → Add:
   ```
   MONGO_URI = your_mongodb_uri_here
   JWT_SECRET = any_random_secret_string_here
   PORT = 3000
   ```
4. Railway will give you a public URL like: `https://chat-backend-production.up.railway.app`

### Step 3 — Alternative: Deploy to Render (Free)
1. Go to [render.com](https://render.com) → New → Web Service → Connect GitHub
2. Root Directory: `backend`
3. Build Command: `npm install`
4. Start Command: `node server.js`
5. Add the same environment variables as above

### Local Development
```bash
cd backend
cp .env.example .env
# Fill in your MONGO_URI and JWT_SECRET in .env
npm install
npm run dev
```

---

##  Mobile App Setup

### Step 1 — Set Backend URL
Edit `mobile/src/utils/constants.js`:
```js
export const API_URL = "https://your-backend-url.railway.app"; // ← your URL here
```

### Step 2 — Install & Run
```bash
cd mobile
npm install
npx expo start
```

Then press `a` for Android emulator or scan QR with Expo Go app.

### Step 3 — Build APK
```bash
npm install -g eas-cli
eas login
eas build --platform android --profile preview
```
Download the APK from the EAS dashboard.

---

## Test Accounts

Use these accounts to test with two users simultaneously:

| Username | Password |
|----------|----------|
| `testuser1` | `password123` |
| `testuser2` | `password123` |

> **Note:** Register these accounts once using the Register screen, or create them via the API:
> ```bash
> curl -X POST https://your-backend.railway.app/auth/register \
>   -H "Content-Type: application/json" \
>   -d '{"username":"testuser1","password":"password123"}'
> ```

---

##  Live Backend URL

```
https://your-backend-url.railway.app
```
*(Replace with your actual deployed URL)*

---

##  Requirements Checklist

- [x] Custom app icon & splash screen
- [x] React Navigation Stack Navigator
- [x] Login screen with validation
- [x] Registration screen
- [x] JWT auth stored in AsyncStorage
- [x] Persistent login (stays logged in on app reopen)
- [x] Logout clears session + SQLite + disconnects socket
- [x] Socket.io real-time messaging
- [x] JWT passed on socket connect (unauthenticated connections rejected)
- [x] Sent messages on right, received on left
- [x] Sender name + timestamp on every message
- [x] FlatList auto-scrolls to latest message
- [x] Keyboard does not overlap input bar
- [x] Socket status indicator (connecting / reconnecting)
- [x] Chat history via expo-sqlite (Option A)
- [x] History cleared on logout
- [x] Clean folder structure: screens/, components/, hooks/, utils/, services/
- [x] No business logic in screen files

---

## 📹 Screen Recording

[Loom link here] ← Record two simulators side by side, log in as testuser1 and testuser2, send messages

---

## APK

[Download APK] ← Link to APK file or GitHub release
