import {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';
import axios from 'axios';

// ── Config ────────────────────────────────────────────────────────────────────
const SELLAUTH_API_URL = 'https://api.sellauth.com/v1/shops/251017/products';
const DISCORD_CHANNEL_ID = '1527717007557005543';
const PING_ROLE_ID      = '1527716607781113866';
const SHOP_BASE_URL     = 'https://nexus5.mysellauth.com';
const POLL_INTERVAL_MS  = 30_000;

// ── In-memory stock store  ────────────────────────────────────────────────────
// Map<productId, stockQuantity>
const previousStock = new Map();
let initialised = false; // skip alerts on the very first fetch

// ── Discord client ────────────────────────────────────────────────────────────
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// ── SellAuth polling ──────────────────────────────────────────────────────────
async function fetchProducts() {
  const { data } = await axios.get(SELLAUTH_API_URL, {
    headers: {
      Authorization: `Bearer ${process.env.SELLAUTH_API_KEY}`,
    },
  });

  // API may return { data: [...] } or a plain array — handle both
  return Array.isArray(data) ? data : (data.data ?? []);
}

async function checkRestock() {
  let products;
  try {
    products = await fetchProducts();
  } catch (err) {
    console.error('[Poll] Failed to fetch products:', err.message);
    return;
  }

  for (const product of products) {
    const id    = String(product.id);
    const name  = product.title ?? product.name ?? `Product #${id}`;
    const stock = product.stock_count != null
      ? Number(product.stock_count)
      : (product.variants ?? []).reduce((sum, v) => sum + Number(v.stock ?? 0), 0);
    const prev  = previousStock.get(id) ?? 0;

    previousStock.set(id, stock);

    if (!initialised) continue; // seed only on first run

    if (stock > prev) {
      console.log(`[Restock] ${name}: ${prev} → ${stock}`);
      await sendRestockAlert(name, product, prev, stock);
    }
  }

  if (!initialised) {
    initialised = true;
    console.log(`[Poll] Seeded stock for ${products.length} product(s). Monitoring...`);
  }
}

// ── Discord alert ─────────────────────────────────────────────────────────────
async function sendRestockAlert(name, product, prevStock, newStock) {
  const channel = await client.channels.fetch(DISCORD_CHANNEL_ID);
  if (!channel?.isTextBased()) {
    console.error('[Alert] Channel not found or not text-based.');
    return;
  }

  const price   = product.variants?.[0]?.price ?? 'N/A';
  const added   = newStock - prevStock;
  const imageUrl = product.images?.[0]?.url ?? product.image_url ?? product.image ?? null;

  const embed = new EmbedBuilder()
    .setColor(0xff2d2d)
    .setTitle(`<a:notificationbell:1526892504031563846> **${name} RESTOCKED!**`)
    .addFields(
      { name: '<:ns_product:1523225961401942047> PRODUCT', value: `\`\`\`${name}\`\`\``,              inline: false },
      { name: '<:ns_buy:1525692198379847873> PRICE',       value: `\`\`\`${Number(price).toFixed(2)}\`\`\``, inline: false },
      { name: '<:ns_rules:1523225693935374487> STOCK',     value: `\`\`\`${newStock} units\`\`\``,    inline: false },
      { name: '<:ns_like:1525692129622364271> ADDED',      value: `\`\`\`+${added} units\`\`\``,      inline: false },
    )
    .setTimestamp()
    .setFooter({
      text: 'Nexus Shop • Automated Restock',
      iconURL: client.user.displayAvatarURL(),
    });

  if (imageUrl) embed.setImage(imageUrl);

  const productUrl = product.path ? `${SHOP_BASE_URL}/${product.path}` : SHOP_BASE_URL;

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setLabel('BUY NOW')
      .setStyle(ButtonStyle.Link)
      .setURL(productUrl)
      .setEmoji('🛒'),
  );

  await channel.send({
    content: `<@&${PING_ROLE_ID}>`,
    embeds: [embed],
    components: [row],
  });
}

// ── Start ─────────────────────────────────────────────────────────────────────
client.once('ready', () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
  console.log(`🔄 Polling every ${POLL_INTERVAL_MS / 1000}s — channel ${DISCORD_CHANNEL_ID}`);

  checkRestock();
  setInterval(checkRestock, POLL_INTERVAL_MS);
});

client.login(process.env.DISCORD_TOKEN);
