const TelegramBot = require('node-telegram-bot-api');

// ⚠️ DEMO TOKEN (NOT SAFE — CHANGE LATER)
const token = "8618485907:AAE5xSlFJFM556vRcZBvTP2vAG8YTOT0_UI";

const bot = new TelegramBot(token, { polling: true });

const ADMIN_ID = 8065726393;

// 🌍 STORAGE
let numbersPool = {};

// STATE
let adminState = null;
let selectedCountry = null;

//////////////////////////////////////////////////
// ✨ ANIMATION SYSTEM
//////////////////////////////////////////////////

function typing(chatId) {
  bot.sendChatAction(chatId, "typing");
}

async function loading(chatId, text = "Processing...") {
  const msg = await bot.sendMessage(chatId, "⏳ " + text);
  await new Promise(r => setTimeout(r, 700));
  await bot.editMessageText("⌛ Almost done...", {
    chat_id: chatId,
    message_id: msg.message_id
  });
  await new Promise(r => setTimeout(r, 700));
  return msg.message_id;
}

//////////////////////////////////////////////////
// 🏠 MAIN MENU
//////////////////////////////////////////////////

function mainMenu(chatId) {
  bot.sendMessage(chatId, "👑 CONTROL PANEL", {
    reply_markup: {
      keyboard: [
        ["🛒 Buy Number"],
        ["📱 Add Number", "📋 View Numbers"],
        ["❌ Delete Number", "🌍 Countries"],
        ["➕ Add Country", "📥 Bulk Add"],
        ["♻️ Mark Free"],
        ["⬅️ Back / Cancel"]
      ],
      resize_keyboard: true
    }
  });
}

bot.onText(/\/start/, (msg) => {
  if (msg.chat.id == ADMIN_ID) {
    mainMenu(msg.chat.id);
  } else {
    bot.sendMessage(msg.chat.id, "⛔ Access Denied (Admin Only)");
  }
});

//////////////////////////////////////////////////
// 🔢 GET FREE NUMBER
//////////////////////////////////////////////////

function getFreeNumber(country) {
  const list = numbersPool[country]?.numbers;
  if (!list) return null;

  const free = list.find(n => !n.used);
  if (!free) return null;

  free.used = true;
  return free.number;
}

//////////////////////////////////////////////////
// 🎛 HANDLER
//////////////////////////////////////////////////

bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  // 🔒 ADMIN LOCK
  if (chatId != ADMIN_ID) {
    bot.sendMessage(chatId, "⛔ You are not authorized.");
    return;
  }

  // 🔙 BACK
  if (text === "⬅️ Back / Cancel") {
    reset();
    mainMenu(chatId);
    return;
  }

  //////////////////////////////////////////////////
  // 🛒 BUY FLOW
  //////////////////////////////////////////////////

  if (text === "🛒 Buy Number") {
    adminState = "buy_choose_country";
    showCountries(chatId, "🌍 Select country to buy:");
    return;
  }

  if (adminState === "buy_choose_country" && numbersPool[text]) {

    typing(chatId);
    const msgId = await loading(chatId, "Finding number...");

    const number = getFreeNumber(text);

    if (!number) {
      bot.editMessageText("❌ No free numbers available", {
        chat_id: chatId,
        message_id: msgId
      });
    } else {
      bot.editMessageText(
        `✨ NUMBER PURCHASED\n\n📱 ${number}\n💰 ₹${numbersPool[text].price}\n\n✔️ Assigned`,
        {
          chat_id: chatId,
          message_id: msgId
        }
      );
    }

    reset();
    return;
  }

  //////////////////////////////////////////////////
  // ➕ ADD COUNTRY
  //////////////////////////////////////////////////

  if (adminState === "add_country") {
    const parts = text.split(" ");
    const price = parseInt(parts.pop());
    const name = parts.join(" ");

    if (!name || isNaN(price)) {
      bot.sendMessage(chatId, "❌ Format: India 20", backBtn());
      return;
    }

    typing(chatId);
    const msgId = await loading(chatId, "Adding country...");

    if (!numbersPool[name]) {
      numbersPool[name] = { price, numbers: [] };
      bot.editMessageText(`✅ ${name} added ₹${price}`, {
        chat_id: chatId,
        message_id: msgId
      });
    } else {
      bot.editMessageText("⚠️ Already exists", {
        chat_id: chatId,
        message_id: msgId
      });
    }

    reset();
    return;
  }

  //////////////////////////////////////////////////
  // 📱 ADD NUMBER
  //////////////////////////////////////////////////

  if (adminState === "add_number") {
    typing(chatId);
    const msgId = await loading(chatId, "Saving number...");

    numbersPool[selectedCountry].numbers.push({
      number: text,
      used: false
    });

    bot.editMessageText("✅ Number added", {
      chat_id: chatId,
      message_id: msgId
    });

    reset();
    return;
  }

  //////////////////////////////////////////////////
  // 📥 BULK ADD
  //////////////////////////////////////////////////

  if (adminState === "bulk_add") {
    typing(chatId);
    const msgId = await loading(chatId, "Uploading numbers...");

    text.split("\n").forEach(n => {
      if (n.trim()) {
        numbersPool[selectedCountry].numbers.push({
          number: n.trim(),
          used: false
        });
      }
    });

    bot.editMessageText("✅ Bulk upload done", {
      chat_id: chatId,
      message_id: msgId
    });

    reset();
    return;
  }

  //////////////////////////////////////////////////
  // ❌ DELETE
  //////////////////////////////////////////////////

  if (adminState === "delete_number") {
    const index = parseInt(text) - 1;

    typing(chatId);
    const msgId = await loading(chatId, "Deleting...");

    if (numbersPool[selectedCountry].numbers[index]) {
      numbersPool[selectedCountry].numbers.splice(index, 1);
      bot.editMessageText("🗑 Deleted", {
        chat_id: chatId,
        message_id: msgId
      });
    } else {
      bot.editMessageText("❌ Invalid index", {
        chat_id: chatId,
        message_id: msgId
      });
    }

    reset();
    return;
  }

  //////////////////////////////////////////////////
  // ♻️ MARK FREE
  //////////////////////////////////////////////////

  if (adminState === "mark_free") {
    const index = parseInt(text) - 1;

    typing(chatId);
    const msgId = await loading(chatId, "Updating...");

    const list = numbersPool[selectedCountry].numbers;

    if (list[index]) {
      list[index].used = false;
      bot.editMessageText("♻️ Now FREE", {
        chat_id: chatId,
        message_id: msgId
      });
    } else {
      bot.editMessageText("❌ Invalid", {
        chat_id: chatId,
        message_id: msgId
      });
    }

    reset();
    return;
  }

  //////////////////////////////////////////////////
  // BUTTONS
  //////////////////////////////////////////////////

  if (text === "➕ Add Country") {
    adminState = "add_country";
    bot.sendMessage(chatId, "🌍 Send: Country Price", backBtn());
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

  else if (text === "♻️ Mark Free") {
    adminState = "choose_mark";
    showCountries(chatId, "♻️ Select county:");
  }

  else if (text === "🌍 Countries") {
    let list = "🌍 Countries:\n\n";
    Object.keys(numbersPool).forEach(c => {
      list += `• ${c} ₹${numbersPool[c].price} (${numbersPool[c].numbers.length})\n`;
    });
    bot.sendMessage(chatId, list, backBtn());
  }

  //////////////////////////////////////////////////
  // COUNTRY SELECT
  //////////////////////////////////////////////////

  else if (numbersPool[text]) {

    selectedCountry = text;

    if (adminState === "choose_add") {
      adminState = "add_number";
      bot.sendMessage(chatId, "📱 Send number:", backBtn());
    }

    else if (adminState === "choose_bulk") {
      adminState = "bulk_add";
      bot.sendMessage(chatId, "📥 Send numbers:", backBtn());
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

    else if (adminState === "choose_mark") {
      showNumbers(chatId, text);
      adminState = "mark_free";
      bot.sendMessage(chatId, "♻️ Send index:", backBtn());
    }
  }
});

//////////////////////////////////////////////////
// 📋 SHOW NUMBERS
//////////////////////////////////////////////////

function showNumbers(chatId, country) {
  const list = numbersPool[country].numbers;

  if (!list.length) {
    bot.sendMessage(chatId, "❌ No numbers", backBtn());
    return;
  }

  let text = `📱 ${country}:\n\n`;

  list.forEach((n, i) => {
    text += `${i + 1}. ${n.number} → ${n.used ? "❌ Used" : "✅ Free"}\n`;
  });

  bot.sendMessage(chatId, text, backBtn());
}

//////////////////////////////////////////////////
// 🌍 SHOW COUNTRIES
//////////////////////////////////////////////////

function showCountries(chatId, title) {
  const keys = Object.keys(numbersPool);

  if (!keys.length) {
    bot.sendMessage(chatId, "❌ No countries", backBtn());
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

//////////////////////////////////////////////////
// 🔙 BACK BTN
//////////////////////////////////////////////////

function backBtn() {
  return {
    reply_markup: {
      keyboard: [["⬅️ Back / Cancel"]],
      resize_keyboard: true
    }
  };
}

//////////////////////////////////////////////////
// 🔄 RESET
//////////////////////////////////////////////////

function reset() {
  adminState = null;
  selectedCountry = null;
}

//////////////////////////////////////////////////

console.log("🚀 PRO ANIMATED ADMIN BOT RUNNING...");
