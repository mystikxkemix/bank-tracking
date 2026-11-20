# Déploiement

L'app est une image Docker (API + front dans un seul conteneur). Elle s'installe sur ZimaOS
depuis le store perso [zimaos-appstore](https://github.com/mystikxkemix/zimaos-appstore).

## Comment une version arrive sur ZimaOS
1. Push sur `main` : la CI (`.github/workflows/ci.yml`) lance `npm run check`.
2. Si tout passe, elle publie `ghcr.io/mystikxkemix/bank-tracking` avec les tags `1.N`
   (N = nombre de commits sur `main`), `latest` et `sha-<commit>`.
3. Le workflow "Publish store" du store (toutes les heures) voit le nouveau tag `1.N`,
   met à jour `Apps/bank-tracking/docker-compose.yml` (image et version `1.N.0`) et republie le store.
4. ZimaOS propose la mise à jour de l'app.

Le package ghcr.io doit rester public : ZimaOS et le store le lisent sans login.

## Configuration
Les variables sont dans `Apps/bank-tracking/docker-compose.yml` du store, et modifiables dans ZimaOS
(réglages de l'app) :

| Variable | Rôle |
|---|---|
| `MONGODB_URI` | MongoDB à utiliser (l'app n'embarque pas de Mongo) |
| `MONGODB_DB` | base de prod, distincte de la base de dev |
| `SESSION_TTL_DAYS` | durée des sessions en jours (30 par défaut) |
| `HTTPS` | `true` seulement si l'app est servie en HTTPS (cookie sécurisé, HSTS) |

Le conteneur écoute sur 8080 ; le store le publie sur le port 8095 de l'hôte.

## Première installation
1. ZimaOS : App Store → **+** → ajouter la source `https://mystikxkemix.github.io/zimaos-appstore`.
2. Installer **Bank tracking**.
3. Ouvrir `http://<machine>:8095` : le premier écran crée le compte administrateur.

Les index Mongo sont créés au démarrage, aucune migration manuelle.

## Tester l'image en local
```sh
docker build -t bank-tracking:local .
docker run -d --rm --name bt-test-mongo -p 127.0.0.1:27019:27017 mongo:8.0
docker run --rm -p 127.0.0.1:8095:8080 \
  -e MONGODB_URI=mongodb://host.docker.internal:27019 -e MONGODB_DB=bank-tracking-smoke \
  bank-tracking:local
```
Puis ouvrir `http://localhost:8095`. Le conteneur doit passer `healthy` (`/api/health`).
