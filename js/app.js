const chatContainer = document.getElementById('chat-container');
const promptInput = document.getElementById('prompt-input');
const sendBtn = document.getElementById('send-btn');
const newChatBtn = document.getElementById('new-chat-btn');
const tokenInfo = document.getElementById('token-info');
const costInfo = document.getElementById('cost-info');
const convList = document.getElementById('conv-list');
const modelSelect = document.getElementById('model-select');
const imageModelSelect = document.getElementById('image-model-select');
const searchModelSelect = document.getElementById('search-model-select');
const spSelect = document.getElementById('sp-select');
const spListEl = document.getElementById('sp-list');
const spAddBtn = document.getElementById('sp-add-btn');
const spModalOverlay = document.getElementById('sp-modal-overlay');
const spModalTitle = document.getElementById('sp-modal-title');
const spModalNom = document.getElementById('sp-modal-nom');
const spModalContenu = document.getElementById('sp-modal-contenu');
const spModalCancel = document.getElementById('sp-modal-cancel');
const spModalSave = document.getElementById('sp-modal-save');
const themeToggle = document.getElementById('theme-toggle');
const convSearch = document.getElementById('conv-search');
const attachBtn = document.getElementById('attach-btn');
const fileInput = document.getElementById('file-input');
const attachPreview = document.getElementById('attach-preview');
const micBtn = document.getElementById('mic-btn');
const webSearchToggle = document.getElementById('web-search-toggle');
const enhancePromptBtn = document.getElementById('enhance-prompt-btn');

const promptPickerBtn = document.getElementById('prompt-picker-btn');
const promptPickerDropdown = document.getElementById('prompt-picker-dropdown');
const prListEl = document.getElementById('pr-list');
const prAddBtn = document.getElementById('pr-add-btn');
const prModalOverlay = document.getElementById('pr-modal-overlay');
const prModalTitle = document.getElementById('pr-modal-title');
const prModalNom = document.getElementById('pr-modal-nom');
const prModalContenu = document.getElementById('pr-modal-contenu');
const prModalCancel = document.getElementById('pr-modal-cancel');
const prModalSave = document.getElementById('pr-modal-save');
let prEditingFilename = null;

const catIcons = document.getElementById('cat-icons');
const catAddBtn = document.getElementById('cat-add-btn');
const catModalOverlay = document.getElementById('cat-modal-overlay');
const catModalTitle = document.getElementById('cat-modal-title');
const catModalNom = document.getElementById('cat-modal-nom');
const catModalIcone = document.getElementById('cat-modal-icone');
const catModalCouleur = document.getElementById('cat-modal-couleur');
const catModalCancel = document.getElementById('cat-modal-cancel');
const catModalSave = document.getElementById('cat-modal-save');
const catModalDelete = document.getElementById('cat-modal-delete');

let activeCategoryId = null;
let editingCategoryId = null;
let currentConversationCategory = null;

const apikeysBtn = document.getElementById('apikeys-btn');
const apikeysModalOverlay = document.getElementById('apikeys-modal-overlay');
const apikeysModalCancel = document.getElementById('apikeys-modal-cancel');
const apikeysModalSave = document.getElementById('apikeys-modal-save');

let currentModel = null;
let currentImageModel = null;
let currentSearchModel = null;
let conversationHistory = [];
let isStreaming = false;
let currentAbortController = null;
let totalInputTokens = 0;
let totalOutputTokens = 0;
let totalCost = 0;
let totalImageCost = 0;
let totalAudioCost = 0;
let conversationId = null;
let conversationStartTime = null;
let conversationTitle = null;
let firstPrompt = null;
let conversationStarted = false;
let currentSystemPrompt = null;
let spEditingFilename = null;
let pendingImages = [];
let pendingFiles = [];
let currentTtsAudio = null;
let mediaRecorder = null;
let micChunks = [];
let micStartTime = null;
let webSearchEnabled = false;
let originalPromptBeforeEnhance = null;
let isEnhancing = false;

// --- Thème clair/sombre ---
function applyTheme(dark) {
    document.body.classList.toggle('dark', dark);
    themeToggle.innerHTML = dark ? '&#9790; Thème sombre' : '&#9788; Thème clair';
}

const savedTheme = localStorage.getItem('minou-theme');
applyTheme(savedTheme === 'dark');

themeToggle.addEventListener('click', () => {
    const isDark = document.body.classList.toggle('dark');
    localStorage.setItem('minou-theme', isDark ? 'dark' : 'light');
    themeToggle.innerHTML = isDark ? '&#9790; Thème sombre' : '&#9788; Thème clair';
});

// --- Recherche de conversations ---
convSearch.addEventListener('input', () => {
    const query = convSearch.value.toLowerCase();
    const items = convList.querySelectorAll('.conv-item');
    for (const item of items) {
        if (!query) {
            item.style.display = '';
            continue;
        }
        const title = item.querySelector('.conv-item-title').textContent.toLowerCase();
        const fulltext = item.dataset.fulltext || '';
        const match = title.includes(query) || fulltext.includes(query);
        item.style.display = match ? '' : 'none';
    }
});

// --- Pièces jointes ---
if (typeof pdfjsLib !== 'undefined') {
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
}

attachBtn.addEventListener('click', () => fileInput.click());

const TEXT_EXTENSIONS = ['.txt', '.md', '.csv', '.json', '.xml', '.log', '.js', '.py', '.html', '.css'];

function isTextFile(file) {
    const ext = '.' + file.name.split('.').pop().toLowerCase();
    return TEXT_EXTENSIONS.includes(ext) || file.type.startsWith('text/');
}

function arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

async function extractPdfText(arrayBuffer) {
    if (typeof pdfjsLib === 'undefined') {
        console.warn('pdfjsLib non disponible');
        return '';
    }
    try {
        const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
        const pages = [];
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const tc = await page.getTextContent();
            pages.push(tc.items.map(item => item.str).join(' '));
        }
        const result = pages.join('\n\n');
        console.log(`PDF: ${pdf.numPages} pages, ${result.length} caractères extraits`);
        return result;
    } catch (e) {
        console.error('Erreur extraction PDF:', e);
        return '';
    }
}

function isPdf(file) {
    return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
}

function processAttachedFile(file) {
    if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const dataUrl = e.target.result;
            const img = { dataUrl, mimeType: file.type, name: file.name };
            pendingImages.push(img);
            renderAttachPreview();
            updateSendButton();
        };
        reader.readAsDataURL(file);
    } else if (isPdf(file)) {
        const reader = new FileReader();
        reader.onload = async (e) => {
            const arrayBuffer = e.target.result;
            const base64 = arrayBufferToBase64(arrayBuffer);
            const textContent = await extractPdfText(arrayBuffer);
            pendingFiles.push({ name: file.name, mimeType: 'application/pdf', data: base64, textContent });
            renderAttachPreview();
            updateSendButton();
        };
        reader.readAsArrayBuffer(file);
    } else if (isTextFile(file)) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const textContent = e.target.result;
            const base64 = btoa(unescape(encodeURIComponent(textContent)));
            pendingFiles.push({ name: file.name, mimeType: file.type || 'text/plain', data: base64, textContent });
            renderAttachPreview();
            updateSendButton();
        };
        reader.readAsText(file);
    }
}

fileInput.addEventListener('change', () => {
    for (const file of fileInput.files) {
        processAttachedFile(file);
    }
    fileInput.value = '';
});

// --- Drag & drop de fichiers sur la zone de saisie ---
const inputArea = document.querySelector('.input-area');

inputArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    inputArea.classList.add('drag-over');
});

inputArea.addEventListener('dragleave', (e) => {
    if (!inputArea.contains(e.relatedTarget)) {
        inputArea.classList.remove('drag-over');
    }
});

inputArea.addEventListener('drop', (e) => {
    e.preventDefault();
    inputArea.classList.remove('drag-over');
    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;
    for (const file of files) {
        processAttachedFile(file);
    }
});

function renderAttachPreview() {
    attachPreview.innerHTML = '';
    pendingImages.forEach((img, idx) => {
        const thumb = document.createElement('div');
        thumb.className = 'attach-thumb';

        const imgEl = document.createElement('img');
        imgEl.src = img.dataUrl;
        imgEl.alt = img.name;

        const removeBtn = document.createElement('button');
        removeBtn.className = 'attach-thumb-remove';
        removeBtn.textContent = '\u00D7';
        removeBtn.addEventListener('click', () => {
            pendingImages.splice(idx, 1);
            renderAttachPreview();
            updateSendButton();
        });

        thumb.appendChild(imgEl);
        thumb.appendChild(removeBtn);
        attachPreview.appendChild(thumb);
    });
    pendingFiles.forEach((file, idx) => {
        const chip = document.createElement('div');
        chip.className = 'attach-file-chip';

        const icon = document.createElement('span');
        icon.className = 'attach-file-chip-icon';
        icon.textContent = '\uD83D\uDCC4';

        const name = document.createElement('span');
        name.className = 'attach-file-chip-name';
        name.textContent = file.name;
        name.title = file.name;

        const removeBtn = document.createElement('button');
        removeBtn.className = 'attach-file-chip-remove';
        removeBtn.textContent = '\u00D7';
        removeBtn.addEventListener('click', () => {
            pendingFiles.splice(idx, 1);
            renderAttachPreview();
            updateSendButton();
        });

        chip.appendChild(icon);
        chip.appendChild(name);
        chip.appendChild(removeBtn);
        attachPreview.appendChild(chip);
    });
}

// --- Export Markdown ---
const exportMdBtn = document.getElementById('export-md-btn');
const exportHtmlBtn = document.getElementById('export-html-btn');
const summaryBtn = document.getElementById('summary-btn');

function updateExportMdBtn() {
    const show = conversationHistory.length > 0 ? '' : 'none';
    exportMdBtn.style.display = show;
    exportHtmlBtn.style.display = show;
    summaryBtn.style.display = show;
}

// --- Utilitaire : label d'un modèle ---
function getModelLabel(modelId) {
    if (!modelId) return modelId;
    const m = MODELS.find(m => m.id === modelId)
           || IMAGE_MODELS.find(m => m.id === modelId)
           || SEARCH_MODELS.find(m => m.id === modelId);
    return m ? m.label : modelId;
}

// --- Marqueur visuel de changement de modèle ---
function addModelSwitchElement(fromLabel, toLabel) {
    const div = document.createElement('div');
    div.className = 'model-switch-marker';
    div.textContent = `─── ${fromLabel} → ${toLabel} ───`;
    chatContainer.appendChild(div);
    scrollToBottom();
}

function addModelSwitch(fromId, toId) {
    conversationHistory.push({ role: 'system', type: 'model-switch', from: fromId, to: toId });
    addModelSwitchElement(getModelLabel(fromId), getModelLabel(toId));
    saveConversation();
}

exportMdBtn.addEventListener('click', () => {
    if (conversationHistory.length === 0) return;

    const activeModel = currentModel || currentImageModel || currentSearchModel || 'inconnu';
    const date = conversationStartTime ? new Date(conversationStartTime).toLocaleString('fr-FR') : '';

    const displayCost = totalCost + totalImageCost + totalAudioCost;
    const costStr = displayCost > 0 ? `$${displayCost.toFixed(4)}` : '—';

    // Collecter les modèles utilisés dans l'ordre
    function getModelType(modelId) {
        if (IMAGE_MODELS.some(m => m.id === modelId)) return 'Image';
        if (SEARCH_MODELS.some(m => m.id === modelId)) return 'Recherche';
        return 'Texte';
    }
    const switches = conversationHistory.filter(m => m.type === 'model-switch');
    const usedModels = [];
    const firstModel = switches.length > 0 ? switches[0].from : activeModel;
    usedModels.push(firstModel);
    for (const sw of switches) {
        if (usedModels[usedModels.length - 1] !== sw.to) usedModels.push(sw.to);
    }

    let md = `# Conversation Frix\n\n`;
    if (usedModels.length === 1) {
        md += `**Modèle** : ${getModelLabel(usedModels[0])} *(${getModelType(usedModels[0])})*  \n`;
    } else {
        md += `**Modèles utilisés** :  \n`;
        for (const mid of usedModels) {
            md += `- ${getModelLabel(mid)} *(${getModelType(mid)})*  \n`;
        }
    }
    if (date) md += `**Date** : ${date}  \n`;
    if (currentSystemPrompt) md += `**Rôle** : ${currentSystemPrompt.nom}  \n`;
    md += `**Recherche web** : ${webSearchEnabled ? 'Activée' : 'Désactivée'}  \n`;
    md += `**Tokens** : ${totalInputTokens.toLocaleString('fr-FR')} entrée / ${totalOutputTokens.toLocaleString('fr-FR')} sortie  \n`;
    md += `**Coût estimé** : ${costStr}  \n`;
    md += `\n---\n\n`;

    for (const msg of conversationHistory) {
        if (msg.type === 'model-switch') {
            md += `> **${getModelLabel(msg.from)}** *(${getModelType(msg.from)})* → **${getModelLabel(msg.to)}** *(${getModelType(msg.to)})*\n\n---\n\n`;
            continue;
        }

        const role = msg.role === 'user' ? '🧑 Utilisateur' : '🤖 Assistant';
        md += `## ${role}\n\n`;

        if (typeof msg.content === 'string') {
            md += msg.content + '\n\n';
        } else if (Array.isArray(msg.content)) {
            for (const part of msg.content) {
                if (part.type === 'text') {
                    md += part.text + '\n\n';
                } else if (part.type === 'image') {
                    md += `*[Image jointe]*\n\n`;
                } else if (part.type === 'file') {
                    md += `*[Fichier joint : ${part.name}]*\n\n`;
                }
            }
        }

        if (msg.citations && msg.citations.length > 0) {
            md += `**Sources :**\n`;
            msg.citations.forEach((cit, i) => {
                const url = typeof cit === 'string' ? cit : cit.url;
                const title = typeof cit === 'string' ? url : (cit.title || url);
                md += `${i + 1}. [${title}](${url})\n`;
            });
            md += '\n';
        }

        md += `---\n\n`;
    }

    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const safeName = (conversationId || 'conversation').replace(/[^a-zA-Z0-9àâéèêëïîôùûüçÀÂÉÈÊËÏÎÔÙÛÜÇ _-]/g, '_');
    a.download = `${safeName}.md`;
    a.click();
    URL.revokeObjectURL(url);
});

