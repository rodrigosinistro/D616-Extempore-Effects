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

function getStoredConditions() {
  const raw = game.settings.get(MODULE_ID, STORE_SETTING);
  const arr = safeJsonParse(raw, []);
  return Array.isArray(arr) ? arr.filter((x) => x && typeof x === "object" && x.id && x.name) : [];
}

async function upsertStoredCondition(id, name) {
  const list = getStoredConditions();
  const idx = list.findIndex((x) => x.id === id);
  if (idx >= 0) {
    if (list[idx].name !== name) {
      list[idx].name = name;
      await game.settings.set(MODULE_ID, STORE_SETTING, JSON.stringify(list));
    }
    return;
  }
  list.push({ id, name });
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
      .sort((a, b) => (a?.label ?? a?.name ?? "").localeCompare(b?.label ?? b?.name ?? "", lang, { sensitivity: "base" }));
  } catch (_e) {
    // ignore
  }
}

function ensureAllStoredInConfig() {
  for (const c of getStoredConditions()) {
    ensureStatusEffectEntry(c.id, c.name);
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
    const name = se?.label ?? se?.name ?? statusId;
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

function extractEffectName(message) {
  // Try to use system flags pointing to an item/power used
  const sysFlags = message?.flags?.[game.system.id] ?? message?.flags?.["multiverse-d616"] ?? {};
  const itemId = sysFlags?.itemId ?? sysFlags?.sourceItemId ?? sysFlags?.originItemId ?? null;
  const actor = message?.speaker?.actor ? game.actors.get(message.speaker.actor) : null;
  if (itemId && actor?.items?.get) {
    const item = actor.items.get(itemId);
    if (item?.name) return item.name;
  }

  // Parse message HTML content into plain text
  const html = String(message?.content ?? "");
  let text = "";
  try {
    const doc = new DOMParser().parseFromString(html, "text/html");
    text = String(doc?.body?.textContent ?? "");
  } catch (_e) {
    text = html.replace(/<[^>]+>/g, " ");
  }
  text = text.replace(/\r/g, "");

  // Patterns seen in this system (examples in the screenshot):
  // "power: Phase Self" / "power: Phase Object" etc.
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);

  const pick = (re) => {
    for (const l of lines) {
      const m = l.match(re);
      if (m && m[1]) return m[1].trim();
    }
    return null;
  };

  const p1 = pick(/\bpower\s*:\s*(.+)$/i);
  if (p1) return p1;
  const p2 = pick(/\bitem\s*:\s*(.+)$/i);
  if (p2) return p2;
  const p3 = pick(/\btrait\s*:\s*(.+)$/i);
  if (p3) return p3;
  const p4 = pick(/\btag\s*:\s*(.+)$/i);
  if (p4) return p4;

  // Fallback: flavor or a short snippet
  const fl = String(message?.flavor ?? "").trim();
  if (fl) return fl;

  const snippet = lines.join(" ").trim();
  if (snippet) return snippet.slice(0, 48);

  return t("D616EE.NameFallback");
}

function statusIdForName(name) {
  return `${STATUS_PREFIX}${slugify(name)}`;
}

async function applyFromMessage(message) {
  ensureAllStoredInConfig();
  const name = extractEffectName(message);
  const statusId = statusIdForName(name);

  await upsertStoredCondition(statusId, name);
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

Hooks.once("ready", () => {
  // Make sure any stored extempore conditions are present in the status list.
  ensureAllStoredInConfig();

  // Also, whenever the system rebuilds CONFIG.statusEffects (rare), we re-inject ours.
  Hooks.on("canvasReady", () => ensureAllStoredInConfig());
  Hooks.on("renderTokenHUD", () => ensureAllStoredInConfig());
});
