/**
 * D616 Extempore Effects (Option A)
 *
 * From a chat message, create a permanent effect (until removed) as a Token condition
 * using the same "M" icon from the Multiverse-D616 system.
 */

const MODULE_ID = "d616-extempore-effects";
const STORE_SETTING = "extemporeConditions"; // world setting (JSON string)
const STATUS_PREFIX = "d616ee.";

function norm(s) {
  return String(s ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function slugify(s) {
  const base = norm(s)
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  // keep it short-ish to avoid weird limits
  return base.slice(0, 48) || "effect";
}

function getMIconPath() {
  const sysId = game?.system?.id || "multiverse-d616";
  return `systems/${sysId}/icons/m.svg`;
}

function t(key, data = null) {
  const str = game.i18n?.localize?.(key) ?? key;
  if (!data) return str;
  return str.replace(/\{(\w+)\}/g, (_m, k) => (k in data ? String(data[k]) : _m));
}

function safeJsonParse(raw, fallback) {
  try {
    const v = JSON.parse(String(raw ?? ""));
    return v ?? fallback;
  } catch (_e) {
    return fallback;
  }
}


function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;",
  }[ch]));
}

function getStoredConditions() {
  const raw = game.settings.get(MODULE_ID, STORE_SETTING);
  const arr = safeJsonParse(raw, []);
  return Array.isArray(arr) ? arr.filter((x) => x && typeof x === "object" && x.id && x.name) : [];
}

async function upsertStoredCondition(id, name, description = "") {
  const list = getStoredConditions();
  const idx = list.findIndex((x) => x.id === id);
  const desc = String(description ?? "");
  if (idx >= 0) {
    if (list[idx].name !== name || String(list[idx].description ?? "") !== desc) {
      list[idx].name = name;
      list[idx].description = desc;
      await game.settings.set(MODULE_ID, STORE_SETTING, JSON.stringify(list));
    }
    return;
  }
  list.push({ id, name, description: desc });
  await game.settings.set(MODULE_ID, STORE_SETTING, JSON.stringify(list));
}

function ensureStatusEffectEntry(id, name) {
  if (!Array.isArray(CONFIG.statusEffects)) CONFIG.statusEffects = [];
  if (CONFIG.statusEffects.some((e) => e?.id === id)) return;

  const icon = getMIconPath();
  CONFIG.statusEffects.push({
    id,
    name,
    label: name,
    img: icon,
    icon: icon,
  });

  // keep list sorted (system also sorts)
  try {
    const lang = game.i18n?.lang || navigator.language || "pt-BR";
    CONFIG.statusEffects = CONFIG.statusEffects
      .slice()
      .sort((a, b) => (a?.name ?? "").localeCompare(b?.name ?? "", lang, { sensitivity: "base" }));
  } catch (_e) {
    // ignore
  }
}

function ensureAllStoredInConfig() {
  for (const c of getStoredConditions()) {
    ensureStatusEffectEntry(c.id, c.name);
  }
}


// ---- Multiverse-D616 Condition Tray Integration ----
// The system shows condition name+description from its conditions registry.
// We add/update our extempore conditions into the system's world setting (customConditions)
// so they show up in the same tray with a tooltip description.
const SYS_MODULE_ID = game?.system?.id || "multiverse-d616";
const SYS_CUSTOM_COND_SETTING = "customConditions";

function parseJsonArray(raw) {
  try {
    const v = JSON.parse(String(raw ?? ""));
    if (Array.isArray(v)) return v;
    if (Array.isArray(v?.conditions)) return v.conditions;
  } catch (_e) {}
  return [];
}

async function upsertSystemCustomCondition(id, name, descriptionHtml) {
  if (!game.user?.isGM) return;
  let raw;
  try {
    raw = game.settings.get(SYS_MODULE_ID, SYS_CUSTOM_COND_SETTING);
  } catch (_e) {
    return;
  }
  const arr = parseJsonArray(raw);

  const entry = {
    id,
    name,
    icon: "icons/m.svg", // relative to system folder
    description: String(descriptionHtml ?? ""),
    remove: "Remova no token (HUD) quando desejar.",
  };

  const idx = arr.findIndex((c) => String(c?.id ?? "") === id);
  if (idx >= 0) {
    const cur = arr[idx] ?? {};
    const changed =
      String(cur.name ?? "") !== entry.name ||
      String(cur.description ?? "") !== entry.description ||
      String(cur.icon ?? "") !== entry.icon ||
      String(cur.remove ?? "") !== entry.remove;
    if (!changed) return;
    arr[idx] = { ...cur, ...entry };
  } else {
    arr.push(entry);
  }

  // Pretty-print so the system's manager UI remains readable.
  const next = JSON.stringify(arr, null, 2);
  await game.settings.set(SYS_MODULE_ID, SYS_CUSTOM_COND_SETTING, next);
}

