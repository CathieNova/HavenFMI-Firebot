const fs = require("fs");
const http = require("http");
const https = require("https");

const SCRIPT_ID = "haven-minecraft-integration";
const SCRIPT_NAME = "Haven Minecraft Integration";
const CONFIG_FILE = "config.json";
const QUEST_CACHE_FILE = "quest-cache.json";
const QUEST_PRESET_FIELDS = [
    "questName",
    "questId",
    "viewerName",
    "hasReward",
    "randomReward",
    "rewards",
    "objectives",
    "displayMode"
];
const QUEST_TYPES = [
    "Walk Distance",
    "Sprint Distance",
    "Swim Distance",
    "Jump Count",
    "Kill Any Mob",
    "Kill Specific Mob",
    "Mine Any Block",
    "Mine Specific Block",
    "Craft Any Item X Times",
    "Craft Specific Item X Times",
    "Craft Any Item Amount",
    "Craft Specific Item Amount",
    "Pick Up Any Item",
    "Pick Up Specific Item",
    "Deal Damage",
    "Deal Damage to Specific Mob",
    "Take Damage"
];
const QUEST_DISPLAY_MODES = ["None", "Client Overlay"];
const QUEST_EVENT_IDS = ["quest-started", "quest-progress", "quest-completed", "quest-abandoned"];
const MINECRAFT_EVENT_IDS = ["bridge-message", "player-died", ...QUEST_EVENT_IDS];
const QUEST_REWARD_VISIBILITY = ["Show Rewards", "Hide Until Completed", "Hide Until Claimed"];
const MINECRAFT_COLORS = ["black", "dark_blue", "dark_green", "dark_aqua", "dark_red", "dark_purple", "gold", "gray", "dark_gray", "blue", "green", "aqua", "red", "light_purple", "yellow", "white"];
const BOSSBAR_COLORS = ["Purple", "Blue", "Green", "Yellow", "Red", "White"];
const BOSSBAR_STYLES = ["Progress", "Notched 6", "Notched 10", "Notched 12", "Notched 20"];

const COLOR_CODE_EXAMPLES = [
    { label: "Black", value: "&0" },
    { label: "Dark Blue", value: "&1" },
    { label: "Dark Green", value: "&2" },
    { label: "Dark Aqua", value: "&3" },
    { label: "Dark Red", value: "&4" },
    { label: "Dark Purple", value: "&5" },
    { label: "Gold", value: "&6" },
    { label: "Gray", value: "&7" },
    { label: "Dark Gray", value: "&8" },
    { label: "Blue", value: "&9" },
    { label: "Green", value: "&a" },
    { label: "Aqua", value: "&b" },
    { label: "Red", value: "&c" },
    { label: "Light Purple", value: "&d" },
    { label: "Yellow", value: "&e" },
    { label: "White", value: "&f" },
    { label: "Random Magic Text", value: "&k" },
    { label: "Bold Text", value: "&l" },
    { label: "Strikethrough Text", value: "&m" },
    { label: "Underline Text", value: "&n" },
    { label: "Italic Text", value: "&o" },
    { label: "Reset Color Code", value: "&r" },
    
    { label: "Example", note: "Works in fields that say they support color codes.", value: "&6CathieNova&r: &fJust a simple message." }
];
const BOSSBAR_STYLE_INFO = [
    { label: "Progress", note: "Smooth bar with no dividers.", value: "Best for normal percentage progress." },
    { label: "Notched 6", note: "Splits the bar into 6 chunks.", value: "Good for 6-step goals." },
    { label: "Notched 10", note: "Splits the bar into 10 chunks.", value: "Good for 10% steps." },
    { label: "Notched 12", note: "Splits the bar into 12 chunks.", value: "Good for 12-step goals." },
    { label: "Notched 20", note: "Splits the bar into 20 chunks.", value: "Good for detailed progress." }
];
const QUEST_OBJECTIVE_EXAMPLES = {
    "Walk Distance": [
        { label: "Short walk", note: "Counts normal walking only.", value: "Blocks To Travel: 500" },
        { label: "Long walk", note: "Good for longer viewer goals.", value: "Blocks To Travel: 2500" }
    ],
    "Sprint Distance": [
        { label: "Sprint goal", note: "Counts sprinting distance.", value: "Blocks To Travel: 400" }
    ],
    "Swim Distance": [
        { label: "Swim goal", note: "Counts swimming distance.", value: "Blocks To Travel: 200" }
    ],
    "Jump Count": [
        { label: "Jump goal", note: "Counts player jumps.", value: "Jumps Needed: 50" }
    ],
    "Kill Any Mob": [
        { label: "Any mobs", note: "Every mob kill counts.", value: "Mobs To Kill: 10" }
    ],
    "Kill Specific Mob": [
        { label: "Single mob", note: "Only zombies count.", value: "Mobs To Kill: 10\nMob IDs: minecraft:zombie" },
        { label: "Mob tag", note: "Any mob in the tag counts.", value: "Mobs To Kill: 5\nMob IDs: #minecraft:raiders" },
        { label: "Named event mob", note: "Only mobs with matching data count.", value: "Mobs To Kill: 1\nMob IDs: minecraft:skeleton | {Tags:[\"Viewer Spawn\"],CustomName:'{\"text\":\"$userDisplayName\"}'}" }
    ],
    "Mine Any Block": [
        { label: "Any block", note: "Every mined block counts.", value: "Blocks To Mine: 64" }
    ],
    "Mine Specific Block": [
        { label: "Single block", note: "Only stone counts.", value: "Blocks To Mine: 64\nBlock IDs: minecraft:stone" },
        { label: "Block tag", note: "Any block in the tag counts.", value: "Blocks To Mine: 32\nBlock IDs: #minecraft:logs" }
    ],
    "Craft Any Item X Times": [
        { label: "Craft actions", note: "One craft action counts as 1, even if the recipe outputs more than 1 item.", value: "Crafts Needed: 10" }
    ],
    "Craft Specific Item X Times": [
        { label: "Craft specific action", note: "Counts craft actions for the item.", value: "Crafts Needed: 5\nItem IDs: minecraft:torch" }
    ],
    "Craft Any Item Amount": [
        { label: "Crafted output", note: "Counts the number of crafted items produced.", value: "Items To Craft: 64" }
    ],
    "Craft Specific Item Amount": [
        { label: "Craft specific output", note: "Counts the number of matching items produced.", value: "Items To Craft: 64\nItem IDs: minecraft:stick" }
    ],
    "Pick Up Any Item": [
        { label: "Any pickup", note: "Every dropped item picked up counts.", value: "Items To Pick Up: 20" }
    ],
    "Pick Up Specific Item": [
        { label: "Specific pickup", note: "Only matching dropped items count.", value: "Items To Pick Up: 16\nItem IDs: minecraft:diamond" },
        { label: "Item tag", note: "Any item in the tag counts.", value: "Items To Pick Up: 32\nItem IDs: #minecraft:wool" }
    ],
    "Deal Damage": [
        { label: "Any damage dealt", note: "Damage to any target counts.", value: "Damage To Deal: 100" },
        { label: "Sword damage", note: "Only damage while holding a sword counts.", value: "Damage To Deal: 50\nUse Specific Damage Filter: On\nDamage Filter: Holding Sword" }
    ],
    "Deal Damage to Specific Mob": [
        { label: "Damage zombies", note: "Only damage dealt to zombies counts.", value: "Damage To Deal: 80\nMob IDs: minecraft:zombie" },
        { label: "Damage tagged mobs", note: "Only damage dealt to matching event mobs counts.", value: "Damage To Deal: 40\nMob IDs: minecraft:skeleton | {Tags:[\"Viewer Spawn\"]}" }
    ],
    "Take Damage": [
        { label: "Any damage taken", note: "Any damage to the player counts.", value: "Damage To Take: 20" },
        { label: "Fall damage", note: "Only fall damage counts.", value: "Damage To Take: 10\nUse Specific Damage Filter: On\nDamage Filter: Fall" }
    ]
};

const QUEST_OBJECTIVE_EXAMPLES_2612 = {
    ...QUEST_OBJECTIVE_EXAMPLES,
    "Kill Specific Mob": [
        { label: "Single mob", note: "Only zombies count.", value: "Mobs To Kill: 10\nMob IDs: minecraft:zombie" },
        { label: "Mob tag", note: "Any mob in the tag counts.", value: "Mobs To Kill: 5\nMob IDs: #minecraft:raiders" },
        { label: "Named event mob", note: "Only mobs with matching data count.", value: "Mobs To Kill: 1\nMob IDs: minecraft:skeleton | {Tags:[\"Viewer Spawn\"],CustomName:{text:'$userDisplayName'}}" }
    ]
};

const QUEST_ITEM_REWARD_EXAMPLES_1192 = [
    { label: "Named item", note: "Put this in Item Data.", value: "{display:{Name:'{\"text\":\"Viewer Stick\",\"color\":\"gold\"}'}}" },
    { label: "Lore", note: "Put this in Item Data.", value: "{display:{Lore:['{\"text\":\"Redeemed on stream\",\"color\":\"gray\"}']}}" },
    { label: "Enchantment", note: "Put this in Item Data.", value: "{Enchantments:[{id:\"minecraft:unbreaking\",lvl:3s}]}" },
    { label: "Named enchanted item", note: "Put this in Item Data.", value: "{display:{Name:'{\"text\":\"Viewer Pickaxe\",\"color\":\"aqua\"}'},Enchantments:[{id:\"minecraft:efficiency\",lvl:5s}]}" }
];

const QUEST_ITEM_REWARD_EXAMPLES_1201 = [
    { label: "Named item", note: "Put this in Item Data.", value: "{display:{Name:'{\"text\":\"Viewer Stick\",\"color\":\"gold\"}'}}" },
    { label: "Lore", note: "Put this in Item Data.", value: "{display:{Lore:['{\"text\":\"Redeemed on stream\",\"color\":\"gray\"}']}}" },
    { label: "Enchantment", note: "Put this in Item Data.", value: "{Enchantments:[{id:\"minecraft:unbreaking\",lvl:3s}]}" },
    { label: "Named enchanted item", note: "Put this in Item Data.", value: "{display:{Name:'{\"text\":\"Viewer Pickaxe\",\"color\":\"aqua\"}'},Enchantments:[{id:\"minecraft:efficiency\",lvl:5s}]}" }
];

const QUEST_ITEM_REWARD_EXAMPLES_1211 = [
    { label: "Named item", note: "Put this in Item Data.", value: "[custom_name='{\"text\":\"Viewer Stick\",\"color\":\"gold\"}']" },
    { label: "Lore", note: "Put this in Item Data.", value: "[lore=['{\"text\":\"Redeemed on stream\",\"color\":\"gray\"}']]" },
    { label: "Enchantment", note: "Put this in Item Data.", value: "[enchantments={levels:{\"minecraft:unbreaking\":3}}]" },
    { label: "Named enchanted item", note: "Put this in Item Data.", value: "[custom_name='{\"text\":\"Viewer Pickaxe\",\"color\":\"aqua\"}',enchantments={levels:{\"minecraft:efficiency\":5}}]" }
];

const QUEST_ITEM_REWARD_EXAMPLES_2612 = [
    { label: "Named item", note: "Put this in Item Data.", value: "[custom_name={text:'Viewer Stick',color:'gold'}]" },
    { label: "Lore", note: "Put this in Item Data.", value: "[lore=[{text:'Redeemed on stream',color:'gray'}]]" },
    { label: "Enchantment", note: "Put this in Item Data.", value: "[enchantments={\"minecraft:unbreaking\":3}]" },
    { label: "Named enchanted item", note: "Put this in Item Data.", value: "[custom_name={text:'Viewer Pickaxe',color:'aqua'},enchantments={\"minecraft:efficiency\":5}]" }
];

const QUEST_COMMAND_REWARD_EXAMPLES = [
    { label: "Potion effect", note: "Command reward Display Name: Receive Haste 3 for 10 seconds.", value: "effect give $minecraftQuestPlayerName minecraft:haste 10 2 true" },
    { label: "XP reward", note: "Command reward Display Name: Receive 5 levels.", value: "xp add $minecraftQuestPlayerName 5 levels" },
    { label: "Teleport", note: "Command reward Display Name: Return to spawn.", value: "tp $minecraftQuestPlayerName 0 80 0" },
    { label: "Title", note: "Command reward Display Name: Receive a title message.", value: "title $minecraftQuestPlayerName title {\"text\":\"Quest Complete!\",\"color\":\"gold\"}" }
];

const MINECRAFT_VERSIONS = ["Forge 1.19.2", "Forge 1.20.1", "NeoForge 1.21.1", "NeoForge 26.1.2"];

const DEFAULT_RANDOM_MOBS = [
    "minecraft:zombie | {Tags:[\"Viewer Spawn\"],CustomName:'{\"text\":\"$userDisplayName\",\"color\":\"gold\"}',CustomNameVisible:1b,PersistenceRequired:1b,DeathLootTable:\"minecraft:empty\"}",
    "minecraft:skeleton | {Tags:[\"Viewer Spawn\"],HandItems:[{},{}],ArmorItems:[{},{},{},{id:\"minecraft:diamond_helmet\",count:1}],CustomName:'{\"text\":\"$userDisplayName\",\"color\":\"gray\"}',CustomNameVisible:1b,PersistenceRequired:1b,DeathLootTable:\"minecraft:empty\",ArmorDropChances:[0.0f,0.0f,0.0f,0.0f]}",
    "minecraft:spider | {Tags:[\"Viewer Spawn\"],CustomName:'\"$userDisplayName\"',CustomNameVisible:1b,PersistenceRequired:1b,DeathLootTable:\"minecraft:empty\"}",
    "minecraft:creeper | {Tags:[\"Viewer Spawn\"],CustomName:'{\"text\":\"$userDisplayName\",\"color\":\"red\"}',CustomNameVisible:1b,PersistenceRequired:1b,DeathLootTable:\"minecraft:empty\"}"
];
const DEFAULT_RANDOM_FOOD = [
    "minecraft:bread",
    "minecraft:cooked_beef",
    "minecraft:cooked_chicken",
    "minecraft:golden_carrot"
];
const DEFAULT_RANDOM_ITEMS_1201 = [
    "minecraft:stick | {display:{Name:'{\"text\":\"Bonk Stick\",\"color\":\"red\"}'},Enchantments:[{id:\"minecraft:knockback\",lvl:2s}]}",
    "minecraft:golden_apple",
    "minecraft:torch | {display:{Name:'{\"text\":\"Emergency Torch\",\"color\":\"yellow\"}'}}",
    "minecraft:ender_pearl"
];
const DEFAULT_RANDOM_ITEMS_1211 = [
    "minecraft:stick | [custom_name='{\"text\":\"Bonk Stick\",\"color\":\"red\"}',enchantments={levels:{\"minecraft:knockback\":2}}]",
    "minecraft:golden_apple",
    "minecraft:torch | [custom_name='{\"text\":\"Emergency Torch\",\"color\":\"yellow\"}']",
    "minecraft:ender_pearl"
];
const DEFAULT_BAD_EFFECTS = [
    "minecraft:poison",
    "minecraft:wither",
    "minecraft:blindness",
    "minecraft:slowness",
    "minecraft:mining_fatigue",
    "minecraft:weakness",
    "minecraft:nausea",
    "minecraft:darkness"
];
const DEFAULT_CONFIG = {
    serverAddress: "http://127.0.0.1:8765",
    requestTimeoutMs: 5000,
    minecraftVersion: "NeoForge 1.21.1",
    playerCode: "",
    fetchedLimits: null,
    fetchedStats: null
};

let modules = null;
let scriptDataDir = null;
let bridgeEventTimer = null;

function ensureFolder(folder) {
    if (!fs.existsSync(folder)) {
        fs.mkdirSync(folder, { recursive: true });
    }
}

function readNumber(value, fallback) {
    const number = Number(value);
    if (!Number.isFinite(number)) {
        return fallback;
    }
    return number;
}

function readText(value, fallback, allowEmpty) {
    if (value === undefined || value === null) {
        return fallback;
    }
    const text = String(value).trim();
    if (!allowEmpty && text.length < 1) {
        return fallback;
    }
    return text;
}

function toLines(value) {
    if (Array.isArray(value)) {
        return value.map(item => String(item).trim()).filter(Boolean);
    }
    return String(value || "")
        .split(/\\r?\\n/)
        .map(item => item.trim())
        .filter(Boolean);
}

function readList(value, fallback) {
    const list = toLines(value);
    if (list.length < 1) {
        return [...fallback];
    }
    return list;
}

function normalizeConfig(config) {
    const source = config && typeof config === "object" ? config : {};

    return {
        serverAddress: readText(source.serverAddress, DEFAULT_CONFIG.serverAddress, false),
        requestTimeoutMs: readNumber(source.requestTimeoutMs, DEFAULT_CONFIG.requestTimeoutMs),
        minecraftVersion: MINECRAFT_VERSIONS.includes(source.minecraftVersion) ? source.minecraftVersion : DEFAULT_CONFIG.minecraftVersion,
        playerCode: readText(source.playerCode, DEFAULT_CONFIG.playerCode, true),
        fetchedLimits: source.fetchedLimits && typeof source.fetchedLimits === "object" ? source.fetchedLimits : null,
        fetchedStats: source.fetchedStats && typeof source.fetchedStats === "object" ? source.fetchedStats : null
    };
}

function minecraftDataFamily(version) {
    if (version === "Forge 1.19.2" || version === "Forge 1.20.1") {
        return "legacy";
    }
    if (version === "NeoForge 26.1.2") {
        return "inline";
    }
    return "json";
}

function splitDataParts(value, separator) {
    const parts = [];
    let start = 0;
    let quote = "";
    let escaped = false;
    let braces = 0;
    let brackets = 0;
    let parentheses = 0;
    for (let index = 0; index < value.length; index++) {
        const character = value[index];
        if (quote) {
            if (escaped) {
                escaped = false;
            } else if (character === "\\") {
                escaped = true;
            } else if (character === quote) {
                quote = "";
            }
            continue;
        }
        if (character === "'" || character === '"') {
            quote = character;
        } else if (character === "{") {
            braces++;
        } else if (character === "}") {
            braces--;
        } else if (character === "[") {
            brackets++;
        } else if (character === "]") {
            brackets--;
        } else if (character === "(") {
            parentheses++;
        } else if (character === ")") {
            parentheses--;
        } else if (character === separator && braces === 0 && brackets === 0 && parentheses === 0) {
            parts.push(value.slice(start, index).trim());
            start = index + 1;
        }
    }
    parts.push(value.slice(start).trim());
    return parts.filter(Boolean);
}

function findDataSeparator(value, separators) {
    let quote = "";
    let escaped = false;
    let braces = 0;
    let brackets = 0;
    let parentheses = 0;
    for (let index = 0; index < value.length; index++) {
        const character = value[index];
        if (quote) {
            if (escaped) {
                escaped = false;
            } else if (character === "\\") {
                escaped = true;
            } else if (character === quote) {
                quote = "";
            }
            continue;
        }
        if (character === "'" || character === '"') {
            quote = character;
        } else if (character === "{") {
            braces++;
        } else if (character === "}") {
            braces--;
        } else if (character === "[") {
            brackets++;
        } else if (character === "]") {
            brackets--;
        } else if (character === "(") {
            parentheses++;
        } else if (character === ")") {
            parentheses--;
        } else if (braces === 0 && brackets === 0 && parentheses === 0 && separators.includes(character)) {
            return index;
        }
    }
    return -1;
}

function unquoteData(value) {
    const text = String(value || "").trim();
    if (text.length < 2 || !((text[0] === "'" && text[text.length - 1] === "'") || (text[0] === '"' && text[text.length - 1] === '"'))) {
        return text;
    }
    const quote = text[0];
    let result = "";
    for (let index = 1; index < text.length - 1; index++) {
        const character = text[index];
        if (character === "\\" && index + 1 < text.length - 1) {
            const next = text[index + 1];
            if (next === quote || next === "\\") {
                result += next;
                index++;
                continue;
            }
        }
        result += character;
    }
    return result;
}