// --- Export HTML autonome ---
exportHtmlBtn.addEventListener('click', () => {
    if (conversationHistory.length === 0) return;

    const activeModel = currentModel || currentImageModel || currentSearchModel || 'inconnu';
    const date = conversationStartTime ? new Date(conversationStartTime).toLocaleString('fr-FR') : '';
    const displayCost = totalCost + totalImageCost + totalAudioCost;
    const costStr = displayCost > 0 ? `$${displayCost.toFixed(4)}` : '\u2014';
    const title = conversationTitle || 'Conversation Frix';

    let messagesHtml = '';
    for (const msg of conversationHistory) {
        if (msg.type === 'model-switch') {
            messagesHtml += `<div class="model-switch">\u2500\u2500\u2500 ${escHtml(getModelLabel(msg.from))} \u2192 ${escHtml(getModelLabel(msg.to))} \u2500\u2500\u2500</div>`;
            continue;
        }
        const role = msg.role;
        const roleLabel = role === 'user' ? '\ud83e\uddd1 Utilisateur' : '\ud83e\udd16 Assistant';
        let contentHtml = '';
        if (typeof msg.content === 'string') {
            contentHtml = role === 'assistant' ? marked.parse(msg.content) : `<p>${escHtml(msg.content).replace(/\n/g, '<br>')}</p>`;
        } else if (Array.isArray(msg.content)) {
            for (const part of msg.content) {
                if (part.type === 'text') {
                    contentHtml += role === 'assistant' ? marked.parse(part.text) : `<p>${escHtml(part.text).replace(/\n/g, '<br>')}</p>`;
                } else if (part.type === 'image') {
                    contentHtml += `<p><em>[Image jointe]</em></p>`;
                } else if (part.type === 'file') {
                    contentHtml += `<p><em>[Fichier : ${escHtml(part.name)}]</em></p>`;
                }
            }
        }
        if (msg.citations && msg.citations.length > 0) {
            contentHtml += '<div class="citations"><strong>Sources :</strong><ol>';
            msg.citations.forEach(cit => {
                const url = typeof cit === 'string' ? cit : cit.url;
                const t = typeof cit === 'string' ? url : (cit.title || url);
                contentHtml += `<li><a href="${escHtml(url)}" target="_blank">${escHtml(t)}</a></li>`;
            });
            contentHtml += '</ol></div>';
        }
        messagesHtml += `<div class="message ${role}"><div class="role">${roleLabel}</div>${contentHtml}</div>`;
    }

    const htmlDoc = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escHtml(title)}</title>
<style>
:root{--bg:#fff;--text:#1a1a1a;--msg-user:#f0f0f0;--msg-asst:#e0e0e0;--border:#e0e0e0;--secondary:#888}
.dark{--bg:#1a1a1a;--text:#e0e0e0;--msg-user:#2a2a2a;--msg-asst:#333;--border:#333;--secondary:#999}
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:var(--bg);color:var(--text);padding:24px;max-width:900px;margin:0 auto;line-height:1.6}
.header{margin-bottom:24px;padding-bottom:16px;border-bottom:1px solid var(--border)}
.header h1{font-size:1.4rem;margin-bottom:8px}
.header .meta{font-size:0.82rem;color:var(--secondary)}
.theme-btn{position:fixed;top:12px;right:12px;background:var(--msg-user);border:1px solid var(--border);border-radius:8px;padding:6px 10px;cursor:pointer;color:var(--text);font-size:0.8rem}
.message{padding:14px 18px;border-radius:16px;margin-bottom:12px;max-width:80%}
.message.user{background:var(--msg-user);align-self:flex-start;border-bottom-left-radius:4px;margin-right:auto}
.message.assistant{background:var(--msg-asst);align-self:flex-end;border-bottom-right-radius:4px;margin-left:auto}
.role{font-size:0.75rem;font-weight:600;color:var(--secondary);margin-bottom:6px}
.model-switch{text-align:center;font-size:0.8rem;color:var(--secondary);padding:12px 0}
pre{background:rgba(0,0,0,0.06);border-radius:8px;padding:12px;overflow-x:auto;margin:0.5em 0;font-size:0.85rem}
.dark pre{background:rgba(255,255,255,0.08)}
code{background:rgba(0,0,0,0.05);border-radius:3px;padding:1px 4px;font-size:0.88em}
.dark code{background:rgba(255,255,255,0.1)}
pre code{background:none;padding:0}
table{border-collapse:collapse;margin:0.5em 0;font-size:0.9em}
th,td{border:1px solid var(--border);padding:4px 10px}
blockquote{border-left:3px solid var(--border);padding:0.2em 0 0.2em 12px;margin:0.5em 0;color:var(--secondary)}
.citations{margin-top:10px;font-size:0.85em}
.citations ol{padding-left:1.2em}
.citations a{color:var(--text)}
a{color:inherit}
</style>
</head>
<body>
<button class="theme-btn" onclick="document.body.classList.toggle('dark');localStorage.setItem('t',document.body.classList.contains('dark')?'d':'l')">\u263e Th\u00e8me</button>
<div class="header">
<h1>${escHtml(title)}</h1>
<div class="meta">
Mod\u00e8le : ${escHtml(getModelLabel(activeModel))} | Date : ${escHtml(date)}<br>
Tokens : ${totalInputTokens.toLocaleString('fr-FR')} entr\u00e9e / ${totalOutputTokens.toLocaleString('fr-FR')} sortie | Co\u00fbt : ${escHtml(costStr)}
</div>
</div>
${messagesHtml}
<script>if(localStorage.getItem('t')==='d')document.body.classList.add('dark')</script>
</body>
</html>`;

    const blob = new Blob([htmlDoc], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const safeName = (conversationId || 'conversation').replace(/[^a-zA-Z0-9àâéèêëïîôùûüçÀÂÉÈÊËÏÎÔÙÛÜÇ _-]/g, '_');
    a.download = `${safeName}.html`;
    a.click();
    URL.revokeObjectURL(url);
});

function escHtml(str) {
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// --- Résumé IA pour nouvelle conversation ---
summaryBtn.addEventListener('click', async () => {
    if (conversationHistory.length === 0) return;
    if (!API_KEYS.openai) {
        alert('Clé API OpenAI requise pour générer un résumé. Renseignez-la dans Configuration.');
        return;
    }

    // Construire le texte de la conversation
    let convText = '';
    for (const msg of conversationHistory) {
        if (msg.type === 'model-switch') continue;
        const role = msg.role === 'user' ? 'Utilisateur' : 'Assistant';
        const text = getTextFromContent(msg.content);
        if (text) convText += `${role} :\n${text}\n\n`;
    }

    // Icône loading
    const originalHtml = summaryBtn.innerHTML;
    summaryBtn.innerHTML = '<svg class="spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>';
    summaryBtn.disabled = true;

    try {
        const response = await fetch('https://api.openai.com/v1/responses', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEYS.openai}`
            },
            body: JSON.stringify({
                model: 'gpt-4.1-2025-04-14',
                input: [{
                    role: 'user',
                    content: `Génère un résumé structuré de cette conversation, optimisé pour servir de contexte initial à une nouvelle conversation. Inclus les points clés, décisions, et le contexte nécessaire.\n\n---\n\n${convText}`
                }],
                stream: true
            })
        });

        if (!response.ok) {
            const err = await response.text();
            throw new Error(`Erreur API : ${response.status}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let summary = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop();
            for (const line of lines) {
                if (!line.startsWith('data: ')) continue;
                const data = line.slice(6).trim();
                if (data === '[DONE]') break;
                try {
                    const parsed = JSON.parse(data);
                    if (parsed.type === 'response.output_text.delta') {
                        summary += parsed.delta;
                    }
                } catch (e) {}
            }
        }

        if (summary) {
            saveConversation();
            resetConversation();
            promptInput.value = summary;
            promptInput.style.height = 'auto';
            promptInput.style.height = Math.min(promptInput.scrollHeight, 200) + 'px';
            updateSendButton();
            promptInput.focus();
        }
    } catch (e) {
        console.error('Erreur résumé IA:', e);
        alert('Erreur lors de la génération du résumé : ' + e.message);
    } finally {
        summaryBtn.innerHTML = originalHtml;
        summaryBtn.disabled = false;
    }
});



// --- Toggles sections sidebar ---
document.querySelectorAll('.sp-toggle').forEach(toggle => {
    toggle.addEventListener('click', (e) => {
        e.stopPropagation();
        const target = document.getElementById(toggle.dataset.target);
        if (!target) return;
        const collapsed = target.classList.toggle('collapsed');
        toggle.innerHTML = collapsed ? '&#9656;' : '&#9662;';
        localStorage.setItem('minou-collapse-' + toggle.dataset.target, collapsed ? '1' : '0');
    });
    // Clic sur le header entier
    toggle.closest('.sp-header').addEventListener('click', (e) => {
        if (e.target.closest('.sp-add-btn')) return;
        toggle.click();
    });
    // Restaurer l'état
    const saved = localStorage.getItem('minou-collapse-' + toggle.dataset.target);
    if (saved === '1') {
        document.getElementById(toggle.dataset.target)?.classList.add('collapsed');
        toggle.innerHTML = '&#9656;';
    } else if (saved === '0') {
        document.getElementById(toggle.dataset.target)?.classList.remove('collapsed');
        toggle.innerHTML = '&#9662;';
    }
});

// --- Toggle sidebar ---
const sidebarToggle = document.getElementById('sidebar-toggle');
const sidebar = document.getElementById('sidebar');

sidebarToggle.addEventListener('click', () => {
    const collapsed = sidebar.classList.toggle('collapsed');
    sidebarToggle.classList.toggle('collapsed', collapsed);
    sidebarToggle.title = collapsed ? 'Afficher le panneau' : 'Masquer le panneau';
});

// --- Toggle recherche web ---
webSearchToggle.addEventListener('click', () => {
    webSearchEnabled = !webSearchEnabled;
    webSearchToggle.classList.toggle('active', webSearchEnabled);
    webSearchToggle.title = webSearchEnabled ? 'Recherche web activée' : 'Recherche web';
});

// --- Amélioration du prompt ---
const enhanceIconDefault = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 4V2"/><path d="M15 16v-2"/><path d="M8 9h2"/><path d="M20 9h2"/><path d="M17.8 11.8L19 13"/><path d="M15 9h.01"/><path d="M17.8 6.2L19 5"/><path d="M11 6.2L9.7 5"/><path d="M11 11.8L9.7 13"/><path d="M2 21l9-9"/></svg>';
const enhanceIconRevert = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>';
const enhanceIconLoading = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="spin"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>';

function updateEnhanceBtn() {
    const hasText = promptInput.value.trim() !== '';
    if (originalPromptBeforeEnhance !== null) {
        enhancePromptBtn.disabled = false;
        enhancePromptBtn.innerHTML = enhanceIconRevert;
        enhancePromptBtn.classList.add('revert');
        enhancePromptBtn.title = 'Revenir au prompt original';
    } else {
        enhancePromptBtn.disabled = !hasText || isEnhancing;
        enhancePromptBtn.innerHTML = isEnhancing ? enhanceIconLoading : enhanceIconDefault;
        enhancePromptBtn.classList.remove('revert');
        enhancePromptBtn.title = 'Améliorer le prompt';
    }
}

enhancePromptBtn.addEventListener('click', async () => {
    if (isEnhancing) return;

    // Mode retour : restaurer le prompt original
    if (originalPromptBeforeEnhance !== null) {
        promptInput.value = originalPromptBeforeEnhance;
        originalPromptBeforeEnhance = null;
        promptInput.style.height = 'auto';
        promptInput.style.height = Math.min(promptInput.scrollHeight, 200) + 'px';
        updateEnhanceBtn();
        updateSendButton();
        promptInput.focus();
        return;
    }

    // Mode amélioration
    const text = promptInput.value.trim();
    if (!text) return;

    if (!API_KEYS.openai) {
        showModelAlert('Clé API OpenAI requise pour améliorer le prompt. Renseignez-la dans Configuration.');
        return;
    }

    originalPromptBeforeEnhance = null;
    isEnhancing = true;
    updateEnhanceBtn();
    const savedText = text;
    promptInput.value = '';

    try {
        const response = await fetch('https://api.openai.com/v1/responses', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEYS.openai}`
            },
            body: JSON.stringify({
                model: 'gpt-4.1-2025-04-14',
                input: [{
                    role: 'user',
                    content: `Tu es un expert en prompt engineering. Voici un prompt écrit par un utilisateur pour une IA conversationnelle :\n\n---\n${savedText}\n---\n\nAméliore ce prompt pour obtenir un meilleur résultat de l'IA. Tu dois :\n- Conserver fidèlement l'intention et le sens du prompt original\n- Ne pas dénaturer ni changer le sujet ou la demande\n- Compléter, reformuler, structurer et préciser le prompt\n- Ajouter du contexte utile si nécessaire\n- Rendre les instructions plus claires et sans ambiguïté\n\nRéponds UNIQUEMENT avec le prompt amélioré, sans explication, sans guillemets, sans préambule.`
                }],
                stream: true
            })
        });

        if (!response.ok) {
            const err = await response.text();
            throw new Error(`Erreur API : ${response.status}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop();
            for (const line of lines) {
                if (!line.startsWith('data: ')) continue;
                const data = line.slice(6).trim();
                if (data === '[DONE]') break;
                try {
                    const parsed = JSON.parse(data);
                    if (parsed.type === 'response.output_text.delta') {
                        promptInput.value += parsed.delta;
                        promptInput.style.height = 'auto';
                        promptInput.style.height = Math.min(promptInput.scrollHeight, 200) + 'px';
                    }
                } catch (e) {}
            }
        }

        originalPromptBeforeEnhance = savedText;
    } catch (e) {
        console.error('Erreur amélioration prompt:', e);
        promptInput.value = savedText;
        showModelAlert('Erreur lors de l\'amélioration du prompt.');
    } finally {
        isEnhancing = false;
        updateEnhanceBtn();
        updateSendButton();
        promptInput.focus();
    }
});

// --- Catégories ---

function refreshCatBar() {
    const cats = listCategories();
    catIcons.innerHTML = '';
    for (const cat of cats) {
        const btn = document.createElement('button');
        btn.className = 'cat-icon';
        btn.title = cat.nom;
        btn.textContent = cat.icone || '?';
        const isActive = activeCategoryId === cat.id;
        btn.style.borderColor = cat.couleur;
        btn.style.backgroundColor = isActive ? cat.couleur : 'transparent';
        btn.style.color = isActive ? '#fff' : '';
        if (isActive) btn.classList.add('active');

        btn.addEventListener('click', () => {
            activeCategoryId = activeCategoryId === cat.id ? null : cat.id;
            refreshCatBar();
            refreshConvList();
        });

        btn.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            openCatModal(cat.id);
        });

        // Drag & drop : recevoir une conversation
        btn.addEventListener('dragover', (e) => {
            e.preventDefault();
            btn.classList.add('drag-over');
        });
        btn.addEventListener('dragleave', () => {
            btn.classList.remove('drag-over');
        });
        btn.addEventListener('drop', async (e) => {
            e.preventDefault();
            btn.classList.remove('drag-over');
            const filename = e.dataTransfer.getData('text/plain');
            if (!filename) return;
            await updateConversationCategory(filename, cat.id);
            // Mettre à jour si c'est la conversation active
            const expectedFn = conversationId
                ? conversationId.replace(/[<>:"/\\|?*]/g, '_') + '.json'
                : null;
            if (filename === expectedFn) {
                currentConversationCategory = cat.id;
            }
            refreshConvList();
        });

        catIcons.appendChild(btn);
    }
}

catAddBtn.addEventListener('click', () => openCatModal(null));

// --- Emoji Picker ---
const EMOJI_LIBRARY = {
    'Smileys': ['😀','😃','😄','😁','😆','😅','🤣','😂','🙂','😊','😇','🥰','😍','🤩','😘','😋','😛','🤔','🤗','🤫','🤭','😏','😌','😴','🤓','😎','🥳','😤','😠','🤯','😱','🥺','😢','😭','🫠'],
    'Gestes': ['👍','👎','👏','🙌','🤝','✌️','🤞','🤟','🤘','👌','🫶','💪','👋','✋','🖐️','🤚','👆','👇','👈','👉','☝️','🫵','🙏'],
    'Coeurs': ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❤️‍🔥','💕','💞','💓','💗','💖','💘','💝','♥️'],
    'Travail': ['💼','📁','📂','📊','📈','📉','📋','📌','📎','✏️','📝','🗂️','🗃️','🗄️','💻','🖥️','⌨️','🖱️','📱','📧','✉️','📬','🏢','🏠','⏰','📅','🗓️'],
    'Science': ['🔬','🔭','⚗️','🧪','🧫','🧬','💊','💉','🩺','🧮','📐','📏','🔋','⚡','🧲','🌡️','☢️','☣️'],
    'Creative': ['🎨','🎭','🎬','🎤','🎧','🎵','🎶','🎸','🎹','🥁','🎻','📷','📸','🎥','🖌️','🖍️','✒️','🪄','💡','📖','📚','✍️'],
    'Nature': ['🌸','🌺','🌻','🌹','🌷','🌱','🌿','🍀','🌳','🌲','🍃','🍂','🍁','🌍','🌎','🌏','🌙','⭐','🌟','✨','☀️','🌈','🔥','💧','❄️','🌊'],
    'Animaux': ['🐱','🐶','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯','🦁','🐮','🐷','🐸','🐵','🐔','🐧','🐦','🦅','🦋','🐝','🐞','🐢','🐍','🐬','🐳','🦄','🐲'],
    'Food': ['🍕','🍔','🍟','🌭','🌮','🌯','🍣','🍜','🍝','🍩','🍪','🎂','🍰','🍫','🍬','☕','🍵','🍺','🍷','🥤','🍎','🍊','🍋','🍇','🍓','🍑','🥑','🥕'],
    'Transport': ['🚗','🚕','🚌','🚎','🏎️','🚓','🚑','🚒','✈️','🚀','🛸','🚁','⛵','🚢','🚲','🛴','🏍️','🚄','🚅','🚇'],
    'Objets': ['🔑','🗝️','🔒','🔓','🛡️','⚔️','🏆','🥇','🥈','🥉','🎯','🎮','🧩','🎲','♟️','🔮','🧿','🎁','🎀','🏷️','💎','👑','🧸','🪩'],
    'Symboles': ['✅','❌','⭕','❗','❓','💯','🔴','🟠','🟡','🟢','🔵','🟣','⚫','⚪','🟤','🔶','🔷','▶️','⏸️','⏹️','🔄','💤','🚫','♻️','⚠️','🏳️','🏴','🚩']
};

const emojiPickerEl = document.getElementById('emoji-picker');
const emojiGridEl = document.getElementById('emoji-grid');
const emojiTabsEl = document.getElementById('emoji-tabs');
const emojiSearchEl = document.getElementById('emoji-search');
const emojiIconeBtn = document.getElementById('cat-modal-icone-btn');
const emojiPreview = document.getElementById('cat-modal-icone-preview');

function initEmojiTabs() {
    emojiTabsEl.innerHTML = '';
    const categories = Object.keys(EMOJI_LIBRARY);
    for (const cat of categories) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'emoji-tab';
        btn.textContent = EMOJI_LIBRARY[cat][0];
        btn.title = cat;
        btn.addEventListener('click', () => {
            emojiSearchEl.value = '';
            renderEmojiGrid(cat);
            emojiTabsEl.querySelectorAll('.emoji-tab').forEach(t => t.classList.remove('active'));
            btn.classList.add('active');
        });
        emojiTabsEl.appendChild(btn);
    }
}

function renderEmojiGrid(activeCategory = null, filter = '') {
    emojiGridEl.innerHTML = '';
    const query = filter.toLowerCase();
    const categories = Object.entries(EMOJI_LIBRARY);

    for (const [catName, emojis] of categories) {
        if (activeCategory && catName !== activeCategory) continue;

        const filtered = query
            ? emojis.filter(e => e.includes(query) || catName.toLowerCase().includes(query))
            : emojis;

        if (filtered.length === 0) continue;

        if (!activeCategory || query) {
            const label = document.createElement('div');
            label.className = 'emoji-cat-label';
            label.textContent = catName;
            emojiGridEl.appendChild(label);
        }

        for (const emoji of filtered) {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'emoji-grid-item';
            btn.textContent = emoji;
            btn.addEventListener('click', () => {
                catModalIcone.value = emoji;
                emojiPreview.textContent = emoji;
                emojiPickerEl.style.display = 'none';
            });
            emojiGridEl.appendChild(btn);
        }
    }

    if (emojiGridEl.children.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'emoji-cat-label';
        empty.textContent = 'Aucun résultat';
        emojiGridEl.appendChild(empty);
    }
}

emojiIconeBtn.addEventListener('click', () => {
    const visible = emojiPickerEl.style.display !== 'none';
    if (visible) {
        emojiPickerEl.style.display = 'none';
    } else {
        initEmojiTabs();
        emojiSearchEl.value = '';
        renderEmojiGrid();
        emojiPickerEl.style.display = '';
        emojiTabsEl.querySelectorAll('.emoji-tab').forEach(t => t.classList.remove('active'));
        emojiSearchEl.focus();
    }
});

emojiSearchEl.addEventListener('input', () => {
    emojiTabsEl.querySelectorAll('.emoji-tab').forEach(t => t.classList.remove('active'));
    renderEmojiGrid(null, emojiSearchEl.value.trim());
});

// Fermer le picker si on clique en dehors
document.addEventListener('click', (e) => {
    if (emojiPickerEl.style.display !== 'none'
        && !emojiPickerEl.contains(e.target)
        && !emojiIconeBtn.contains(e.target)) {
        emojiPickerEl.style.display = 'none';
    }
});

function openCatModal(catId) {
    editingCategoryId = catId;
    emojiPickerEl.style.display = 'none';
    if (catId) {
        const cat = readCategory(catId);
        if (!cat) return;
        catModalTitle.textContent = 'Modifier la catégorie';
        catModalNom.value = cat.nom;
        catModalIcone.value = cat.icone;
        emojiPreview.textContent = cat.icone || '?';
        catModalCouleur.value = cat.couleur;
        catModalDelete.style.display = '';
    } else {
        catModalTitle.textContent = 'Nouvelle catégorie';
        catModalNom.value = '';
        catModalIcone.value = '';
        emojiPreview.textContent = '?';
        catModalCouleur.value = '#3b82f6';
        catModalDelete.style.display = 'none';
    }
    catModalOverlay.style.display = '';
    catModalNom.focus();
}

catModalCancel.addEventListener('click', () => {
    catModalOverlay.style.display = 'none';
});

catModalOverlay.addEventListener('click', (e) => {
    if (e.target === catModalOverlay) catModalOverlay.style.display = 'none';
});

catModalSave.addEventListener('click', () => {
    const nom = catModalNom.value.trim();
    if (!nom) return;
    const id = editingCategoryId || ('cat_' + Date.now());
    writeCategory(id, {
        nom,
        couleur: catModalCouleur.value,
        icone: catModalIcone.value || '?'
    });
    catModalOverlay.style.display = 'none';
    refreshCatBar();
});

catModalDelete.addEventListener('click', async () => {
    if (!editingCategoryId) return;
    if (!confirm('Supprimer cette catégorie ? Les conversations seront décatégorisées.')) return;
    // Décatégoriser toutes les conversations de cette catégorie
    const conversations = await listConversationFiles();
    for (const conv of conversations) {
        if (conv.category === editingCategoryId) {
            await updateConversationCategory(conv.filename, null);
        }
    }
    // Si la conversation active est dans cette catégorie
    if (currentConversationCategory === editingCategoryId) {
        currentConversationCategory = null;
    }
    deleteCategory(editingCategoryId);
    catModalOverlay.style.display = 'none';
    if (activeCategoryId === editingCategoryId) activeCategoryId = null;
    refreshCatBar();
    refreshConvList();
});

// --- Initialisation ---
initConfig().then(async () => {
    populateModelSelect();
    populateImageModelSelect();
    populateSearchModelSelect();
    updateTokenDisplay();
    refreshConvList();
    refreshCatBar();
    await importDefaultSystemPrompts();
    refreshSpList();
    refreshPrList();
});

// --- Remplir le sélecteur de modèles texte ---
function populateModelSelect() {
    modelSelect.innerHTML = '<option value="">—</option>';
    for (const m of MODELS) {
        const opt = document.createElement('option');
        opt.value = m.id;
        opt.textContent = m.label;
        modelSelect.appendChild(opt);
    }
    currentModel = null;
}

// --- Remplir le sélecteur de modèles image ---
function populateImageModelSelect() {
    imageModelSelect.innerHTML = '<option value="">—</option>';
    for (const m of IMAGE_MODELS) {
        const opt = document.createElement('option');
        opt.value = m.id;
        opt.textContent = m.label;
        imageModelSelect.appendChild(opt);
    }
    currentImageModel = null;
}

// --- Remplir le sélecteur de modèles recherche ---
function populateSearchModelSelect() {
    searchModelSelect.innerHTML = '<option value="">—</option>';
    for (const m of SEARCH_MODELS) {
        const opt = document.createElement('option');
        opt.value = m.id;
        opt.textContent = m.label;
        searchModelSelect.appendChild(opt);
    }
    currentSearchModel = null;
}

// --- Sélecteurs mutuellement exclusifs ---
function checkApiKeyForModel(modelId, lookupFn) {
    const editeur = lookupFn(modelId);
    if (editeur && !API_KEYS[editeur]) {
        showModelAlert(`Clé API ${editeur} manquante. Renseignez-la dans Configuration.`);
        return false;
    }
    return true;
}

modelSelect.addEventListener('change', () => {
    if (modelSelect.value && !checkApiKeyForModel(modelSelect.value, getModelEditeur)) {
        modelSelect.value = '';
        currentModel = null;
        return;
    }
    const prevModel = currentModel || currentImageModel || currentSearchModel;
    currentModel = modelSelect.value || null;
    if (currentModel) {
        imageModelSelect.value = '';
        currentImageModel = null;
        searchModelSelect.value = '';
        currentSearchModel = null;
        document.getElementById('image-format-label').style.display = 'none';
        document.getElementById('image-format-select').style.display = 'none';
    }
    const newModel = currentModel || currentImageModel || currentSearchModel;
    if (conversationStarted && prevModel && newModel && prevModel !== newModel) {
        addModelSwitch(prevModel, newModel);
    }
    updateTokenDisplay();
});

imageModelSelect.addEventListener('change', () => {
    if (imageModelSelect.value && !checkApiKeyForModel(imageModelSelect.value, getImageModelEditeur)) {
        imageModelSelect.value = '';
        currentImageModel = null;
        return;
    }
    const prevModel = currentModel || currentImageModel || currentSearchModel;
    currentImageModel = imageModelSelect.value || null;
    const imgFormatLabel = document.getElementById('image-format-label');
    const imgFormatSelect = document.getElementById('image-format-select');
    if (currentImageModel) {
        modelSelect.value = '';
        currentModel = null;
        searchModelSelect.value = '';
        currentSearchModel = null;
        imgFormatLabel.style.display = '';
        imgFormatSelect.style.display = '';
    } else {
        imgFormatLabel.style.display = 'none';
        imgFormatSelect.style.display = 'none';
    }
    const newModel = currentModel || currentImageModel || currentSearchModel;
    if (conversationStarted && prevModel && newModel && prevModel !== newModel) {
        addModelSwitch(prevModel, newModel);
    }
    updateTokenDisplay();
});

searchModelSelect.addEventListener('change', () => {
    if (searchModelSelect.value && !checkApiKeyForModel(searchModelSelect.value, getSearchModelEditeur)) {
        searchModelSelect.value = '';
        currentSearchModel = null;
        return;
    }
    const prevModel = currentModel || currentImageModel || currentSearchModel;
    currentSearchModel = searchModelSelect.value || null;
    if (currentSearchModel) {
        modelSelect.value = '';
        currentModel = null;
        imageModelSelect.value = '';
        currentImageModel = null;
        document.getElementById('image-format-label').style.display = 'none';
        document.getElementById('image-format-select').style.display = 'none';
    }
    const newModel = currentModel || currentImageModel || currentSearchModel;
    if (conversationStarted && prevModel && newModel && prevModel !== newModel) {
        addModelSwitch(prevModel, newModel);
    }
    updateTokenDisplay();
});

// --- Auto-resize du textarea ---
promptInput.addEventListener('input', () => {
    promptInput.style.height = 'auto';
    promptInput.style.height = Math.min(promptInput.scrollHeight, 200) + 'px';
    updateSendButton();
    // Réinitialiser l'état d'amélioration si l'utilisateur modifie manuellement le texte
    if (originalPromptBeforeEnhance !== null && !isEnhancing) {
        originalPromptBeforeEnhance = null;
        updateEnhanceBtn();
    }
    if (!isEnhancing) updateEnhanceBtn();
});

// --- Activer/désactiver le bouton OK ---
function updateSendButton() {
    if (isStreaming) {
        sendBtn.disabled = false;
        sendBtn.textContent = '■';
        sendBtn.classList.add('stop-mode');
    } else {
        const hasText = promptInput.value.trim() !== '';
        const hasImages = pendingImages.length > 0;
        const hasFiles = pendingFiles.length > 0;
        sendBtn.disabled = !hasText && !hasImages && !hasFiles;
        sendBtn.textContent = 'OK';
        sendBtn.classList.remove('stop-mode');
    }
}

// --- Ctrl+Entrée pour envoyer ---
promptInput.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'Enter') {
        e.preventDefault();
        if (!isStreaming && !sendBtn.disabled) sendMessage();
    }
});

// --- Clic sur OK / Stop ---
sendBtn.addEventListener('click', () => {
    if (isStreaming) {
        if (currentAbortController) currentAbortController.abort();
    } else {
        if (!sendBtn.disabled) sendMessage();
    }
});

// --- Nouvelle conversation ---
newChatBtn.addEventListener('click', () => {
    saveConversation();
    resetConversation();
    refreshConvList();
});

function resetConversation() {
    conversationHistory = [];
    chatContainer.innerHTML = '';
    promptInput.value = '';
    promptInput.style.height = 'auto';
    totalInputTokens = 0;
    totalOutputTokens = 0;
    totalCost = 0;
    totalImageCost = 0;
    totalAudioCost = 0;
    conversationId = null;
    conversationStartTime = null;
    conversationTitle = null;
    firstPrompt = null;
    conversationStarted = false;
    currentSystemPrompt = null;
    currentModel = null;
    currentImageModel = null;
    currentSearchModel = null;
    currentConversationCategory = null;
    pendingImages = [];
    pendingFiles = [];
    originalPromptBeforeEnhance = null;
    isEnhancing = false;
    attachPreview.innerHTML = '';
    modelSelect.value = '';
    modelSelect.disabled = false;
    imageModelSelect.value = '';
    imageModelSelect.disabled = false;
    document.getElementById('image-format-label').style.display = 'none';
    document.getElementById('image-format-select').style.display = 'none';
    searchModelSelect.value = '';
    searchModelSelect.disabled = false;
    spSelect.disabled = false;
    spSelect.value = '';
    updateTokenDisplay();
    updateSendButton();
    updateEnhanceBtn();
    highlightActiveConv();
    updateExportMdBtn();
    promptInput.focus();
}

// --- Alerte modèle manquant ---
let modelAlertTimer = null;
function showModelAlert(msg) {
    const el = document.getElementById('model-alert');
    if (msg) el.textContent = msg;
    el.style.display = '';
    if (modelAlertTimer) clearTimeout(modelAlertTimer);
    modelAlertTimer = setTimeout(() => {
        el.style.display = 'none';
        el.textContent = 'Veuillez choisir un modèle (texte ou image) avant d\'envoyer.';
    }, 4000);
}

// --- Générer l'identifiant de conversation ---
function generateConversationId(prompt) {
    const now = new Date();
    const date = now.getFullYear() + '-'
        + String(now.getMonth() + 1).padStart(2, '0') + '-'
        + String(now.getDate()).padStart(2, '0') + ' '
        + String(now.getHours()).padStart(2, '0') + '-'
        + String(now.getMinutes()).padStart(2, '0');
    const prefix = prompt.substring(0, 10).replace(/[^a-zA-Z0-9àâéèêëïîôùûüçÀÂÉÈÊËÏÎÔÙÛÜÇ ]/g, '_');
    return `${prefix} ${date}`;
}

// --- Mettre à jour l'affichage tokens et coût ---
function updateTokenDisplay() {
    tokenInfo.textContent = `Tokens — entrée : ${totalInputTokens.toLocaleString('fr-FR')} | sortie : ${totalOutputTokens.toLocaleString('fr-FR')}`;

    const displayCost = totalCost + totalImageCost + totalAudioCost;
    if (displayCost > 0) {
        costInfo.textContent = `Coût estimé : $${displayCost.toFixed(4)}`;
    } else {
        costInfo.textContent = 'Coût estimé : —';
    }
}

// --- Sauvegarder la conversation dans un fichier JSON ---
function saveConversation() {
    if (!conversationId || conversationHistory.length === 0) return;

    const data = {
        id: conversationId,
        title: conversationTitle,
        model: currentModel || currentImageModel || currentSearchModel,
        startTime: conversationStartTime,
        totalInputTokens,
        totalOutputTokens,
        totalCost,
        totalImageCost,
        totalAudioCost,
        systemPrompt: currentSystemPrompt ? currentSystemPrompt.nom : null,
        category: currentConversationCategory,
        messages: conversationHistory
    };
    const filename = conversationId.replace(/[<>:"/\\|?*]/g, '_') + '.json';
    const content = formatConversationFile(data);
    writeConversationFile(filename, content).then(() => refreshConvList());
    updateExportMdBtn();
}

// --- Génération automatique du titre de conversation ---
async function maybeGenerateTitle() {
    // Seulement après le premier échange (1 user + 1 assistant)
    if (conversationTitle || conversationHistory.length !== 2) return;

    const userMsg = getTextFromContent(conversationHistory[0].content);
    const assistantMsg = getTextFromContent(conversationHistory[1].content);
    if (!userMsg) return;

    try {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': API_KEYS.anthropic,
                'anthropic-version': '2023-06-01',
                'anthropic-dangerous-direct-browser-access': 'true'
            },
            body: JSON.stringify({
                model: 'claude-haiku-4-5-20251001',
                max_tokens: 30,
                messages: [{
                    role: 'user',
                    content: `Donne un titre très court (3 à 6 mots max, en français) pour cette conversation. Réponds UNIQUEMENT avec le titre, sans guillemets ni ponctuation finale.\n\nUtilisateur : ${userMsg.substring(0, 300)}\n\nAssistant : ${assistantMsg.substring(0, 300)}`
                }]
            })
        });

        if (!response.ok) return;
        const data = await response.json();
        const title = data.content?.[0]?.text?.trim();
        if (title) {
            conversationTitle = title;
            saveConversation();
        }
    } catch (e) {
        console.error('Erreur génération titre:', e);
    }
}

// --- Extraire le texte d'un content (string ou array multimodal) ---
function getTextFromContent(content) {
    if (typeof content === 'string') return content;
    if (Array.isArray(content)) {
        return content.map(p => {
            if (p.type === 'text') return p.text;
            if (p.type === 'file') return p.textContent || '';
            return '';
        }).join('');
    }
    return '';
}

// --- Ajouter un message dans le DOM ---
function addMessage(role, content, citations, generationTime, thinking) {
    const div = document.createElement('div');
    div.className = `message message-${role}`;

    // Bloc de raisonnement dépliable (assistant uniquement)
    if (role === 'assistant' && thinking) {
        const details = document.createElement('details');
        details.className = 'thinking-block';
        const summary = document.createElement('summary');
        summary.textContent = 'Raisonnement';
        details.appendChild(summary);
        const thinkContent = document.createElement('div');
        thinkContent.className = 'thinking-content';
        thinkContent.innerHTML = marked.parse(thinking);
        details.appendChild(thinkContent);
        div.appendChild(details);
    }

    // Images (messages multimodaux)
    if (Array.isArray(content)) {
        const images = content.filter(p => p.type === 'image');
        if (images.length > 0) {
            const imagesDiv = document.createElement('div');
            imagesDiv.className = 'message-images';
            for (const img of images) {
                const imgWrap = document.createElement('div');
                imgWrap.className = 'message-image-wrap';

                const imgEl = document.createElement('img');
                const src = img.dataUrl || `data:${img.mimeType};base64,${img.data}`;
                imgEl.src = src;
                imgEl.alt = 'Image';

                const dlBtn = document.createElement('button');
                dlBtn.className = 'image-download-btn';
                dlBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>';
                dlBtn.title = 'Télécharger';
                dlBtn.addEventListener('click', () => {
                    const a = document.createElement('a');
                    a.href = src;
                    const ext = (img.mimeType || 'image/png').split('/')[1] || 'png';
                    a.download = `kiro-image.${ext}`;
                    a.click();
                });

                attachLightboxToImg(imgEl);
                imgWrap.appendChild(imgEl);
                imgWrap.appendChild(dlBtn);
                imagesDiv.appendChild(imgWrap);
            }
            div.appendChild(imagesDiv);
        }

        // Fichiers joints
        const files = content.filter(p => p.type === 'file');
        if (files.length > 0) {
            const filesDiv = document.createElement('div');
            filesDiv.className = 'message-files';
            for (const file of files) {
                const chip = document.createElement('a');
                chip.className = 'message-file-chip';
                chip.title = file.name;
                if (file.data) {
                    const blob = new Blob([Uint8Array.from(atob(file.data), c => c.charCodeAt(0))], { type: file.mimeType || 'application/octet-stream' });
                    const url = URL.createObjectURL(blob);
                    chip.href = url;
                    chip.download = file.name;
                } else {
                    chip.href = '#';
                }
                chip.innerHTML = '\uD83D\uDCC4 ' + (file.name.length > 25 ? file.name.substring(0, 22) + '...' : file.name);
                filesDiv.appendChild(chip);
            }
            div.appendChild(filesDiv);
        }
    }

    // Texte
    const textDiv = document.createElement('div');
    textDiv.className = 'message-text';
    const textContent = getTextFromContent(content);
    if (role === 'assistant' && textContent) {
        textDiv.innerHTML = marked.parse(textContent);
        addCodeCopyButtons(textDiv);
    } else {
        textDiv.textContent = textContent;
    }
    div.appendChild(textDiv);

    // Bouton copier (sous la bulle)
    const copyBtn = document.createElement('button');
    copyBtn.className = 'message-copy-btn';
    copyBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
    copyBtn.title = 'Copier';
    copyBtn.addEventListener('click', () => {
        const textEl = div.querySelector('.message-text');
        const text = textEl ? textEl.textContent : getTextFromContent(content);
        navigator.clipboard.writeText(text).then(() => {
            copyBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
            setTimeout(() => {
                copyBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
            }, 1500);
        });
    });

    // Boutons sous la bulle
    const btnRow = document.createElement('div');
    btnRow.className = 'message-btn-row';
    btnRow.appendChild(copyBtn);

    // Bouton sauvegarder prompt (user uniquement)
    if (role === 'user') {
        const savePromptBtn = document.createElement('button');
        savePromptBtn.className = 'message-save-prompt-btn';
        savePromptBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>';
        savePromptBtn.title = 'Enregistrer ce prompt';
        savePromptBtn.addEventListener('click', () => {
            const textEl = div.querySelector('.message-text');
            const text = textEl ? textEl.textContent : getTextFromContent(content);
            if (!text) return;
            openPrModal(null, text);
        });
        btnRow.appendChild(savePromptBtn);
    }

    // Temps de génération (assistant uniquement)
    if (role === 'assistant') {
        const genTimeEl = document.createElement('span');
        genTimeEl.className = 'message-gen-time';
        genTimeEl.textContent = generationTime ? formatGenTime(generationTime) : '';
        btnRow.appendChild(genTimeEl);
    }

    // Bouton lecture vocale OpenAI TTS (assistant uniquement, pas pour les images)
    const hasImages = Array.isArray(content) && content.some(p => p.type === 'image');
    if (role === 'assistant' && !hasImages) {
        const ttsBtn = document.createElement('button');
        ttsBtn.className = 'message-tts-btn';
        const iconPlay = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>';
        const iconStop = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="6" width="12" height="12" rx="1"/></svg>';
        const iconLoading = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="spin"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>';
        ttsBtn.innerHTML = iconPlay;
        ttsBtn.title = 'Lire à haute voix';
        ttsBtn.addEventListener('click', () => {
            // Si un audio est en cours, l'arrêter
            if (currentTtsAudio) {
                currentTtsAudio.pause();
                currentTtsAudio.currentTime = 0;
                currentTtsAudio = null;
                document.querySelectorAll('.message-tts-btn').forEach(b => { b.innerHTML = iconPlay; });
                return;
            }
            // Lire le texte depuis le DOM (pas la variable capturée, vide en streaming)
            const textEl = div.querySelector('.message-text');
            const text = textEl ? textEl.textContent : '';
            if (!text) return;
            ttsBtn.innerHTML = iconLoading;
            ttsBtn.title = 'Chargement...';
            ttsSpeak(text, (blob, charCount) => {
                const url = URL.createObjectURL(blob);
                const audio = new Audio(url);
                currentTtsAudio = audio;
                ttsBtn.innerHTML = iconStop;
                ttsBtn.title = 'Arrêter la lecture';
                audio.onended = () => {
                    currentTtsAudio = null;
                    ttsBtn.innerHTML = iconPlay;
                    ttsBtn.title = 'Lire à haute voix';
                    URL.revokeObjectURL(url);
                };
                audio.play();
                // Coût TTS : $30 / 1M caractères
                totalAudioCost += (charCount / 1_000_000) * 30;
                updateTokenDisplay();
                saveConversation();
            }, (err) => {
                ttsBtn.innerHTML = iconPlay;
                ttsBtn.title = 'Lire à haute voix';
                console.error('TTS error:', err);
                alert('Erreur TTS : ' + err.message);
            });
        });
        btnRow.appendChild(ttsBtn);
    }

    // Citations Perplexity
    if (citations && citations.length > 0) {
        appendCitations(div, citations);
    }

    // Wrapper pour positionner les boutons sous la bulle
    const wrapper = document.createElement('div');
    wrapper.className = `message-wrapper message-wrapper-${role}`;
    wrapper.appendChild(div);
    wrapper.appendChild(btnRow);

    chatContainer.appendChild(wrapper);
    scrollToBottom();
    return div;
}

// --- Afficher le temps de génération sur le dernier message assistant ---
function formatGenTime(seconds) {
    if (seconds < 1) return '< 1s';
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const min = Math.floor(seconds / 60);
    const sec = Math.round(seconds % 60);
    return sec > 0 ? `${min}min ${sec}s` : `${min}min`;
}

function setGenTimeOnLastAssistant(seconds) {
    const wrappers = chatContainer.querySelectorAll('.message-wrapper-assistant');
    if (wrappers.length === 0) return;
    const lastWrapper = wrappers[wrappers.length - 1];
    const el = lastWrapper.querySelector('.message-gen-time');
    if (el) el.textContent = formatGenTime(seconds);
}

// --- Afficher les citations Perplexity sous un message ---
function appendCitations(messageDiv, citations) {
    const existing = messageDiv.querySelector('.citations-block');
    if (existing) existing.remove();
    if (!citations || citations.length === 0) return;

    const block = document.createElement('div');
    block.className = 'citations-block';

    const title = document.createElement('div');
    title.className = 'citations-title';
    title.textContent = 'Sources';
    block.appendChild(title);

    const list = document.createElement('ul');
    list.className = 'citations-list';
    for (let i = 0; i < citations.length; i++) {
        const cit = citations[i];
        // Support format string (Perplexity) ou objet {url, title}
        const url = typeof cit === 'string' ? cit : cit.url;
        const citTitle = typeof cit === 'string' ? '' : (cit.title || '');
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.href = url;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        // Afficher le titre si disponible, sinon le domaine
        if (citTitle) {
            a.textContent = citTitle.length > 50 ? citTitle.substring(0, 50) + '...' : citTitle;
        } else {
            try {
                a.textContent = new URL(url).hostname.replace(/^www\./, '');
            } catch (e) {
                a.textContent = url;
            }
        }
        a.title = url;
        const num = document.createElement('span');
        num.className = 'citation-num';
        num.textContent = `[${i + 1}]`;
        li.appendChild(num);
        li.appendChild(a);
        list.appendChild(li);
    }
    block.appendChild(list);
    messageDiv.appendChild(block);
}

// --- Bouton régénérer ---
function removeRegenBtn() {
    document.querySelectorAll('.regen-btn').forEach(b => b.remove());
}

function addRegenBtn() {
    removeRegenBtn();
    if (conversationHistory.length < 2) return;
    const last = conversationHistory[conversationHistory.length - 1];
    if (last.role !== 'assistant') return;

    const wrappers = chatContainer.querySelectorAll('.message-wrapper-assistant');
    if (wrappers.length === 0) return;
    const lastWrapper = wrappers[wrappers.length - 1];
    const btnRow = lastWrapper.querySelector('.message-btn-row');
    if (!btnRow) return;

    const btn = document.createElement('button');
    btn.className = 'regen-btn';
    btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>';
    btn.title = 'Régénérer la réponse';
    btn.addEventListener('click', regenerateLastResponse);
    btnRow.appendChild(btn);
}

function regenerateLastResponse() {
    if (isStreaming) return;
    // Retirer la dernière réponse assistant
    if (conversationHistory.length > 0 && conversationHistory[conversationHistory.length - 1].role === 'assistant') {
        conversationHistory.pop();
    }
    // Retirer le wrapper du dernier message assistant + le bouton regen
    removeRegenBtn();
    const wrappers = chatContainer.querySelectorAll('.message-wrapper-assistant');
    if (wrappers.length > 0) {
        wrappers[wrappers.length - 1].remove();
    }

    // Re-générer
    isStreaming = true;
    currentAbortController = new AbortController();
    updateSendButton();

    const assistantDiv = addMessage('assistant', '');
    assistantDiv.classList.add('streaming');
    const regenStartTime = Date.now();

    if (currentImageModel) {
        const lastUserMsg = conversationHistory[conversationHistory.length - 1];
        const prompt = getTextFromContent(lastUserMsg.content);

        // Collecter les images de référence pour la régénération
        const regenRefImages = [];
        const regenAttachedIds = new Set();
        if (Array.isArray(lastUserMsg.content)) {
            for (const part of lastUserMsg.content) {
                if (part.type === 'image' && part.data) {
                    regenRefImages.push({ data: part.data, mimeType: part.mimeType });
                    regenAttachedIds.add(part.data);
                }
            }
        }
        for (let i = conversationHistory.length - 2; i >= 0; i--) {
            const msg = conversationHistory[i];
            if (Array.isArray(msg.content)) {
                const imgs = msg.content.filter(p => p.type === 'image' && p.data && !regenAttachedIds.has(p.data));
                if (imgs.length > 0) {
                    for (const img of imgs) {
                        regenRefImages.push({ data: img.data, mimeType: img.mimeType });
                    }
                    break;
                }
            }
        }

        generateImage(
            currentImageModel,
            prompt,
            (result) => {
                assistantDiv.classList.remove('streaming');
                if (result.images.length > 0) {
                    const imagesDiv = document.createElement('div');
                    imagesDiv.className = 'message-images';
                    for (const img of result.images) {
                        const imgWrap = document.createElement('div');
                        imgWrap.className = 'message-image-wrap';
                        const imgEl = document.createElement('img');
                        const src = `data:${img.mimeType};base64,${img.b64}`;
                        imgEl.src = src;
                        imgEl.alt = 'Image générée';
                        attachLightboxToImg(imgEl);
                        const dlBtn = document.createElement('button');
                        dlBtn.className = 'image-download-btn';
                        dlBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>';
                        dlBtn.title = 'Télécharger';
                        dlBtn.addEventListener('click', () => { const a = document.createElement('a'); a.href = src; a.download = `kiro-image.${(img.mimeType||'image/png').split('/')[1]||'png'}`; a.click(); });
                        imgWrap.appendChild(imgEl);
                        imgWrap.appendChild(dlBtn);
                        imagesDiv.appendChild(imgWrap);
                    }
                    assistantDiv.insertBefore(imagesDiv, assistantDiv.firstChild);
                }
                const textEl = assistantDiv.querySelector('.message-text');
                if (textEl && result.text) { textEl.innerHTML = marked.parse(result.text); addCodeCopyButtons(textEl); } else if (textEl) { textEl.remove(); }
                const assistantContent = [];
                if (result.text) assistantContent.push({ type: 'text', text: result.text });
                for (const img of result.images) assistantContent.push({ type: 'image', data: img.b64, mimeType: img.mimeType });
                const regenSeconds = (Date.now() - regenStartTime) / 1000;
                conversationHistory.push({ role: 'assistant', content: assistantContent.length === 1 && assistantContent[0].type === 'text' ? assistantContent[0].text : assistantContent, generationTime: regenSeconds });
                setGenTimeOnLastAssistant(regenSeconds);
                if (result.usage) { totalInputTokens += result.usage.input_tokens; totalOutputTokens += result.usage.output_tokens; }
                const imgTarif = getImageTarif(currentImageModel);
                if (imgTarif && result.imageCount > 0) totalImageCost += imgTarif.imageOutput * result.imageCount;
                updateTokenDisplay(); saveConversation(); scrollToBottom(); addRegenBtn();
                isStreaming = false; currentAbortController = null; updateSendButton(); promptInput.focus();
            },
            (err) => {
                assistantDiv.classList.remove('streaming');
                const textEl = assistantDiv.querySelector('.message-text');
                if (textEl) { textEl.textContent = `Erreur : ${err.message}`; textEl.style.color = '#c00'; }
                isStreaming = false; currentAbortController = null; updateSendButton(); promptInput.focus();
            },
            regenRefImages,
            currentAbortController.signal,
            document.getElementById('image-format-select').value
        );
    } else {
        let fullResponse = '';
        let fullThinking = '';
        const spContent = currentSystemPrompt ? currentSystemPrompt.contenu : null;
        const regenTextModel = currentModel || currentSearchModel;
        streamModel(
            regenTextModel,
            conversationHistory,
            (chunk) => {
                if (!fullResponse) { const tb = assistantDiv.querySelector('.thinking-block'); if (tb) tb.open = false; }
                fullResponse += chunk; const textEl = assistantDiv.querySelector('.message-text'); if (textEl) textEl.innerHTML = marked.parse(fullResponse); scrollToBottom();
            },
            (usage, citations) => {
                assistantDiv.classList.remove('streaming');
                const textEl = assistantDiv.querySelector('.message-text');
                if (textEl) { textEl.innerHTML = marked.parse(fullResponse); addCodeCopyButtons(textEl); }
                if (fullThinking) {
                    const thinkContent = assistantDiv.querySelector('.thinking-content');
                    if (thinkContent) thinkContent.innerHTML = marked.parse(fullThinking);
                }
                if (citations && citations.length > 0) appendCitations(assistantDiv, citations);
                const regenSeconds = (Date.now() - regenStartTime) / 1000;
                conversationHistory.push({ role: 'assistant', content: fullResponse, citations: citations || undefined, generationTime: regenSeconds, thinking: fullThinking || undefined });
                setGenTimeOnLastAssistant(regenSeconds);
                if (usage) { totalInputTokens += usage.input_tokens; totalOutputTokens += usage.output_tokens; }
                updateTokenDisplay(); saveConversation(); addRegenBtn();
                isStreaming = false; currentAbortController = null; updateSendButton(); promptInput.focus();
            },
            (err) => {
                assistantDiv.classList.remove('streaming');
                const textEl = assistantDiv.querySelector('.message-text');
                if (textEl) { textEl.textContent = `Erreur : ${err.message}`; textEl.style.color = '#c00'; }
                isStreaming = false; currentAbortController = null; updateSendButton(); promptInput.focus();
            },
            spContent,
            webSearchEnabled,
            (thinkChunk) => {
                fullThinking += thinkChunk;
                let thinkBlock = assistantDiv.querySelector('.thinking-block');
                if (!thinkBlock) {
                    const details = document.createElement('details');
                    details.className = 'thinking-block';
                    details.open = true;
                    const summary = document.createElement('summary');
                    summary.textContent = 'Raisonnement';
                    details.appendChild(summary);
                    const thinkContent = document.createElement('div');
                    thinkContent.className = 'thinking-content';
                    details.appendChild(thinkContent);
                    assistantDiv.insertBefore(details, assistantDiv.firstChild);
                    thinkBlock = details;
                }
                const thinkContent = thinkBlock.querySelector('.thinking-content');
                if (thinkContent) thinkContent.innerHTML = marked.parse(fullThinking);
                scrollToBottom();
            },
            currentAbortController.signal
        );
    }
}

// --- Scroll automatique ---
function scrollToBottom() {
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

// --- Envoyer le message ---
function sendMessage() {
    const text = promptInput.value.trim();
    if ((!text && pendingImages.length === 0 && pendingFiles.length === 0) || isStreaming) return;

    removeRegenBtn();

    // Vérifier qu'un modèle est sélectionné
    if (!currentModel && !currentImageModel && !currentSearchModel) {
        showModelAlert();
        return;
    }

    // Initialiser la conversation si c'est le premier message
    if (!conversationId) {
        firstPrompt = text || '(image)';
        conversationStartTime = new Date().toISOString();
        conversationId = generateConversationId(firstPrompt);
    }

    // Verrouiller le system prompt dès le premier envoi (modèles restent déverrouillés)
    if (!conversationStarted) {
        conversationStarted = true;
        spSelect.disabled = true;
        if (spSelect.value) {
            const opt = spSelect.selectedOptions[0];
            currentSystemPrompt = { nom: opt.textContent, contenu: opt.dataset.contenu };
        } else {
            currentSystemPrompt = null;
        }
    }

    // Construire le contenu du message (texte simple ou multimodal)
    let messageContent;
    if (pendingImages.length > 0 || pendingFiles.length > 0) {
        messageContent = [];
        if (text) {
            messageContent.push({ type: 'text', text });
        }
        for (const img of pendingImages) {
            const base64 = img.dataUrl.split(',')[1];
            messageContent.push({ type: 'image', data: base64, mimeType: img.mimeType, dataUrl: img.dataUrl });
        }
        for (const file of pendingFiles) {
            messageContent.push({ type: 'file', name: file.name, mimeType: file.mimeType, data: file.data, textContent: file.textContent });
        }
        pendingImages = [];
        pendingFiles = [];
        attachPreview.innerHTML = '';
    } else {
        messageContent = text;
    }

    // Afficher le message utilisateur
    addMessage('user', messageContent);
    conversationHistory.push({ role: 'user', content: messageContent });

    // Réinitialiser le champ de saisie
    promptInput.value = '';
    promptInput.style.height = 'auto';
    isStreaming = true;
    currentAbortController = new AbortController();
    updateSendButton();

    // Créer le bloc de réponse assistant
    const assistantDiv = addMessage('assistant', '');
    assistantDiv.classList.add('streaming');
    const genStartTime = Date.now();

    const activeTextModel = currentModel || currentSearchModel;

    if (currentImageModel) {
        // --- Mode génération d'image ---
        // Enrichir le prompt avec le contexte conversationnel
        let imagePrompt = text;
        const textMessages = conversationHistory.filter(m => m.role === 'user' || m.role === 'assistant');
        // S'il y a du contexte et que le prompt semble relatif (court ou référentiel)
        if (textMessages.length > 1) {
            const contextParts = [];
            // Prendre les derniers messages (hors le dernier qu'on vient d'ajouter)
            const recent = textMessages.slice(-6, -1);
            for (const m of recent) {
                const t = typeof m.content === 'string' ? m.content
                    : Array.isArray(m.content) ? m.content.filter(p => p.type === 'text').map(p => p.text).join(' ') : '';
                if (t) contextParts.push(`${m.role === 'user' ? 'User' : 'Assistant'}: ${t.substring(0, 300)}`);
            }
            if (contextParts.length > 0) {
                imagePrompt = `Context of the conversation:\n${contextParts.join('\n')}\n\nImage request: ${text}`;
            }
        }

        // Collecter les images de référence : jointes dans ce message ET images précédentes de la conversation
        const referenceImages = [];
        // Images jointes dans le message courant (ex: un logo uploadé)
        const lastMsg = conversationHistory[conversationHistory.length - 1];
        const attachedImageIds = new Set();
        if (Array.isArray(lastMsg.content)) {
            for (const part of lastMsg.content) {
                if (part.type === 'image' && part.data) {
                    referenceImages.push({ data: part.data, mimeType: part.mimeType });
                    attachedImageIds.add(part.data);
                }
            }
        }
        // Images précédentes dans la conversation (générées ou jointes), en remontant
        for (let i = conversationHistory.length - 2; i >= 0; i--) {
            const msg = conversationHistory[i];
            if (Array.isArray(msg.content)) {
                const imgs = msg.content.filter(p => p.type === 'image' && p.data && !attachedImageIds.has(p.data));
                if (imgs.length > 0) {
                    for (const img of imgs) {
                        referenceImages.push({ data: img.data, mimeType: img.mimeType });
                    }
                    break;
                }
            }
        }

        generateImage(
            currentImageModel,
            imagePrompt,
            // onDone
            (result) => {
                assistantDiv.classList.remove('streaming');

                // Afficher les images générées
                if (result.images.length > 0) {
                    const imagesDiv = document.createElement('div');
                    imagesDiv.className = 'message-images';
                    for (const img of result.images) {
                        const imgWrap = document.createElement('div');
                        imgWrap.className = 'message-image-wrap';

                        const imgEl = document.createElement('img');
                        const src = `data:${img.mimeType};base64,${img.b64}`;
                        imgEl.src = src;
                        imgEl.alt = 'Image générée';
                        attachLightboxToImg(imgEl);

                        const dlBtn = document.createElement('button');
                        dlBtn.className = 'image-download-btn';
                        dlBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>';
                        dlBtn.title = 'Télécharger';
                        dlBtn.addEventListener('click', () => {
                            const a = document.createElement('a');
                            a.href = src;
                            const ext = (img.mimeType || 'image/png').split('/')[1] || 'png';
                            a.download = `kiro-image.${ext}`;
                            a.click();
                        });

                        imgWrap.appendChild(imgEl);
                        imgWrap.appendChild(dlBtn);
                        imagesDiv.appendChild(imgWrap);
                    }
                    assistantDiv.insertBefore(imagesDiv, assistantDiv.firstChild);
                }

                // Afficher le texte (revised_prompt ou texte accompagnant)
                const textEl = assistantDiv.querySelector('.message-text');
                if (textEl && result.text) {
                    textEl.innerHTML = marked.parse(result.text);
                    addCodeCopyButtons(textEl);
                } else if (textEl) {
                    textEl.remove();
                }

                // Construire le contenu pour l'historique
                const assistantContent = [];
                if (result.text) {
                    assistantContent.push({ type: 'text', text: result.text });
                }
                for (const img of result.images) {
                    assistantContent.push({ type: 'image', data: img.b64, mimeType: img.mimeType });
                }
                const genSeconds = (Date.now() - genStartTime) / 1000;
                conversationHistory.push({
                    role: 'assistant',
                    content: assistantContent.length === 1 && assistantContent[0].type === 'text'
                        ? assistantContent[0].text
                        : assistantContent,
                    generationTime: genSeconds
                });
                setGenTimeOnLastAssistant(genSeconds);

                // Coûts
                if (result.usage) {
                    totalInputTokens += result.usage.input_tokens;
                    totalOutputTokens += result.usage.output_tokens;
                }
                const imgTarif = getImageTarif(currentImageModel);
                if (imgTarif) {
                    if (result.usage) {
                        totalCost += (result.usage.input_tokens / 1_000_000) * imgTarif.inputPer1M
                                   + (result.usage.output_tokens / 1_000_000) * imgTarif.outputPer1M;
                    }
                    if (result.imageCount > 0) {
                        totalImageCost += imgTarif.imageOutput * result.imageCount;
                    }
                }

                updateTokenDisplay();
                saveConversation();
                scrollToBottom();
                addRegenBtn();
                maybeGenerateTitle();

                isStreaming = false;
                currentAbortController = null;
                updateSendButton();
                promptInput.focus();
            },
            // onError
            (err) => {
                assistantDiv.classList.remove('streaming');
                const textEl = assistantDiv.querySelector('.message-text');
                if (textEl) {
                    textEl.textContent = `Erreur : ${err.message}`;
                    textEl.style.color = '#c00';
                }
                isStreaming = false;
                currentAbortController = null;
                updateSendButton();
                promptInput.focus();
            },
            referenceImages,
            currentAbortController.signal,
            document.getElementById('image-format-select').value
        );
    } else {
        // --- Mode texte / recherche (streaming) ---
        let fullResponse = '';
        let fullThinking = '';
        const spContent = currentSystemPrompt ? currentSystemPrompt.contenu : null;

        streamModel(
            activeTextModel,
            conversationHistory,
            // onChunk
            (chunk) => {
                // Refermer le bloc de raisonnement quand la vraie réponse commence
                if (!fullResponse) {
                    const thinkBlock = assistantDiv.querySelector('.thinking-block');
                    if (thinkBlock) thinkBlock.open = false;
                }
                fullResponse += chunk;
                const textEl = assistantDiv.querySelector('.message-text');
                if (textEl) textEl.innerHTML = marked.parse(fullResponse);
                scrollToBottom();
            },
            // onDone(usage, citations)
            (usage, citations) => {
                assistantDiv.classList.remove('streaming');
                const textEl = assistantDiv.querySelector('.message-text');
                if (textEl) { textEl.innerHTML = marked.parse(fullResponse); addCodeCopyButtons(textEl); }

                // Finaliser le bloc de raisonnement
                if (fullThinking) {
                    const thinkContent = assistantDiv.querySelector('.thinking-content');
                    if (thinkContent) thinkContent.innerHTML = marked.parse(fullThinking);
                }

                // Afficher les citations Perplexity
                if (citations && citations.length > 0) {
                    appendCitations(assistantDiv, citations);
                }

                const genSeconds = (Date.now() - genStartTime) / 1000;
                conversationHistory.push({ role: 'assistant', content: fullResponse, citations: citations || undefined, generationTime: genSeconds, thinking: fullThinking || undefined });
                setGenTimeOnLastAssistant(genSeconds);

                if (usage) {
                    totalInputTokens += usage.input_tokens;
                    totalOutputTokens += usage.output_tokens;
                    const segTarif = getTarif(activeTextModel) || getSearchTarif(activeTextModel);
                    if (segTarif) {
                        totalCost += (usage.input_tokens / 1_000_000) * segTarif.inputPer1M
                                   + (usage.output_tokens / 1_000_000) * segTarif.outputPer1M;
                    }
                }
                updateTokenDisplay();
                saveConversation();
                addRegenBtn();
                maybeGenerateTitle();

                isStreaming = false;
                currentAbortController = null;
                updateSendButton();
                promptInput.focus();
            },
            // onError
            (err) => {
                assistantDiv.classList.remove('streaming');
                const textEl = assistantDiv.querySelector('.message-text');
                if (textEl) {
                    textEl.textContent = `Erreur : ${err.message}`;
                    textEl.style.color = '#c00';
                }
                isStreaming = false;
                currentAbortController = null;
                updateSendButton();
                promptInput.focus();
            },
            spContent,
            webSearchEnabled,
            // onThinkingChunk
            (thinkChunk) => {
                fullThinking += thinkChunk;
                // Créer le bloc dépliable s'il n'existe pas encore
                let thinkBlock = assistantDiv.querySelector('.thinking-block');
                if (!thinkBlock) {
                    const details = document.createElement('details');
                    details.className = 'thinking-block';
                    details.open = true;
                    const summary = document.createElement('summary');
                    summary.textContent = 'Raisonnement';
                    details.appendChild(summary);
                    const thinkContent = document.createElement('div');
                    thinkContent.className = 'thinking-content';
                    details.appendChild(thinkContent);
                    assistantDiv.insertBefore(details, assistantDiv.firstChild);
                    thinkBlock = details;
                }
                const thinkContent = thinkBlock.querySelector('.thinking-content');
                if (thinkContent) thinkContent.innerHTML = marked.parse(fullThinking);
                scrollToBottom();
            },
            currentAbortController.signal
        );
    }
}

// --- Liste des conversations dans la sidebar ---
async function refreshConvList() {
    const conversations = await listConversationFiles();
    convList.innerHTML = '';
    for (const conv of conversations) {
        // Filtre catégorie
        if (activeCategoryId) {
            if (conv.category !== activeCategoryId) continue;
        } else {
            if (conv.category) continue;
        }

        const item = document.createElement('div');
        item.className = 'conv-item';
        item.dataset.filename = conv.filename;
        item.dataset.fulltext = conv.fullText || '';

        // Drag & drop
        item.draggable = true;
        item.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', conv.filename);
            item.classList.add('dragging');
        });
        item.addEventListener('dragend', () => {
            item.classList.remove('dragging');
        });

        const itemContent = document.createElement('div');
        itemContent.className = 'conv-item-content';

        const title = document.createElement('div');
        title.className = 'conv-item-title';
        if (conv.titre) {
            title.textContent = conv.titre;
        } else {
            const firstMsg = conv.firstMessage || '';
            const titleText = typeof firstMsg === 'string' ? firstMsg : getTextFromContent(firstMsg);
            title.textContent = titleText
                ? titleText.substring(0, 30) + (titleText.length > 30 ? '...' : '')
                : conv.id;
        }

        const dateLine = document.createElement('div');
        dateLine.className = 'conv-item-date-line';

        const date = document.createElement('span');
        date.className = 'conv-item-date';
        if (conv.date) {
            const d = new Date(conv.date);
            date.textContent = d.toLocaleDateString('fr-FR') + ' ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
        }

        const renameBtn = document.createElement('button');
        renameBtn.className = 'conv-rename-btn';
        renameBtn.innerHTML = '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>';
        renameBtn.title = 'Renommer';
        renameBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            renameConversation(conv.filename, title);
        });

        dateLine.appendChild(date);
        dateLine.appendChild(renameBtn);

        itemContent.appendChild(title);
        itemContent.appendChild(dateLine);

        // Bouton retirer de la catégorie
        if (activeCategoryId) {
            const uncatBtn = document.createElement('button');
            uncatBtn.className = 'conv-uncat-btn';
            uncatBtn.textContent = '\u2715';
            uncatBtn.title = 'Retirer de la catégorie';
            uncatBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                await updateConversationCategory(conv.filename, null);
                // Si c'est la conversation active, mettre à jour
                const expectedFn = conversationId
                    ? conversationId.replace(/[<>:"/\\|?*]/g, '_') + '.json'
                    : null;
                if (conv.filename === expectedFn) {
                    currentConversationCategory = null;
                }
                refreshConvList();
            });
            item.appendChild(uncatBtn);
        }

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'conv-delete-btn';
        deleteBtn.textContent = '\u00D7';
        deleteBtn.title = 'Supprimer cette conversation';
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteConversation(conv.filename);
        });

        item.appendChild(itemContent);
        item.appendChild(deleteBtn);
        item.addEventListener('click', () => loadConversation(conv.filename));
        convList.appendChild(item);
    }
    highlightActiveConv();

    if (convSearch.value) {
        convSearch.dispatchEvent(new Event('input'));
    }
}

async function renameConversation(filename, titleEl) {
    const currentTitle = titleEl.textContent;
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'conv-rename-input';
    input.value = currentTitle;
    titleEl.textContent = '';
    titleEl.appendChild(input);
    input.focus();
    input.select();

    const finish = async () => {
        const newTitle = input.value.trim();
        if (newTitle && newTitle !== currentTitle) {
            // Mettre à jour dans IndexedDB
            const data = await readConversationFile(filename);
            if (data) {
                data.titre = newTitle;
                await writeConversationFile(filename, data);
            }
            // Mettre à jour la variable si c'est la conversation active
            const expectedFn = conversationId
                ? conversationId.replace(/[<>:"/\\|?*]/g, '_') + '.json'
                : null;
            if (filename === expectedFn) {
                conversationTitle = newTitle;
            }
        }
        titleEl.textContent = newTitle || currentTitle;
    };

    input.addEventListener('blur', finish);
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); input.blur(); }
        if (e.key === 'Escape') { input.value = currentTitle; input.blur(); }
    });
}

async function deleteConversation(filename) {
    if (!confirm('Supprimer cette conversation ?')) return;
    await deleteConversationFile(filename);
    const expectedFn = conversationId
        ? conversationId.replace(/[<>:"/\\|?*]/g, '_') + '.json'
        : null;
    if (filename === expectedFn) {
        resetConversation();
    }
    refreshConvList();
}

async function loadConversation(filename) {
    if (isStreaming) return;
    saveConversation();

    const data = await readConversationFile(filename);
    if (!data) return;

    // Restaurer l'état de la conversation
    conversationId = data.id;
    conversationTitle = data.titre || null;
    conversationStartTime = data.date;
    const savedModel = data.modele;
    conversationHistory = data.messages || [];
    totalInputTokens = data.tokens_entree || 0;
    totalOutputTokens = data.tokens_sortie || 0;
    totalCost = data.totalCost || 0;
    totalImageCost = data.cout_images || 0;
    totalAudioCost = data.cout_audio || 0;
    currentConversationCategory = data.category || null;
    firstPrompt = conversationHistory.length > 0 ? getTextFromContent(conversationHistory[0].content) : null;
    conversationStarted = conversationHistory.length > 0;

    // Déterminer si c'est un modèle texte, image ou recherche
    const isImageModel = IMAGE_MODELS.some(m => m.id === savedModel);
    const isSearchModel = SEARCH_MODELS.some(m => m.id === savedModel);
    if (isImageModel) {
        currentImageModel = savedModel;
        currentModel = null;
        currentSearchModel = null;
        imageModelSelect.value = savedModel;
        modelSelect.value = '';
        searchModelSelect.value = '';
    } else if (isSearchModel) {
        currentSearchModel = savedModel;
        currentModel = null;
        currentImageModel = null;
        searchModelSelect.value = savedModel;
        modelSelect.value = '';
        imageModelSelect.value = '';
    } else {
        currentModel = savedModel;
        currentImageModel = null;
        currentSearchModel = null;
        modelSelect.value = savedModel;
        imageModelSelect.value = '';
        searchModelSelect.value = '';
    }

    // Restaurer le system prompt
    if (data.system_prompt || data.systemPrompt) {
        const spName = data.system_prompt || data.systemPrompt;
        spSelect.value = '';
        for (const opt of spSelect.options) {
            if (opt.textContent === spName) { spSelect.value = opt.value; break; }
        }
        currentSystemPrompt = spSelect.value
            ? { nom: spName, contenu: spSelect.selectedOptions[0]?.dataset.contenu || '' }
            : { nom: spName, contenu: '' };
    } else {
        currentSystemPrompt = null;
        spSelect.value = '';
    }

    // Restaurer le modèle actif depuis le dernier model-switch
    const lastSwitch = [...conversationHistory].reverse().find(m => m.type === 'model-switch');
    if (lastSwitch) {
        const restoredModel = lastSwitch.to;
        const isImg = IMAGE_MODELS.some(m => m.id === restoredModel);
        const isSrch = SEARCH_MODELS.some(m => m.id === restoredModel);
        currentModel = null; currentImageModel = null; currentSearchModel = null;
        modelSelect.value = ''; imageModelSelect.value = ''; searchModelSelect.value = '';
        if (isImg) { currentImageModel = restoredModel; imageModelSelect.value = restoredModel; }
        else if (isSrch) { currentSearchModel = restoredModel; searchModelSelect.value = restoredModel; }
        else { currentModel = restoredModel; modelSelect.value = restoredModel; }
    }

    // Verrouiller uniquement le system prompt
    spSelect.disabled = conversationStarted;

    // Vider les pièces jointes en attente
    pendingImages = [];
    pendingFiles = [];
    attachPreview.innerHTML = '';

    // Réafficher les messages
    chatContainer.innerHTML = '';
    for (const msg of conversationHistory) {
        if (msg.type === 'model-switch') {
            addModelSwitchElement(getModelLabel(msg.from), getModelLabel(msg.to));
        } else {
            addMessage(msg.role === 'user' ? 'user' : 'assistant', msg.content, msg.citations, msg.generationTime, msg.thinking);
        }
    }

    updateTokenDisplay();
    updateSendButton();
    highlightActiveConv();
    updateExportMdBtn();
    addRegenBtn();
    promptInput.focus();
}

function highlightActiveConv() {
    const items = convList.querySelectorAll('.conv-item');
    for (const item of items) {
        const fn = item.dataset.filename;
        const expectedFn = conversationId
            ? conversationId.replace(/[<>:"/\\|?*]/g, '_') + '.json'
            : null;
        item.classList.toggle('active', fn === expectedFn);
    }
}

// --- Rôles (System Prompts) : liste, modale, CRUD ---

async function refreshSpList() {
    const prompts = await listSystemPrompts();

    // Sidebar list
    spListEl.innerHTML = '';
    for (const sp of prompts) {
        const item = document.createElement('div');
        item.className = 'sp-item';

        const name = document.createElement('span');
        name.className = 'sp-item-name';
        name.textContent = sp.nom;

        const actions = document.createElement('div');
        actions.className = 'sp-item-actions';

        const exportBtn = document.createElement('button');
        exportBtn.className = 'sp-item-btn';
        exportBtn.innerHTML = '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5"/><path d="M5 12l7-7 7 7"/></svg>';
        exportBtn.title = 'Exporter';
        exportBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            exportSpItem(sp.filename);
        });

        const editBtn = document.createElement('button');
        editBtn.className = 'sp-item-btn';
        editBtn.textContent = '\u270E';
        editBtn.title = 'Modifier';
        editBtn.addEventListener('click', () => openSpModal(sp.filename));

        const delBtn = document.createElement('button');
        delBtn.className = 'sp-item-btn delete';
        delBtn.textContent = '\u00D7';
        delBtn.title = 'Supprimer';
        delBtn.addEventListener('click', () => deleteSpItem(sp.filename, sp.nom));

        actions.appendChild(exportBtn);
        actions.appendChild(editBtn);
        actions.appendChild(delBtn);
        item.appendChild(name);
        item.appendChild(actions);
        spListEl.appendChild(item);
    }

    // Select dropdown
    const prevValue = spSelect.value;
    spSelect.innerHTML = '<option value="">Aucun</option>';
    for (const sp of prompts) {
        const opt = document.createElement('option');
        opt.value = sp.filename;
        opt.textContent = sp.nom;
        opt.dataset.contenu = sp.contenu;
        spSelect.appendChild(opt);
    }
    spSelect.value = prevValue || '';
}

async function deleteSpItem(filename, nom) {
    if (!confirm(`Supprimer le rôle "${nom}" ?`) ) return;
    await deleteSystemPromptFile(filename);
    if (spSelect.value === filename) {
        spSelect.value = '';
        currentSystemPrompt = null;
    }
    refreshSpList();
}

async function exportSpItem(filename) {
    const data = await readSystemPrompt(filename);
    if (!data) return;
    const exportData = { _minou_role: true, nom: data.nom, contenu: data.contenu };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const safeName = data.nom.replace(/[^a-zA-Z0-9àâéèêëïîôùûüçÀÂÉÈÊËÏÎÔÙÛÜÇ _-]/g, '_');
    a.download = `role-${safeName}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

const spImportBtn = document.getElementById('sp-import-btn');
const spImportFile = document.getElementById('sp-import-file');

spImportBtn.addEventListener('click', () => spImportFile.click());

spImportFile.addEventListener('change', async () => {
    const file = spImportFile.files[0];
    if (!file) return;
    spImportFile.value = '';
    try {
        const text = await file.text();
        const data = JSON.parse(text);
        if (!data._minou_role || !data.nom || !data.contenu) {
            showModelAlert('Ce fichier n\'est pas un rôle valide.');
            return;
        }
        const filename = data.nom.replace(/[^a-zA-Z0-9àâéèêëïîôùûüçÀÂÉÈÊËÏÎÔÙÛÜÇ _-]/g, '_') + '.json';
        await writeSystemPrompt(filename, { nom: data.nom, contenu: data.contenu });
        refreshSpList();
    } catch (e) {
        console.error('Erreur import rôle:', e);
        showModelAlert('Erreur lors de l\'import du rôle.');
    }
});

function openSpModal(filename = null) {
    spEditingFilename = filename;
    if (filename) {
        spModalTitle.textContent = 'Modifier le rôle';
        readSystemPrompt(filename).then(data => {
            if (data) {
                spModalNom.value = data.nom;
                spModalContenu.value = data.contenu;
            }
        });
    } else {
        spModalTitle.textContent = 'Nouveau rôle';
        spModalNom.value = '';
        spModalContenu.value = '';
    }
    spModalOverlay.style.display = 'flex';
    spModalNom.focus();
}

function closeSpModal() {
    spModalOverlay.style.display = 'none';
    spEditingFilename = null;
}

const spModalOptimize = document.getElementById('sp-modal-optimize');

spAddBtn.addEventListener('click', () => openSpModal());
spModalCancel.addEventListener('click', closeSpModal);

spModalOptimize.addEventListener('click', async () => {
    const contenu = spModalContenu.value.trim();
    if (!contenu) return;

    if (!API_KEYS.anthropic) {
        showModelAlert('Clé API Anthropic requise pour l\'optimisation. Renseignez-la dans Configuration.');
        return;
    }

    const originalText = spModalOptimize.textContent;
    spModalOptimize.disabled = true;
    spModalOptimize.textContent = 'Optimisation...';
    spModalContenu.value = '';

    try {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': API_KEYS.anthropic,
                'anthropic-version': '2023-06-01',
                'anthropic-dangerous-direct-browser-access': 'true'
            },
            body: JSON.stringify({
                model: 'claude-sonnet-4-5-20250929',
                max_tokens: 4096,
                stream: true,
                messages: [{
                    role: 'user',
                    content: `Tu es un expert en prompt engineering. Voici un system prompt brut :\n\n---\n${contenu}\n---\n\nRéécris-le en une version optimisée, claire et structurée en markdown. Améliore la formulation, ajoute de la structure (titres, listes, emphases) pour le rendre plus efficace. Réponds UNIQUEMENT avec le system prompt amélioré, sans explication ni commentaire autour.`
                }]
            })
        });

        if (!response.ok) {
            const err = await response.text();
            throw new Error(`Erreur API : ${response.status}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop();
            for (const line of lines) {
                if (!line.startsWith('data: ')) continue;
                const data = line.slice(6).trim();
                try {
                    const parsed = JSON.parse(data);
                    if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
                        spModalContenu.value += parsed.delta.text;
                        spModalContenu.style.height = 'auto';
                        spModalContenu.style.height = spModalContenu.scrollHeight + 'px';
                        spModalContenu.scrollTop = spModalContenu.scrollHeight;
                    }
                } catch (e) {}
            }
        }
    } catch (e) {
        console.error('Erreur optimisation:', e);
        alert('Erreur lors de l\'optimisation : ' + e.message);
    } finally {
        spModalOptimize.disabled = false;
        spModalOptimize.textContent = originalText;
    }
});
spModalOverlay.addEventListener('click', (e) => {
    if (e.target === spModalOverlay) closeSpModal();
});

spModalSave.addEventListener('click', async () => {
    const nom = spModalNom.value.trim();
    const contenu = spModalContenu.value.trim();
    if (!nom || !contenu) return;

    const data = { nom, contenu };
    const filename = spEditingFilename || nom.replace(/[^a-zA-Z0-9àâéèêëïîôùûüçÀÂÉÈÊËÏÎÔÙÛÜÇ _-]/g, '_') + '.json';

    if (spEditingFilename) {
        const oldData = await readSystemPrompt(spEditingFilename);
        if (oldData && oldData.nom !== nom) {
            const newFilename = nom.replace(/[^a-zA-Z0-9àâéèêëïîôùûüçÀÂÉÈÊËÏÎÔÙÛÜÇ _-]/g, '_') + '.json';
            if (newFilename !== spEditingFilename) {
                await writeSystemPrompt(newFilename, data);
                await deleteSystemPromptFile(spEditingFilename);
                closeSpModal();
                refreshSpList();
                return;
            }
        }
    }

    await writeSystemPrompt(filename, data);
    closeSpModal();
    refreshSpList();
});

// --- Prompts enregistrés : sidebar, modale, picker ---

async function refreshPrList() {
    const prompts = await listSavedPrompts();

    prListEl.innerHTML = '';
    for (const pr of prompts) {
        const item = document.createElement('div');
        item.className = 'sp-item';

        const name = document.createElement('span');
        name.className = 'sp-item-name';
        name.textContent = pr.nom;

        const actions = document.createElement('div');
        actions.className = 'sp-item-actions';

        const editBtn = document.createElement('button');
        editBtn.className = 'sp-item-btn';
        editBtn.textContent = '\u270E';
        editBtn.title = 'Modifier';
        editBtn.addEventListener('click', () => openPrModal(pr.filename));

        const delBtn = document.createElement('button');
        delBtn.className = 'sp-item-btn delete';
        delBtn.textContent = '\u00D7';
        delBtn.title = 'Supprimer';
        delBtn.addEventListener('click', async () => {
            if (!confirm(`Supprimer le prompt "${pr.nom}" ?`)) return;
            await deleteSavedPrompt(pr.filename);
            refreshPrList();
        });

        actions.appendChild(editBtn);
        actions.appendChild(delBtn);
        item.appendChild(name);
        item.appendChild(actions);
        prListEl.appendChild(item);
    }
}

function openPrModal(filename = null, prefillContenu = '') {
    prEditingFilename = filename;
    if (filename) {
        prModalTitle.textContent = 'Modifier le Prompt';
        readSavedPrompt(filename).then(data => {
            if (data) {
                prModalNom.value = data.nom;
                prModalContenu.value = data.contenu;
            }
        });
    } else {
        prModalTitle.textContent = 'Enregistrer un Prompt';
        prModalNom.value = '';
        prModalContenu.value = prefillContenu;
    }
    prModalOverlay.style.display = 'flex';
    prModalNom.focus();
}

function closePrModal() {
    prModalOverlay.style.display = 'none';
    prEditingFilename = null;
}

prAddBtn.addEventListener('click', () => openPrModal());
prModalCancel.addEventListener('click', closePrModal);
prModalOverlay.addEventListener('click', (e) => {
    if (e.target === prModalOverlay) closePrModal();
});

prModalSave.addEventListener('click', async () => {
    const nom = prModalNom.value.trim();
    const contenu = prModalContenu.value.trim();
    if (!nom || !contenu) return;

    const data = { nom, contenu };
    const filename = prEditingFilename || nom.replace(/[^a-zA-Z0-9àâéèêëïîôùûüçÀÂÉÈÊËÏÎÔÙÛÜÇ _-]/g, '_') + '.json';

    if (prEditingFilename) {
        const oldData = await readSavedPrompt(prEditingFilename);
        if (oldData && oldData.nom !== nom) {
            const newFilename = nom.replace(/[^a-zA-Z0-9àâéèêëïîôùûüçÀÂÉÈÊËÏÎÔÙÛÜÇ _-]/g, '_') + '.json';
            if (newFilename !== prEditingFilename) {
                await writeSavedPrompt(newFilename, data);
                await deleteSavedPrompt(prEditingFilename);
                closePrModal();
                refreshPrList();
                return;
            }
        }
    }

    await writeSavedPrompt(filename, data);
    closePrModal();
    refreshPrList();
});

// --- Prompt Picker (dropdown dans la zone de saisie) ---

promptPickerBtn.addEventListener('click', async () => {
    if (promptPickerDropdown.style.display !== 'none') {
        promptPickerDropdown.style.display = 'none';
        return;
    }
    const prompts = await listSavedPrompts();
    promptPickerDropdown.innerHTML = '';

    if (prompts.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'prompt-picker-empty';
        empty.textContent = 'Aucun prompt enregistré';
        promptPickerDropdown.appendChild(empty);
    } else {
        for (const pr of prompts) {
            const item = document.createElement('div');
            item.className = 'prompt-picker-item';

            const name = document.createElement('div');
            name.className = 'prompt-picker-item-name';
            name.textContent = pr.nom;

            const preview = document.createElement('div');
            preview.className = 'prompt-picker-item-preview';
            preview.textContent = pr.contenu.substring(0, 80) + (pr.contenu.length > 80 ? '...' : '');

            item.appendChild(name);
            item.appendChild(preview);
            item.addEventListener('click', () => {
                const sep = promptInput.value && !promptInput.value.endsWith(' ') && !promptInput.value.endsWith('\n') ? ' ' : '';
                promptInput.value += sep + pr.contenu;
                promptInput.dispatchEvent(new Event('input'));
                promptPickerDropdown.style.display = 'none';
                promptInput.focus();
            });
            promptPickerDropdown.appendChild(item);
        }
    }
    promptPickerDropdown.style.display = '';
});

// Fermer le picker en cliquant ailleurs
document.addEventListener('click', (e) => {
    if (!promptPickerBtn.contains(e.target) && !promptPickerDropdown.contains(e.target)) {
        promptPickerDropdown.style.display = 'none';
    }
});

// --- Micro : dictée vocale via Whisper ---
const micIconDefault = micBtn.innerHTML;
const micIconStop = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="6" width="12" height="12" rx="1"/></svg>';
const micIconLoading = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="spin"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>';

micBtn.addEventListener('click', async () => {
    // Si en cours d'enregistrement, arrêter
    if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
        return;
    }

    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        micChunks = [];
        micStartTime = Date.now();

        mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) micChunks.push(e.data);
        };

        mediaRecorder.onstop = () => {
            const durationMin = (Date.now() - micStartTime) / 60000;
            const blob = new Blob(micChunks, { type: 'audio/webm' });
            stream.getTracks().forEach(t => t.stop());
            micBtn.innerHTML = micIconLoading;
            micBtn.classList.remove('recording');

            transcribeAudio(blob, (text) => {
                micBtn.innerHTML = micIconDefault;
                promptInput.value += (promptInput.value && !promptInput.value.endsWith(' ') ? ' ' : '') + text;
                promptInput.dispatchEvent(new Event('input'));
                // Coût Whisper : $0.006 / minute
                totalAudioCost += durationMin * 0.006;
                updateTokenDisplay();
                if (conversationId) saveConversation();
            }, (err) => {
                micBtn.innerHTML = micIconDefault;
                console.error('Whisper error:', err);
                alert('Erreur transcription : ' + err.message);
            });
        };

        mediaRecorder.start();
        micBtn.innerHTML = micIconStop;
        micBtn.classList.add('recording');
    } catch (err) {
        console.error('Mic error:', err);
        alert('Impossible d\u2019accéder au microphone.');
    }
});

// --- Export / Import ---
const exportBtn = document.getElementById('export-btn');
const importBtn = document.getElementById('import-btn');
const importFileInput = document.getElementById('import-file-input');

exportBtn.addEventListener('click', async () => {
    const conversations = {};
    const db = await openConvDB();
    const tx = db.transaction('conversations', 'readonly');
    const store = tx.objectStore('conversations');
    const keys = await new Promise((resolve) => {
        const req = store.getAllKeys();
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve([]);
    });
    for (const key of keys) {
        const val = await new Promise((resolve) => {
            const req = store.get(key);
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => resolve(null);
        });
        if (val) conversations[key] = val;
    }

    const data = {
        _minou_backup: true,
        date: new Date().toISOString(),
        conversations: conversations,
        systemPrompts: JSON.parse(localStorage.getItem('minou-systemprompts') || '{}'),
        savedPrompts: JSON.parse(localStorage.getItem('minou-savedprompts') || '{}'),
        categories: JSON.parse(localStorage.getItem('minou-categories') || '{}'),
        theme: localStorage.getItem('minou-theme') || 'dark',
        apiKeys: JSON.parse(localStorage.getItem('minou-apikeys') || '{}')
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'kiro-backup-' + new Date().toISOString().slice(0, 10) + '.json';
    a.click();
    URL.revokeObjectURL(url);
});

importBtn.addEventListener('click', () => importFileInput.click());

importFileInput.addEventListener('change', async () => {
    const file = importFileInput.files[0];
    if (!file) return;
    importFileInput.value = '';

    try {
        const text = await file.text();
        const data = JSON.parse(text);

        if (!data._minou_backup) {
            showModelAlert('Ce fichier n\'est pas une sauvegarde valide.');
            return;
        }

        const convCount = data.conversations ? Object.keys(data.conversations).length : 0;
        const spCount = data.systemPrompts ? Object.keys(data.systemPrompts).length : 0;
        const prCount = data.savedPrompts ? Object.keys(data.savedPrompts).length : 0;
        const catCount = data.categories ? Object.keys(data.categories).length : 0;

        if (!confirm(`Importer ${convCount} conversation(s), ${spCount} rôle(s), ${prCount} prompt(s) enregistré(s) et ${catCount} catégorie(s) ?\n\nLes données existantes portant les mêmes noms seront écrasées.`)) return;

        // Importer les conversations dans IndexedDB
        if (data.conversations) {
            const db = await openConvDB();
            for (const [key, val] of Object.entries(data.conversations)) {
                const tx = db.transaction('conversations', 'readwrite');
                tx.objectStore('conversations').put(val, key);
                await new Promise(r => { tx.oncomplete = r; });
            }
        }

        // Importer les system prompts
        if (data.systemPrompts) {
            const existing = JSON.parse(localStorage.getItem('minou-systemprompts') || '{}');
            Object.assign(existing, data.systemPrompts);
            localStorage.setItem('minou-systemprompts', JSON.stringify(existing));
        }

        // Importer les prompts enregistrés
        if (data.savedPrompts) {
            const existing = JSON.parse(localStorage.getItem('minou-savedprompts') || '{}');
            Object.assign(existing, data.savedPrompts);
            localStorage.setItem('minou-savedprompts', JSON.stringify(existing));
        }

        // Importer les clés API
        if (data.apiKeys && Object.keys(data.apiKeys).length > 0) {
            saveApiKeys(data.apiKeys);
        }

        // Importer les catégories
        if (data.categories) {
            const existing = JSON.parse(localStorage.getItem('minou-categories') || '{}');
            Object.assign(existing, data.categories);
            localStorage.setItem('minou-categories', JSON.stringify(existing));
        }

        // Rafraîchir l'interface
        refreshConvList();
        refreshCatBar();
        refreshSpList();
        refreshPrList();
        showModelAlert('Import terminé avec succès !');
    } catch (e) {
        console.error('Erreur import:', e);
        showModelAlert('Erreur lors de l\'import : fichier invalide.');
    }
});

// --- Dashboard Statistiques ---
const dashboardBtn = document.getElementById('dashboard-btn');
const dashboardOverlay = document.getElementById('dashboard-modal-overlay');
const dashboardClose = document.getElementById('dashboard-close');
const dashboardContent = document.getElementById('dashboard-content');
let dashboardData = null;

dashboardBtn.addEventListener('click', openDashboard);
dashboardClose.addEventListener('click', closeDashboard);
dashboardOverlay.addEventListener('click', (e) => {
    if (e.target === dashboardOverlay) closeDashboard();
});

document.querySelectorAll('.dashboard-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.dashboard-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        renderDashboardTab(tab.dataset.tab);
    });
});

async function openDashboard() {
    dashboardData = await listConversationFiles();
    document.querySelector('.dashboard-tab.active')?.click() ||
        renderDashboardTab('periodes');
    dashboardOverlay.style.display = 'flex';
}

function closeDashboard() {
    dashboardOverlay.style.display = 'none';
}

// --- Modale Config (clés API) ---
apikeysBtn.addEventListener('click', openApiKeysModal);
apikeysModalCancel.addEventListener('click', closeApiKeysModal);
apikeysModalSave.addEventListener('click', saveApiKeysFromModal);
apikeysModalOverlay.addEventListener('click', (e) => {
    if (e.target === apikeysModalOverlay) closeApiKeysModal();
});

document.querySelectorAll('.apikey-toggle-vis').forEach(btn => {
    btn.addEventListener('click', () => {
        const input = document.getElementById(btn.dataset.target);
        input.type = input.type === 'password' ? 'text' : 'password';
    });
});

function openApiKeysModal() {
    document.getElementById('apikey-openai').value = API_KEYS.openai || '';
    document.getElementById('apikey-anthropic').value = API_KEYS.anthropic || '';
    document.getElementById('apikey-google').value = API_KEYS.google || '';
    document.getElementById('apikey-perplexity').value = API_KEYS.perplexity || '';
    apikeysModalOverlay.style.display = 'flex';
}

function closeApiKeysModal() {
    apikeysModalOverlay.style.display = 'none';
}

function saveApiKeysFromModal() {
    saveApiKeys({
        openai: document.getElementById('apikey-openai').value.trim(),
        anthropic: document.getElementById('apikey-anthropic').value.trim(),
        google: document.getElementById('apikey-google').value.trim(),
        perplexity: document.getElementById('apikey-perplexity').value.trim()
    });
    closeApiKeysModal();
}

function fmtTokens(n) {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
    if (n >= 1_000) return (n / 1_000).toFixed(1) + 'k';
    return String(n);
}

function fmtCost(n) {
    return '$' + n.toFixed(4);
}

const CHART_COLORS = ['#3b82f6','#ef4444','#10b981','#f59e0b','#8b5cf6','#ec4899','#06b6d4','#f97316','#6366f1','#14b8a6'];

function buildBarChart(title, rows, colorFn) {
    // rows: [{ label, value, formatted }]
    if (rows.length === 0) return '';
    const max = Math.max(...rows.map(r => r.value), 0.0001);
    let html = `<div class="dashboard-chart"><div class="dashboard-chart-title">${title}</div><div class="dashboard-bar-chart">`;
    rows.forEach((r, i) => {
        const pct = (r.value / max) * 100;
        const color = colorFn ? colorFn(r, i) : CHART_COLORS[i % CHART_COLORS.length];
        html += `<div class="dashboard-bar-row">
            <span class="dashboard-bar-label" title="${r.label}">${r.label}</span>
            <div class="dashboard-bar-track"><div class="dashboard-bar-fill" style="width:${pct}%;background:${color}"></div></div>
            <span class="dashboard-bar-value">${r.formatted}</span>
        </div>`;
    });
    html += '</div></div>';
    return html;
}

function renderDashboardTab(tab) {
    if (!dashboardData) return;
    const convs = dashboardData;
    if (convs.length === 0) {
        dashboardContent.innerHTML = '<div class="dashboard-empty">Aucune conversation enregistrée.</div>';
        return;
    }
    switch (tab) {
        case 'periodes': renderPeriodes(convs); break;
        case 'conversations': renderConversations(convs); break;
        case 'modeles': renderModeles(convs); break;
        case 'editeurs': renderEditeurs(convs); break;
        case 'categories': renderDashCategories(convs); break;
    }
}

function renderPeriodes(convs) {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const d7 = new Date(now); d7.setDate(d7.getDate() - 7);
    const d30 = new Date(now); d30.setDate(d30.getDate() - 30);

    const periods = [
        { label: "Aujourd'hui", filter: c => c.date && c.date.slice(0, 10) === todayStr },
        { label: '7 derniers jours', filter: c => c.date && new Date(c.date) >= d7 },
        { label: '30 derniers jours', filter: c => c.date && new Date(c.date) >= d30 },
        { label: 'Total', filter: () => true }
    ];

    let html = '<table class="dashboard-table"><thead><tr><th>Période</th><th class="num">Conv.</th><th class="num">Tokens entrée</th><th class="num">Tokens sortie</th><th class="num">Coût</th></tr></thead><tbody>';
    for (const p of periods) {
        const filtered = convs.filter(p.filter);
        const tin = filtered.reduce((s, c) => s + c.tokens_entree, 0);
        const tout = filtered.reduce((s, c) => s + c.tokens_sortie, 0);
        const cost = filtered.reduce((s, c) => s + c.cout_estime_usd, 0);
        html += `<tr><td>${p.label}</td><td class="num">${filtered.length}</td><td class="num">${fmtTokens(tin)}</td><td class="num">${fmtTokens(tout)}</td><td class="num">${fmtCost(cost)}</td></tr>`;
    }
    html += '</tbody></table>';

    // Graphique par mois
    const months = {};
    for (const c of convs) {
        if (!c.date) continue;
        const key = c.date.slice(0, 7); // YYYY-MM
        if (!months[key]) months[key] = { cost: 0, count: 0 };
        months[key].cost += c.cout_estime_usd;
        months[key].count++;
    }
    const monthRows = Object.entries(months)
        .sort((a, b) => b[0].localeCompare(a[0]))
        .slice(0, 12)
        .reverse()
        .map(([m, d]) => {
            const [y, mo] = m.split('-');
            const label = new Date(y, mo - 1).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' });
            return { label, value: d.cost, formatted: fmtCost(d.cost) };
        });

    html += '<hr class="dashboard-separator">';
    html += '<div class="dashboard-charts-row">';
    html += buildBarChart('Coût par mois', monthRows);

    const monthConvRows = Object.entries(months)
        .sort((a, b) => b[0].localeCompare(a[0]))
        .slice(0, 12)
        .reverse()
        .map(([m, d]) => {
            const [y, mo] = m.split('-');
            const label = new Date(y, mo - 1).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' });
            return { label, value: d.count, formatted: String(d.count) };
        });
    html += buildBarChart('Conversations par mois', monthConvRows, () => '#10b981');
    html += '</div>';

    dashboardContent.innerHTML = html;
}

function renderConversations(convs) {
    let html = '<table class="dashboard-table"><thead><tr><th>Titre</th><th>Modèle</th><th>Date</th><th class="num">Tokens</th><th class="num">Coût</th></tr></thead><tbody>';
    for (const c of convs) {
        const titre = c.titre || c.id || '—';
        const modele = c.modele || '—';
        const date = c.date ? new Date(c.date).toLocaleDateString('fr-FR') : '—';
        const tokens = c.tokens_entree + c.tokens_sortie;
        html += `<tr><td title="${titre.length > 40 ? titre : ''}">${titre.length > 40 ? titre.substring(0, 37) + '...' : titre}</td><td>${modele}</td><td>${date}</td><td class="num">${fmtTokens(tokens)}</td><td class="num">${fmtCost(c.cout_estime_usd)}</td></tr>`;
    }
    html += '</tbody></table>';

    // Top 10 par coût
    const top = [...convs].sort((a, b) => b.cout_estime_usd - a.cout_estime_usd).slice(0, 10);
    const topRows = top.map(c => ({
        label: (c.titre || c.id || '?').substring(0, 20),
        value: c.cout_estime_usd,
        formatted: fmtCost(c.cout_estime_usd)
    }));

    // Top 10 par tokens
    const topTokens = [...convs].sort((a, b) => (b.tokens_entree + b.tokens_sortie) - (a.tokens_entree + a.tokens_sortie)).slice(0, 10);
    const topTokenRows = topTokens.map(c => ({
        label: (c.titre || c.id || '?').substring(0, 20),
        value: c.tokens_entree + c.tokens_sortie,
        formatted: fmtTokens(c.tokens_entree + c.tokens_sortie)
    }));

    html += '<hr class="dashboard-separator">';
    html += '<div class="dashboard-charts-row">';
    html += buildBarChart('Top 10 — coût', topRows, () => '#ef4444');
    html += buildBarChart('Top 10 — tokens', topTokenRows, () => '#8b5cf6');
    html += '</div>';

    dashboardContent.innerHTML = html;
}

function renderModeles(convs) {
    const map = {};
    for (const c of convs) {
        const m = c.modele || 'inconnu';
        if (!map[m]) map[m] = { count: 0, tin: 0, tout: 0, cost: 0 };
        map[m].count++;
        map[m].tin += c.tokens_entree;
        map[m].tout += c.tokens_sortie;
        map[m].cost += c.cout_estime_usd;
    }
    const rows = Object.entries(map).sort((a, b) => b[1].cost - a[1].cost);
    let html = '<table class="dashboard-table"><thead><tr><th>Modèle</th><th class="num">Conv.</th><th class="num">Tokens entrée</th><th class="num">Tokens sortie</th><th class="num">Coût</th></tr></thead><tbody>';
    for (const [model, d] of rows) {
        html += `<tr><td>${model}</td><td class="num">${d.count}</td><td class="num">${fmtTokens(d.tin)}</td><td class="num">${fmtTokens(d.tout)}</td><td class="num">${fmtCost(d.cost)}</td></tr>`;
    }
    html += '</tbody></table>';

    const costRows = rows.map(([m, d]) => ({ label: m, value: d.cost, formatted: fmtCost(d.cost) }));
    const convRows = rows.sort((a, b) => b[1].count - a[1].count).map(([m, d]) => ({ label: m, value: d.count, formatted: String(d.count) }));

    html += '<hr class="dashboard-separator">';
    html += '<div class="dashboard-charts-row">';
    html += buildBarChart('Coût par modèle', costRows);
    html += buildBarChart('Conversations par modèle', convRows, () => '#10b981');
    html += '</div>';

    dashboardContent.innerHTML = html;
}

function renderEditeurs(convs) {
    const map = {};
    for (const c of convs) {
        const editeur = getModelEditeur(c.modele) || getImageModelEditeur(c.modele) || getSearchModelEditeur(c.modele) || 'inconnu';
        if (!map[editeur]) map[editeur] = { count: 0, tin: 0, tout: 0, cost: 0 };
        map[editeur].count++;
        map[editeur].tin += c.tokens_entree;
        map[editeur].tout += c.tokens_sortie;
        map[editeur].cost += c.cout_estime_usd;
    }
    const rows = Object.entries(map).sort((a, b) => b[1].cost - a[1].cost);
    let html = '<table class="dashboard-table"><thead><tr><th>Éditeur</th><th class="num">Conv.</th><th class="num">Tokens entrée</th><th class="num">Tokens sortie</th><th class="num">Coût</th></tr></thead><tbody>';
    for (const [editeur, d] of rows) {
        html += `<tr><td>${editeur.charAt(0).toUpperCase() + editeur.slice(1)}</td><td class="num">${d.count}</td><td class="num">${fmtTokens(d.tin)}</td><td class="num">${fmtTokens(d.tout)}</td><td class="num">${fmtCost(d.cost)}</td></tr>`;
    }
    html += '</tbody></table>';

    const costRows = rows.map(([e, d]) => ({ label: e.charAt(0).toUpperCase() + e.slice(1), value: d.cost, formatted: fmtCost(d.cost) }));
    const convRows = [...rows].sort((a, b) => b[1].count - a[1].count).map(([e, d]) => ({ label: e.charAt(0).toUpperCase() + e.slice(1), value: d.count, formatted: String(d.count) }));

    html += '<hr class="dashboard-separator">';
    html += '<div class="dashboard-charts-row">';
    html += buildBarChart('Coût par éditeur', costRows);
    html += buildBarChart('Conversations par éditeur', convRows, () => '#f59e0b');
    html += '</div>';

    dashboardContent.innerHTML = html;
}

function renderDashCategories(convs) {
    const cats = listCategories();
    const map = {};
    // Initialiser avec toutes les catégories existantes
    for (const cat of cats) {
        map[cat.id] = { nom: cat.nom, icone: cat.icone, couleur: cat.couleur, count: 0, tin: 0, tout: 0, cost: 0 };
    }
    map['_none'] = { nom: 'Non classées', icone: '—', couleur: '#888', count: 0, tin: 0, tout: 0, cost: 0 };

    for (const c of convs) {
        const key = c.category || '_none';
        if (!map[key]) { map[key] = { nom: key, icone: '?', couleur: '#888', count: 0, tin: 0, tout: 0, cost: 0 }; }
        map[key].count++;
        map[key].tin += c.tokens_entree;
        map[key].tout += c.tokens_sortie;
        map[key].cost += c.cout_estime_usd;
    }

    const rows = Object.entries(map).sort((a, b) => b[1].cost - a[1].cost);
    let html = '<table class="dashboard-table"><thead><tr><th>Catégorie</th><th class="num">Conv.</th><th class="num">Tokens entrée</th><th class="num">Tokens sortie</th><th class="num">Coût</th></tr></thead><tbody>';
    for (const [, d] of rows) {
        html += `<tr><td>${d.icone} ${d.nom}</td><td class="num">${d.count}</td><td class="num">${fmtTokens(d.tin)}</td><td class="num">${fmtTokens(d.tout)}</td><td class="num">${fmtCost(d.cost)}</td></tr>`;
    }
    html += '</tbody></table>';

    const costRows = rows.map(([, d]) => ({ label: d.icone + ' ' + d.nom, value: d.cost, formatted: fmtCost(d.cost), color: d.couleur }));
    const convRows = [...rows].sort((a, b) => b[1].count - a[1].count).map(([, d]) => ({ label: d.icone + ' ' + d.nom, value: d.count, formatted: String(d.count), color: d.couleur }));

    html += '<hr class="dashboard-separator">';
    html += '<div class="dashboard-charts-row">';
    html += buildBarChart('Coût par catégorie', costRows, (r) => r.color);
    html += buildBarChart('Conversations par catégorie', convRows, (r) => r.color);
    html += '</div>';

    dashboardContent.innerHTML = html;
}

// --- Bouton copier sur chaque bloc de code ---
function addCodeCopyButtons(container) {
    const pres = container.querySelectorAll('pre');
    for (const pre of pres) {
        if (pre.querySelector('.code-copy-btn')) continue;
        pre.style.position = 'relative';
        const btn = document.createElement('button');
        btn.className = 'code-copy-btn';
        btn.textContent = 'Copier';
        btn.addEventListener('click', () => {
            const code = pre.querySelector('code');
            const text = code ? code.textContent : pre.textContent;
            navigator.clipboard.writeText(text).then(() => {
                btn.textContent = 'Copié !';
                setTimeout(() => { btn.textContent = 'Copier'; }, 1500);
            });
        });
        pre.appendChild(btn);
    }
}

// --- Lightbox images ---
const lightboxOverlay = document.getElementById('lightbox-overlay');
const lightboxImg = document.getElementById('lightbox-img');
const lightboxClose = document.getElementById('lightbox-close');

function openLightbox(src) {
    lightboxImg.src = src;
    lightboxOverlay.style.display = 'flex';
}

function closeLightbox() {
    lightboxOverlay.style.display = 'none';
    lightboxImg.src = '';
}

if (lightboxOverlay) {
    lightboxOverlay.addEventListener('click', (e) => {
        if (e.target === lightboxOverlay) closeLightbox();
    });
    lightboxClose.addEventListener('click', closeLightbox);
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && lightboxOverlay.style.display !== 'none') closeLightbox();
    });
}

function attachLightboxToImg(imgEl) {
    imgEl.style.cursor = 'zoom-in';
    imgEl.addEventListener('click', () => openLightbox(imgEl.src));
}

// Focus initial
promptInput.focus();
