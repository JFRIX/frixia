// --- Gestion des conversations via IndexedDB ---

function openConvDB() {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open('minou_conversations', 1);
        req.onupgradeneeded = () => {
            const db = req.result;
            if (!db.objectStoreNames.contains('conversations')) {
                db.createObjectStore('conversations');
            }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

async function writeConversationFile(filename, content) {
    try {
        const db = await openConvDB();
        const tx = db.transaction('conversations', 'readwrite');
        tx.objectStore('conversations').put(content, filename);
        return new Promise((resolve) => {
            tx.oncomplete = () => resolve(true);
            tx.onerror = () => resolve(false);
        });
    } catch (e) {
        console.error('Erreur écriture conversation:', e);
        return false;
    }
}

async function listConversationFiles() {
    try {
        const db = await openConvDB();
        const tx = db.transaction('conversations', 'readonly');
        const store = tx.objectStore('conversations');
        const keys = await new Promise((resolve) => {
            const req = store.getAllKeys();
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => resolve([]);
        });
        const conversations = [];
        for (const name of keys) {
            try {
                const raw = await new Promise((resolve) => {
                    const req = store.get(name);
                    req.onsuccess = () => resolve(req.result);
                    req.onerror = () => resolve(null);
                });
                if (!raw) continue;
                const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
                let fullText = '';
                if (data.messages) {
                    for (const msg of data.messages) {
                        if (typeof msg.content === 'string') {
                            fullText += msg.content + ' ';
                        } else if (Array.isArray(msg.content)) {
                            for (const p of msg.content) {
                                if (p.type === 'text') fullText += p.text + ' ';
                            }
                        }
                    }
                }
                conversations.push({
                    filename: name,
                    id: data.id,
                    titre: data.titre || null,
                    date: data.date,
                    modele: data.modele,
                    firstMessage: data.messages && data.messages.length > 0
                        ? data.messages[0].content : '',
                    tokens_entree: data.tokens_entree || 0,
                    tokens_sortie: data.tokens_sortie || 0,
                    cout_estime_usd: data.cout_estime_usd || 0,
                    fullText: fullText.toLowerCase(),
                    category: data.category || null
                });
            } catch (e) {}
        }
        conversations.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
        return conversations;
    } catch (e) {
        console.error('Erreur lecture conversations:', e);
        return [];
    }
}

async function readConversationFile(filename) {
    try {
        const db = await openConvDB();
        const tx = db.transaction('conversations', 'readonly');
        const req = tx.objectStore('conversations').get(filename);
        return new Promise((resolve) => {
            req.onsuccess = () => {
                const raw = req.result;
                if (!raw) { resolve(null); return; }
                resolve(typeof raw === 'string' ? JSON.parse(raw) : raw);
            };
            req.onerror = () => resolve(null);
        });
    } catch (e) {
        console.error('Erreur lecture conversation:', e);
        return null;
    }
}

async function deleteConversationFile(filename) {
    try {
        const db = await openConvDB();
        const tx = db.transaction('conversations', 'readwrite');
        tx.objectStore('conversations').delete(filename);
        return new Promise((resolve) => {
            tx.oncomplete = () => resolve(true);
            tx.onerror = () => resolve(false);
        });
    } catch (e) {
        console.error('Erreur suppression conversation:', e);
        return false;
    }
}

// --- Gestion des System Prompts (localStorage) ---

const SP_STORAGE_KEY = 'minou-systemprompts';

function _getSpStore() {
    try {
        return JSON.parse(localStorage.getItem(SP_STORAGE_KEY)) || {};
    } catch (e) {
        return {};
    }
}

function _saveSpStore(store) {
    localStorage.setItem(SP_STORAGE_KEY, JSON.stringify(store));
}

async function listSystemPrompts() {
    const store = _getSpStore();
    const prompts = Object.entries(store).map(([filename, data]) => ({
        filename,
        nom: data.nom,
        contenu: data.contenu
    }));
    prompts.sort((a, b) => a.nom.localeCompare(b.nom));
    return prompts;
}

async function readSystemPrompt(filename) {
    const store = _getSpStore();
    return store[filename] || null;
}

async function writeSystemPrompt(filename, data) {
    const store = _getSpStore();
    store[filename] = { nom: data.nom, contenu: data.contenu };
    _saveSpStore(store);
    return true;
}

async function deleteSystemPromptFile(filename) {
    const store = _getSpStore();
    delete store[filename];
    _saveSpStore(store);
    return true;
}

// Importer les system prompts depuis le dossier systemprompts/ au premier lancement
async function importDefaultSystemPrompts() {
    const store = _getSpStore();
    if (Object.keys(store).length > 0) return; // déjà initialisé
    const defaults = [
        { filename: 'sympote.json', nom: 'sympote', contenu: 'tu es mon pote, on s\'écrit un peu en langage sms, cool, friendly, marrant.' }
    ];
    for (const sp of defaults) {
        store[sp.filename] = { nom: sp.nom, contenu: sp.contenu };
    }
    _saveSpStore(store);
}

// --- Gestion des Prompts enregistrés (localStorage) ---

const PROMPT_STORAGE_KEY = 'minou-savedprompts';

function _getPromptStore() {
    try {
        return JSON.parse(localStorage.getItem(PROMPT_STORAGE_KEY)) || {};
    } catch (e) {
        return {};
    }
}

function _savePromptStore(store) {
    localStorage.setItem(PROMPT_STORAGE_KEY, JSON.stringify(store));
}

async function listSavedPrompts() {
    const store = _getPromptStore();
    const prompts = Object.entries(store).map(([filename, data]) => ({
        filename,
        nom: data.nom,
        contenu: data.contenu
    }));
    prompts.sort((a, b) => a.nom.localeCompare(b.nom));
    return prompts;
}

async function readSavedPrompt(filename) {
    const store = _getPromptStore();
    return store[filename] || null;
}

async function writeSavedPrompt(filename, data) {
    const store = _getPromptStore();
    store[filename] = { nom: data.nom, contenu: data.contenu };
    _savePromptStore(store);
    return true;
}

async function deleteSavedPrompt(filename) {
    const store = _getPromptStore();
    delete store[filename];
    _savePromptStore(store);
    return true;
}

// --- Gestion des Catégories (localStorage) ---

const CAT_STORAGE_KEY = 'minou-categories';

function _getCatStore() {
    try {
        return JSON.parse(localStorage.getItem(CAT_STORAGE_KEY)) || {};
    } catch (e) {
        return {};
    }
}

function _saveCatStore(store) {
    localStorage.setItem(CAT_STORAGE_KEY, JSON.stringify(store));
}

function listCategories() {
    const store = _getCatStore();
    return Object.entries(store).map(([id, data]) => ({
        id,
        nom: data.nom,
        couleur: data.couleur,
        icone: data.icone
    }));
}

function readCategory(id) {
    const store = _getCatStore();
    return store[id] || null;
}

function writeCategory(id, data) {
    const store = _getCatStore();
    store[id] = { nom: data.nom, couleur: data.couleur, icone: data.icone };
    _saveCatStore(store);
}

function deleteCategory(id) {
    const store = _getCatStore();
    delete store[id];
    _saveCatStore(store);
}

async function updateConversationCategory(filename, categoryId) {
    const data = await readConversationFile(filename);
    if (!data) return;
    if (categoryId) {
        data.category = categoryId;
    } else {
        delete data.category;
    }
    await writeConversationFile(filename, data);
}

// Formater une conversation en JSON
function formatConversationFile(data) {
    const imgCost = data.totalImageCost || 0;
    const audioCost = data.totalAudioCost || 0;
    const extraCost = imgCost + audioCost;
    let cost = null;
    if (data.totalCost != null) {
        // Coût pré-calculé par segment (multi-modèle)
        cost = Math.round((data.totalCost + extraCost) * 10000) / 10000;
    } else {
        // Fallback : calcul global (rétro-compatibilité)
        const tarif = getTarif(data.model) || getImageTarif(data.model) || getSearchTarif(data.model);
        if (tarif) {
            cost = (data.totalInputTokens / 1_000_000) * tarif.inputPer1M
                 + (data.totalOutputTokens / 1_000_000) * tarif.outputPer1M
                 + extraCost;
            cost = Math.round(cost * 10000) / 10000;
        } else if (extraCost > 0) {
            cost = Math.round(extraCost * 10000) / 10000;
        }
    }
    const obj = {
        id: data.id,
        titre: data.title || null,
        modele: data.model,
        date: data.startTime,
        tokens_entree: data.totalInputTokens,
        tokens_sortie: data.totalOutputTokens,
        totalCost: data.totalCost || 0,
        cout_images: imgCost,
        cout_audio: audioCost,
        cout_estime_usd: cost,
        messages: data.messages
    };
    if (data.systemPrompt) obj.system_prompt = data.systemPrompt;
    if (data.category) obj.category = data.category;
    return JSON.stringify(obj, null, 2);
}