function quoteData(value) {
    return "'" + String(value == null ? "" : value).replace(/\\/g, "\\\\").replace(/'/g, "\\'") + "'";
}

function cleanDataKey(value) {
    const key = unquoteData(value).trim();
    return key.startsWith("minecraft:") ? key.slice("minecraft:".length) : key;
}

function parseDataEntries(value, opening, closing, separators) {
    const text = String(value || "").trim();
    if (!text.startsWith(opening) || !text.endsWith(closing)) {
        return null;
    }
    return splitDataParts(text.slice(1, -1), ",").map(part => {
        const index = findDataSeparator(part, separators);
        if (index < 0) {
            return { keyRaw: part, key: cleanDataKey(part), value: "" };
        }
        const keyRaw = part.slice(0, index).trim();
        return { keyRaw, key: cleanDataKey(keyRaw), value: part.slice(index + 1).trim() };
    });
}

function parseLooseData(value) {
    const text = String(value || "").trim();
    if (!text) {
        return "";
    }
    if ((text[0] === "'" && text[text.length - 1] === "'") || (text[0] === '"' && text[text.length - 1] === '"')) {
        const unquoted = unquoteData(text);
        if ((unquoted.startsWith("{") && unquoted.endsWith("}")) || (unquoted.startsWith("[") && unquoted.endsWith("]"))) {
            try {
                return JSON.parse(unquoted);
            } catch (error) {
            }
        }
        return unquoted;
    }
    if (text.startsWith("{") && text.endsWith("}")) {
        const object = {};
        const entries = parseDataEntries(text, "{", "}", [":"]);
        if (entries) {
            entries.forEach(entry => {
                object[unquoteData(entry.keyRaw)] = parseLooseData(entry.value);
            });
        }
        return object;
    }
    if (text.startsWith("[") && text.endsWith("]")) {
        return splitDataParts(text.slice(1, -1), ",").map(parseLooseData);
    }
    if (/^(true|false)$/i.test(text)) {
        return text.toLowerCase() === "true";
    }
    if (/^-?\d+(?:\.\d+)?[bBsSlLfFdD]?$/.test(text)) {
        return Number(text.replace(/[bBsSlLfFdD]$/, ""));
    }
    return text;
}

function stringifyInlineData(value) {
    if (value === null || value === undefined) {
        return "{}";
    }
    if (Array.isArray(value)) {
        return "[" + value.map(stringifyInlineData).join(",") + "]";
    }
    if (typeof value === "object") {
        return "{" + Object.entries(value).map(([key, item]) => (/^[A-Za-z0-9_.+-]+$/.test(key) ? key : quoteData(key)) + ":" + stringifyInlineData(item)).join(",") + "}";
    }
    if (typeof value === "number" || typeof value === "boolean") {
        return String(value);
    }
    return quoteData(value);
}

function textComponentValue(value, family) {
    const parsed = parseLooseData(value);
    let component = parsed;
    if (typeof component === "string") {
        try {
            component = JSON.parse(component);
        } catch (error) {
            component = { text: component };
        }
    }
    if (family === "inline") {
        return stringifyInlineData(component);
    }
    return quoteData(JSON.stringify(component));
}

function numericDataValue(value) {
    return String(value || "0").trim().replace(/[bBsSlLfFdD]$/, "");
}

function enchantmentEntries(value) {
    const outer = parseDataEntries(value, "{", "}", [":"]);
    if (!outer) {
        return [];
    }
    const levelsEntry = outer.find(entry => entry.key.toLowerCase() === "levels");
    if (levelsEntry) {
        return parseDataEntries(levelsEntry.value, "{", "}", [":"]) || [];
    }
    return outer.filter(entry => entry.key.toLowerCase() !== "show_in_tooltip");
}

function enchantmentComponentValue(entries, family) {
    const levels = entries.map(entry => quoteData(unquoteData(entry.keyRaw)) + ":" + numericDataValue(entry.value)).join(",");
    return family === "inline" ? "{" + levels + "}" : "{levels:{" + levels + "}}";
}

function legacyEnchantmentsToComponent(value, family) {
    const text = String(value || "").trim();
    if (!text.startsWith("[") || !text.endsWith("]")) {
        return enchantmentComponentValue([], family);
    }
    const levels = [];
    splitDataParts(text.slice(1, -1), ",").forEach(item => {
        const entries = parseDataEntries(item, "{", "}", [":"]);
        if (!entries) {
            return;
        }
        const id = entries.find(entry => entry.key.toLowerCase() === "id");
        const level = entries.find(entry => entry.key.toLowerCase() === "lvl" || entry.key.toLowerCase() === "level");
        if (id && level) {
            levels.push({ keyRaw: quoteData(unquoteData(id.value)), value: level.value });
        }
    });
    return enchantmentComponentValue(levels, family);
}

function normalizeEnchantmentComponent(value, family) {
    return enchantmentComponentValue(enchantmentEntries(value), family);
}

function componentEnchantmentsToLegacy(value) {
    const levels = enchantmentEntries(value);
    if (!levels.length) {
        return "[]";
    }
    return "[" + levels.map(entry => "{id:" + quoteData(unquoteData(entry.keyRaw)) + ",lvl:" + numericDataValue(entry.value) + "s}").join(",") + "]";
}

function legacyItemDataToComponents(value, family) {
    const entries = parseDataEntries(value, "{", "}", [":"]);
    if (!entries) {
        return value;
    }
    const components = [];
    const custom = [];
    entries.forEach(entry => {
        const key = entry.key.toLowerCase();
        if (key === "display") {
            const display = parseDataEntries(entry.value, "{", "}", [":"]);
            const remaining = [];
            (display || []).forEach(displayEntry => {
                const displayKey = displayEntry.key.toLowerCase();
                if (displayKey === "name") {
                    components.push("custom_name=" + textComponentValue(displayEntry.value, family));
                } else if (displayKey === "lore") {
                    const lore = String(displayEntry.value || "").trim();
                    const values = lore.startsWith("[") && lore.endsWith("]") ? splitDataParts(lore.slice(1, -1), ",") : [];
                    components.push("lore=[" + values.map(item => textComponentValue(item, family)).join(",") + "]");
                } else if (displayKey === "color") {
                    components.push("dyed_color=" + numericDataValue(displayEntry.value));
                } else {
                    remaining.push(displayEntry.keyRaw + ":" + displayEntry.value);
                }
            });
            if (remaining.length) {
                custom.push("display:{" + remaining.join(",") + "}");
            }
        } else if (key === "enchantments") {
            components.push("enchantments=" + legacyEnchantmentsToComponent(entry.value, family));
        } else if (key === "storedenchantments") {
            components.push("stored_enchantments=" + legacyEnchantmentsToComponent(entry.value, family));
        } else if (key === "unbreakable") {
            components.push("unbreakable={}");
        } else if (key === "damage") {
            components.push("damage=" + numericDataValue(entry.value));
        } else if (key === "custommodeldata") {
            components.push("custom_model_data=" + numericDataValue(entry.value));
        } else if (key === "repaircost") {
            components.push("repair_cost=" + numericDataValue(entry.value));
        } else if (key === "havenfmicomponents") {
            const saved = parseDataEntries(entry.value, "{", "}", [":"]);
            (saved || []).forEach(savedEntry => components.push(unquoteData(savedEntry.keyRaw) + "=" + savedEntry.value));
        } else {
            custom.push(entry.keyRaw + ":" + entry.value);
        }
    });
    if (custom.length) {
        components.push("custom_data={" + custom.join(",") + "}");
    }
    return components.length ? "[" + components.join(",") + "]" : "";
}

function normalizeComponentItemData(value, family) {
    const entries = parseDataEntries(value, "[", "]", ["="]);
    if (!entries) {
        return value;
    }
    return "[" + entries.map(entry => {
        const key = entry.key.toLowerCase();
        const componentKey = key.startsWith("minecraft:") ? key.substring("minecraft:".length) : key;
        let componentValue = entry.value;
        if (componentKey === "custom_name" || componentKey === "item_name") {
            componentValue = textComponentValue(componentValue, family);
        } else if (componentKey === "lore") {
            const lore = String(componentValue || "").trim();
            const values = lore.startsWith("[") && lore.endsWith("]") ? splitDataParts(lore.slice(1, -1), ",") : [];
            componentValue = "[" + values.map(item => textComponentValue(item, family)).join(",") + "]";
        } else if (componentKey === "enchantments" || componentKey === "stored_enchantments") {
            componentValue = normalizeEnchantmentComponent(componentValue, family);
        }
        return entry.keyRaw + "=" + componentValue;
    }).join(",") + "]";
}

function componentItemDataToLegacy(value) {
    const entries = parseDataEntries(value, "[", "]", ["="]);
    if (!entries) {
        return value;
    }
    const root = [];
    const display = [];
    const unknown = [];
    entries.forEach(entry => {
        const key = entry.key.toLowerCase();
        const componentKey = key.startsWith("minecraft:") ? key.substring("minecraft:".length) : key;
        if (componentKey === "custom_name" || componentKey === "item_name") {
            const parsed = parseLooseData(entry.value);
            const component = typeof parsed === "string" ? (() => { try { return JSON.parse(parsed); } catch (error) { return { text: parsed }; } })() : parsed;
            display.push("Name:" + quoteData(JSON.stringify(component)));
        } else if (componentKey === "lore") {
            const lore = String(entry.value || "").trim();
            const values = lore.startsWith("[") && lore.endsWith("]") ? splitDataParts(lore.slice(1, -1), ",") : [];
            display.push("Lore:[" + values.map(item => {
                const parsed = parseLooseData(item);
                const component = typeof parsed === "string" ? (() => { try { return JSON.parse(parsed); } catch (error) { return { text: parsed }; } })() : parsed;
                return quoteData(JSON.stringify(component));
            }).join(",") + "]");
        } else if (componentKey === "enchantments") {
            root.push("Enchantments:" + componentEnchantmentsToLegacy(entry.value));
        } else if (componentKey === "stored_enchantments") {
            root.push("StoredEnchantments:" + componentEnchantmentsToLegacy(entry.value));
        } else if (componentKey === "unbreakable") {
            root.push("Unbreakable:1b");
        } else if (componentKey === "damage") {
            root.push("Damage:" + numericDataValue(entry.value));
        } else if (componentKey === "custom_model_data" && !String(entry.value).trim().startsWith("{")) {
            root.push("CustomModelData:" + numericDataValue(entry.value));
        } else if (componentKey === "repair_cost") {
            root.push("RepairCost:" + numericDataValue(entry.value));
        } else if (componentKey === "dyed_color") {
            display.push("color:" + numericDataValue(entry.value));
        } else if (componentKey === "custom_data") {
            const custom = parseDataEntries(entry.value, "{", "}", [":"]);
            (custom || []).forEach(item => root.push(item.keyRaw + ":" + item.value));
        } else {
            unknown.push(quoteData(unquoteData(entry.keyRaw)) + ":" + entry.value);
        }
    });
    if (display.length) {
        root.unshift("display:{" + display.join(",") + "}");
    }
    if (unknown.length) {
        root.push("HavenFMIComponents:{" + unknown.join(",") + "}");
    }
    return root.length ? "{" + root.join(",") + "}" : "";
}

function convertItemDataForVersion(value, version) {
    const text = String(value || "").trim();
    if (!text) {
        return "";
    }
    const family = minecraftDataFamily(version);
    if (family === "legacy") {
        return text.startsWith("[") ? componentItemDataToLegacy(text) : text;
    }
    return text.startsWith("{") ? legacyItemDataToComponents(text, family) : normalizeComponentItemData(text, family);
}

function convertEntityDataForVersion(value, version) {
    const family = minecraftDataFamily(version);
    function convertStructured(text) {
        const trimmed = String(text || "").trim();
        if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
            const entries = parseDataEntries(trimmed, "{", "}", [":"]);
            if (!entries) {
                return trimmed;
            }
            const hasItemId = entries.some(entry => entry.key.toLowerCase() === "id");
            return "{" + entries.map(entry => {
                let keyRaw = entry.keyRaw;
                let itemValue = convertStructured(entry.value);
                const key = entry.key.toLowerCase();
                if (key === "customname") {
                    itemValue = textComponentValue(entry.value, family === "inline" ? "inline" : "json");
                }
                if (hasItemId && key === "count") {
                    keyRaw = family === "legacy" ? "Count" : "count";
                    itemValue = family === "legacy" ? numericDataValue(entry.value) + "b" : numericDataValue(entry.value);
                }
                if (hasItemId && key === "tag" && family !== "legacy") {
                    keyRaw = "components";
                    const bracket = legacyItemDataToComponents(entry.value, family);
                    const componentEntries = parseDataEntries(bracket, "[", "]", ["="]) || [];
                    itemValue = "{" + componentEntries.map(component => quoteData("minecraft:" + component.key) + ":" + component.value).join(",") + "}";
                } else if (hasItemId && key === "components") {
                    const componentEntries = parseDataEntries(entry.value, "{", "}", [":"]) || [];
                    const bracket = "[" + componentEntries.map(component => cleanDataKey(component.keyRaw) + "=" + component.value).join(",") + "]";
                    if (family === "legacy") {
                        keyRaw = "tag";
                        itemValue = componentItemDataToLegacy(bracket);
                    } else {
                        itemValue = "{" + (parseDataEntries(normalizeComponentItemData(bracket, family), "[", "]", ["="]) || []).map(component => quoteData("minecraft:" + component.key) + ":" + component.value).join(",") + "}";
                    }
                }
                return keyRaw + ":" + itemValue;
            }).join(",") + "}";
        }
        if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
            if (/^\[[BILbil];/.test(trimmed)) {
                return trimmed;
            }
            return "[" + splitDataParts(trimmed.slice(1, -1), ",").map(convertStructured).join(",") + "]";
        }
        return trimmed;
    }
    return convertStructured(String(value || "").trim());
}

function convertDataRows(value, converter) {
    return String(value || "").split(/\r?\n/).map(line => {
        const pipeIndex = findDataSeparator(line, ["|"]);
        if (pipeIndex < 0) {
            return line;
        }
        return line.slice(0, pipeIndex).trim() + " | " + converter(line.slice(pipeIndex + 1).trim());
    }).join("\n");
}

function convertRewardItemsForVersion(value, version) {
    return String(value || "").split(/\r?\n/).map(line => {
        if (/^\s*command\b/i.test(line)) {
            return line;
        }
        const pipeIndex = findDataSeparator(line, ["|"]);
        if (pipeIndex < 0) {
            return line;
        }
        return line.slice(0, pipeIndex).trim() + " | " + convertItemDataForVersion(line.slice(pipeIndex + 1).trim(), version);
    }).join("\n");
}

function convertPayloadDataForVersion(action, data, version) {
    const result = data && typeof data === "object" ? data : {};
    if (action === "give_item" && result.itemData) {
        result.itemData = convertItemDataForVersion(result.itemData, version);
    }
    if (action === "spawn_mob" && result.entityData) {
        result.entityData = convertEntityDataForVersion(result.entityData, version);
    }
    if (action === "spawn_random_mob" && Array.isArray(result.mobEntries)) {
        result.mobEntries = result.mobEntries.map(entry => ({ ...entry, entityData: convertEntityDataForVersion(entry && entry.entityData, version) }));
    }
    if (action === "start_quest") {
        result.rewardItems = convertRewardItemsForVersion(result.rewardItems, version);
        if (Array.isArray(result.objectives)) {
            result.objectives = result.objectives.map(objective => {
                const converted = { ...objective };
                const questType = String(converted.questType || "");
                if (converted.targetIds) {
                    if (questType.startsWith("Kill Specific") || questType.startsWith("Deal Damage to Specific")) {
                        converted.targetIds = convertDataRows(converted.targetIds, item => convertEntityDataForVersion(item, version));
                    } else if (questType.startsWith("Craft Specific") || questType.startsWith("Pick Up Specific")) {
                        converted.targetIds = convertDataRows(converted.targetIds, item => convertItemDataForVersion(item, version));
                    }
                }
                return converted;
            });
            const first = result.objectives[0];
            if (first) {
                result.targetIds = first.targetIds;
            }
        }
    }
    return result;
}

function getConfigPath() {
    return modules.path.join(scriptDataDir, CONFIG_FILE);
}

function saveConfig(config) {
    ensureFolder(scriptDataDir);
    const normalized = normalizeConfig(config);
    fs.writeFileSync(getConfigPath(), JSON.stringify(normalized, null, 4), "utf8");
    return normalized;
}

function loadConfig() {
    ensureFolder(scriptDataDir);
    const filePath = getConfigPath();
    if (!fs.existsSync(filePath)) {
        return saveConfig(DEFAULT_CONFIG);
    }
    try {
        const raw = fs.readFileSync(filePath, "utf8");
        return saveConfig(JSON.parse(raw));
    } catch (error) {
        modules.logger.error(`${SCRIPT_NAME}: Failed to load config`, error);
        return saveConfig(DEFAULT_CONFIG);
    }
}

function getQuestCachePath() {
    return modules.path.join(scriptDataDir, QUEST_CACHE_FILE);
}

function loadQuestCache() {
    ensureFolder(scriptDataDir);
    const filePath = getQuestCachePath();
    if (!fs.existsSync(filePath)) {
        return null;
    }
    try {
        const raw = fs.readFileSync(filePath, "utf8");
        const value = JSON.parse(raw);
        return value && typeof value === "object" ? value : null;
    } catch (error) {
        modules.logger.error(`${SCRIPT_NAME}: Failed to load quest cache`, error);
        return null;
    }
}

function saveQuestCache(value) {
    ensureFolder(scriptDataDir);
    if (!value) {
        fs.writeFileSync(getQuestCachePath(), JSON.stringify(null, null, 4), "utf8");
        return null;
    }
    fs.writeFileSync(getQuestCachePath(), JSON.stringify(value, null, 4), "utf8");
    return value;
}

function clearQuestCache() {
    ensureFolder(scriptDataDir);
    fs.writeFileSync(getQuestCachePath(), JSON.stringify(null, null, 4), "utf8");
    return null;
}

function rewardRowFromText(line) {
    const value = String(line || "").trim();
    if (!value) {
        return null;
    }
    const pipeIndex = value.indexOf("|");
    const left = pipeIndex >= 0 ? value.slice(0, pipeIndex).trim() : value;
    const itemData = pipeIndex >= 0 ? value.slice(pipeIndex + 1).trim() : "";
    const amountMatch = left.match(/^(.*?)\s+x(\d+)$/i);
    if (amountMatch) {
        return {
            itemId: amountMatch[1].trim(),
            amount: Number(amountMatch[2]) || 1,
            itemData
        };
    }
    return {
        itemId: left,
        amount: 1,
        itemData
    };
}

function questUsesTargets(questType) {
    const value = String(questType || "");
    return value.indexOf("Kill Specific") === 0 || value.indexOf("Mine Specific") === 0 || value.indexOf("Craft Specific") === 0 || value.indexOf("Pick Up Specific") === 0 || value.indexOf("Deal Damage to Specific") === 0;
}

function questUsesDamageFilter(questType) {
    return questType === "Deal Damage" || questType === "Deal Damage to Specific Mob" || questType === "Take Damage";
}

function normalizeQuestPreset(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        throw new Error("Quest preset must be a JSON object.");
    }

    const preset = {};
    QUEST_PRESET_FIELDS.forEach(key => {
        if (value[key] !== undefined) {
            preset[key] = value[key];
        }
    });

    if (preset.questName !== undefined) {
        preset.questName = readText(preset.questName, "Viewer Quest", false);
    }
    if (preset.questId !== undefined) {
        preset.questId = readText(preset.questId, "", true);
    }
    if (preset.viewerName !== undefined) {
        preset.viewerName = readText(preset.viewerName, "$userDisplayName", false);
    }
    if (preset.hasReward !== undefined) {
        preset.hasReward = preset.hasReward === true || String(preset.hasReward).toLowerCase() === "true";
    }
    if (preset.randomReward !== undefined) {
        preset.randomReward = preset.randomReward === true || String(preset.randomReward).toLowerCase() === "true";
    }
    if (preset.rewards !== undefined) {
        const randomRewardEnabled = preset.randomReward === true;
        preset.rewards = Array.isArray(preset.rewards) ? preset.rewards.map(reward => {
            const rewardType = reward && reward.rewardType === "Command Reward" ? "Command Reward" : "Item Reward";
            const rewardVisibility = reward && QUEST_REWARD_VISIBILITY.includes(reward.rewardVisibility) ? reward.rewardVisibility : "Show Rewards";
            const result = {
                rewardType,
                collapsed: reward && reward.collapsed === true
            };
            if (rewardVisibility !== "Show Rewards") {
                result.rewardVisibility = rewardVisibility;
            }
            if (randomRewardEnabled) {
                result.weight = readNumber(reward && reward.weight, 1);
                if (reward && (reward.showPercent === true || String(reward.showPercent).toLowerCase() === "true")) {
                    result.showPercent = true;
                }
            }
            if (rewardType === "Command Reward") {
                const displayName = readText(reward && reward.displayName, "", true);
                if (displayName) {
                    result.displayName = displayName;
                }
                result.command = readText(reward && reward.command, "", true);
            } else {
                result.itemId = readText(reward && reward.itemId, "", true);
                result.amount = readNumber(reward && reward.amount, 1);
                const itemData = readText(reward && reward.itemData, "", true);
                if (itemData) {
                    result.itemData = itemData;
                }
            }
            return result;
        }).filter(reward => reward.rewardType === "Command Reward" ? reward.command : reward.itemId || reward.itemData) : [];
    }
    if (preset.objectives !== undefined) {
        preset.objectives = Array.isArray(preset.objectives) ? preset.objectives.map(objective => {
            const questType = QUEST_TYPES.includes(objective && objective.questType) ? objective.questType : "Jump Count";
            const result = {
                questType,
                targetAmount: readNumber(objective && objective.targetAmount, 10),
                collapsed: objective && objective.collapsed === true
            };
            if (questUsesTargets(questType)) {
                result.targetIds = readText(objective && objective.targetIds, "", true);
            }
            if (questUsesDamageFilter(questType)) {
                result.useDamageFilter = objective && (objective.useDamageFilter === true || String(objective.useDamageFilter).toLowerCase() === "true");
                if (result.useDamageFilter) {
                    result.damageFilter = readText(objective && objective.damageFilter, "Any", false);
                }
            }
            return result;
        }) : [];
    }
    if (preset.displayMode !== undefined && !QUEST_DISPLAY_MODES.includes(preset.displayMode)) {
        preset.displayMode = "None";
    }
    if (Object.keys(preset).length < 1) {
        throw new Error("Quest preset does not contain any supported quest fields.");
    }

    return preset;
}

function loadQuestPresetFile(filePath) {
    const selectedPath = readText(filePath, "", true);
    if (!selectedPath) {
        return { ok: false, error: "No preset file selected." };
    }

    try {
        const raw = fs.readFileSync(selectedPath, "utf8");
        return { ok: true, preset: normalizeQuestPreset(JSON.parse(raw)) };
    } catch (error) {
        modules.logger.error(`${SCRIPT_NAME}: Quest preset load failed`, error);
        return { ok: false, error: error.message || "Could not load quest preset." };
    }
}

function saveQuestPresetFile(data) {
    const selectedPath = readText(data && data.filePath, "", true);
    if (!selectedPath) {
        return { ok: false, error: "No preset file selected." };
    }

    try {
        const preset = normalizeQuestPreset(data.preset || {});
        const outputPath = selectedPath.toLowerCase().endsWith(".json") ? selectedPath : `${selectedPath}.json`;
        ensureFolder(modules.path.dirname(outputPath));
        fs.writeFileSync(outputPath, JSON.stringify(preset, null, 4), "utf8");
        return { ok: true, filePath: outputPath };
    } catch (error) {
        modules.logger.error(`${SCRIPT_NAME}: Quest preset save failed`, error);
        return { ok: false, error: error.message || "Could not save quest preset." };
    }
}

function normalizeServerAddress(address) {
    const value = String(address || "").trim();
    if (value.endsWith("/")) {
        return value.slice(0, -1);
    }
    return value;
}

function pickRandom(list) {
    const items = toLines(list);
    if (items.length < 1) {
        return "";
    }
    return items[Math.floor(Math.random() * items.length)];
}

function splitRandomEntry(value) {
    const text = String(value || "").trim();
    const pipeIndex = text.indexOf("|");
    if (pipeIndex >= 0) {
        return {
            id: text.slice(0, pipeIndex).trim(),
            data: text.slice(pipeIndex + 1).trim()
        };
    }
    const componentIndex = text.indexOf("[");
    if (componentIndex > 0) {
        return {
            id: text.slice(0, componentIndex).trim(),
            data: text.slice(componentIndex).trim()
        };
    }
    const nbtIndex = text.indexOf("{");
    if (nbtIndex > 0) {
        return {
            id: text.slice(0, nbtIndex).trim(),
            data: text.slice(nbtIndex).trim()
        };
    }
    return {
        id: text,
        data: ""
    };
}

function pickRandomItem(list) {
    const picked = splitRandomEntry(pickRandom(list));
    return {
        itemId: picked.id,
        itemData: picked.data
    };
}

function normalizeListText(value) {
    return toLines(value).join("\n");
}

