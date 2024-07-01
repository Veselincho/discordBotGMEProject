const fetch = require("node-fetch");
const cheerio = require("cheerio");
const { Client, GatewayIntentBits, ActivityType } = require("discord.js");
const dotenv = require('dotenv');
dotenv.config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

let adaPrice = "";
let adaPriceActivity = "";
let cooldown = false;

const adaGmeUrl = process.env.adaGmeUrl
const marketStateUrl = process.env.marketStateUrl
const volumeUrl =process.env.volumeUrl
const solanaUrl =process.env.solanaUrl
const ethUrl =process.env.ethUrl
const gmePriceUrl =process.env.gmePriceUrl

const updateInterval = 60000;
const cooldownTime = 5000;

client.on("ready", async (c) => {
  console.log(`${c.user.tag} is online.`);
  await updateActivity();
  setInterval(updateActivity, updateInterval);
});

client.on("messageCreate", async (message) => {
  if (cooldown) {
    return;
  }

  if (message.content === "/price") {
    cooldown = true;
    setTimeout(() => {
      cooldown = false;
    }, cooldownTime);

    const { stateMarket, timeToOpen, timeToClose } = await fetchMarketState();
    const solanaData = await solanaChart();
    const ethData = await ethChart();
    const { volumeData } = await getVolume();
    await getAdaPrice();

    const marketStatusMessage = stateMarket
      ? `⦿ NYSE market status: OPEN. Time to close: ${timeToClose}`
      : `⦿ NYSE market status: CLOSED. Time to open: ${timeToOpen}`;

    const response = await fetch(gmePriceUrl);
    const data = await response.json();
    const currentPriceUSD = data.price;
    const formattedPrice = parseFloat(currentPriceUSD).toFixed(2);

    const averageVolume = Number(volumeData.average_volume).toLocaleString();
    const volume = Number(volumeData.volume).toLocaleString()

    //  message.channel.send(marketStatusMessage);
    message.channel.send(`${marketStatusMessage}\n
      ⌚Real Time Prices:\nGameStop Corporation current price is: $${formattedPrice} USD\n\n    ⛃ crypto tokens:\n➼   ADA $GME price: $${adaPrice} ₳\n➼   SOL $GME price: $${solanaData.gme.usd.toFixed(
        6,
      )} ◎\n➼   ETH $GME price: $${ethData["game-stop"]["usd"].toFixed(6)} Ξ\n\n    📊 Volume: ${volume} || Average Volume: ${averageVolume} at ${volumeData.datetime}
      
      `);
  }

  if (
    message.content.toLowerCase() === "gme" ||
    message.content.toLowerCase() === "gme!"
  ) {
    message.channel.send("GME buddy! ^^");
  }
});

async function updateActivity() {
  await getAdaPrice();
  client.user.setActivity({
    type: ActivityType.Custom,
    name: `📈 ${adaPriceActivity}`,
  });
}

async function getAdaPrice() {
  const response = await fetch(adaGmeUrl);
  const body = await response.text();
  const $ = cheerio.load(body);
  const titleElement = $("head > title").text();
  const priceMatch = titleElement.match(/^(\d+\.\d+)/);

  adaPrice = priceMatch[1];
  adaPriceActivity = priceMatch[1];
}

async function fetchMarketState() {
  const responseMarket = await fetch(marketStateUrl);
  const dataMarket = await responseMarket.json();
  const stateMarket = dataMarket[0].is_market_open;
  const timeToOpen = dataMarket[0].time_to_open;
  const timeToClose = dataMarket[0].time_to_close;

  return { stateMarket, timeToOpen, timeToClose };
}

async function getVolume() {
  const volumeResponse = await fetch(volumeUrl);
  const volumeData = await volumeResponse.json();

  return { volumeData };
}

async function solanaChart() {
  const solanaResponse = await fetch(solanaUrl);
  const solanaData = await solanaResponse.json();

  return solanaData;
}

async function ethChart() {
  const ethResponse = await fetch(ethUrl);
  const ethData = await ethResponse.json();

  return ethData;
}

client.login(process.env.discordToken);