async function ensureStoredInSystemCustomConditions() {
  if (!game.user?.isGM) return;
  for (const c of getStoredConditions()) {
    await upsertSystemCustomCondition(c.id, c.name, c.description ?? "");
  }
}

async function toggleStatus(actor, statusId, active) {
  // Make sure config entry exists so toggleStatusEffect can resolve icon/label
  const stored = getStoredConditions().find((x) => x.id === statusId);
  ensureStatusEffectEntry(statusId, stored?.name ?? statusId);

  // Prefer Actor.toggleStatusEffect
  try {
    if (actor?.toggleStatusEffect) {
      return await actor.toggleStatusEffect(statusId, { active });
    }
  } catch (_e) {}

  // Fallback: token document
  try {
    const tok = actor?.getActiveTokens?.(true, true)?.[0];
    if (tok?.document?.toggleStatusEffect) return await tok.document.toggleStatusEffect(statusId, { active });
    if (tok?.toggleStatusEffect) return await tok.toggleStatusEffect(statusId, { active });
  } catch (_e) {}

  // Last resort: create/delete ActiveEffect manually
  try {
    if (!active) {
      const ids = (actor?.effects ?? [])
        .filter((e) => !e.disabled && (e.statuses?.has?.(statusId) || Array.from(e.statuses ?? []).includes(statusId)))
        .map((e) => e.id);
      if (ids.length) return await actor.deleteEmbeddedDocuments("ActiveEffect", ids);
      return;
    }
    const se = (CONFIG.statusEffects || []).find((x) => x.id === statusId);
    const name = se?.name ?? statusId;
    const icon = se?.icon ?? se?.img ?? getMIconPath();
    return await actor.createEmbeddedDocuments("ActiveEffect", [
      {
        name,
        icon,
        disabled: false,
        statuses: [statusId],
      },
    ]);
  } catch (e) {
    console.error(`[${MODULE_ID}] Failed to toggle status ${statusId}`, e);
  }
}

function uniqueActorsFromTokens(tokens) {
  const map = new Map();
  for (const tok of tokens) {
    const a = tok?.actor;
    if (!a) continue;
    map.set(a.id, a);
  }
  return Array.from(map.values());
}

function getTokensForMessage(message) {
  // 1) Controlled tokens
  const controlled = canvas?.tokens?.controlled ?? [];
  if (controlled.length) return controlled;

  // 2) Speaker token in this scene
  const spTokId = message?.speaker?.token;
  if (spTokId) {
    const direct = canvas?.tokens?.get?.(spTokId);
    if (direct) return [direct];
    const placeable = canvas?.tokens?.placeables?.find((t) => t?.document?.id === spTokId);
    if (placeable) return [placeable];
  }

  // 3) Any token for speaker actor
  const spActorId = message?.speaker?.actor;
  if (spActorId) {
    const matches = canvas?.tokens?.placeables?.filter((t) => t?.actor?.id === spActorId) ?? [];
    if (matches.length) return matches;
  }

  return [];
}

function htmlToTextLines(html) {
  const raw = String(html ?? "");
  let text = "";
  try {
    const doc = new DOMParser().parseFromString(raw, "text/html");
    // Convert <br> to real newlines
    doc.querySelectorAll("br").forEach((br) => br.replaceWith("\n"));
    // Ensure block-ish elements separate lines a bit
    doc.querySelectorAll("p,div,li,section,article,header,footer,tr").forEach((el) => el.append("\n"));
    text = String(doc?.body?.textContent ?? "");
  } catch (_e) {
    text = raw.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, " ");
  }
  text = text.replace(/\r/g, "");
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  return { text, lines };
}