function stripOuterPair(value, left, right) {
    const text = String(value || "").trim();
    if (text.startsWith(left) && text.endsWith(right)) {
        return text.slice(1, -1).trim();
    }
    return text;
}

function mergeDataText(baseData, addedData) {
    const base = String(baseData || "").trim();
    const added = String(addedData || "").trim();
    if (!base) {
        return added;
    }
    if (!added) {
        return base;
    }
    if (base.startsWith("{") && base.endsWith("}") && added.startsWith("{") && added.endsWith("}")) {
        return `{${stripOuterPair(base, "{", "}")},${stripOuterPair(added, "{", "}")}}`;
    }
    if (base.startsWith("[") && base.endsWith("]") && added.startsWith("[") && added.endsWith("]")) {
        return `[${stripOuterPair(base, "[", "]")},${stripOuterPair(added, "[", "]")}]`;
    }
    return `${base} ${added}`;
}

function listContainsItem(list, itemId) {
    const wanted = String(itemId || "").trim().toLowerCase();
    return toLines(list).some(item => item.split("|")[0].trim().toLowerCase() === wanted);
}

function pickAllowedRandomItem(list, blacklist) {
    const entries = toLines(list);
    const blocked = toLines(blacklist).map(item => item.split("|")[0].trim().toLowerCase());
    const allowed = entries.filter(item => !blocked.includes(item.split("|")[0].trim().toLowerCase()));
    if (allowed.length < 1) {
        throw new Error("Random item list only contains blacklisted items.");
    }
    const picked = splitRandomEntry(allowed[Math.floor(Math.random() * allowed.length)]);
    return {
        itemId: picked.id,
        itemData: picked.data
    };
}

function randomItemRowsFromList(list) {
    return toLines(list).map(line => {
        const split = splitRandomEntry(line);
        const amountMatch = split.id.match(/^(.*?)\s+x(\d+)$/i);
        return {
            itemId: amountMatch ? amountMatch[1].trim() : split.id,
            amount: amountMatch ? Number(amountMatch[2]) || 1 : 1,
            itemData: split.data,
            collapsed: true
        };
    }).filter(item => item.itemId);
}

function randomItemRowsFromEffect(effect, config) {
    if (Array.isArray(effect.randomItems) && effect.randomItems.length > 0) {
        return effect.randomItems.map(item => ({
            itemId: String(item && item.itemId || "").trim(),
            amount: Math.max(1, Number(item && item.amount) || 1),
            itemData: String(item && item.itemData || "").trim()
        })).filter(item => item.itemId);
    }
    const fallback = String(config.minecraftVersion || "").startsWith("Forge") ? DEFAULT_RANDOM_ITEMS_1201 : DEFAULT_RANDOM_ITEMS_1211;
    return randomItemRowsFromList(effect.itemListOverride || fallback.join("\n"));
}

function pickAllowedRandomItemRow(rows, blacklist) {
    const blocked = toLines(blacklist).map(item => item.split("|")[0].trim().toLowerCase());
    const allowed = rows.filter(item => item.itemId && !blocked.includes(item.itemId.toLowerCase()));
    if (allowed.length < 1) {
        throw new Error("Random item list only contains blacklisted items.");
    }
    return allowed[Math.floor(Math.random() * allowed.length)];
}

function randomMobRowsFromList(list) {
    return toLines(list).map(line => {
        const split = splitRandomEntry(line);
        const amountMatch = split.id.match(/^(.*?)\s+x(\d+)$/i);
        return {
            mobId: amountMatch ? amountMatch[1].trim() : split.id,
            amount: amountMatch ? Number(amountMatch[2]) || 1 : 1,
            offsetX: 0,
            offsetY: 0,
            offsetZ: 0,
            entityData: split.data,
            collapsed: true
        };
    }).filter(mob => mob.mobId);
}

function randomMobRowsFromEffect(effect) {
    if (Array.isArray(effect.randomMobs) && effect.randomMobs.length > 0) {
        return effect.randomMobs.map(mob => ({
            mobId: String(mob && mob.mobId || "").trim(),
            amount: Math.max(1, Number(mob && mob.amount) || 1),
            offsetX: Number(mob && mob.offsetX) || 0,
            offsetY: Number(mob && mob.offsetY) || 0,
            offsetZ: Number(mob && mob.offsetZ) || 0,
            entityData: String(mob && mob.entityData || "").trim()
        })).filter(mob => mob.mobId);
    }
    return randomMobRowsFromList(effect.mobListOverride || DEFAULT_RANDOM_MOBS.join("\n"));
}


function defaultQuestObjectiveForPayload() {
    return {
        questType: "Jump Count",
        targetAmount: 10,
        targetIds: "",
        useDamageFilter: false,
        damageFilter: "Any"
    };
}

function questObjectivesFromEffect(effect) {
    const source = Array.isArray(effect.objectives) && effect.objectives.length > 0 ? effect.objectives : [defaultQuestObjectiveForPayload()];
    const objectives = source.map(objective => {
        const questType = QUEST_TYPES.includes(objective.questType) ? objective.questType : "Jump Count";
        return {
            questType,
            targetAmount: Number(objective.targetAmount) || 10,
            targetIds: usesQuestTargets(questType) ? String(objective.targetIds || "") : "",
            damageFilter: objective.useDamageFilter === true ? String(objective.damageFilter || "Any") : "Any"
        };
    }).filter(objective => objective.targetAmount > 0);
    return objectives.length > 0 ? objectives : [{ questType: "Jump Count", targetAmount: 10, targetIds: "", damageFilter: "Any" }];
}

function rewardVisibilityKey(value) {
    switch (String(value || "")) {
        case "Hide Until Completed": return "completed";
        case "Hide Until Claimed": return "claimed";
        default: return "show";
    }
}

function rewardLineFromRow(reward, randomReward) {
    const rewardType = reward && reward.rewardType === "Command Reward" ? "Command Reward" : "Item Reward";
    const weight = randomReward ? " weight=" + Math.max(1, Number(reward && reward.weight) || 1) : "";
    const visibility = " visibility=" + rewardVisibilityKey(reward && reward.rewardVisibility);
    const showPercent = randomReward && reward && reward.showPercent === true ? " show_percent=true" : "";
    if (rewardType === "Command Reward") {
        const command = String(reward && reward.command || "").trim();
        if (!command) {
            return "";
        }
        const displayName = String(reward && reward.displayName || "").replace(/\|/g, "/").trim();
        return "command" + weight + visibility + showPercent + " | " + (displayName ? displayName + " | " : "") + command;
    }
    const itemId = String(reward && reward.itemId || "").trim();
    if (!itemId) {
        return "";
    }
    const amount = Math.max(1, Number(reward && reward.amount) || 1);
    const itemData = String(reward && reward.itemData || "").trim();
    return itemId + " x" + amount + weight + visibility + showPercent + (itemData ? " | " + itemData : "");
}

function questRewardsFromEffect(effect) {
    if (!effect.hasReward) {
        return "";
    }
    if (Array.isArray(effect.rewards) && effect.rewards.length > 0) {
        return effect.rewards.map(reward => rewardLineFromRow(reward, effect.randomReward === true)).filter(Boolean).join("\n");
    }
    return "";
}

function questPayloadFromEffect(effect) {
    const objectives = questObjectivesFromEffect(effect);
    const first = objectives[0];
    const rewardItems = questRewardsFromEffect(effect);
    return {
        objectives,
        questType: first.questType,
        targetAmount: first.targetAmount,
        targetIds: first.targetIds,
        damageFilter: first.damageFilter,
        rewardItems,
        randomReward: effect.hasReward === true && effect.randomReward === true
    };
}

function cleanPayloadValue(value) {
    if (value === undefined || value === null || value === "") {
        return undefined;
    }
    return value;
}

function buildData(effect, keys) {
    const data = {};
    for (const key of keys) {
        const value = cleanPayloadValue(effect[key]);
        if (value !== undefined) {
            data[key] = value;
        }
    }
    return data;
}

function sendBridgeRequest(payload) {
    return sendBridgeHttpRequest("POST", "/firebot", payload);
}

function sendBridgeGet(path) {
    return sendBridgeHttpRequest("GET", path, null);
}

function sendBridgeHttpRequest(method, path, payload) {
    return new Promise((resolve, reject) => {
        const config = loadConfig();
        const baseAddress = normalizeServerAddress(config.serverAddress);
        if (!baseAddress) {
            reject(new Error("Minecraft Server Address is empty."));
            return;
        }

        const url = new URL(`${baseAddress}${path}`);
        let body = "";
        const headers = {};
        if (method === "POST") {
            body = JSON.stringify({
                playerCode: config.playerCode,
                minecraftVersion: config.minecraftVersion,
                ...payload
            });
            headers["Content-Type"] = "application/json";
            headers["Content-Length"] = Buffer.byteLength(body);
        }

        const client = url.protocol === "https:" ? https : http;
        const request = client.request({
            method,
            hostname: url.hostname,
            port: url.port || (url.protocol === "https:" ? 443 : 80),
            path: `${url.pathname}${url.search}`,
            timeout: Number(config.requestTimeoutMs) || 5000,
            headers
        }, response => {
            let responseBody = "";
            response.setEncoding("utf8");
            response.on("data", chunk => {
                responseBody += chunk;
            });
            response.on("end", () => {
                if (response.statusCode >= 200 && response.statusCode < 300) {
                    resolve(responseBody);
                } else {
                    const reply = parseBridgeReply(responseBody);
                    const message = reply && reply.message ? reply.message : `Minecraft bridge returned ${response.statusCode}: ${responseBody}`;
                    const error = new Error(message);
                    error.fromBridge = true;
                    reject(error);
                }
            });
        });

        request.on("timeout", () => {
            request.destroy(new Error("Minecraft bridge request timed out."));
        });

        request.on("error", error => {
            reject(error);
        });

        if (body) {
            request.write(body);
        }
        request.end();
    });
}

function parseBridgeReply(raw) {
    try {
        return JSON.parse(raw);
    } catch (error) {
        return null;
    }
}

async function runMinecraftEffect(action, effect, keys, addData) {
    const config = loadConfig();
    if (!String(config.playerCode || "").trim()) {
        const message = "No linked Minecraft player code is set in Firebot.";
        triggerHavenMinecraftEvent("bridge-message", {
            level: "Error",
            action,
            message
        });
        throw new Error(message);
    }
    const data = buildData(effect, keys);
    if (typeof addData === "function") {
        Object.assign(data, addData(effect, config));
    }
    convertPayloadDataForVersion(action, data, config.minecraftVersion);
    try {
        await sendBridgeRequest({
            action,
            data
        });
        return true;
    } catch (error) {
        if (!error.fromBridge) {
            triggerHavenMinecraftEvent("bridge-message", {
                level: "Error",
                action,
                message: error.message || "Minecraft effect failed."
            });
        }
        throw error;
    }
}

function registerEventSource() {
    if (!modules || !modules.eventManager) {
        return;
    }
    modules.eventManager.registerEventSource({
        id: SCRIPT_ID,
        name: SCRIPT_NAME,
        description: "Events from Haven Minecraft Integration",
        events: [
            {
                id: "bridge-message",
                name: "Minecraft Bridge Message",
                description: "Runs when the Minecraft bridge sends an error, warning, or info message.",
                cached: false
            },
            {
                id: "player-died",
                name: "Minecraft Player Died",
                description: "Runs when the linked Minecraft player dies.",
                cached: false
            },
            {
                id: "quest-started",
                name: "Minecraft Quest Started",
                description: "Runs when a viewer quest starts.",
                cached: false
            },
            {
                id: "quest-progress",
                name: "Minecraft Quest Progress",
                description: "Runs when a viewer quest updates.",
                cached: false
            },
            {
                id: "quest-completed",
                name: "Minecraft Quest Completed",
                description: "Runs when a viewer quest is completed.",
                cached: false
            },
            {
                id: "quest-abandoned",
                name: "Minecraft Quest Abandoned",
                description: "Runs when a viewer quest is abandoned.",
                cached: false
            }
        ]
    });
}


function minecraftFilterEvent(eventId) {
    return { eventSourceId: SCRIPT_ID, eventId };
}

function minecraftFilterEvents(eventIds) {
    return eventIds.map(minecraftFilterEvent);
}

function addBuiltInFilterToEvents(filterId, events) {
    if (!modules || !modules.eventFilterManager || typeof modules.eventFilterManager.addEventToFilter !== "function") {
        return;
    }
    if (typeof modules.eventFilterManager.getFilterById === "function" && !modules.eventFilterManager.getFilterById(filterId)) {
        return;
    }
    for (const event of events) {
        try {
            if (typeof modules.eventFilterManager.getFiltersForEvent === "function") {
                const filters = modules.eventFilterManager.getFiltersForEvent(event.eventSourceId, event.eventId) || [];
                if (filters.some(filter => filter && filter.id === filterId)) {
                    continue;
                }
            }
            modules.eventFilterManager.addEventToFilter(filterId, event.eventSourceId, event.eventId);
        } catch (error) {
            modules.logger.warn(`${SCRIPT_NAME}: Could not add filter ${filterId} to ${event.eventId}.`);
        }
    }
}

function registerFilter(filter) {
    if (!filter || !modules || !modules.eventFilterManager || typeof modules.eventFilterManager.registerFilter !== "function") {
        return;
    }
    try {
        if (typeof modules.eventFilterManager.getFilterById === "function" && modules.eventFilterManager.getFilterById(filter.id)) {
            return;
        }
        modules.eventFilterManager.registerFilter(filter);
    } catch (error) {
        modules.logger.warn(`${SCRIPT_NAME}: Could not register filter ${filter.id}.`);
    }
}

function registerTextEventFilter(id, name, description, events, eventMetaKey) {
    if (!modules.eventFilterFactory || typeof modules.eventFilterFactory.createTextFilter !== "function") {
        return;
    }
    registerFilter(modules.eventFilterFactory.createTextFilter({
        id: `${SCRIPT_ID}:${id}`,
        name,
        description,
        events,
        eventMetaKey,
        caseInsensitive: true
    }));
}

function registerNumberEventFilter(id, name, description, events, eventMetaKey) {
    if (!modules.eventFilterFactory || typeof modules.eventFilterFactory.createNumberFilter !== "function") {
        return;
    }
    registerFilter(modules.eventFilterFactory.createNumberFilter({
        id: `${SCRIPT_ID}:${id}`,
        name,
        description,
        events,
        eventMetaKey
    }));
}

function registerPresetEventFilter(id, name, description, events, eventMetaKey, values) {
    if (!modules.eventFilterFactory || typeof modules.eventFilterFactory.createPresetFilter !== "function") {
        return;
    }
    registerFilter(modules.eventFilterFactory.createPresetFilter({
        id: `${SCRIPT_ID}:${id}`,
        name,
        description,
        events,
        eventMetaKey,
        allowIsNot: true,
        presetValues: async () => values.map(value => ({ value, display: value }))
    }));
}

function registerEventFilters() {
    if (!modules || !modules.eventFilterManager) {
        return;
    }
    const allEvents = minecraftFilterEvents(MINECRAFT_EVENT_IDS);
    const bridgeEvents = minecraftFilterEvents(["bridge-message"]);
    const playerDiedEvents = minecraftFilterEvents(["player-died"]);
    const questEvents = minecraftFilterEvents(QUEST_EVENT_IDS);

    addBuiltInFilterToEvents("firebot:channel-live", allEvents);
    addBuiltInFilterToEvents("firebot:viewerroles", questEvents);
    addBuiltInFilterToEvents("firebot:viewerranks", questEvents);

    registerPresetEventFilter("bridge-level", "Bridge Level", "Filter by bridge message level.", bridgeEvents, "level", ["Info", "Warning", "Error"]);
    registerTextEventFilter("bridge-action", "Bridge Action", "Filter by the Minecraft action attached to the bridge message.", bridgeEvents, "action");
    registerTextEventFilter("bridge-message", "Bridge Message", "Filter by bridge message text.", bridgeEvents, "message");

    registerTextEventFilter("death-player-name", "Minecraft Player Name", "Filter by the Minecraft player name.", playerDiedEvents, "playerName");
    registerTextEventFilter("death-cause", "Death Cause", "Filter by Minecraft death cause.", playerDiedEvents, "deathCause");
    registerTextEventFilter("death-dimension", "Death Dimension", "Filter by the dimension where the player died.", playerDiedEvents, "dimensionId");
    registerTextEventFilter("death-attacker-type", "Attacker Type", "Filter by the entity type that killed the player.", playerDiedEvents, "attackerTypeId");
    registerTextEventFilter("death-direct-entity-type", "Direct Damage Source", "Filter by the direct damage source entity type.", playerDiedEvents, "directEntityTypeId");

    registerTextEventFilter("quest-name", "Quest Name", "Filter by quest name.", questEvents, "questName");
    registerTextEventFilter("quest-id", "Quest ID", "Filter by quest ID.", questEvents, "questId");
    registerTextEventFilter("quest-viewer-name", "Quest Viewer Name", "Filter by the viewer attached to the quest.", questEvents, "viewerName");
    registerTextEventFilter("quest-player-name", "Quest Player Name", "Filter by the Minecraft player attached to the quest.", questEvents, "playerName");
    registerPresetEventFilter("quest-type", "Quest Type", "Filter by quest type.", questEvents, "questType", QUEST_TYPES);
    registerPresetEventFilter("quest-display-mode", "Quest Display Mode", "Filter by quest display mode.", questEvents, "displayMode", QUEST_DISPLAY_MODES);
    registerPresetEventFilter("quest-random-reward", "Random Reward", "Filter by whether the quest uses random rewards.", questEvents, "randomReward", ["true", "false"]);
    registerNumberEventFilter("quest-progress", "Quest Progress", "Filter by current quest progress.", questEvents, "progress");
    registerNumberEventFilter("quest-target", "Quest Target", "Filter by quest target amount.", questEvents, "target");
    registerNumberEventFilter("quest-remaining", "Quest Remaining", "Filter by remaining quest progress.", questEvents, "remaining");
    registerNumberEventFilter("quest-percent", "Quest Percent", "Filter by quest completion percent.", questEvents, "percent");
}

function createTextVariable(handle, description, eventId, key, examples, options) {
    const variableOptions = options || {};
    const definition = {
        handle,
        description,
        possibleDataOutput: ["text"],
        categories: ["common", "integrations"],
        triggers: variableOptions.triggers || {
            event: variableOptions.allEvents ? true : Array.isArray(eventId) ? eventId.map(id => `${SCRIPT_ID}:${id}`) : [`${SCRIPT_ID}:${eventId}`],
            manual: true,
            command: true
        }
    };
    return {
        definition,
        evaluator: trigger => {
            if (trigger && trigger.metadata && trigger.metadata.eventData && trigger.metadata.eventData[key] != null) {
                return String(trigger.metadata.eventData[key]);
            }
            return variableOptions.preserveWhenMissing ? `$${handle}` : "";
        }
    };
}

function createQuestVariable(handle, description, key) {
    return createTextVariable(handle, description, ["quest-started", "quest-progress", "quest-completed", "quest-abandoned"], key, undefined, {
        triggers: {
            command: true,
            custom_script: true,
            startup_script: true,
            api: true,
            event: true,
            hotkey: true,
            timer: true,
            scheduled_task: true,
            counter: true,
            preset: true,
            quick_action: true,
            manual: true,
            channel_reward: true,
            power_up: true,
            overlay_widget: true
        },
        preserveWhenMissing: true
    });
}

function createStatsVariable(handle, description, key) {
    return {
        definition: {
            handle,
            description,
            possibleDataOutput: ["text"],
            categories: ["integrations", "minecraft"],
            triggers: {
                manual: true,
                event: [`${SCRIPT_ID}:bridge-message`, `${SCRIPT_ID}:quest-started`, `${SCRIPT_ID}:quest-progress`, `${SCRIPT_ID}:quest-completed`, `${SCRIPT_ID}:quest-abandoned`]
            }
        },
        evaluator: () => {
            const config = loadConfig();
            return config.fetchedStats && config.fetchedStats[key] != null ? String(config.fetchedStats[key]) : "0";
        }
    };
}

