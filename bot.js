const TelegramBot = require('node-telegram-bot-api');

// ⚠️ NOT SAFE — use only for testing
const token = "8708024661:AAHck_MSBLcIUV4IQsCsFETj6fVn7bE8lmI";

const bot = new TelegramBot(token, { polling: true });

const ADMIN_ID = 7855128004;

// 🌍 Storage
let numbersPool = {};

let adminState = null;
let selectedCountry = null;

//////////////////////////////////////////////////
// 🏠 ADMIN MENU
//////////////////////////////////////////////////

function adminMenu(chatId) {
  bot.sendMessage(chatId, "👑 ADMIN PANEL", {
    reply_markup: {
      keyboard: [
        ["📱 Add Number", "📋 View Numbers"],
        ["❌ Delete Number", "🌍 Countries"],
        ["➕ Add Country", "📥 Bulk Add"],
        ["🚀 Get Number"],
        ["⬅️ Back / Cancel"]
      ],
      resize_keyboard: true
    }
  });
}

bot.onText(/\/start/, (msg) => {
  if (msg.chat.id == ADMIN_ID) adminMenu(msg.chat.id);
});

//////////////////////////////////////////////////
// 🔢 GET FREE NUMBER
//////////////////////////////////////////////////

function getFreeNumber(country) {
  const list = numbersPool[country];
  if (!list) return null;

  const free = list.find(n => !n.used);
  if (!free) return null;

  free.used = true;
  return free.number;
}

//////////////////////////////////////////////////
// 🎛 MAIN HANDLER
//////////////////////////////////////////////////

bot.on('message', (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  if (chatId != ADMIN_ID) return;

  if (text === "⬅️ Back / Cancel") {
    reset();
    adminMenu(chatId);
    return;
  }

  if (adminState === "add_country") {
    if (!numbersPool[text]) {
      numbersPool[text] = [];
      bot.sendMessage(chatId, `✅ Country added: ${text}`);
    } else {
      bot.sendMessage(chatId, "⚠️ Already exists");
    }
    reset();
    adminMenu(chatId);
    return;
  }

  if (adminState === "add_number") {
    numbersPool[selectedCountry].push({
      number: text,
      used: false
    });

    bot.sendMessage(chatId, `✅ Added to ${selectedCountry}`);
    reset();
    adminMenu(chatId);
    return;
  }

  if (adminState === "bulk_add") {
    const numbers = text.split("\n");

    numbers.forEach(num => {
      if (num.trim()) {
        numbersPool[selectedCountry].push({
          number: num.trim(),
          used: false
        });
      }
    });

    bot.sendMessage(chatId, `✅ Bulk numbers added to ${selectedCountry}`);
    reset();
    adminMenu(chatId);
    return;
  }

  if (adminState === "delete_number") {
    const index = parseInt(text) - 1;

    if (numbersPool[selectedCountry][index]) {
      numbersPool[selectedCountry].splice(index, 1);
      bot.sendMessage(chatId, "✅ Deleted");
    } else {
      bot.sendMessage(chatId, "❌ Invalid index");
    }

    reset();
    adminMenu(chatId);
    return;
  }

  if (adminState === "choose_auto" && numbersPool[text]) {

    const number = getFreeNumber(text);

    if (!number) {
      bot.sendMessage(chatId, "❌ No free numbers available");
    } else {
      bot.sendMessage(chatId,
        `📱 Number Assigned:\n\n${number}\n\n✅ Marked as USED`
      );
    }

    reset();
    adminMenu(chatId);
    return;
  }

  if (text === "➕ Add Country") {
    adminState = "add_country";
    bot.sendMessage(chatId, "🌍 Enter country name:", backBtn());
  }

  else if (text === "📱 Add Number") {
    adminState = "choose_add";
    showCountries(chatId, "📱 Select country:");
  }

  else if (text === "📥 Bulk Add") {
    adminState = "choose_bulk";
    showCountries(chatId, "📥 Select country:");
  }

  else if (text === "📋 View Numbers") {
    adminState = "choose_view";
    showCountries(chatId, "📋 Select country:");
  }

  else if (text === "❌ Delete Number") {
    adminState = "choose_delete";
    showCountries(chatId, "❌ Select country:");
  }

  else if (text === "🚀 Get Number") {
    adminState = "choose_auto";
    showCountries(chatId, "🌍 Select country:");
  }

  else if (text === "🌍 Countries") {
    let list = "🌍 Countries:\n\n";

    Object.keys(numbersPool).forEach(c => {
      list += `• ${c} (${numbersPool[c].length})\n`;
    });

    bot.sendMessage(chatId, list || "No countries yet", backBtn());
  }

  else if (numbersPool[text]) {

    selectedCountry = text;

    if (adminState === "choose_add") {
      adminState = "add_number";
      bot.sendMessage(chatId, `📱 Send number for ${text}`, backBtn());
    }

    else if (adminState === "choose_bulk") {
      adminState = "bulk_add";
      bot.sendMessage(chatId,
        `📥 Send numbers (one per line) for ${text}`,
        backBtn()
      );
    }

    else if (adminState === "choose_view") {
      showNumbers(chatId, text);
      reset();
    }

    else if (adminState === "choose_delete") {
      showNumbers(chatId, text);
      adminState = "delete_number";
      bot.sendMessage(chatId, "❌ Send index:", backBtn());
    }
  }
});

function showNumbers(chatId, country) {
  const list = numbersPool[country];

  if (!list || list.length === 0) {
    bot.sendMessage(chatId, "❌ No numbers", backBtn());
    return;
  }

  let text = `📱 ${country} Numbers:\n\n`;

  list.forEach((obj, i) => {
    text += `${i + 1}. ${obj.number} → ${obj.used ? "❌ Used" : "✅ Free"}\n`;
  });

  bot.sendMessage(chatId, text, backBtn());
}

function showCountries(chatId, title) {
  const keys = Object.keys(numbersPool);

  if (keys.length === 0) {
    bot.sendMessage(chatId, "❌ No countries added yet", backBtn());
    return;
  }

  const buttons = keys.map(c => [c]);
  buttons.push(["⬅️ Back / Cancel"]);

  bot.sendMessage(chatId, title, {
    reply_markup: {
      keyboard: buttons,
      resize_keyboard: true
    }
  });
}

function backBtn() {
  return {
    reply_markup: {
      keyboard: [["⬅️ Back / Cancel"]],
      resize_keyboard: true
    }
  };
}

function reset() {
  adminState = null;
  selectedCountry = null;
}

console.log("🚀 Auto Assign Admin Bot Running...");
