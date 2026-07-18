# SellAuth Restock Bot

Polls the SellAuth API every 30 seconds and sends a Discord alert whenever a product's stock increases.

## Setup

1. **Copy the env template and fill in your credentials:**
   ```bash
   cp .env.example .env
   ```

   | Variable           | Where to find it |
   |--------------------|-----------------|
   | `DISCORD_TOKEN`    | [Discord Developer Portal](https://discord.com/developers/applications) → Bot → Reset Token |
   | `SELLAUTH_API_KEY` | SellAuth Dashboard → Settings → API |

2. **Invite the bot** to your server with the `Send Messages`, `Embed Links`, and `Mention Everyone` permissions.

3. **Start the bot:**
   ```bash
   pnpm --filter @workspace/discord-bot run dev
   ```

## How it works

- On startup, stock levels for all products are **seeded silently** (no alerts fired).
- Every **30 seconds** the bot fetches `https://api.sellauth.com/v1/shops/251017/products`.
- If any product's stock is **higher than the last recorded value**, a red embed is sent to channel `1527717007557005543` pinging role `1527716607781113866` with a **Buy Now** button linking to `https://nexus5.mysellauth.com`.
- Stock is held in memory — it resets if the bot restarts.

## Project structure

```
discord-bot/
├── src/
│   └── index.js    — bot entry point + polling loop
├── .env.example    — environment variable template
├── .env            — your credentials (git-ignored)
└── package.json
```