function registerVariables() {
    if (!modules || !modules.replaceVariableManager) {
        return;
    }
    const variables = [
        createTextVariable("minecraftBridgeLevel", "Bridge message level.", "bridge-message", "level", [
            { usage: "minecraftBridgeLevel", description: "Shows Info, Warning, or Error from the latest bridge message event." }
        ]),
        createTextVariable("minecraftBridgeMessage", "Bridge message text.", "bridge-message", "message", [
            { usage: "minecraftBridgeMessage", description: "Shows the reason the bridge message event fired." }
        ]),
        createTextVariable("minecraftBridgeAction", "Minecraft action that caused the bridge message.", "bridge-message", "action", [
            { usage: "minecraftBridgeAction", description: "Shows the Minecraft effect action, like give_item or spawn_mob." }
        ]),
        createTextVariable("minecraftPlayerName", "Your Minecraft account name from the event.", "player-died", "playerName", [
            { usage: "minecraftPlayerName", description: "Shows the Minecraft username from a Minecraft Player Died event." }
        ]),
        createTextVariable("minecraftPlayerDisplayName", "Your Minecraft display name from the event.", "player-died", "playerDisplayName", [
            { usage: "minecraftPlayerDisplayName", description: "Shows the readable player display name from a Minecraft Player Died event." }
        ]),
        createTextVariable("minecraftDeathMessage", "Full Minecraft death message for your death.", "player-died", "deathMessage", [
            { usage: "minecraftDeathMessage", description: "Shows the full death message, like CathieNova was slain by Zombie." }
        ]),
        createTextVariable("minecraftDeathCause", "Minecraft death cause ID for your death.", "player-died", "deathCause", [
            { usage: "minecraftDeathCause", description: "Shows the damage cause ID, like player_attack, mob_attack, lava, or fall." }
        ]),
        createTextVariable("minecraftDeathDimensionId", "Dimension ID where you died.", "player-died", "dimensionId", [
            { usage: "minecraftDeathDimensionId", description: "Shows the raw dimension ID, like minecraft:overworld." }
        ]),
        createTextVariable("minecraftDeathDimensionDisplayName", "Readable dimension name where you died.", "player-died", "dimensionDisplayName", [
            { usage: "minecraftDeathDimensionDisplayName", description: "Shows a readable dimension name, like Overworld or The Nether." }
        ]),
        createTextVariable("minecraftDeathDimension", "Dimension ID where you died.", "player-died", "dimension", [
            { usage: "minecraftDeathDimension", description: "Same as minecraftDeathDimensionId." }
        ]),
        createTextVariable("minecraftDeathPosition", "Where you died as text.", "player-died", "position", [
            { usage: "minecraftDeathPosition", description: "Shows coordinates in one line, like X: 1, Y: 64, Z: 5." }
        ]),
        createTextVariable("minecraftDeathX", "X position where you died.", "player-died", "x", [
            { usage: "minecraftDeathX", description: "Shows only the X coordinate from the death location." }
        ]),
        createTextVariable("minecraftDeathY", "Y position where you died.", "player-died", "y", [
            { usage: "minecraftDeathY", description: "Shows only the Y coordinate from the death location." }
        ]),
        createTextVariable("minecraftDeathZ", "Z position where you died.", "player-died", "z", [
            { usage: "minecraftDeathZ", description: "Shows only the Z coordinate from the death location." }
        ]),
        createTextVariable("minecraftDeathAttackerName", "Name of the entity that killed you.", "player-died", "attackerName", [
            { usage: "minecraftDeathAttackerName", description: "Shows the attacker name when Minecraft provides one." }
        ]),
        createTextVariable("minecraftDeathAttackerTypeId", "Entity type ID that killed you.", "player-died", "attackerTypeId", [
            { usage: "minecraftDeathAttackerTypeId", description: "Shows the attacker type ID, like minecraft:zombie." }
        ]),
        createTextVariable("minecraftDeathAttackerTypeDisplayName", "Readable entity type that killed you.", "player-died", "attackerTypeDisplayName", [
            { usage: "minecraftDeathAttackerTypeDisplayName", description: "Shows the attacker type as readable text, like Zombie." }
        ]),
        createTextVariable("minecraftDeathAttackerType", "Entity type ID that killed you.", "player-died", "attackerType", [
            { usage: "minecraftDeathAttackerType", description: "Same as minecraftDeathAttackerTypeId." }
        ]),
        createTextVariable("minecraftDeathDirectEntityName", "Name of the direct damage source that killed you.", "player-died", "directEntityName", [
            { usage: "minecraftDeathDirectEntityName", description: "Shows the projectile or direct source name when available." }
        ]),
        createTextVariable("minecraftDeathDirectEntityTypeId", "Entity type ID of the direct damage source that killed you.", "player-died", "directEntityTypeId", [
            { usage: "minecraftDeathDirectEntityTypeId", description: "Shows the direct source type ID, like minecraft:arrow." }
        ]),
        createTextVariable("minecraftDeathDirectEntityTypeDisplayName", "Readable entity type of the direct damage source that killed you.", "player-died", "directEntityTypeDisplayName", [
            { usage: "minecraftDeathDirectEntityTypeDisplayName", description: "Shows the direct source type as readable text, like Arrow." }
        ]),
        createTextVariable("minecraftDeathDirectEntityType", "Entity type ID of the direct damage source that killed you.", "player-died", "directEntityType", [
            { usage: "minecraftDeathDirectEntityType", description: "Same as minecraftDeathDirectEntityTypeId." }
        ]),
        createQuestVariable("minecraftQuestStatus", "Current viewer quest status.", "questStatus"),
        createQuestVariable("minecraftQuestName", "Current viewer quest name.", "questName"),
        createQuestVariable("minecraftQuestId", "Quest ID from the current viewer quest.", "questId"),
        createQuestVariable("minecraftQuestViewerName", "Viewer name attached to the current quest.", "viewerName"),
        createQuestVariable("minecraftQuestReward", "Reward text attached to the current quest.", "rewardText"),
        createQuestVariable("minecraftQuestRewardItems", "Reward item list attached to the current quest.", "rewardItems"),
        createQuestVariable("minecraftQuestRandomReward", "Whether the current quest uses a random reward.", "randomReward"),
        createStatsVariable("minecraftQuestStartedCount", "Cached number of quests started by chat. Use Request Statistics first.", "questsStartedByChat"),
        createStatsVariable("minecraftQuestCompletedCount", "Cached number of quests completed by chat. Use Request Statistics first.", "questsCompletedByChat"),
        createStatsVariable("minecraftQuestAbandonedCount", "Cached number of quests abandoned by chat. Use Request Statistics first.", "questsAbandonedByChat"),
        createQuestVariable("minecraftQuestType", "Current viewer quest type.", "questType"),
        createQuestVariable("minecraftQuestObjectives", "Readable objective list for the current viewer quest.", "objectives"),
        createQuestVariable("minecraftQuestTargetIds", "IDs used by the current viewer quest.", "targetIds"),
        createQuestVariable("minecraftQuestTargetNames", "Readable target names used by the current viewer quest.", "targetNames"),
        createQuestVariable("minecraftQuestDisplayMode", "In-game display mode used by the current viewer quest.", "displayMode"),
        createQuestVariable("minecraftQuestProgress", "Current quest progress amount.", "progress"),
        createQuestVariable("minecraftQuestTarget", "Current quest target amount.", "target"),
        createQuestVariable("minecraftQuestRemaining", "Amount left before the current quest is complete.", "remaining"),
        createQuestVariable("minecraftQuestPercent", "Current quest progress percent.", "percent"),
        createQuestVariable("minecraftQuestPlayerName", "Minecraft account name for the active quest.", "playerName"),
        createQuestVariable("minecraftQuestPlayerDisplayName", "Readable Minecraft display name for the active quest.", "playerDisplayName"),
        createQuestVariable("minecraftQuestPosition", "Current quest position as text.", "position"),
        createQuestVariable("minecraftQuestDimensionId", "Dimension ID for the quest update.", "dimensionId"),
        createQuestVariable("minecraftQuestDimensionDisplayName", "Readable dimension name for the quest update.", "dimensionDisplayName")
    ];
    for (const variable of variables) {
        modules.replaceVariableManager.registerReplaceVariable(variable);
    }
}

function normalizeEventMeta(eventId, meta) {
    const data = meta && typeof meta === "object" ? { ...meta } : {};
    if (QUEST_EVENT_IDS.includes(eventId)) {
        if (data.username == null && data.viewerName != null) {
            data.username = String(data.viewerName).trim();
        }
        if (data.userDisplayName == null && data.viewerName != null) {
            data.userDisplayName = String(data.viewerName).trim();
        }
    }
    return data;
}

function triggerHavenMinecraftEvent(eventId, meta) {
    if (!modules || !modules.eventManager) {
        return;
    }
    try {
        modules.eventManager.triggerEvent(SCRIPT_ID, eventId, normalizeEventMeta(eventId, meta), false);
    } catch (error) {
        modules.logger.error(`${SCRIPT_NAME}: Failed triggering event`, error);
    }
}

function triggerBridgeEventFromServer(event) {
    if (!event || typeof event !== "object") {
        return;
    }
    if (event.type === "player_died") {
        triggerHavenMinecraftEvent("player-died", event);
        return;
    }
    if (event.type === "quest_started") {
        const cached = { ...event, questStatus: "Started" };
        saveQuestCache(cached);
        triggerHavenMinecraftEvent("quest-started", cached);
        return;
    }
    if (event.type === "quest_progress") {
        const cached = { ...event, questStatus: "Progress" };
        saveQuestCache(cached);
        triggerHavenMinecraftEvent("quest-progress", cached);
        return;
    }
    if (event.type === "quest_completed") {
        const cached = { ...event, questStatus: "Completed" };
        saveQuestCache(cached);
        triggerHavenMinecraftEvent("quest-completed", cached);
        return;
    }
    if (event.type === "quest_abandoned") {
        const cached = { ...event, questStatus: "Abandoned" };
        saveQuestCache(cached);
        triggerHavenMinecraftEvent("quest-abandoned", cached);
        return;
    }
    triggerHavenMinecraftEvent("bridge-message", event);
}

function startBridgeEventPolling() {
    if (bridgeEventTimer != null) {
        clearInterval(bridgeEventTimer);
    }
    bridgeEventTimer = setInterval(async () => {
        try {
            const raw = await sendBridgeGet("/events");
            const reply = parseBridgeReply(raw);
            const events = reply && reply.data && Array.isArray(reply.data.events) ? reply.data.events : [];
            for (const event of events) {
                triggerBridgeEventFromServer(event);
            }
        } catch (error) {
        }
    }, 2000);
}

function attr(value) {
    return String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/"/g, "&quot;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}

function html(value) {
    return String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}

function tooltip(text) {
    if (!text) {
        return "";
    }
    return ` title-tooltip="${attr(text)}"`;
}