function extractEffectName(message) {
  // Try to use system flags pointing to an item/power used
  const sysFlags = message?.flags?.[game.system.id] ?? message?.flags?.["multiverse-d616"] ?? {};
  const itemId = sysFlags?.itemId ?? sysFlags?.sourceItemId ?? sysFlags?.originItemId ?? null;
  const actor = message?.speaker?.actor ? game.actors.get(message.speaker.actor) : null;
  if (itemId && actor?.items?.get) {
    const item = actor.items.get(itemId);
    if (item?.name) return item.name;
  }

  const cleanName = (n) => {
    let out = String(n ?? "").replace(/\s+/g, " ").trim();
    // If the card got flattened, cut before common sections
    const stop = out.search(/\b(acao|ação|duracao|duração|duration|custo|cost)\s*:/i);
    if (stop > 0) out = out.slice(0, stop).trim();
    // If the description got appended to the same line
    out = out.replace(/\s+(o|a)\s+personagem\b.*$/i, "").trim();
    out = out.replace(/\s+the\s+character\b.*$/i, "").trim();
    // If there's still a lot of text, keep only the first segment
    out = out.split(/\s{2,}/)[0].trim();
    return out;
  };

  const parseForName = (html) => {
    const { text, lines } = htmlToTextLines(html);

    const pickLine = (re) => {
      for (const l of lines) {
        const m = l.match(re);
        if (m && m[1]) return cleanName(m[1]);
      }
      return null;
    };

    // Prefer exact line formats
    const p1 = pickLine(/^power\s*:\s*(.+)$/i);
    if (p1) return p1;
    const p2 = pickLine(/^item\s*:\s*(.+)$/i);
    if (p2) return p2;
    const p3 = pickLine(/^trait\s*:\s*(.+)$/i);
    if (p3) return p3;
    const p4 = pickLine(/^tag\s*:\s*(.+)$/i);
    if (p4) return p4;

    // Fallback: find the key anywhere in the text (in case boundaries got merged)
    const any = (re) => {
      const m = text.match(re);
      return m?.[1] ? cleanName(m[1]) : null;
    };
    const a1 = any(/power\s*:\s*([^\n]+)/i);
    if (a1) return a1;
    const a2 = any(/item\s*:\s*([^\n]+)/i);
    if (a2) return a2;
    const a3 = any(/trait\s*:\s*([^\n]+)/i);
    if (a3) return a3;
    const a4 = any(/tag\s*:\s*([^\n]+)/i);
    if (a4) return a4;

    return null;
  };

  // In Multiverse-D616, the most reliable hint is usually in ChatMessage.flavor.
  // We'll parse flavor first, then fall back to the HTML content.
  const sources = [];
  if (message?.flavor) sources.push(message.flavor);
  if (message?.content) sources.push(message.content);

  for (const src of sources) {
    const found = parseForName(src);
    if (found) return found;
  }

  // Last fallback: use a short snippet of the message as a name.
  for (const src of sources) {
    const { lines } = htmlToTextLines(src);
    const snippet = lines.join(" ").trim();
    if (snippet) return cleanName(snippet).slice(0, 48);
  }

  return t("D616EE.NameFallback");
}


function extractEffectDescription(message, effectName) {
  // Pull main descriptive text from the chat card content.
  // We store HTML-safe text (with <br>) so the system tray can display it.
  const html = message?.content ?? "";
  const { lines } = htmlToTextLines(html);

  const speakerName = String(message?.speaker?.alias ?? "").trim();
  const name = String(effectName ?? "").trim();

  const dropPrefixes = [
    /^ability\s*:/i,
    /^power\s*:/i,
    /^item\s*:/i,
    /^trait\s*:/i,
    /^tag\s*:/i,
  ];
  const stopPrefixes = [
    /^a[cç]ao\s*:/i,
    /^dura[cç]ao\s*:/i,
    /^duration\s*:/i,
    /^custo\s*:/i,
    /^cost\s*:/i,
  ];

  const kept = [];
  for (const l of lines) {
    const ll = String(l ?? "").trim();
    if (!ll) continue;
    if (speakerName && ll === speakerName) continue;
    if (name && ll === name) continue;
    if (dropPrefixes.some((re) => re.test(ll))) continue;
    if (stopPrefixes.some((re) => re.test(ll))) break;
    kept.push(ll);
  }

  const txt = kept.join("\n").trim();
  const fallback = "Efeito criado a partir do chat. Remova quando desejar.";
  const safe = escapeHtml(txt || fallback);
  return safe.replace(/\n/g, "<br>");
}

function statusIdForName(name) {
  return `${STATUS_PREFIX}${slugify(name)}`;
}

