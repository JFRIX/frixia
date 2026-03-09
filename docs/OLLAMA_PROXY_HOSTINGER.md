# Configuration reverse-proxy Ollama sur Hostinger

Ce guide permet d’exposer Ollama via le même domaine que Frixia (chemin `/ollama`) pour éviter les erreurs navigateur de type CORS / mixed-content.

---

## 1) Réglages Frixia

Dans **Configuration > Ollama** :

- Activer Ollama ✅
- Cocher **Utiliser un chemin proxy local** ✅
- Chemin proxy : `/ollama`
- Modèle : `qwen2.5:3b` (ou votre modèle)
- URL serveur Ollama : peut rester vide si le mode proxy est actif

Vous pouvez aussi les mettre dans `config/ollama.config.json` :

```json
{
  "enabled": true,
  "baseUrl": "",
  "useProxy": true,
  "proxyPath": "/ollama",
  "model": "qwen2.5:3b",
  "keepAlive": "5m"
}
```

---

## 2) Nginx (Hostinger VPS)

> Pré-requis : Ollama écoute sur `127.0.0.1:11434` (ou IP privée interne).

Ajoutez ce bloc dans le `server { ... }` de votre domaine (HTTPS) :

```nginx
location /ollama/ {
    proxy_pass http://127.0.0.1:11434/;
    proxy_http_version 1.1;

    # En-têtes proxy standards
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;

    # Important pour le streaming (SSE/chunked)
    proxy_buffering off;
    proxy_request_buffering off;
    chunked_transfer_encoding on;
    proxy_read_timeout 3600s;
    proxy_send_timeout 3600s;
}
```

Puis :

```bash
sudo nginx -t && sudo systemctl reload nginx
```

### Vérification

```bash
curl -i https://VOTRE-DOMAINE/ollama/api/tags
```

Vous devez obtenir `HTTP/1.1 200` (ou `401/403` si vous avez volontairement mis une auth en amont).

---

## 3) Apache (Hostinger VPS)

Activez les modules nécessaires :

```bash
sudo a2enmod proxy proxy_http headers rewrite
sudo systemctl reload apache2
```

Dans votre vhost HTTPS (`<VirtualHost *:443> ...`), ajoutez :

```apache
ProxyPreserveHost On
SSLProxyEngine On

# Reverse proxy Ollama sur /ollama
ProxyPass        /ollama/  http://127.0.0.1:11434/
ProxyPassReverse /ollama/  http://127.0.0.1:11434/

# Désactiver le buffering pour mieux supporter le stream
SetEnv proxy-sendchunked 1
RequestHeader set X-Forwarded-Proto "https"
RequestHeader set X-Forwarded-Port "443"
```

Puis :

```bash
sudo apachectl configtest && sudo systemctl reload apache2
```

### Vérification

```bash
curl -i https://VOTRE-DOMAINE/ollama/api/tags
```

---

## 4) Checklist en cas d’erreur 403/Failed to fetch

1. Vérifier qu’Ollama répond localement :
   ```bash
   curl -i http://127.0.0.1:11434/api/tags
   ```
2. Vérifier le proxy domaine :
   ```bash
   curl -i https://VOTRE-DOMAINE/ollama/api/tags
   ```
3. Vérifier le modèle présent :
   ```bash
   curl -s https://VOTRE-DOMAINE/ollama/api/tags | jq '.models[].name'
   ```
4. Vérifier que Frixia utilise bien `useProxy=true` et `proxyPath=/ollama`.
5. Si un WAF/CDN est actif, autoriser le chemin `/ollama/*`.

---

## 5) Variante si Ollama est sur une autre machine

Remplacez `127.0.0.1:11434` par l’IP privée du serveur Ollama (ex: `10.0.0.12:11434`) dans `proxy_pass` / `ProxyPass`, et ouvrez uniquement le flux réseau interne nécessaire.