function inlineTooltip(text) {
    if (!text) {
        return "";
    }
    const safeText = String(text).replace(/'/g, "&#39;");
    return ` <tooltip text="'${safeText}'"></tooltip>`;
}

function effectTemplate(content) {
    return `
        <style>
            .haven-minecraft-effect{display:block}
            .haven-minecraft-effect > eos-container{display:block;margin-bottom:22px!important}
            .haven-minecraft-field{display:block;margin:0 0 18px 0!important;padding:0 0 2px 0!important}
            .haven-minecraft-field firebot-input{display:block;width:100%;margin-bottom:0!important}
            .haven-minecraft-note{display:block;color:#aaa0b8;font-size:12px;line-height:1.4;margin:6px 0 14px}
            .haven-minecraft-label{display:block;font-weight:700;margin-bottom:7px;color:#fff}
            .haven-minecraft-effect dropdown-select{display:block;margin-top:4px;margin-bottom:18px}
            .haven-minecraft-effect firebot-checkbox{display:block;margin-top:10px;margin-bottom:18px}
            .haven-minecraft-examples-toggle{background:#4a3b5e;border:0;border-radius:6px;color:#fff;font-weight:700;padding:7px 10px;margin:2px 0 14px 0}
            .haven-minecraft-examples{background:#140d1d;border:1px solid #674294;border-radius:8px;box-shadow:0 0 18px rgba(0,0,0,.45);padding:12px;margin:0 0 18px 0;color:#d8cfea;max-height:360px;overflow:auto}
            .haven-minecraft-examples-title{font-weight:700;color:#fff}
            .haven-minecraft-examples-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px}
            .haven-minecraft-examples-close{background:#7a2834;border:0;border-radius:6px;color:#fff;font-weight:700;padding:4px 8px}
            .haven-minecraft-example-label{font-size:12px;font-weight:700;color:#fff;margin-top:8px}.haven-minecraft-example-note{font-size:12px;color:#aaa0b8;margin:2px 0 4px}.haven-minecraft-example-line{font-family:Consolas,monospace;font-size:12px;line-height:1.55;user-select:all;cursor:text;background:#0d0814;border-radius:4px;padding:5px 7px;margin-bottom:6px}
            .haven-minecraft-check-row{margin:12px 0 18px 0}
            .haven-minecraft-preset-actions{display:flex;gap:10px;align-items:center;margin:0 0 14px 0}
            .haven-minecraft-preset-status{font-size:12px;line-height:1.4;margin:0 0 14px 0}
            .haven-minecraft-preset-status.good{color:#8fd69a}
            .haven-minecraft-preset-status.bad{color:#ff9a9a}
            .haven-minecraft-list-row{background:#140d1d;border:1px solid #3a2b50;border-radius:7px;padding:12px;margin:0 0 12px 0}
            .haven-minecraft-row-title{display:flex;align-items:center;justify-content:space-between;font-weight:700;color:#fff;margin-bottom:10px}
            .haven-minecraft-clickable-row{cursor:pointer;user-select:none}
            .haven-minecraft-row-summary{font-size:12px;font-weight:400;color:#aaa0b8;margin-left:6px}
            .haven-minecraft-row-body{margin-top:10px}
            .haven-minecraft-small-button{background:#4a3b5e;border:0;border-radius:6px;color:#fff;font-weight:700;padding:6px 9px;margin-right:6px}
            .haven-minecraft-danger-button{background:#7a2834;border:0;border-radius:6px;color:#fff;font-weight:700;padding:6px 9px}
            .haven-minecraft-example-modal-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:9999;display:flex;align-items:center;justify-content:center}
            .haven-minecraft-example-modal{width:min(720px,calc(100vw - 80px));max-height:calc(100vh - 90px);overflow:auto;background:#140d1d;border:1px solid #674294;border-radius:8px;box-shadow:0 0 28px rgba(0,0,0,.6);padding:16px}
            .haven-minecraft-example-modal-header{display:flex;align-items:center;justify-content:space-between;font-weight:700;color:#fff;margin-bottom:10px}
            .haven-minecraft-example-modal-close{background:#7a2834;border:0;border-radius:6px;color:#fff;font-weight:700;padding:5px 9px}
        </style>
        <div class="haven-minecraft-effect">
            ${content}
        </div>
    `;
}

function note(text) {
    return `<div class="haven-minecraft-note">${text}</div>`;
}

function exampleBlock(key, title, examples) {
    const items = examples.map(example => {
        if (typeof example === "string") {
            return `<div class="haven-minecraft-example-line">${html(example)}</div>`;
        }
        const label = example.label ? `<div class="haven-minecraft-example-label">${html(example.label)}</div>` : "";
        const noteText = example.note ? `<div class="haven-minecraft-example-note">${html(example.note)}</div>` : "";
        return `${label}${noteText}<div class="haven-minecraft-example-line">${html(example.value)}</div>`;
    }).join("");
    return `
        <button type="button" class="haven-minecraft-examples-toggle" ng-click="effectHelp.${key}=!effectHelp.${key}">Show Examples</button>
        <div class="haven-minecraft-examples" ng-if="effectHelp.${key}">
            <div class="haven-minecraft-examples-header">
                <div class="haven-minecraft-examples-title">${title}</div>
                <button type="button" class="haven-minecraft-examples-close" ng-click="effectHelp.${key}=false">Close</button>
            </div>
            ${items}
        </div>
    `;
}

function versionedExampleBlock(key, title, examples1192, examples1201, examples1211, examples2612) {
    return `
        <button type="button" class="haven-minecraft-examples-toggle" ng-click="effectHelp.${key}=!effectHelp.${key}">Show Examples</button>
        <div class="haven-minecraft-examples" ng-if="effectHelp.${key}">
            <div class="haven-minecraft-examples-header">
                <div class="haven-minecraft-examples-title">${title} - {{minecraftVersion}}</div>
                <button type="button" class="haven-minecraft-examples-close" ng-click="effectHelp.${key}=false">Close</button>
            </div>
            <div ng-if="minecraftVersion === 'Forge 1.19.2'">
                ${exampleItems(examples1192)}
            </div>
            <div ng-if="minecraftVersion === 'Forge 1.20.1'">
                ${exampleItems(examples1201)}
            </div>
            <div ng-if="minecraftVersion === 'NeoForge 1.21.1'">
                ${exampleItems(examples1211)}
            </div>
            <div ng-if="minecraftVersion === 'NeoForge 26.1.2'">
                ${exampleItems(examples2612)}
            </div>
        </div>
    `;
}

function exampleItems(examples) {
    return examples.map(example => {
        if (typeof example === "string") {
            return `<div class="haven-minecraft-example-line">${html(example)}</div>`;
        }
        const label = example.label ? `<div class="haven-minecraft-example-label">${html(example.label)}</div>` : "";
        const noteText = example.note ? `<div class="haven-minecraft-example-note">${html(example.note)}</div>` : "";
        return `${label}${noteText}<div class="haven-minecraft-example-line">${html(example.value)}</div>`;
    }).join("");
}

function inputField(content) {
    return `<div class="haven-minecraft-field">${content}</div>`;
}

function numberInput(title, model, placeholder, helpText) {
    return inputField(`<firebot-input input-title="${title}"${tooltip(helpText)} model="effect.${model}" input-type="number" placeholder-text="${placeholder || "0"}" menu-position="under"></firebot-input>`);
}

function textInput(title, model, placeholder, helpText) {
    return inputField(`<firebot-input input-title="${title}"${tooltip(helpText)} model="effect.${model}" placeholder-text="${placeholder || ""}" menu-position="under"></firebot-input>`);
}

function textArea(title, model, placeholder, helpText) {
    return inputField(`<firebot-input input-title="${title}"${tooltip(helpText)} model="effect.${model}" use-text-area="true" rows="4" cols="40" placeholder-text="${placeholder || ""}" menu-position="under"></firebot-input>`);
}

function checkboxField(label, model, helpText) {
    const help = helpText ? ` tooltip="${attr(helpText)}"` : "";
    return `<div class="haven-minecraft-check-row"><firebot-checkbox label="${label}"${help} model="effect.${model}"></firebot-checkbox></div>`;
}

function dropdownField(title, model, options, helpText) {
    return inputField(`
        <div class="haven-minecraft-label">${title}${inlineTooltip(helpText)}</div>
        <dropdown-select options='${JSON.stringify(options)}' selected="effect.${model}"></dropdown-select>
    `);
}

function colorDropdownField(title, model, helpText) {
    return dropdownField(title, model, MINECRAFT_COLORS, helpText);
}

function questObjectivesTemplate() {
    return `
        <eos-container header="Objectives" pad-top="true">
            <div class="haven-minecraft-list-row" ng-repeat="objective in effect.objectives track by $index">
                <div class="haven-minecraft-row-title haven-minecraft-clickable-row" ng-click="toggleObjectiveCollapsed($index)">
                    <span>{{objectiveCollapsedMarker($index)}} {{objectiveSummary(objective)}}</span>
                    <button type="button" class="haven-minecraft-danger-button" ng-click="$event.stopPropagation(); removeObjective($index)" ng-if="effect.objectives.length > 1">Remove</button>
                </div>
                <div class="haven-minecraft-row-body" ng-if="!isObjectiveCollapsed($index)">
                    <div class="haven-minecraft-field">
                        <div class="haven-minecraft-label">Quest Type${inlineTooltip("What Minecraft should track for this objective.")}</div>
                        <dropdown-select options="questTypes" selected="objective.questType"></dropdown-select>
                    </div>
                    <div class="haven-minecraft-field">
                        <div class="haven-minecraft-label">{{questGoalTitle(objective.questType)}} <i class="fal fa-question-circle" uib-tooltip="{{questGoalHelp(objective.questType)}}" tooltip-append-to-body="true"></i></div>
                        <firebot-input model="objective.targetAmount" input-type="number" placeholder-text="10" menu-position="under"></firebot-input>
                    </div>
                    <div ng-if="objectiveUsesTargets(objective.questType)">
                        <div class="haven-minecraft-field">
                            <div class="haven-minecraft-label">{{objectiveTargetIdsTitle(objective.questType)}} <i class="fal fa-question-circle" uib-tooltip="{{objectiveTargetHelp(objective.questType)}}" tooltip-append-to-body="true"></i></div>
                            <firebot-input model="objective.targetIds" use-text-area="true" rows="4" cols="40" placeholder-text="{{objectiveTargetPlaceholder(objective.questType)}}" menu-position="under"></firebot-input>
                        </div>
                    </div>
                    <div ng-if="objective.questType === 'Deal Damage' || objective.questType === 'Deal Damage to Specific Mob' || objective.questType === 'Take Damage'">
                        <div class="haven-minecraft-check-row"><firebot-checkbox label="Use Specific Damage Filter" tooltip="Only count damage that matches the selected filter." model="objective.useDamageFilter"></firebot-checkbox></div>
                        <div ng-if="objective.useDamageFilter">
                            <div class="haven-minecraft-field">
                                <div class="haven-minecraft-label">Damage Filter${inlineTooltip("What damage should count for this objective.")}</div>
                                <dropdown-select options="['Any', 'Projectile', 'Bow / Arrow', 'Trident', 'Holding Sword', 'Holding Axe', 'Holding Bow', 'Holding Crossbow', 'Fire', 'Explosion', 'Fall', 'Magic']" selected="objective.damageFilter"></dropdown-select>
                            </div>
                        </div>
                    </div>
                    <button type="button" class="haven-minecraft-examples-toggle" ng-click="toggleObjectiveExamples($index, objective.questType)">Show Examples</button>
                    <div class="haven-minecraft-examples" ng-if="effectHelp.objectiveExamples[$index]">
                        <div class="haven-minecraft-examples-header">
                            <div class="haven-minecraft-examples-title">{{effectHelp.objectiveExamples[$index].title}}</div>
                            <button type="button" class="haven-minecraft-examples-close" ng-click="effectHelp.objectiveExamples[$index]=null">Close</button>
                        </div>
                        <div ng-repeat="example in effectHelp.objectiveExamples[$index].rows track by $index">
                            <div class="haven-minecraft-example-label" ng-if="example.label">{{example.label}}</div>
                            <div class="haven-minecraft-example-note" ng-if="example.note">{{example.note}}</div>
                            <div class="haven-minecraft-example-line">{{example.value}}</div>
                        </div>
                    </div>
                </div>
            </div>
            <button type="button" class="haven-minecraft-small-button" ng-click="addObjective()"><i class="far fa-plus"></i> Add Objective</button>
        </eos-container>
    `;
}

function questRewardsTemplate() {
    return `
        <eos-container header="Rewards" pad-top="true">
            ${checkboxField("Has Reward", "hasReward", "Gives the player item rewards when the whole quest is completed.")}
            <div ng-if="effect.hasReward">
                ${checkboxField("Random Reward", "randomReward", "Picks one reward row when rewards are claimed.")}
                <div class="haven-minecraft-list-row" ng-repeat="reward in effect.rewards track by $index">
                    <div class="haven-minecraft-row-title haven-minecraft-clickable-row" ng-click="toggleRewardCollapsed($index)">
                        <span>{{rewardCollapsedMarker($index)}} {{rewardSummary(reward)}}</span>
                        <button type="button" class="haven-minecraft-danger-button" ng-click="$event.stopPropagation(); removeReward($index)">Remove</button>
                    </div>
                    <div class="haven-minecraft-row-body" ng-if="!isRewardCollapsed($index)">
                        <div class="haven-minecraft-field">
                            <div class="haven-minecraft-label">Reward Type${inlineTooltip("Choose whether this reward gives an item or runs a server command.")}</div>
                            <dropdown-select options="['Item Reward', 'Command Reward']" selected="reward.rewardType"></dropdown-select>
                        </div>
                        <div class="haven-minecraft-field">
                            <div class="haven-minecraft-label">Reward Visibility${inlineTooltip("Controls when this reward is shown in the questbook.")}</div>
                            <dropdown-select options="['Show Rewards', 'Hide Until Completed', 'Hide Until Claimed']" selected="reward.rewardVisibility"></dropdown-select>
                        </div>
                        <div class="haven-minecraft-field" ng-if="reward.rewardType !== 'Command Reward'">
                            <div class="haven-minecraft-label">Item ID${inlineTooltip("Minecraft item ID to give as a reward.")}</div>
                            <firebot-input model="reward.itemId" placeholder-text="minecraft:stone" menu-position="under"></firebot-input>
                        </div>
                        <div class="haven-minecraft-field" ng-if="reward.rewardType !== 'Command Reward'">
                            <div class="haven-minecraft-label">Amount${inlineTooltip("How many of this item to give.")}</div>
                            <firebot-input model="reward.amount" input-type="number" placeholder-text="1" menu-position="under"></firebot-input>
                        </div>
                        <div class="haven-minecraft-field" ng-if="reward.rewardType === 'Command Reward'">
                            <div class="haven-minecraft-label">Display Name${inlineTooltip("Name shown for this command reward in the questbook. Supports § and & color codes.")}</div>
                            <firebot-input model="reward.displayName" placeholder-text="Receive Haste 3 for 10 seconds" menu-position="under"></firebot-input>
                            ${exampleBlock("commandRewardColorCodes", "Color Codes", COLOR_CODE_EXAMPLES).replace("Show Examples", "Show Color Codes")}
                        </div>
                        <div class="haven-minecraft-field" ng-if="reward.rewardType === 'Command Reward'">
                            <div class="haven-minecraft-label">Command${inlineTooltip("Server command to run when the reward is claimed. Do not include the leading slash.")}</div>
                            <firebot-input model="reward.command" placeholder-text="effect give $minecraftQuestPlayerName minecraft:haste 10 2 true" menu-position="under"></firebot-input>
                        </div>
                        <div class="haven-minecraft-field" ng-if="effect.randomReward">
                            <div class="haven-minecraft-label">Weight${inlineTooltip("Higher weight makes this reward more likely when Random Reward is enabled.")}</div>
                            <firebot-input model="reward.weight" input-type="number" placeholder-text="1" menu-position="under"></firebot-input>
                        </div>
                        <div class="haven-minecraft-check-row" ng-if="effect.randomReward"><firebot-checkbox label="Show Percentage" tooltip="Shows this reward chance in the questbook." model="reward.showPercent"></firebot-checkbox></div>
                        <div class="haven-minecraft-field" ng-if="reward.rewardType !== 'Command Reward'">
                            <div class="haven-minecraft-label">Item Data${inlineTooltip("Optional item components or NBT for this reward.")}</div>
                            <firebot-input model="reward.itemData" use-text-area="true" rows="3" cols="40" placeholder-text="Optional item data" menu-position="under"></firebot-input>
                        </div>
                        <button type="button" class="haven-minecraft-examples-toggle" ng-click="toggleRewardExamples($index, reward.rewardType)">Show Examples</button>
                        <div class="haven-minecraft-examples" ng-if="effectHelp.rewardExamples[$index]">
                            <div class="haven-minecraft-examples-header">
                                <div class="haven-minecraft-examples-title">{{effectHelp.rewardExamples[$index].title}}</div>
                                <button type="button" class="haven-minecraft-examples-close" ng-click="effectHelp.rewardExamples[$index]=null">Close</button>
                            </div>
                            <div ng-repeat="example in effectHelp.rewardExamples[$index].rows track by $index">
                                <div class="haven-minecraft-example-label" ng-if="example.label">{{example.label}}</div>
                                <div class="haven-minecraft-example-note" ng-if="example.note">{{example.note}}</div>
                                <div class="haven-minecraft-example-line">{{example.value}}</div>
                            </div>
                        </div>
                    </div>
                </div>
                <button type="button" class="haven-minecraft-small-button" ng-click="addReward()"><i class="far fa-plus"></i> Add Reward</button>
            </div>
        </eos-container>
    `;
}

function targetTemplate() {
    return "";
}

function defaultsController(defaults) {
    const defaultsJson = JSON.stringify(defaults);
    const questTypesJson = JSON.stringify(QUEST_TYPES);
    const questObjectiveExamplesJson = JSON.stringify(QUEST_OBJECTIVE_EXAMPLES);
    const questObjectiveExamples2612Json = JSON.stringify(QUEST_OBJECTIVE_EXAMPLES_2612);
    const questItemRewardExamples1192Json = JSON.stringify(QUEST_ITEM_REWARD_EXAMPLES_1192);
    const questItemRewardExamples1201Json = JSON.stringify(QUEST_ITEM_REWARD_EXAMPLES_1201);
    const questItemRewardExamples1211Json = JSON.stringify(QUEST_ITEM_REWARD_EXAMPLES_1211);
    const questItemRewardExamples2612Json = JSON.stringify(QUEST_ITEM_REWARD_EXAMPLES_2612);
    const questCommandRewardExamplesJson = JSON.stringify(QUEST_COMMAND_REWARD_EXAMPLES);
    const controller = function() {};
    controller.toString = () => `["$scope", "backendCommunicator", function($scope, backendCommunicator) {
        const defaults = ${defaultsJson};
        const questTypes = ${questTypesJson};
        const questObjectiveExamples = ${questObjectiveExamplesJson};
        const questObjectiveExamples2612 = ${questObjectiveExamples2612Json};
        const questItemRewardExamples1192 = ${questItemRewardExamples1192Json};
        const questItemRewardExamples1201 = ${questItemRewardExamples1201Json};
        const questItemRewardExamples1211 = ${questItemRewardExamples1211Json};
        const questItemRewardExamples2612 = ${questItemRewardExamples2612Json};
        const questCommandRewardExamples = ${questCommandRewardExamplesJson};
        const objectiveTargetKinds = new WeakMap();
        if ($scope.effect == null) {
            $scope.effect = {};
        }
        if ($scope.effectHelp == null) {
            $scope.effectHelp = {};
        }
        if ($scope.effectHelp.collapsedObjectives == null) {
            $scope.effectHelp.collapsedObjectives = {};
        }
        if ($scope.effectHelp.collapsedRewards == null) {
            $scope.effectHelp.collapsedRewards = {};
        }
        if ($scope.effectHelp.objectiveExamples == null) {
            $scope.effectHelp.objectiveExamples = {};
        }
        if ($scope.effectHelp.rewardExamples == null) {
            $scope.effectHelp.rewardExamples = {};
        }
        $scope.minecraftVersion = "NeoForge 1.21.1";
        $scope.questTypes = questTypes;
        function usesTargets(questType) {
            const value = String(questType || "");
            return value.indexOf("Kill Specific") === 0 || value.indexOf("Mine Specific") === 0 || value.indexOf("Craft Specific") === 0 || value.indexOf("Pick Up Specific") === 0 || value.indexOf("Deal Damage to Specific") === 0;
        }
        function defaultObjective() {
            return {
                questType: "Jump Count",
                targetAmount: 10,
                targetIds: "",
                useDamageFilter: false,
                damageFilter: "Any",
                collapsed: true
            };
        }
        function defaultReward() {
            return {
                rewardType: "Item Reward",
                itemId: "",
                amount: 1,
                itemData: "",
                command: "",
                displayName: "",
                weight: 1,
                showPercent: false,
                rewardVisibility: "Show Rewards",
                collapsed: true
            };
        }
        function defaultRandomItem() {
            return {
                itemId: "",
                amount: 1,
                itemData: "",
                collapsed: true
            };
        }
        function defaultRandomMob() {
            return {
                mobId: "",
                amount: 1,
                offsetX: 0,
                offsetY: 0,
                offsetZ: 0,
                entityData: "",
                collapsed: true
            };
        }
        function normalizeRandomItem(item) {
            const source = item || {};
            return {
                itemId: source.itemId || "",
                amount: Number(source.amount) || 1,
                itemData: source.itemData || "",
                collapsed: source.collapsed === true
            };
        }
        function normalizeRandomMob(mob) {
            const source = mob || {};
            return {
                mobId: source.mobId || "",
                amount: Number(source.amount) || 1,
                offsetX: Number(source.offsetX) || 0,
                offsetY: Number(source.offsetY) || 0,
                offsetZ: Number(source.offsetZ) || 0,
                entityData: source.entityData || "",
                collapsed: source.collapsed === true
            };
        }
        function splitRewardLine(line) {
            const value = String(line || "").trim();
            if (!value) {
                return defaultReward();
            }
            const pipeIndex = value.indexOf("|");
            const left = pipeIndex >= 0 ? value.slice(0, pipeIndex).trim() : value;
            const itemData = pipeIndex >= 0 ? value.slice(pipeIndex + 1).trim() : "";
            const amountMatch = left.match(/^(.*?)\\s+x(\\d+)$/i);
            if (amountMatch) {
                return {
                    rewardType: "Item Reward",
                    itemId: amountMatch[1].trim(),
                    amount: Number(amountMatch[2]) || 1,
                    itemData,
                    command: "",
                    displayName: "",
                    weight: 1,
                    showPercent: false,
                    rewardVisibility: "Show Rewards",
                    collapsed: true
                };
            }
            return {
                rewardType: "Item Reward",
                itemId: left.trim(),
                amount: 1,
                itemData,
                command: "",
                displayName: "",
                weight: 1,
                showPercent: false,
                rewardVisibility: "Show Rewards",
                collapsed: true
            };
        }
        function usesDamageFilter(questType) {
            return questType === "Deal Damage" || questType === "Deal Damage to Specific Mob" || questType === "Take Damage";
        }
        function targetKind(questType) {
            const value = String(questType || "");
            if (value.indexOf("Kill Specific") === 0 || value.indexOf("Deal Damage to Specific") === 0) {
                return "mob";
            }
            if (value.indexOf("Mine Specific") === 0) {
                return "block";
            }
            if (value.indexOf("Craft Specific") === 0 || value.indexOf("Pick Up Specific") === 0) {
                return "item";
            }
            return "none";
        }
        function normalizeObjective(objective) {
            const source = objective || {};
            const questType = questTypes.indexOf(source.questType) >= 0 ? source.questType : "Jump Count";
            const result = {
                questType,
                targetAmount: Number(source.targetAmount) || 10,
                collapsed: source.collapsed === true
            };
            if (usesTargets(questType)) {
                result.targetIds = source.targetIds || "";
            } else {
                result.targetIds = "";
            }
            if (usesDamageFilter(questType)) {
                result.useDamageFilter = source.useDamageFilter === true;
                result.damageFilter = source.damageFilter || "Any";
            } else {
                result.useDamageFilter = false;
                result.damageFilter = "Any";
            }
            return result;
        }
        function normalizeReward(reward) {
            const source = reward || {};
            return {
                rewardType: source.rewardType === "Command Reward" ? "Command Reward" : "Item Reward",
                itemId: source.itemId || "",
                amount: Number(source.amount) || 1,
                itemData: source.itemData || "",
                command: source.command || "",
                displayName: source.displayName || "",
                weight: Number(source.weight) || 1,
                showPercent: source.showPercent === true,
                rewardVisibility: ["Show Rewards", "Hide Until Completed", "Hide Until Claimed"].indexOf(source.rewardVisibility) >= 0 ? source.rewardVisibility : "Show Rewards",
                collapsed: source.collapsed === true
            };
        }
        function ensureQuestLists() {
            if (!Array.isArray($scope.effect.objectives) || $scope.effect.objectives.length < 1) {
                $scope.effect.objectives = [defaultObjective()];
            } else {
                $scope.effect.objectives = $scope.effect.objectives.map(normalizeObjective);
            }
            if (!Array.isArray($scope.effect.rewards)) {
                $scope.effect.rewards = [defaultReward()];
            } else if ($scope.effect.rewards.length < 1) {
                $scope.effect.rewards = [defaultReward()];
            } else {
                $scope.effect.rewards = $scope.effect.rewards.map(normalizeReward);
            }
            if (Array.isArray($scope.effect.randomItems)) {
                if ($scope.effect.randomItems.length < 1) {
                    $scope.effect.randomItems = [defaultRandomItem()];
                } else {
                    $scope.effect.randomItems = $scope.effect.randomItems.map(normalizeRandomItem);
                }
            }
            if (Array.isArray($scope.effect.randomMobs)) {
                if ($scope.effect.randomMobs.length < 1) {
                    $scope.effect.randomMobs = [defaultRandomMob()];
                } else {
                    $scope.effect.randomMobs = $scope.effect.randomMobs.map(normalizeRandomMob);
                }
            }
        }
        function collapseQuestListsForOpen() {
            ($scope.effect.objectives || []).forEach(function(objective) {
                objective.collapsed = true;
            });
            ($scope.effect.rewards || []).forEach(function(reward) {
                reward.collapsed = true;
            });
            ($scope.effect.randomItems || []).forEach(function(item) {
                item.collapsed = true;
            });
            ($scope.effect.randomMobs || []).forEach(function(mob) {
                mob.collapsed = true;
            });
        }
        $scope.addObjective = function() {
            $scope.effect.objectives.push(defaultObjective());
        };
        $scope.removeObjective = function(index) {
            if ($scope.effect.objectives.length <= 1) {
                return;
            }
            $scope.effect.objectives.splice(index, 1);
        };
        $scope.addReward = function() {
            $scope.effect.rewards.push(defaultReward());
        };
        $scope.removeReward = function(index) {
            if ($scope.effect.rewards.length <= 1) {
                $scope.effect.rewards[index] = defaultReward();
                return;
            }
            $scope.effect.rewards.splice(index, 1);
        };
        $scope.addRandomItem = function() {
            if (!Array.isArray($scope.effect.randomItems)) {
                $scope.effect.randomItems = [];
            }
            $scope.effect.randomItems.push(defaultRandomItem());
        };
        $scope.removeRandomItem = function(index) {
            if (!Array.isArray($scope.effect.randomItems)) {
                $scope.effect.randomItems = [defaultRandomItem()];
                return;
            }
            if ($scope.effect.randomItems.length <= 1) {
                $scope.effect.randomItems[index] = defaultRandomItem();
                return;
            }
            $scope.effect.randomItems.splice(index, 1);
        };
        $scope.addRandomMob = function() {
            if (!Array.isArray($scope.effect.randomMobs)) {
                $scope.effect.randomMobs = [];
            }
            $scope.effect.randomMobs.push(defaultRandomMob());
        };
        $scope.removeRandomMob = function(index) {
            if (!Array.isArray($scope.effect.randomMobs)) {
                $scope.effect.randomMobs = [defaultRandomMob()];
                return;
            }
            if ($scope.effect.randomMobs.length <= 1) {
                $scope.effect.randomMobs[index] = defaultRandomMob();
                return;
            }
            $scope.effect.randomMobs.splice(index, 1);
        };
        $scope.toggleObjectiveCollapsed = function(index) {
            $scope.effect.objectives[index].collapsed = !$scope.effect.objectives[index].collapsed;
        };
        $scope.isObjectiveCollapsed = function(index) {
            return $scope.effect.objectives[index] && $scope.effect.objectives[index].collapsed === true;
        };
        $scope.objectiveCollapsedMarker = function(index) {
            return $scope.isObjectiveCollapsed(index) ? "+" : "-";
        };
        $scope.toggleRewardCollapsed = function(index) {
            $scope.effect.rewards[index].collapsed = !$scope.effect.rewards[index].collapsed;
        };
        $scope.isRewardCollapsed = function(index) {
            return $scope.effect.rewards[index] && $scope.effect.rewards[index].collapsed === true;
        };
        $scope.rewardCollapsedMarker = function(index) {
            return $scope.isRewardCollapsed(index) ? "+" : "-";
        };
        $scope.toggleRandomItemCollapsed = function(index) {
            $scope.effect.randomItems[index].collapsed = !$scope.effect.randomItems[index].collapsed;
        };
        $scope.isRandomItemCollapsed = function(index) {
            return $scope.effect.randomItems[index] && $scope.effect.randomItems[index].collapsed === true;
        };
        $scope.randomItemCollapsedMarker = function(index) {
            return $scope.isRandomItemCollapsed(index) ? "+" : "-";
        };
        $scope.toggleRandomMobCollapsed = function(index) {
            $scope.effect.randomMobs[index].collapsed = !$scope.effect.randomMobs[index].collapsed;
        };
        $scope.isRandomMobCollapsed = function(index) {
            return $scope.effect.randomMobs[index] && $scope.effect.randomMobs[index].collapsed === true;
        };
        $scope.randomMobCollapsedMarker = function(index) {
            return $scope.isRandomMobCollapsed(index) ? "+" : "-";
        };
        function firstTargetId(targetIds) {
            const lines = String(targetIds || "").split(/\\r?\\n/).map(function(line) { return line.trim(); }).filter(Boolean);
            if (lines.length < 1) {
                return "";
            }
            const first = lines[0].split("|")[0].trim();
            return first + (lines.length > 1 ? " ++" : "");
        }
        $scope.objectiveSummary = function(objective) {
            const source = objective || {};
            const target = usesTargets(source.questType) ? firstTargetId(source.targetIds) : "";
            return String(source.questType || "Objective") + (target ? " " + target : "");
        };
        $scope.rewardSummary = function(reward) {
            const source = reward || {};
            if (source.rewardType === "Command Reward") {
                const displayName = String(source.displayName || "").trim();
                const command = String(source.command || "No command selected");
                return "Command: " + (displayName || command);
            }
            const itemId = String(source.itemId || "No item selected");
            const amount = Math.max(1, Number(source.amount) || 1);
            return itemId + (source.itemId ? " x" + amount : "");
        };
        $scope.randomItemSummary = function(item) {
            const source = item || {};
            const itemId = String(source.itemId || "No item selected");
            const amount = Math.max(1, Number(source.amount) || 1);
            return itemId + (source.itemId ? " x" + amount : "");
        };
        $scope.randomMobSummary = function(mob) {
            const source = mob || {};
            const mobId = String(source.mobId || "No mob selected");
            const amount = Math.max(1, Number(source.amount) || 1);
            return mobId + (source.mobId ? " x" + amount : "");
        };
        $scope.toggleObjectiveExamples = function(index, questType) {
            if ($scope.effectHelp.objectiveExamples[index]) {
                $scope.effectHelp.objectiveExamples[index] = null;
                return;
            }
            $scope.effectHelp.objectiveExamples[index] = objectiveExamplesFor(questType);
        };
        function rewardExamplesFor(rewardType) {
            if (rewardType === "Command Reward") {
                return {
                    title: "Command Reward Examples",
                    rows: questCommandRewardExamples
                };
            }
            let rows = questItemRewardExamples1211;
            if ($scope.minecraftVersion === "Forge 1.19.2") {
                rows = questItemRewardExamples1192;
            } else if ($scope.minecraftVersion === "Forge 1.20.1") {
                rows = questItemRewardExamples1201;
            } else if ($scope.minecraftVersion === "NeoForge 26.1.2") {
                rows = questItemRewardExamples2612;
            }
            return {
                title: "Item Data Examples - " + $scope.minecraftVersion,
                rows
            };
        }
        function objectiveExamplesFor(questType) {
            const examples = $scope.minecraftVersion === "NeoForge 26.1.2" ? questObjectiveExamples2612 : questObjectiveExamples;
            return {
                title: "Examples - " + String(questType || "Objective"),
                rows: examples[questType] || examples["Jump Count"] || []
            };
        }
        $scope.toggleRewardExamples = function(index, rewardType) {
            if ($scope.effectHelp.rewardExamples[index]) {
                $scope.effectHelp.rewardExamples[index] = null;
                return;
            }
            $scope.effectHelp.rewardExamples[index] = rewardExamplesFor(rewardType);
        };
        $scope.$watchCollection("effect.rewards", function(rewards) {
            (rewards || []).forEach(function(reward, index) {
                if ($scope.effectHelp.rewardExamples[index]) {
                    $scope.effectHelp.rewardExamples[index] = rewardExamplesFor(reward.rewardType);
                }
            });
        });
        $scope.$watch("minecraftVersion", function() {
            ($scope.effect.rewards || []).forEach(function(reward, index) {
                if ($scope.effectHelp.rewardExamples[index]) {
                    $scope.effectHelp.rewardExamples[index] = rewardExamplesFor(reward.rewardType);
                }
            });
        });
        $scope.$watchCollection("effect.objectives", function(objectives) {
            (objectives || []).forEach(function(objective, index) {
                if ($scope.effectHelp.objectiveExamples[index]) {
                    $scope.effectHelp.objectiveExamples[index] = objectiveExamplesFor(objective.questType);
                }
            });
        });
        $scope.objectiveUsesTargets = usesTargets;
        $scope.objectiveTargetIdsTitle = function(questType) {
            const value = String(questType || "");
            if (value.indexOf("Kill Specific") === 0 || value.indexOf("Deal Damage to Specific") === 0) {
                return "Mob IDs";
            }
            if (value.indexOf("Mine Specific") === 0) {
                return "Block IDs";
            }
            return "Item IDs";
        };
        $scope.objectiveTargetPlaceholder = function(questType) {
            const value = String(questType || "");
            if (value.indexOf("Kill Specific") === 0 || value.indexOf("Deal Damage to Specific") === 0) {
                return "minecraft:zombie";
            }
            if (value.indexOf("Mine Specific") === 0) {
                return "minecraft:stone";
            }
            return "minecraft:stone";
        };
        $scope.objectiveTargetHelp = function(questType) {
            const value = String(questType || "");
            if (value.indexOf("Kill Specific") === 0 || value.indexOf("Deal Damage to Specific") === 0) {
                return "Mob IDs, mob tags, or mob IDs with data. One per line.";
            }
            if (value.indexOf("Mine Specific") === 0) {
                return "Block IDs or block tags. One per line.";
            }
            return "Item IDs, item tags, or item IDs with data. One per line.";
        };
        $scope.questGoalTitle = function(questType) {
            switch (questType) {
                case "Walk Distance":
                case "Sprint Distance":
                case "Swim Distance":
                    return "Blocks To Travel";
                case "Jump Count":
                    return "Jumps Needed";
                case "Kill Any Mob":
                case "Kill Specific Mob":
                    return "Mobs To Kill";
                case "Mine Any Block":
                case "Mine Specific Block":
                    return "Blocks To Mine";
                case "Craft Any Item X Times":
                case "Craft Specific Item X Times":
                    return "Crafts Needed";
                case "Craft Any Item Amount":
                case "Craft Specific Item Amount":
                    return "Items To Craft";
                case "Pick Up Any Item":
                case "Pick Up Specific Item":
                    return "Items To Pick Up";
                case "Deal Damage":
                case "Deal Damage to Specific Mob":
                    return "Damage To Deal";
                case "Take Damage":
                    return "Damage To Take";
                default:
                    return "Goal";
            }
        };
        $scope.questGoalNote = function(questType) {
            switch (questType) {
                case "Walk Distance": return "Amount of blocks to walk.";
                case "Sprint Distance": return "Amount of blocks to sprint.";
                case "Swim Distance": return "Amount of blocks to swim.";
                case "Jump Count": return "Amount of jumps needed.";
                case "Kill Any Mob": return "Amount of mobs to kill.";
                case "Kill Specific Mob": return "Amount of matching mobs to kill.";
                case "Mine Any Block": return "Amount of blocks to mine.";
                case "Mine Specific Block": return "Amount of matching blocks to mine.";
                case "Craft Any Item X Times": return "Amount of craft actions to complete. A recipe that gives 4 items still counts as 1 craft.";
                case "Craft Specific Item X Times": return "Amount of matching craft actions to complete. A recipe that gives 4 items still counts as 1 craft.";
                case "Craft Any Item Amount": return "Amount of crafted item output to make.";
                case "Craft Specific Item Amount": return "Amount of matching crafted item output to make.";
                case "Pick Up Any Item": return "Amount of dropped items to pick up.";
                case "Pick Up Specific Item": return "Amount of matching dropped items to pick up.";
                case "Deal Damage": return "Amount of damage to deal. 20 equals 10 hearts.";
                case "Deal Damage to Specific Mob": return "Amount of damage to deal to matching mobs. 20 equals 10 hearts.";
                case "Take Damage": return "Amount of damage to take. 20 equals 10 hearts.";
                default: return "Amount needed to finish the quest.";
            }
        };
        $scope.questGoalHelp = function(questType) {
            switch (questType) {
                case "Walk Distance":
                case "Sprint Distance":
                case "Swim Distance": return "Distance in blocks.";
                case "Jump Count": return "How many jumps are needed.";
                case "Kill Any Mob":
                case "Kill Specific Mob": return "How many mobs must be killed.";
                case "Mine Any Block":
                case "Mine Specific Block": return "How many blocks must be mined.";
                case "Craft Any Item X Times":
                case "Craft Specific Item X Times": return "How many craft actions are needed.";
                case "Craft Any Item Amount":
                case "Craft Specific Item Amount": return "How many crafted output items are needed.";
                case "Pick Up Any Item":
                case "Pick Up Specific Item": return "How many dropped items must be picked up.";
                case "Deal Damage":
                case "Deal Damage to Specific Mob": return "How much damage must be dealt. 20 damage equals 10 hearts.";
                case "Take Damage": return "How much damage the player must take. 20 damage equals 10 hearts.";
                default: return "Amount needed to finish the quest.";
            }
        };
        $scope.$watch("effect.objectives", function(objectives) {
            (objectives || []).forEach(function(objective) {
                if (!objective || questTypes.indexOf(objective.questType) < 0) {
                    return;
                }
                const kind = targetKind(objective.questType);
                const previousKind = objectiveTargetKinds.get(objective);
                if (previousKind !== undefined && previousKind !== kind) {
                    objective.targetIds = "";
                }
                objectiveTargetKinds.set(objective, kind);
                if (!usesTargets(objective.questType)) {
                    objective.targetIds = "";
                }
                if (!usesDamageFilter(objective.questType)) {
                    objective.useDamageFilter = false;
                    objective.damageFilter = "Any";
                }
            });
        }, true);
        function setQuestPresetStatus(message, failed) {
            $scope.effectHelp.questPresetMessage = message || "";
            $scope.effectHelp.questPresetFailed = failed === true;
            if (typeof $scope.$applyAsync === "function") {
                $scope.$applyAsync();
            }
        }
        function makeQuestPresetFileName() {
            const source = $scope.effect.questId || $scope.effect.questName || "quest-preset";
            const fileName = String(source).trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
            return (fileName || "quest-preset") + ".json";
        }
        function cleanObjectiveForPreset(objective) {
            const normalized = normalizeObjective(objective);
            const result = {
                questType: normalized.questType,
                targetAmount: normalized.targetAmount,
                collapsed: normalized.collapsed === true
            };
            if (usesTargets(normalized.questType)) {
                result.targetIds = normalized.targetIds || "";
            }
            if (usesDamageFilter(normalized.questType) && normalized.useDamageFilter === true) {
                result.useDamageFilter = true;
                result.damageFilter = normalized.damageFilter || "Any";
            }
            return result;
        }
        function cleanRewardForPreset(reward) {
            const normalized = normalizeReward(reward);
            const result = {
                rewardType: normalized.rewardType,
                collapsed: normalized.collapsed === true
            };
            if (normalized.rewardVisibility !== "Show Rewards") {
                result.rewardVisibility = normalized.rewardVisibility;
            }
            if ($scope.effect.randomReward === true) {
                result.weight = normalized.weight;
                if (normalized.showPercent === true) {
                    result.showPercent = true;
                }
            }
            if (normalized.rewardType === "Command Reward") {
                if (normalized.displayName) {
                    result.displayName = normalized.displayName;
                }
                result.command = normalized.command || "";
            } else {
                result.itemId = normalized.itemId || "";
                result.amount = normalized.amount;
                if (normalized.itemData) {
                    result.itemData = normalized.itemData;
                }
            }
            return result;
        }
        function currentQuestPreset() {
            ensureQuestLists();
            const preset = {
                questName: $scope.effect.questName || "",
                questId: $scope.effect.questId || "",
                viewerName: $scope.effect.viewerName || "",
                hasReward: $scope.effect.hasReward === true,
                objectives: ($scope.effect.objectives || []).map(cleanObjectiveForPreset),
                displayMode: $scope.effect.displayMode || "None"
            };
            if ($scope.effect.hasReward === true) {
                preset.randomReward = $scope.effect.randomReward === true;
                preset.rewards = ($scope.effect.rewards || []).map(cleanRewardForPreset).filter(function(reward) { return reward.rewardType === "Command Reward" ? reward.command : reward.itemId || reward.itemData; });
            }
            return preset;
        }
        function applyQuestPreset(preset) {
            if (!preset || typeof preset !== "object") {
                setQuestPresetStatus("Invalid quest preset.", true);
                return;
            }
            $scope.effect = angular.copy(defaults);
            Object.keys(preset).forEach(function(key) {
                $scope.effect[key] = preset[key];
            });
            ensureQuestLists();
            setQuestPresetStatus("Quest preset loaded.", false);
        }
        $scope.loadQuestPreset = function() {
            if (!backendCommunicator || typeof backendCommunicator.fireEventAsync !== "function") {
                setQuestPresetStatus("File browser is not available.", true);
                return;
            }
            setQuestPresetStatus("", false);
            backendCommunicator.fireEventAsync("open-file-browser", {
                options: {
                    title: "Load Quest Preset",
                    buttonLabel: "Load Preset",
                    filters: [{ name: "Quest Preset JSON", extensions: ["json"] }]
                }
            }).then(function(response) {
                if (!response || !response.path) {
                    return;
                }
                backendCommunicator.fireEventAsync("haven-minecraft:load-quest-preset", response.path).then(function(result) {
                    if (result && result.ok) {
                        applyQuestPreset(result.preset);
                    } else {
                        setQuestPresetStatus(result && result.error ? result.error : "Could not load quest preset.", true);
                    }
                }, function() {
                    setQuestPresetStatus("Could not load quest preset.", true);
                });
            }, function() {
                setQuestPresetStatus("Could not open file browser.", true);
            });
        };
        $scope.saveQuestPreset = function() {
            if (!backendCommunicator || typeof backendCommunicator.fireEventAsync !== "function") {
                setQuestPresetStatus("Save dialog is not available.", true);
                return;
            }
            setQuestPresetStatus("", false);
            backendCommunicator.fireEventAsync("show-save-dialog", {
                options: {
                    title: "Save Quest Preset",
                    buttonLabel: "Save Preset",
                    defaultPath: makeQuestPresetFileName(),
                    filters: [{ name: "Quest Preset JSON", extensions: ["json"] }]
                }
            }).then(function(response) {
                if (!response || response.canceled || !response.filePath) {
                    return;
                }
                backendCommunicator.fireEventAsync("haven-minecraft:save-quest-preset", {
                    filePath: response.filePath,
                    preset: currentQuestPreset()
                }).then(function(result) {
                    if (result && result.ok) {
                        setQuestPresetStatus("Quest preset saved.", false);
                    } else {
                        setQuestPresetStatus(result && result.error ? result.error : "Could not save quest preset.", true);
                    }
                }, function() {
                    setQuestPresetStatus("Could not save quest preset.", true);
                });
            }, function() {
                setQuestPresetStatus("Could not open save dialog.", true);
            });
        };
        Object.keys(defaults).forEach(key => {
            if ($scope.effect[key] === undefined || $scope.effect[key] === null || $scope.effect[key] === "") {
                $scope.effect[key] = defaults[key];
            }
        });
        ensureQuestLists();
        collapseQuestListsForOpen();
        if (backendCommunicator && typeof backendCommunicator.fireEventAsync === "function") {
            backendCommunicator.fireEventAsync("haven-minecraft:get-config").then(function(config) {
                if (config && config.minecraftVersion) {
                    $scope.minecraftVersion = config.minecraftVersion;
                    if (typeof $scope.$applyAsync === "function") {
                        $scope.$applyAsync();
                    }
                }
            });
        }
    }]`;
    return controller;
}

function makeEffect(id, name, description, template, defaults, action, keys, addData) {
    return {
        definition: {
            id: `cathienova:haven-minecraft-${id}`,
            name: `Minecraft: ${name}`,
            description,
            icon: "fad fa-cube",
            categories: ["integrations"]
        },
        optionsTemplate: effectTemplate(template),
        optionsController: defaultsController(defaults),
        onTriggerEvent: async ({ effect }) => {
            try {
                return await runMinecraftEffect(action, effect, keys, addData);
            } catch (error) {
                modules.logger.error(`${SCRIPT_NAME}: ${name} failed`, error);
                return false;
            }
        }
    };
}

function registerEffect(effect) {
    modules.effectManager.registerEffect(effect);
}

function registerEffects() {
    const spawnMobExamples1201 = [
        { label: "Viewer name", note: "Names the mob after the viewer and keeps it from despawning.", value: "{Tags:[\"Viewer Spawn\"],CustomName:'{\"text\":\"$userDisplayName\",\"color\":\"gold\"}',CustomNameVisible:1b,PersistenceRequired:1b}" },
        { label: "No loot", note: "Stops normal loot drops.", value: "{DeathLootTable:\"minecraft:empty\"}" },
        { label: "Sun-safe undead", note: "Gives undead a helmet and prevents armor drops.", value: "{ArmorItems:[{},{},{},{Count:1,id:\"minecraft:diamond_helmet\"}],ArmorDropChances:[0.0f,0.0f,0.0f,0.0f]}" },
        { label: "Skeleton without bow", note: "Adds a helmet and removes the bow when combined with shared random mob data.", value: "minecraft:skeleton | {HandItems:[{},{}],ArmorItems:[{},{},{},{Count:1,id:\"minecraft:diamond_helmet\"}]}" },
        { label: "Piglin brute event mob", note: "Keeps the brute from zombifying and gives it a weapon.", value: "minecraft:piglin_brute | {Tags:[\"Viewer Spawn\"],IsImmuneToZombification:1b,HandItems:[{Count:1,id:\"minecraft:golden_axe\"},{}],ArmorItems:[{},{},{},{Count:1,id:\"minecraft:diamond_helmet\"}],CustomName:'{\"text\":\"$userDisplayName\",\"color\":\"gold\"}',PersistenceRequired:1b,DeathLootTable:\"minecraft:empty\"}" }
    ];
    const spawnMobExamples1192 = spawnMobExamples1201;
    const spawnMobExamples1211 = [
        { label: "Viewer name", note: "Names the mob after the viewer and keeps it from despawning.", value: "{Tags:[\"Viewer Spawn\"],CustomName:'{\"text\":\"$userDisplayName\",\"color\":\"gold\"}',CustomNameVisible:1b,PersistenceRequired:1b}" },
        { label: "No loot", note: "Stops normal loot drops.", value: "{DeathLootTable:\"minecraft:empty\"}" },
        { label: "Sun-safe undead", note: "Gives undead a helmet and prevents armor drops.", value: "{ArmorItems:[{},{},{},{id:\"minecraft:diamond_helmet\",count:1}],ArmorDropChances:[0.0f,0.0f,0.0f,0.0f]}" },
        { label: "Skeleton without bow", note: "Adds a helmet and removes the bow when combined with shared random mob data.", value: "minecraft:skeleton | {HandItems:[{},{}],ArmorItems:[{},{},{},{id:\"minecraft:diamond_helmet\",count:1}]}" },
        { label: "Piglin brute event mob", note: "Keeps the brute from zombifying and gives it a weapon.", value: "minecraft:piglin_brute | {Tags:[\"Viewer Spawn\"],IsImmuneToZombification:1b,HandItems:[{id:\"minecraft:golden_axe\",count:1},{}],ArmorItems:[{},{},{},{id:\"minecraft:diamond_helmet\",count:1}],CustomName:'{\"text\":\"$userDisplayName\",\"color\":\"gold\"}',PersistenceRequired:1b,DeathLootTable:\"minecraft:empty\"}" }
    ];
    const spawnMobExamples2612 = [
        { label: "Viewer name", note: "Names the mob after the viewer and keeps it from despawning.", value: "{Tags:[\"Viewer Spawn\"],CustomName:{text:'$userDisplayName',color:'gold'},CustomNameVisible:1b,PersistenceRequired:1b}" },
        { label: "No loot", note: "Stops normal loot drops.", value: "{DeathLootTable:\"minecraft:empty\"}" },
        { label: "Sun-safe undead", note: "Gives undead a helmet and prevents armor drops.", value: "{ArmorItems:[{},{},{},{id:\"minecraft:diamond_helmet\",count:1}],ArmorDropChances:[0.0f,0.0f,0.0f,0.0f]}" },
        { label: "Skeleton without bow", note: "Adds a helmet and removes the bow when combined with shared random mob data.", value: "minecraft:skeleton | {HandItems:[{},{}],ArmorItems:[{},{},{},{id:\"minecraft:diamond_helmet\",count:1}]}" },
        { label: "Piglin brute event mob", note: "Keeps the brute from zombifying and gives it a weapon.", value: "minecraft:piglin_brute | {Tags:[\"Viewer Spawn\"],IsImmuneToZombification:1b,HandItems:[{id:\"minecraft:golden_axe\",count:1},{}],ArmorItems:[{},{},{},{id:\"minecraft:diamond_helmet\",count:1}],CustomName:{text:'$userDisplayName',color:'gold'},PersistenceRequired:1b,DeathLootTable:\"minecraft:empty\"}" }
    ];
    const itemExamples1201 = [
        { label: "Named item", note: "Gives the item a colored custom name.", value: "{display:{Name:'{\"text\":\"Viewer Gift\",\"color\":\"gold\"}'}}" },
        { label: "Bonk stick", note: "Adds a name and knockback.", value: "minecraft:stick | {display:{Name:'{\"text\":\"Bonk Stick\",\"color\":\"red\"}'},Enchantments:[{id:\"minecraft:knockback\",lvl:2s}]}" },
        { label: "Lore", note: "Adds one short lore line.", value: "{display:{Lore:['{\"text\":\"Redeemed on stream\",\"color\":\"gray\"}']}}" }
    ];
    const itemExamples1192 = itemExamples1201;
    const itemExamples1211 = [
        { label: "Named item", note: "Gives the item a colored custom name.", value: "[custom_name='{\"text\":\"Viewer Gift\",\"color\":\"gold\"}']" },
        { label: "Bonk stick", note: "Adds a name and knockback.", value: "minecraft:stick | [custom_name='{\"text\":\"Bonk Stick\",\"color\":\"red\"}',enchantments={levels:{\"minecraft:knockback\":2}}]" },
        { label: "Lore", note: "Adds one short lore line.", value: "[lore=['{\"text\":\"Redeemed on stream\",\"color\":\"gray\"}']]" }
    ];
    const itemExamples2612 = [
        { label: "Named item", note: "Gives the item a colored custom name.", value: "[custom_name={text:'Viewer Gift',color:'gold'}]" },
        { label: "Bonk stick", note: "Adds a name and knockback.", value: "minecraft:stick | [custom_name={text:'Bonk Stick',color:'red'},enchantments={\"minecraft:knockback\":2}]" },
        { label: "Lore", note: "Adds one short lore line.", value: "[lore=[{text:'Redeemed on stream',color:'gray'}]]" }
    ];
    const itemIdExamples = [
        { label: "Single item", note: "Matches one item.", value: "minecraft:stick" },
        { label: "Item tag", note: "Matches any item inside the tag.", value: "#minecraft:wool" },
        { label: "Short tag", note: "minecraft: is optional for vanilla tags.", value: "#logs_that_burn" },
        { label: "Specific item data", note: "Use when the picked up item needs matching data.", value: "minecraft:stick | [custom_name='{\"text\":\"Viewer Stick\",\"color\":\"gold\"}']" },
        { label: "Modded item data", note: "Useful for modded items with stored data.", value: "mekanism:creative_energy_cube | {mekData:{tier:4,energy:9223372036854775807L}}" }
    ];
    const rewardItemExamples = [
        { label: "One item", note: "Gives one item.", value: "minecraft:stick" },
        { label: "Multiple items", note: "Gives the item amount after x.", value: "minecraft:oak_log x5" },
        { label: "Reward with data", note: "Adds data to the rewarded item.", value: "minecraft:stick x5 | [custom_name='{\"text\":\"Viewer Stick\",\"color\":\"gold\"}']" },
        { label: "Modded reward data", note: "Useful for modded items with stored data.", value: "mekanism:creative_energy_cube x1 | {mekData:{tier:4,energy:9223372036854775807L}}" }
    ];
    const mobTargetExamples = [
        { label: "Single mob", note: "Matches one entity type.", value: "minecraft:zombie" },
        { label: "Mob tag", note: "Matches any mob inside the tag.", value: "#minecraft:raiders" },
        { label: "Tagged event mobs", note: "Matches mobs spawned with this entity tag.", value: "minecraft:skeleton | {Tags:[\"Viewer Spawn\"]}" },
        { label: "Named mob", note: "Use data when the mob must have matching custom data.", value: "minecraft:zombie | {CustomName:'{\"text\":\"Boss Zombie\"}'}" }
    ];
    const potionExamples1201 = ["minecraft:speed", "minecraft:slowness", "minecraft:haste", "minecraft:mining_fatigue", "minecraft:strength", "minecraft:instant_health", "minecraft:instant_damage", "minecraft:jump_boost", "minecraft:nausea", "minecraft:regeneration", "minecraft:resistance", "minecraft:fire_resistance", "minecraft:water_breathing", "minecraft:invisibility", "minecraft:blindness", "minecraft:night_vision", "minecraft:hunger", "minecraft:weakness", "minecraft:poison", "minecraft:wither", "minecraft:levitation", "minecraft:glowing", "minecraft:darkness"];
    const potionExamples1192 = potionExamples1201;
    const potionExamples1211 = ["minecraft:speed", "minecraft:slowness", "minecraft:haste", "minecraft:mining_fatigue", "minecraft:strength", "minecraft:instant_health", "minecraft:instant_damage", "minecraft:jump_boost", "minecraft:nausea", "minecraft:regeneration", "minecraft:resistance", "minecraft:fire_resistance", "minecraft:water_breathing", "minecraft:invisibility", "minecraft:blindness", "minecraft:night_vision", "minecraft:hunger", "minecraft:weakness", "minecraft:poison", "minecraft:wither", "minecraft:levitation", "minecraft:glowing", "minecraft:darkness", "minecraft:wind_charged", "minecraft:weaving", "minecraft:oozing", "minecraft:infested", "minecraft:raid_omen", "minecraft:trial_omen", "minecraft:bad_omen"];
    const potionExamples2612 = potionExamples1211;

    registerEffect(makeEffect(
        "spawn-mob",
        "Spawn Mob",
        "Spawns a mob near the player.",
        `${targetTemplate()}
        <eos-container header="Mob" pad-top="true">
            ${textInput("Mob ID", "mobId", "minecraft:zombie", "Minecraft entity ID, such as minecraft:zombie or modid:custom_mob.")}
            ${numberInput("Amount", "amount", "1", "How many mobs to spawn.")}
        </eos-container>
        <eos-container header="Position Offset" pad-top="true">
            ${note("Offset is blocks away from the player. 0, 0, 0 means on the player.")}
            ${numberInput("Offset X", "offsetX", "0", "Blocks east or west from the player.")}
            ${numberInput("Offset Y", "offsetY", "0", "Blocks up or down from the player.")}
            ${numberInput("Offset Z", "offsetZ", "0", "Blocks north or south from the player.")}
        </eos-container>
        <eos-container header="Entity Data" pad-top="true">
            ${note("Optional data for names, equipment, loot, tags, and modded values. Use Viewer Spawn inside Tags to tag mobs for Bring Tagged Mobs.")}
            ${textArea("Entity Data", "entityData", "Optional entity data", "Optional entity data for names, equipment, baby state, or modded entity data.")}
            ${versionedExampleBlock("entityData", "Entity Data Examples", spawnMobExamples1192, spawnMobExamples1201, spawnMobExamples1211, spawnMobExamples2612)}
        </eos-container>`,
        { amount: 1, offsetX: 0, offsetY: 0, offsetZ: 0, entityData: "" },
        "spawn_mob",
        ["mobId", "amount", "offsetX", "offsetY", "offsetZ", "entityData"]
    ));

    registerEffect(makeEffect(
        "spawn-random-mob",
        "Spawn Random Mob",
        "Spawns one random mob row from this effect.",
        `${targetTemplate()}
        <eos-container header="Random Mobs" pad-top="true">
            ${note("One mob row is picked when the effect runs. Amount and offset belong to that row.")}
            <div class="haven-minecraft-list-row" ng-repeat="mob in effect.randomMobs track by $index">
                <div class="haven-minecraft-row-title haven-minecraft-clickable-row" ng-click="toggleRandomMobCollapsed($index)">
                    <span>{{randomMobCollapsedMarker($index)}} {{randomMobSummary(mob)}}</span>
                    <button type="button" class="haven-minecraft-danger-button" ng-click="$event.stopPropagation(); removeRandomMob($index)">Remove</button>
                </div>
                <div class="haven-minecraft-row-body" ng-if="!isRandomMobCollapsed($index)">
                    <div class="haven-minecraft-field">
                        <div class="haven-minecraft-label">Entity ID${inlineTooltip("Minecraft entity ID, such as minecraft:zombie or modid:custom_mob.")}</div>
                        <firebot-input model="mob.mobId" placeholder-text="minecraft:zombie" menu-position="under"></firebot-input>
                    </div>
                    <div class="haven-minecraft-field">
                        <div class="haven-minecraft-label">Amount${inlineTooltip("How many of this mob to spawn if this row is picked.")}</div>
                        <firebot-input model="mob.amount" input-type="number" placeholder-text="1" menu-position="under"></firebot-input>
                    </div>
                    <eos-container header="Position Offset" pad-top="true">
                        ${note("Offset is blocks away from the player. 0, 0, 0 means on the player.")}
                        <div class="haven-minecraft-field">
                            <div class="haven-minecraft-label">Offset X${inlineTooltip("Blocks east or west from the player.")}</div>
                            <firebot-input model="mob.offsetX" input-type="number" placeholder-text="0" menu-position="under"></firebot-input>
                        </div>
                        <div class="haven-minecraft-field">
                            <div class="haven-minecraft-label">Offset Y${inlineTooltip("Blocks up or down from the player.")}</div>
                            <firebot-input model="mob.offsetY" input-type="number" placeholder-text="0" menu-position="under"></firebot-input>
                        </div>
                        <div class="haven-minecraft-field">
                            <div class="haven-minecraft-label">Offset Z${inlineTooltip("Blocks north or south from the player.")}</div>
                            <firebot-input model="mob.offsetZ" input-type="number" placeholder-text="0" menu-position="under"></firebot-input>
                        </div>
                    </eos-container>
                    <div class="haven-minecraft-field">
                        <div class="haven-minecraft-label">Entity Data${inlineTooltip("Names, equipment, loot, tags, and modded values for this mob.")}</div>
                        <firebot-input model="mob.entityData" use-text-area="true" rows="4" cols="40" placeholder-text="Optional entity data" menu-position="under"></firebot-input>
                    </div>
                </div>
            </div>
            <button type="button" class="haven-minecraft-small-button" ng-click="addRandomMob()"><i class="far fa-plus"></i> Add Mob</button>
            ${versionedExampleBlock("randomEntityData", "Random Mob Examples", spawnMobExamples1192, spawnMobExamples1201, spawnMobExamples1211, spawnMobExamples2612)}
        </eos-container>`,
        { randomMobs: randomMobRowsFromList(DEFAULT_RANDOM_MOBS.join("\n")) },
        "spawn_random_mob",
        [],
        effect => ({ mobEntries: randomMobRowsFromEffect(effect) })
    ));

    registerEffect(makeEffect("spawn-anvil-above-player", "Spawn Anvil Above Player", "Drops anvils above the player.", `${targetTemplate()}<eos-container header="Anvil" pad-top="true">${numberInput("Amount", "amount", "1", "How many anvils to drop.")}${numberInput("Height", "height", "8", "Blocks above the player.")}${numberInput("Offset X", "offsetX", "0", "Blocks east or west from the player.")}${numberInput("Offset Z", "offsetZ", "0", "Blocks north or south from the player.")}${checkboxField("Add Delay Between Amounts?", "addDelayBetweenAmounts", "Spawns each anvil with a tick delay instead of all at once.")}<div ng-if="effect.addDelayBetweenAmounts">${numberInput("Delay Ticks", "delayTicks", "20", "Ticks between each anvil. 20 ticks = 1 second.")}</div></eos-container>`, { amount: 1, height: 8, offsetX: 0, offsetZ: 0, addDelayBetweenAmounts: false, delayTicks: 20 }, "spawn_anvil_above_player", ["amount", "height", "offsetX", "offsetZ", "addDelayBetweenAmounts", "delayTicks"]));

    registerEffect(makeEffect("spawn-lightning", "Spawn Lightning", "Strikes lightning near the player.", `${targetTemplate()}<eos-container header="Lightning" pad-top="true">${numberInput("Amount", "amount", "1", "How many lightning strikes to spawn.")}${numberInput("Offset X", "offsetX", "0", "Blocks east or west from the player.")}${numberInput("Offset Y", "offsetY", "0", "Blocks up or down from the player.")}${numberInput("Offset Z", "offsetZ", "0", "Blocks north or south from the player.")}${checkboxField("Add Delay Between Amounts?", "addDelayBetweenAmounts", "Spawns each lightning strike with a tick delay instead of all at once.")}<div ng-if="effect.addDelayBetweenAmounts">${numberInput("Delay Ticks", "delayTicks", "20", "Ticks between each lightning strike. 20 ticks = 1 second.")}</div></eos-container>`, { amount: 1, offsetX: 0, offsetY: 0, offsetZ: 0, addDelayBetweenAmounts: false, delayTicks: 20 }, "spawn_lightning", ["amount", "offsetX", "offsetY", "offsetZ", "addDelayBetweenAmounts", "delayTicks"]));

    registerEffect(makeEffect(
        "give-item", "Give Item", "Gives an item to the player.",
        `${targetTemplate()}<eos-container header="Item" pad-top="true">
            ${checkboxField("Use Random Item", "useRandomItem", "Picks one item row when the effect runs.")}
            <div ng-hide="effect.useRandomItem">
                ${textInput("Item ID", "itemId", "minecraft:diamond", "Minecraft item ID, such as minecraft:diamond or modid:custom_item. Use Item Data below for custom data.")}
                ${numberInput("Amount", "amount", "1", "How many items to give.")}
                ${textArea("Item Data", "itemData", "Optional item data", "Item data for names, lore, enchantments, components, NBT, or modded values.")}
            </div>
            <div ng-if="effect.useRandomItem">
                ${note("One item row is picked when the effect runs.")}
                <div class="haven-minecraft-list-row" ng-repeat="item in effect.randomItems track by $index">
                    <div class="haven-minecraft-row-title haven-minecraft-clickable-row" ng-click="toggleRandomItemCollapsed($index)">
                        <span>{{randomItemCollapsedMarker($index)}} {{randomItemSummary(item)}}</span>
                        <button type="button" class="haven-minecraft-danger-button" ng-click="$event.stopPropagation(); removeRandomItem($index)">Remove</button>
                    </div>
                    <div class="haven-minecraft-row-body" ng-if="!isRandomItemCollapsed($index)">
                        <div class="haven-minecraft-field">
                            <div class="haven-minecraft-label">Item ID${inlineTooltip("Minecraft item ID, such as minecraft:diamond or modid:custom_item.")}</div>
                            <firebot-input model="item.itemId" placeholder-text="minecraft:diamond" menu-position="under"></firebot-input>
                        </div>
                        <div class="haven-minecraft-field">
                            <div class="haven-minecraft-label">Amount${inlineTooltip("How many of this item to give if this row is picked.")}</div>
                            <firebot-input model="item.amount" input-type="number" placeholder-text="1" menu-position="under"></firebot-input>
                        </div>
                        <div class="haven-minecraft-field">
                            <div class="haven-minecraft-label">Item Data${inlineTooltip("Item data for this item row.")}</div>
                            <firebot-input model="item.itemData" use-text-area="true" rows="4" cols="40" placeholder-text="Optional item data" menu-position="under"></firebot-input>
                        </div>
                    </div>
                </div>
                <button type="button" class="haven-minecraft-small-button" ng-click="addRandomItem()"><i class="far fa-plus"></i> Add Item</button>
            </div>
            ${checkboxField("Use Blacklist", "useBlacklist", "Blocks items from being given by this effect.")}
            <div ng-if="effect.useBlacklist">${textArea("Blacklisted Items", "blacklistedItems", "minecraft:diamond\nminecraft:netherite_ingot", "One blocked item ID per line.")}</div>
            ${versionedExampleBlock("itemData", "Give Item Examples", itemExamples1192, itemExamples1201, itemExamples1211, itemExamples2612)}
        </eos-container>`,
        { useRandomItem: false, useBlacklist: false, blacklistedItems: "", amount: 1, itemData: "", randomItems: randomItemRowsFromList(DEFAULT_RANDOM_ITEMS_1211.join("\n")) },
        "give_item",
        ["amount", "itemData", "useRandomItem", "useBlacklist", "blacklistedItems"],
        (effect, config) => {
            if (!effect.useRandomItem) {
                if (effect.useBlacklist && listContainsItem(effect.blacklistedItems, effect.itemId)) {
                    throw new Error("Item is blacklisted: " + effect.itemId);
                }
                return { itemId: effect.itemId };
            }
            const rows = randomItemRowsFromEffect(effect, config);
            const picked = pickAllowedRandomItemRow(rows, effect.useBlacklist ? effect.blacklistedItems : "");
            return { itemId: picked.itemId, amount: picked.amount, itemData: picked.itemData };
        }
    ));

    registerEffect(makeEffect("remove-item", "Remove Item", "Removes an item from the player.", `${targetTemplate()}<eos-container header="Item" pad-top="true">${checkboxField("Remove Random Item", "useRandomItem", "Picks a random item from the selected inventory area.")}<div ng-hide="effect.useRandomItem">${textInput("Item ID", "itemId", "minecraft:diamond", "Minecraft item ID to remove.")}</div>${numberInput("Amount", "amount", "1", "How many items to remove.")}${dropdownField("Item Location", "itemLocation", ["Any", "Hotbar", "Inventory", "Offhand"], "Where the item can be removed from.")}</eos-container>`, { useRandomItem: false, amount: 1, itemLocation: "Any" }, "take_item", ["amount", "itemLocation", "useRandomItem"], effect => effect.useRandomItem ? {} : { itemId: effect.itemId }));
    registerEffect(makeEffect("remove-held-item", "Remove Held Item", "Removes the selected held item.", `${targetTemplate()}<eos-container header="Held Item" pad-top="true">${dropdownField("Hand", "hand", ["Main Hand", "Offhand"], "Which hand to remove the item from.")}</eos-container>`, { hand: "Main Hand" }, "take_held_item", ["hand"]));
    registerEffect(makeEffect("drop-held-item", "Drop Held Item", "Drops the selected held item.", `${targetTemplate()}<eos-container header="Held Item" pad-top="true">${dropdownField("Hand", "hand", ["Main Hand", "Offhand"], "Which hand to drop the item from.")}</eos-container>`, { hand: "Main Hand" }, "drop_held_item", ["hand"]));
    registerEffect(makeEffect("shuffle-inventory", "Shuffle Inventory", "Shuffles or sorts the player's inventory.", `${targetTemplate()}<eos-container header="Inventory" pad-top="true">${dropdownField("Area", "area", ["Hotbar", "Inventory", "All"], "Which part of the inventory to shuffle or sort.")}${checkboxField("Sort Instead Of Shuffle", "sortInsteadOfShuffle", "Sorts the selected area instead of mixing it randomly.")}<div ng-if="effect.sortInsteadOfShuffle">${dropdownField("Sort By", "sortBy", ["Alphabetically", "Amount", "Alphabetically Then Amount"], "How items should be sorted in the selected area.")}</div></eos-container>`, { area: "All", sortInsteadOfShuffle: false, sortBy: "Alphabetically" }, "shuffle_inventory", ["area", "sortInsteadOfShuffle", "sortBy"]));

    registerEffect(makeEffect("damage-player", "Damage Player", "Damages the player.", `${targetTemplate()}<eos-container header="Damage" pad-top="true">${numberInput("Amount", "amount", "1", "Damage amount. 20 equals 10 hearts.")}${textInput("Damage Type", "damageType", "minecraft:generic", "Controls how Minecraft treats the damage.")}${exampleBlock("damageType", "Common Damage Types", ["minecraft:generic", "minecraft:magic", "minecraft:in_fire", "minecraft:on_fire", "minecraft:lava", "minecraft:drown", "minecraft:starve", "minecraft:fall", "minecraft:out_of_world", "minecraft:explosion", "minecraft:arrow", "minecraft:mob_attack", "minecraft:player_attack", "minecraft:wither", "minecraft:freeze", "minecraft:sonic_boom", "minecraft:falling_anvil"])}</eos-container>`, { amount: 1, damageType: "minecraft:generic" }, "damage_player", ["amount", "damageType"]));
    registerEffect(makeEffect("heal-player", "Heal Player", "Heals the player.", `${targetTemplate()}<eos-container header="Heal" pad-top="true">${numberInput("Amount", "amount", "4", "Health points to restore. 20 equals 10 hearts.")}</eos-container>`, { amount: 4 }, "heal_player", ["amount"]));
    registerEffect(makeEffect("feed-player", "Feed Player", "Feeds the player.", `${targetTemplate()}<eos-container header="Food" pad-top="true">${numberInput("Amount", "amount", "10", "Food points to restore. 20 equals a full food bar.")}</eos-container>`, { amount: 10 }, "feed_player", ["amount"]));
    registerEffect(makeEffect("set-player-on-fire", "Set Player On Fire", "Sets the player on fire.", `${targetTemplate()}<eos-container header="Fire" pad-top="true">${numberInput("Seconds", "seconds", "5", "How long the player should burn.")}</eos-container>`, { seconds: 5 }, "set_player_on_fire", ["seconds"]));
    registerEffect(makeEffect("add-potion-effect", "Add Potion Effect", "Adds a potion effect to the player.", `${targetTemplate()}<eos-container header="Effect" pad-top="true">${textInput("Effect ID", "effectId", "minecraft:slowness", "Potion effect ID, such as minecraft:slowness or modid:custom_effect.")}${versionedExampleBlock("effectId", "Common Effect IDs", potionExamples1192, potionExamples1201, potionExamples1211, potionExamples2612)}${numberInput("Seconds", "seconds", "10", "How long the effect should last.")}${numberInput("Amplifier", "amplifier", "0", "Effect level minus one. 0 means level 1.")}${checkboxField("Hide Particles", "hideParticles", "Hides the visible potion particles.")}</eos-container>`, { seconds: 10, amplifier: 0, hideParticles: false }, "add_potion_effect", ["effectId", "seconds", "amplifier", "hideParticles"]));
    registerEffect(makeEffect("remove-potion-effect", "Remove Potion Effect", "Removes a potion effect from the player.", `${targetTemplate()}<eos-container header="Effect" pad-top="true">${checkboxField("Use Random Bad Effect", "useRandomEffect", "Picks one effect from this effect's list.")}<div ng-hide="effect.useRandomEffect">${textInput("Effect ID", "effectId", "minecraft:slowness", "Potion effect ID to remove.")}</div><div ng-if="effect.useRandomEffect">${textArea("Bad Effects List", "badEffectsOverride", "minecraft:poison", "One effect ID per line.")}</div>${versionedExampleBlock("removeEffectId", "Common Effect IDs", potionExamples1192, potionExamples1201, potionExamples1211, potionExamples2612)}</eos-container>`, { useRandomEffect: false, badEffectsOverride: DEFAULT_BAD_EFFECTS.join("\n") }, "remove_potion_effect", ["useRandomEffect", "badEffectsOverride"], effect => ({ effectId: effect.useRandomEffect ? pickRandom(effect.badEffectsOverride || DEFAULT_BAD_EFFECTS) : effect.effectId })));
    registerEffect(makeEffect("clear-bad-effects", "Clear Bad Effects", "Clears bad effects from the player.", `${targetTemplate()}<eos-container header="Effects" pad-top="true">${textArea("Bad Effects List", "badEffectsOverride", "minecraft:poison", "One effect ID per line. These effects will be cleared from the player.")}</eos-container>`, { badEffectsOverride: DEFAULT_BAD_EFFECTS.join("\n") }, "clear_bad_effects", ["badEffectsOverride"], effect => ({ effects: toLines(effect.badEffectsOverride || DEFAULT_BAD_EFFECTS) })));

    registerEffect(makeEffect("teleport-player", "Teleport Player", "Teleports the player.", `${targetTemplate()}<eos-container header="Teleport" pad-top="true">${checkboxField("Use Random Range", "useRandomRange", "Teleports the player randomly near their current position.")}<div ng-hide="effect.useRandomRange">${note("Fixed offsets move the player from where they are now. 0 keeps that axis unchanged.")}${numberInput("Offset X", "offsetX", "0", "Blocks east or west from the player.")}${numberInput("Offset Y", "offsetY", "0", "Blocks up or down from the player.")}${numberInput("Offset Z", "offsetZ", "0", "Blocks north or south from the player.")}</div><div ng-if="effect.useRandomRange">${note("Leave X, Y, and Z unchecked to use Max Radius. Turn on axes when you want a controlled random offset.")}${numberInput("Max Radius", "maxRadius", "100", "Maximum amount of blocks away from the player.")}${checkboxField("Random Offset X", "randomOffsetX", "Picks a random east or west offset up to the X range.")}<div ng-if="effect.randomOffsetX">${numberInput("X Range", "xRange", "10", "Maximum random blocks east or west.")}</div>${checkboxField("Random Offset Y", "randomOffsetY", "Picks a random up or down offset up to the Y range.")}<div ng-if="effect.randomOffsetY">${numberInput("Y Range", "yRange", "0", "Maximum random blocks up or down.")}</div>${checkboxField("Random Offset Z", "randomOffsetZ", "Picks a random north or south offset up to the Z range.")}<div ng-if="effect.randomOffsetZ">${numberInput("Z Range", "zRange", "10", "Maximum random blocks north or south.")}</div></div></eos-container>`, { useRandomRange: false, offsetX: 0, offsetY: 0, offsetZ: 0, maxRadius: 100, randomOffsetX: false, xRange: 10, randomOffsetY: false, yRange: 0, randomOffsetZ: false, zRange: 10 }, "teleport_player", ["useRandomRange", "offsetX", "offsetY", "offsetZ", "maxRadius", "randomOffsetX", "xRange", "randomOffsetY", "yRange", "randomOffsetZ", "zRange"]));
    registerEffect(makeEffect("flip-player-direction", "Flip Player Direction", "Changes where the player is looking.", `${targetTemplate()}<eos-container header="Direction" pad-top="true">${numberInput("Horizontal Turn Amount", "yaw", "180", "Degrees to turn left or right. 180 turns around. 90 turns right. -90 turns left.")}${numberInput("Vertical Look Amount", "pitch", "0", "Degrees to look up or down. -90 looks up. 90 looks down. 0 keeps current vertical look.")}</eos-container>`, { yaw: 180, pitch: 0 }, "flip_player_direction", ["yaw", "pitch"]));
    registerEffect(makeEffect("swap-main-hand-and-offhand", "Swap Main Hand And Offhand", "Swaps the player's main hand and offhand.", `${targetTemplate()}`, {}, "swap_main_hand_and_offhand", []));
    registerEffect(makeEffect("bring-tagged-mobs", "Bring Tagged Mobs", "Teleports tagged entities to the player.", `${targetTemplate()}<eos-container header="Tagged Mobs" pad-top="true">${textInput("Entity Tag", "entityTag", "Viewer Spawn", "Which entity tag to bring. Viewer Spawn is a normal literal tag name.")}${note("Teleports entities with this tag to the linked player. Use Tags:[\"Viewer Spawn\"] in Entity Data to make mobs work with this.")}</eos-container>`, { entityTag: "Viewer Spawn" }, "bring_tagged_mobs", ["entityTag"]));
    registerEffect(makeEffect("change-time", "Change Time", "Changes the world time.", `${targetTemplate()}<eos-container header="Time" pad-top="true">${dropdownField("Time", "time", ["Noon", "Day", "Night", "Midnight"], "Time to set in the player world.")}</eos-container>`, { time: "Day" }, "change_time", ["time"]));
    registerEffect(makeEffect("change-weather", "Change Weather", "Changes the weather.", `<eos-container header="Weather" pad-top="true">${dropdownField("Weather", "weather", ["Clear", "Rain", "Thunder"], "Weather to set.")}${numberInput("Seconds", "seconds", "60", "How long the weather should last.")}</eos-container>`, { weather: "Rain", seconds: 60 }, "change_weather", ["weather", "seconds"]));
    registerEffect(makeEffect(
        "send-player-message-chat",
        "Send Player Message Chat",
        "Sends a chat message only to the linked player.",
        `<eos-container header="Chat Message" pad-top="true">
            ${textInput("Sender Name", "senderName", "", "Optional name shown before the message. Supports Minecraft § and & color codes.")}
            ${textInput("Separator", "separator", ": ", "Text added between Sender Name and Message. Supports Minecraft § and & color codes.")}
            ${textArea("Message", "message", "", "Message sent to the linked Minecraft player. Supports Minecraft § and & color codes.")}
            ${exampleBlock("chatColorCodes", "Color Codes", COLOR_CODE_EXAMPLES).replace("Show Examples", "Show Color Codes")}
        </eos-container>`,
        { senderName: "", separator: ": ", message: "" },
        "send_player_chat_message",
        ["senderName", "separator", "message"]
    ));
    registerEffect(makeEffect(
        "send-player-message-hotbar",
        "Send Player Message Hotbar",
        "Sends a hotbar actionbar message only to the linked player.",
        `<eos-container header="Hotbar Message" pad-top="true">
            ${textArea("Message", "message", "", "Actionbar text shown above the hotbar. Supports Minecraft § and & color codes.")}
            ${exampleBlock("hotbarColorCodes", "Color Codes", COLOR_CODE_EXAMPLES).replace("Show Examples", "Show Color Codes")}
        </eos-container>`,
        { message: "" },
        "send_player_hotbar_message",
        ["message"]
    ));
    registerEffect(makeEffect(
        "send-player-message-toast",
        "Send Player Message Toast",
        "Sends a server-side screen notification only to the linked player.",
        `<eos-container header="Toast Message" pad-top="true">
            ${textInput("Title", "title", "", "Notification title text. Supports Minecraft § and & color codes.")}
            ${textArea("Message", "message", "", "Notification message text. Supports Minecraft § and & color codes.")}
            ${exampleBlock("toastColorCodes", "Color Codes", COLOR_CODE_EXAMPLES).replace("Show Examples", "Show Color Codes")}
        </eos-container>`,
        { title: "", message: "" },
        "send_player_toast_message",
        ["title", "message"]
    ));
    registerEffect(makeEffect(
        "set-player-bossbar",
        "Set Player Bossbar",
        "Adds or updates a bossbar for the linked player.",
        `<eos-container header="Bossbar" pad-top="true">
            ${textInput("Bossbar ID", "bossbarId", "hype_train", "Unique ID for this bossbar. Use the same ID to update it later.")}
            ${textInput("Title", "title", "", "Bossbar title. Supports Minecraft § and & color codes.")}
            ${exampleBlock("bossbarColorCodes", "Color Codes", COLOR_CODE_EXAMPLES).replace("Show Examples", "Show Color Codes")}
            ${numberInput("Progress Percent", "progressPercent", "100", "Bossbar fill from 0 to 100.")}
            ${dropdownField("Bossbar Color", "bossbarColor", BOSSBAR_COLORS, "Minecraft bossbar color.")}
            ${dropdownField("Bossbar Style", "bossbarStyle", BOSSBAR_STYLES, "Minecraft bossbar notch style.")}
            ${exampleBlock("bossbarStylesInfo", "Bossbar Styles Info", BOSSBAR_STYLE_INFO).replace("Show Examples", "Show Bossbar Styles Info")}
        </eos-container>`,
        { bossbarId: "", title: "", progressPercent: 100, bossbarColor: "Purple", bossbarStyle: "Progress" },
        "set_player_bossbar",
        ["bossbarId", "title", "progressPercent", "bossbarColor", "bossbarStyle"]
    ));
    registerEffect(makeEffect(
        "remove-player-bossbar",
        "Remove Player Bossbar",
        "Removes a specific bossbar.",
        `${targetTemplate()}<eos-container header="Bossbar" pad-top="true">
            ${textInput("Bossbar ID", "bossbarId", "hype_train", "Unique ID for the bossbar to remove.")}
        </eos-container>`,
        { bossbarId: "" },
        "remove_player_bossbar",
        ["bossbarId"]
    ));
    registerEffect(makeEffect(
        "start-viewer-quest",
        "Start Viewer Quest",
        "Starts a viewer quest for the linked Minecraft player.",
        `${targetTemplate()}
        <eos-container header="Quest Preset" pad-top="true">
            <div class="haven-minecraft-preset-actions">
                <button type="button" class="btn btn-default" ng-click="loadQuestPreset()">Load Quest Preset${inlineTooltip("Loads a saved quest preset JSON file into this effect.")}</button>
                <button type="button" class="btn btn-default" ng-click="saveQuestPreset()">Save Quest Preset${inlineTooltip("Saves this quest setup as a JSON preset file you can share.")}</button>
            </div>
            <div class="haven-minecraft-preset-status" ng-class="{good: effectHelp.questPresetMessage && !effectHelp.questPresetFailed, bad: effectHelp.questPresetMessage && effectHelp.questPresetFailed}" ng-if="effectHelp.questPresetMessage">{{effectHelp.questPresetMessage}}</div>
        </eos-container>
        <eos-container header="Quest" pad-top="true">
            ${textInput("Quest Name", "questName", "Viewer Quest", "Short name shown in quest events and in Minecraft.")}
            ${textInput("Quest ID", "questId", "Optional", "Optional. Leave empty to make one automatically. Use this to abandon one specific quest later.")}
            ${textInput("Viewer Name", "viewerName", "$userDisplayName", "Viewer attached to this quest.")}
        </eos-container>
        ${questObjectivesTemplate()}
        ${questRewardsTemplate()}
        <eos-container header="Display" pad-top="true">
            ${dropdownField("Display Mode", "displayMode", QUEST_DISPLAY_MODES, "How Minecraft should show quest progress.")}
            <div ng-if="effect.displayMode === 'Client Overlay'">${note("The HavenFMI-Client mod must be installed on the player's client for the in-game overlay and questbook to show.")}</div>
        </eos-container>`,
        { questName: "", questId: "", viewerName: "", hasReward: false, rewards: [{ rewardType: "Item Reward", itemId: "", amount: 1, itemData: "", command: "", displayName: "", weight: 1, showPercent: false, rewardVisibility: "Show Rewards", collapsed: true }], randomReward: false, objectives: [{ questType: "Jump Count", targetAmount: 10, targetIds: "", useDamageFilter: false, damageFilter: "Any", collapsed: true }], displayMode: "Client Overlay" },
        "start_quest",
        ["questName", "questId", "viewerName", "hasReward", "displayMode"],
        effect => questPayloadFromEffect(effect)
    ));

    registerEffect(makeEffect(
        "abandon-viewer-quest",
        "Abandon Viewer Quest",
        "Stops viewer quests for the linked Minecraft player.",
        `${targetTemplate()}<eos-container header="Quest" pad-top="true">${textInput("Quest ID", "questId", "", "Optional. Leave empty to abandon all active quests for this player.")}</eos-container>`,
        { questId: "" },
        "abandon_quest",
        ["questId"]
    ));
}


function usesQuestTargets(questType) {
    const value = String(questType || "");
    return value.startsWith("Kill Specific") || value.startsWith("Mine Specific") || value.startsWith("Craft Specific") || value.startsWith("Pick Up Specific") || value.startsWith("Deal Damage to Specific");
}

function configInput(title, model, placeholder, helpText, type) {
    const inputType = type ? ` input-type="${type}"` : "";
    return `<firebot-input input-title="${title}"${tooltip(helpText)} model="${model}"${inputType} placeholder-text="${placeholder || ""}" disable-variables="true" menu-position="under"></firebot-input>`;
}

function serverAddressInput() {
    return `<div style="display:flex; gap:8px; align-items:flex-end;">
        <div style="flex:1;" ng-if="!showServerAddress">
            ${configInput("Minecraft Server Address", "config.serverAddress", "http://127.0.0.1:8765", "Command bridge address. Use http://127.0.0.1:8765 when Firebot and the Minecraft server run on the same PC. For another server, replace 127.0.0.1 with the server IP or domain.", "password")}
        </div>
        <div style="flex:1;" ng-if="showServerAddress">
            ${configInput("Minecraft Server Address", "config.serverAddress", "http://127.0.0.1:8765", "Command bridge address. Use http://127.0.0.1:8765 when Firebot and the Minecraft server run on the same PC. For another server, replace 127.0.0.1 with the server IP or domain.", "text")}
        </div>
        <button class="btn btn-default" type="button" ng-click="showServerAddress=!showServerAddress" style="margin-bottom:14px;">{{showServerAddress ? 'Hide' : 'Show'}}</button>
    </div>`;
}

function playerCodeInput() {
    return `<div style="display:flex; gap:8px; align-items:flex-end;">
        <div style="flex:1;" ng-if="!showPlayerCode">
            ${configInput("Player Code", "config.playerCode", "Use /firebot code in Minecraft", "Code given by the Minecraft bridge. Firebot uses it to know which player to control.", "password")}
        </div>
        <div style="flex:1;" ng-if="showPlayerCode">
            ${configInput("Player Code", "config.playerCode", "Use /firebot code in Minecraft", "Code given by the Minecraft bridge. Firebot uses it to know which player to control.", "text")}
        </div>
        <button class="btn btn-default" type="button" ng-click="showPlayerCode=!showPlayerCode" style="margin-bottom:14px;">{{showPlayerCode ? 'Hide' : 'Show'}}</button>
    </div>`;
}

function makeSettingsPageController() {
    const minecraftVersionsJson = JSON.stringify(MINECRAFT_VERSIONS);
    const body = `
                    const fallbackConfig = ${JSON.stringify(DEFAULT_CONFIG)};
                    $scope.minecraftVersions = ${minecraftVersionsJson};
                    $scope.config = angular.copy(fallbackConfig);
                    $scope.limitsText = "Request Limits From Server";
                    $scope.statsText = "Request Statistics From Server";
                    $scope.questCacheText = questCacheToText(null);
                    $scope.saveMessage = "";
                    $scope.errorMessage = "";
                    $scope.saving = false;
                    $scope.testing = false;
                    $scope.fetchingLimits = false;
                    $scope.fetchingStats = false;
                    $scope.clearingQuestCache = false;
                    $scope.showPlayerCode = false;
                    $scope.showServerAddress = false;

                    function applyConfig(config) {
                        const incoming = config || fallbackConfig;
                        const mergedConfig = angular.copy(fallbackConfig);
                        angular.extend(mergedConfig, incoming);
                        if ($scope.minecraftVersions.indexOf(mergedConfig.minecraftVersion) === -1) {
                            mergedConfig.minecraftVersion = fallbackConfig.minecraftVersion;
                        }
                        $scope.config = mergedConfig;
                        $scope.limitsText = limitsToText(mergedConfig.fetchedLimits);
                        $scope.statsText = statsToText(mergedConfig.fetchedStats);
                    }

                    function prepareConfig() {
                        if ($scope.minecraftVersions.indexOf($scope.config.minecraftVersion) === -1) {
                            $scope.config.minecraftVersion = fallbackConfig.minecraftVersion;
                        }
                        return $scope.config;
                    }


                    function questCacheToText(cache) {
                        if (!cache) {
                            return "No cached quest.";
                        }
                        return [
                            "Status: " + (cache.questStatus || ""),
                            "Quest: " + (cache.questName || ""),
                            "Viewer: " + (cache.viewerName || ""),
                            "Progress: " + (cache.progress || 0) + " / " + (cache.target || 0),
                            "Player: " + (cache.playerDisplayName || cache.playerName || "")
                        ].join("\\n");
                    }

                    function limitsToText(limits) {
                        if (!limits) {
                            return "Request Limits From Server";
                        }
                        return [
                            "Max Mob Amount: " + limits.maxMobAmount,
                            "Max Item Amount: " + limits.maxItemAmount,
                            "Max Damage: " + limits.maxDamage,
                            "Max Potion Seconds: " + limits.maxPotionSeconds,
                            "Max Fire Seconds: " + limits.maxFireSeconds,
                            "Max Teleport Radius: " + limits.maxTeleportRadius
                        ].join("\\n");
                    }


                    function statsToText(stats) {
                        if (!stats) {
                            return "Request Statistics From Server";
                        }
                        return [
                            "Mobs Spawned By Chat: " + stats.mobsSpawnedByChat,
                            "Spawn Mob Requests: " + stats.spawnMobRequests,
                            "Random Mob Requests: " + stats.spawnRandomMobRequests,
                            "Items Given By Chat: " + stats.itemsGivenByChat,
                            "Give Item Requests: " + stats.giveItemRequests,
                            "Items Removed By Chat: " + stats.itemsRemovedByChat,
                            "Remove Item Requests: " + stats.removeItemRequests,
                            "Items Dropped By Chat: " + stats.itemsDroppedByChat,
                            "Lightning Spawned By Chat: " + stats.lightningSpawnedByChat,
                            "Anvils Dropped By Chat: " + stats.anvilsDroppedByChat,
                            "Damage Dealt By Chat: " + stats.damageDealtByChat,
                            "Healing Given By Chat: " + stats.healingGivenByChat,
                            "Food Given By Chat: " + stats.foodGivenByChat,
                            "Teleports By Chat: " + stats.teleportsByChat,
                            "Weather Changes By Chat: " + stats.weatherChangesByChat,
                            "Time Changes By Chat: " + stats.timeChangesByChat,
                            "Quests Started By Chat: " + stats.questsStartedByChat,
                            "Quests Completed By Chat: " + stats.questsCompletedByChat,
                            "Quests Abandoned By Chat: " + stats.questsAbandonedByChat,
                            "Quest Progress Updates: " + stats.questProgressUpdates,
                            "Active Viewer Quests: " + stats.activeViewerQuests
                        ].join("\\n");
                    }

                    function load() {
                        backendCommunicator.fireEventAsync("haven-minecraft:get-config").then(function(config) {
                            applyConfig(config);
                            backendCommunicator.fireEventAsync("haven-minecraft:get-quest-cache").then(function(cache) {
                                $scope.questCacheText = questCacheToText(cache);
                                $scope.$applyAsync();
                            }, function() {
                                $scope.questCacheText = questCacheToText(null);
                                $scope.$applyAsync();
                            });
                        }, function() {
                            applyConfig(fallbackConfig);
                            $scope.errorMessage = "Could not load saved config. Showing defaults.";
                            $scope.$applyAsync();
                        });
                    }

                    $scope.save = function() {
                        $scope.saving = true;
                        $scope.saveMessage = "";
                        $scope.errorMessage = "";
                        backendCommunicator.fireEventAsync("haven-minecraft:save-config", prepareConfig()).then(function(config) {
                            applyConfig(config);
                            $scope.saveMessage = "Saved.";
                            $scope.saving = false;
                            $scope.$applyAsync();
                        }, function() {
                            $scope.errorMessage = "Save failed.";
                            $scope.saving = false;
                            $scope.$applyAsync();
                        });
                    };

                    $scope.testConnection = function() {
                        $scope.testing = true;
                        $scope.saveMessage = "";
                        $scope.errorMessage = "";
                        backendCommunicator.fireEventAsync("haven-minecraft:save-config", prepareConfig()).then(function() {
                            backendCommunicator.fireEventAsync("haven-minecraft:test-connection").then(function(result) {
                                if (result && result.ok) {
                                    $scope.saveMessage = "Connection worked.";
                                } else {
                                    $scope.errorMessage = result && result.error ? result.error : "Connection failed.";
                                }
                                $scope.testing = false;
                                $scope.$applyAsync();
                            }, function() {
                                $scope.errorMessage = "Connection failed.";
                                $scope.testing = false;
                                $scope.$applyAsync();
                            });
                        }, function() {
                            $scope.errorMessage = "Connection failed.";
                            $scope.testing = false;
                            $scope.$applyAsync();
                        });
                    };

                    $scope.fetchLimits = function() {
                        $scope.fetchingLimits = true;
                        $scope.saveMessage = "";
                        $scope.errorMessage = "";
                        backendCommunicator.fireEventAsync("haven-minecraft:save-config", prepareConfig()).then(function() {
                            backendCommunicator.fireEventAsync("haven-minecraft:fetch-limits").then(function(result) {
                                if (result && result.ok) {
                                    $scope.config.fetchedLimits = result.limits || null;
                                    $scope.limitsText = limitsToText($scope.config.fetchedLimits);
                                    backendCommunicator.fireEventAsync("haven-minecraft:save-config", prepareConfig()).then(function(config) {
                                        applyConfig(config);
                                    });
                                    $scope.saveMessage = "Limits requested.";
                                } else {
                                    $scope.errorMessage = result && result.error ? result.error : "Could not request limits.";
                                }
                                $scope.fetchingLimits = false;
                    $scope.fetchingStats = false;
                                $scope.$applyAsync();
                            }, function() {
                                $scope.errorMessage = "Could not request limits.";
                                $scope.fetchingLimits = false;
                    $scope.fetchingStats = false;
                                $scope.$applyAsync();
                            });
                        }, function() {
                            $scope.errorMessage = "Could not request limits.";
                            $scope.fetchingLimits = false;
                    $scope.fetchingStats = false;
                            $scope.$applyAsync();
                        });
                    };


                    $scope.fetchStats = function() {
                        $scope.fetchingStats = true;
                        $scope.saveMessage = "";
                        $scope.errorMessage = "";
                        backendCommunicator.fireEventAsync("haven-minecraft:save-config", prepareConfig()).then(function() {
                            backendCommunicator.fireEventAsync("haven-minecraft:fetch-stats").then(function(result) {
                                if (result && result.ok) {
                                    $scope.config.fetchedStats = result.stats || null;
                                    $scope.statsText = statsToText($scope.config.fetchedStats);
                                    backendCommunicator.fireEventAsync("haven-minecraft:save-config", prepareConfig()).then(function(config) {
                                        applyConfig(config);
                                    });
                                    $scope.saveMessage = "Statistics requested.";
                                } else {
                                    $scope.errorMessage = result && result.error ? result.error : "Could not request statistics.";
                                }
                                $scope.fetchingStats = false;
                                $scope.$applyAsync();
                            }, function() {
                                $scope.errorMessage = "Could not request statistics.";
                                $scope.fetchingStats = false;
                                $scope.$applyAsync();
                            });
                        }, function() {
                            $scope.errorMessage = "Could not request statistics.";
                            $scope.fetchingStats = false;
                            $scope.$applyAsync();
                        });
                    };



                    $scope.clearQuestCache = function() {
                        $scope.clearingQuestCache = true;
                        $scope.saveMessage = "";
                        $scope.errorMessage = "";
                        backendCommunicator.fireEventAsync("haven-minecraft:clear-quest-cache").then(function() {
                            $scope.questCacheText = questCacheToText(null);
                            $scope.saveMessage = "Quest cache cleared.";
                            $scope.clearingQuestCache = false;
                            $scope.$applyAsync();
                        }, function() {
                            $scope.errorMessage = "Could not clear quest cache.";
                            $scope.clearingQuestCache = false;
                            $scope.$applyAsync();
                        });
                    };

                    applyConfig($scope.config);
                    load();`;
    const controller = function() {};
    controller.toString = () => `["$scope", "backendCommunicator", function($scope, backendCommunicator) {
${body}
}]`;
    return controller;
}
function registerSettingsPage() {
    const defaultConfig = JSON.stringify(DEFAULT_CONFIG);
    modules.uiExtensionManager.registerUIExtension({
        id: SCRIPT_ID,
        pages: [
            {
                id: "settings",
                name: "Haven Minecraft",
                icon: "fa-cube",
                type: "angularjs",
                fullPage: true,
                template: `
                    <div class="p-6" style="max-width: 1100px; margin: 0 auto; padding-bottom: 40px;">
                        <style>
                            .hm-page eos-container{display:block;margin-bottom:18px!important}
                            .hm-page firebot-input{display:block;margin-bottom:14px!important}
                            .hm-version-row{margin-bottom:14px}
                            .hm-version-label{display:block;font-weight:700;margin-bottom:7px;color:#fff}
                            .hm-actions{display:flex;gap:10px;margin-top:16px}
                            .hm-page .muted-note{color:#aaa0b8;font-size:12px;line-height:1.4;margin:4px 0 14px}
                                                    </style>
                        <div class="hm-page">
                            <h2 style="margin-top: 0;">Haven Minecraft Integration</h2>
                            <p class="muted">Firebot sends Minecraft effects to the Haven Minecraft command bridge.</p>

                            <div class="effect-info alert alert-success" ng-if="saveMessage">{{saveMessage}}</div>
                            <div class="effect-info alert alert-danger" ng-if="errorMessage">{{errorMessage}}</div>

                            <eos-container header="Connection" pad-top="true">
                                ${serverAddressInput()}
                                ${configInput("Request Timeout Ms", "config.requestTimeoutMs", "5000", "How long Firebot waits before treating the bridge request as failed.", "number")}
                                <button class="btn btn-default" ng-click="testConnection()" ng-disabled="testing">Test Connection</button>
                            </eos-container>

                            <eos-container header="Minecraft" pad-top="true">
                                <div class="hm-version-row">
                                    <span class="hm-version-label">Minecraft Version${inlineTooltip("Automatically converts item and entity data to the selected Minecraft version before sending it to the server.")}</span>
                                    <dropdown-select options="minecraftVersions" selected="config.minecraftVersion"></dropdown-select>
                                </div>
                                ${playerCodeInput()}
                            </eos-container>


                            <eos-container header="Limits" pad-top="true">
                                <div class="muted-note">Click to Request Limits from the Minecraft Server Connection.</div>
                                <pre style="white-space: pre-wrap; background:#140d1d; border:1px solid #3a2b50; border-radius:7px; padding:12px; color:#d8cfea;">{{limitsText}}</pre>
                                <button class="btn btn-default" ng-click="fetchLimits()" ng-disabled="fetchingLimits">Request Limits</button>
                            </eos-container>

                            <eos-container header="Statistics" pad-top="true">
                                <div class="muted-note">Click to request current bridge statistics from the Minecraft server connection.</div>
                                <pre style="white-space: pre-wrap; background:#140d1d; border:1px solid #3a2b50; border-radius:7px; padding:12px; color:#d8cfea;">{{statsText}}</pre>
                                <button class="btn btn-default" ng-click="fetchStats()" ng-disabled="fetchingStats">Request Statistics</button>
                            </eos-container>

                            <eos-container header="Quest Cache" pad-top="true">
                                <div class="muted-note">Stores the latest quest update so variables and overlays can reuse it.</div>
                                <pre style="white-space: pre-wrap; background:#140d1d; border:1px solid #3a2b50; border-radius:7px; padding:12px; color:#d8cfea;">{{questCacheText}}</pre>
                                <button class="btn btn-default" ng-click="clearQuestCache()" ng-disabled="clearingQuestCache">Clear Quest Cache</button>
                            </eos-container>

                            <div class="hm-actions">
                                <button class="btn btn-primary" ng-click="save()" ng-disabled="saving">Save</button>
                            </div>
                        </div>
                    </div>
                `,
                controller: makeSettingsPageController()
            }
        ]
    });
}

function registerFrontendEvents() {
    modules.frontendCommunicator.onAsync("haven-minecraft:get-config", async () => {
        try {
            return loadConfig();
        } catch (error) {
            modules.logger.error(`${SCRIPT_NAME}: Config load failed`, error);
            return DEFAULT_CONFIG;
        }
    });
    modules.frontendCommunicator.onAsync("haven-minecraft:save-config", async config => {
        try {
            return saveConfig(config);
        } catch (error) {
            modules.logger.error(`${SCRIPT_NAME}: Config save failed`, error);
            return loadConfig();
        }
    });
    modules.frontendCommunicator.onAsync("haven-minecraft:test-connection", async () => {
        try {
            await sendBridgeRequest({
                action: "ping",
                data: {}
            });
            return { ok: true };
        } catch (error) {
            modules.logger.error(`${SCRIPT_NAME}: Connection test failed`, error);
            return { ok: false, error: error.message };
        }
    });
    modules.frontendCommunicator.onAsync("haven-minecraft:fetch-limits", async () => {
        try {
            const raw = await sendBridgeRequest({
                action: "limits",
                data: {}
            });
            const reply = parseBridgeReply(raw);
            return { ok: true, limits: reply && reply.data ? reply.data : null };
        } catch (error) {
            modules.logger.error(`${SCRIPT_NAME}: Limits fetch failed`, error);
            return { ok: false, error: error.message };
        }
    });
    modules.frontendCommunicator.onAsync("haven-minecraft:get-quest-cache", async () => {
        try {
            return loadQuestCache();
        } catch (error) {
            modules.logger.error(`${SCRIPT_NAME}: Quest cache load failed`, error);
            return null;
        }
    });
    modules.frontendCommunicator.onAsync("haven-minecraft:clear-quest-cache", async () => {
        try {
            clearQuestCache();
            return { ok: true };
        } catch (error) {
            modules.logger.error(`${SCRIPT_NAME}: Quest cache clear failed`, error);
            return { ok: false, error: error.message };
        }
    });
    modules.frontendCommunicator.onAsync("haven-minecraft:load-quest-preset", async filePath => {
        return loadQuestPresetFile(filePath);
    });
    modules.frontendCommunicator.onAsync("haven-minecraft:save-quest-preset", async data => {
        return saveQuestPresetFile(data || {});
    });
    modules.frontendCommunicator.onAsync("haven-minecraft:fetch-stats", async () => {
        try {
            const raw = await sendBridgeRequest({
                action: "stats",
                data: {}
            });
            const reply = parseBridgeReply(raw);
            return { ok: true, stats: reply && reply.data ? reply.data : null };
        } catch (error) {
            modules.logger.error(`${SCRIPT_NAME}: Statistics fetch failed`, error);
            return { ok: false, error: error.message };
        }
    });
}

module.exports = {
    getScriptManifest: () => ({
        name: SCRIPT_NAME,
        description: "Minecraft effects for Firebot.",
        author: "CathieNova",
        version: "1.0.0",
        firebotVersion: "5"
    }),
    getDefaultParameters: () => ({}),
    run: async runRequest => {
        modules = runRequest.modules;
        scriptDataDir = runRequest.scriptDataDir;
        loadConfig();
        registerFrontendEvents();
        registerEventSource();
        registerEventFilters();
        registerVariables();
        registerSettingsPage();
        registerEffects();
        startBridgeEventPolling();
        modules.logger.info(`${SCRIPT_NAME} loaded.`);
    }
};