async function applyFromMessage(message) {
  ensureAllStoredInConfig();
  await ensureStoredInSystemCustomConditions();
  const name = extractEffectName(message);
  const description = extractEffectDescription(message, name);
  const statusId = statusIdForName(name);

  await upsertStoredCondition(statusId, name, description);
  await upsertSystemCustomCondition(statusId, name, description);
  ensureStatusEffectEntry(statusId, name);

  const tokens = getTokensForMessage(message);
  if (!tokens.length) {
    ui.notifications.warn(t("D616EE.NoTargets"));
    return;
  }

  for (const actor of uniqueActorsFromTokens(tokens)) {
    await toggleStatus(actor, statusId, true);
  }

  ui.notifications.info(t("D616EE.Applied", { name }));
}

async function removeFromMessage(message) {
  ensureAllStoredInConfig();
  await ensureStoredInSystemCustomConditions();
  const name = extractEffectName(message);
  const statusId = statusIdForName(name);

  const tokens = getTokensForMessage(message);
  if (!tokens.length) {
    ui.notifications.warn(t("D616EE.NoTargets"));
    return;
  }

  for (const actor of uniqueActorsFromTokens(tokens)) {
    await toggleStatus(actor, statusId, false);
  }

  ui.notifications.info(t("D616EE.Removed", { name }));
}

async function removeAllFromSelection() {
  ensureAllStoredInConfig();
  await ensureStoredInSystemCustomConditions();
  const tokens = canvas?.tokens?.controlled ?? [];
  if (!tokens.length) {
    ui.notifications.warn(t("D616EE.NoTargets"));
    return;
  }
  const ids = getStoredConditions().map((c) => c.id);
  for (const actor of uniqueActorsFromTokens(tokens)) {
    for (const id of ids) {
      await toggleStatus(actor, id, false);
    }
  }
  ui.notifications.info(t("D616EE.RemovedAll"));
}

function addChatContextOptions(options) {
  options.push({
    name: `${t("D616EE.ContextMenuTitle")}: ${t("D616EE.CreateEffect")}`,
    icon: '<i class="fas fa-plus"></i>',
    condition: (li) => {
      const msgId = li?.dataset?.messageId;
      return !!msgId;
    },
    callback: async (li) => {
      const msgId = li?.dataset?.messageId;
      const message = game.messages.get(msgId);
      if (message) await applyFromMessage(message);
    },
  });

  options.push({
    name: `${t("D616EE.ContextMenuTitle")}: ${t("D616EE.RemoveEffect")}`,
    icon: '<i class="fas fa-minus"></i>',
    condition: (li) => {
      const msgId = li?.dataset?.messageId;
      return !!msgId;
    },
    callback: async (li) => {
      const msgId = li?.dataset?.messageId;
      const message = game.messages.get(msgId);
      if (message) await removeFromMessage(message);
    },
  });

  options.push({
    name: `${t("D616EE.ContextMenuTitle")}: ${t("D616EE.RemoveAll")}`,
    icon: '<i class="fas fa-trash"></i>',
    condition: () => true,
    callback: async () => {
      await removeAllFromSelection();
    },
  });
}

function patchChatContextIfNeeded() {
  // Preferred hook (still supported in v13)
  Hooks.on("getChatLogEntryContext", (_html, options) => addChatContextOptions(options));

  // Extra safety: patch the method directly if the hook isn't firing in a future update
  try {
    const proto = foundry?.applications?.sidebar?.tabs?.ChatLog?.prototype;
    if (!proto || !proto._getEntryContextOptions) return;
    if (proto._d616ee_patched) return;

    const original = proto._getEntryContextOptions;
    proto._getEntryContextOptions = function (...args) {
      const opts = original.apply(this, args);
      try {
        addChatContextOptions(opts);
      } catch (_e) {}
      return opts;
    };
    proto._d616ee_patched = true;
  } catch (_e) {
    // ignore
  }
}

Hooks.once("init", () => {
  game.settings.register(MODULE_ID, STORE_SETTING, {
    name: "Extempore Conditions (JSON)",
    hint: "Armazenamento interno dos efeitos Extempore criados.",
    scope: "world",
    config: false,
    type: String,
    default: "[]",
  });

  patchChatContextIfNeeded();
});

Hooks.once("ready", async () => {
  // Ensure stored extempore conditions are present and registered in the system tray (GM).
  ensureAllStoredInConfig();
  await ensureStoredInSystemCustomConditions();

  // Also, whenever the system rebuilds CONFIG.statusEffects (rare), we re-inject ours.
  Hooks.on("canvasReady", () => ensureAllStoredInConfig());
  Hooks.on("renderTokenHUD", () => ensureAllStoredInConfig());
});
