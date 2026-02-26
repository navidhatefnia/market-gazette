# 📰 The Market Gazette

A newspaper-style stock news dashboard powered by Claude AI + web search.
Fetches the latest headlines for your watchlist in real time.

**Live site:** `https://<your-github-username>.github.io/market-gazette/`

---

## 🚀 Local Development

### 1. Clone the repo
```bash
git clone https://github.com/<your-github-username>/market-gazette.git
cd market-gazette
```

### 2. Create your `.env` file
```bash
cp .env.example .env
```
Then edit `.env` and paste your Anthropic API key:
```
VITE_ANTHROPIC_API_KEY=sk-ant-...your-key-here...
```

> ⚠️ **Never commit `.env`** — it is already in `.gitignore`.

### 3. Install & run
```bash
npm install
npm run dev
```
Open [http://localhost:5173](http://localhost:5173).

---

## ☁️ GitHub Pages Deployment

### 1. Create the GitHub repository
- Go to [github.com/new](https://github.com/new)
- Name it `market-gazette`
- Keep it public (required for free GitHub Pages)
- **Don't** add README or .gitignore (you already have them)

### 2. Push the code
```bash
cd /path/to/market-gazette
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/<your-github-username>/market-gazette.git
git push -u origin main
```

### 3. Add your API key as a repository secret
1. Go to your repo on GitHub
2. Click **Settings → Secrets and variables → Actions**
3. Click **New repository secret**
4. Name: `ANTHROPIC_API_KEY`
5. Value: your `sk-ant-...` key
6. Click **Add secret**

### 4. Enable GitHub Pages
1. Go to **Settings → Pages**
2. Under **Source**, select **GitHub Actions**
3. Save

### 5. Trigger the first deployment
- Push any commit to `main`, **OR**
- Go to **Actions → Deploy Market Gazette to GitHub Pages → Run workflow**

After ~1-2 minutes, your app will be live at:
```
https://<your-github-username>.github.io/market-gazette/
```

---

## 🔧 Customise Your Watchlist

Edit the `stocks` object at the top of `src/App.jsx` to add, remove, or modify stocks.

---

## ⚠️ Disclaimer

For personal, informational use only. Not investment advice.
