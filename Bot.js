const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');

// 🔐 SAFE TOKEN (Railway variable)
const token = process.env.BOT_TOKEN;

if (!token) {
  console.log("❌ BOT_TOKEN not found!");
  process.exit(1);
}

const bot = new TelegramBot(token, { polling: true });

const ADMIN_ID = 7855128004;

// 📁 FILE STORAGE
const DATA_FILE = "data.json";

// 🌍 Load data
let numbersPool = {};
try {
  if (fs.existsSync(DATA_FILE)) {
    numbersPool = JSON.parse(fs.readFileSync(DATA_FILE));
  }
} catch (e) {
  console.log("Error loading data:", e);
}

// 💾 Save function
function saveData() {
  fs.writeFileSync(DATA_FILE, JSON.stringify(numbersPool, null, 2));
}

let adminState = null;
let selectedCountry = null;

//////////////////////////////////////////////////
// 🏠 ADMIN MENU
//////////////////////////////////////////////////

function adminMenu(chatId) {
  if (chatId != ADMIN_ID) return;

  bot.sendMessage(chatId, "👑 ADMIN PANEL", {
    reply_markup: {
      keyboard: [
        ["📱 Add Number", "📋 View Numbers"],
        ["❌ Delete Number", "🌍 Countries"],
        ["➕ Add Country"]
      ],
      resize_keyboard: true
    }
  });
}

bot.onText(/\/start/, (msg) => {
  if (msg.chat.id == ADMIN_ID) adminMenu(msg.chat.id);
});

//////////////////////////////////////////////////
// 🎛 HANDLER
//////////////////////////////////////////////////

bot.on('message', (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  if (chatId != ADMIN_ID) return;

  //////////////////////////////////////////////////
  // ➕ ADD COUNTRY
  //////////////////////////////////////////////////

  if (adminState === "add_country") {
    if (!numbersPool[text]) {
      numbersPool[text] = [];
      saveData();
      bot.sendMessage(chatId, `✅ Country added: ${text}`);
    } else {
      bot.sendMessage(chatId, "⚠️ Already exists");
    }
    reset();
    return;
  }

  //////////////////////////////////////////////////
  // 📱 ADD NUMBER
  //////////////////////////////////////////////////

  if (adminState === "add_number") {
    numbersPool[selectedCountry].push(text);
    saveData();
    bot.sendMessage(chatId, `✅ Added to ${selectedCountry}`);
    reset();
    return;
  }

  //////////////////////////////////////////////////
  // ❌ DELETE
  //////////////////////////////////////////////////

  if (adminState === "delete_number") {
    const index = parseInt(text) - 1;

    if (numbersPool[selectedCountry][index]) {
      numbersPool[selectedCountry].splice(index, 1);
      saveData();
      bot.sendMessage(chatId, "✅ Deleted");
    } else {
      bot.sendMessage(chatId, "❌ Invalid index");
    }

    reset();
    return;
  }

  //////////////////////////////////////////////////
  // BUTTONS
  //////////////////////////////////////////////////

  if (text === "➕ Add Country") {
    adminState = "add_country";
    bot.sendMessage(chatId, "Enter country name:");
  }

  else if (text === "📱 Add Number") {
    adminState = "choose_add";
    showCountries(chatId, "Select country:");
  }

  else if (text === "📋 View Numbers") {
    adminState = "choose_view";
    showCountries(chatId, "Select country:");
  }

  else if (text === "❌ Delete Number") {
    adminState = "choose_delete";
    showCountries(chatId, "Select country:");
  }

  else if (text === "🌍 Countries") {
    let list = "🌍 Countries:\n\n";

    Object.keys(numbersPool).forEach(c => {
      list += `• ${c} (${numbersPool[c].length})\n`;
    });

    bot.sendMessage(chatId, list || "No countries yet");
  }

  //////////////////////////////////////////////////
  // COUNTRY SELECT
  //////////////////////////////////////////////////

  else if (numbersPool[text]) {

    selectedCountry = text;

    if (adminState === "choose_add") {
      adminState = "add_number";
      bot.sendMessage(chatId, `Send number for ${text}`);
    }

    else if (adminState === "choose_view") {
      showNumbers(chatId, text);
      reset();
    }

    else if (adminState === "choose_delete") {
      showNumbers(chatId, text);
      adminState = "delete_number";
      bot.sendMessage(chatId, "Send index to delete:");
    }
  }
});

//////////////////////////////////////////////////
// 📋 SHOW NUMBERS
//////////////////////////////////////////////////

function showNumbers(chatId, country) {
  const list = numbersPool[country];

  if (!list || list.length === 0) {
    bot.sendMessage(chatId, "❌ No numbers");
    return;
  }

  let text = `📱 ${country} Numbers:\n\n`;

  list.forEach((num, i) => {
    text += `${i + 1}. ${num}\n`;
  });

  bot.sendMessage(chatId, text);
}

//////////////////////////////////////////////////
// 🌍 SHOW COUNTRIES
//////////////////////////////////////////////////

function showCountries(chatId, title) {
  const keys = Object.keys(numbersPool);

  if (keys.length === 0) {
    bot.sendMessage(chatId, "❌ No countries added yet");
    return;
  }

  const buttons = keys.map(c => [c]);

  bot.sendMessage(chatId, title, {
    reply_markup: {
      keyboard: buttons,
      resize_keyboard: true
    }
  });
}

//////////////////////////////////////////////////
// 🔄 RESET
//////////////////////////////////////////////////

function reset() {
  adminState = null;
  selectedCountry = null;
}

//////////////////////////////////////////////////

console.log("🌍 Production Admin Bot Running...");
