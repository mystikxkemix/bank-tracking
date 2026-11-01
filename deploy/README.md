# Déploiement

Ce zip contient tout ce qu'il faut pour faire tourner l'app dans un conteneur Docker, sur la même machine que le conteneur MongoDB.

## Contenu
- `server.cjs` : API + service du front, en un seul fichier (Node 22, aucune dépendance à installer).
- `public/` : front React buildé.
- `Dockerfile`, `docker-compose.yml`, `.env.example`.

## Première installation
1. Dézipper dans un dossier dédié, par exemple `~/apps/bank-tracking`.
2. `cp .env.example .env` puis renseigner `MONGODB_URI` (identifiants du Mongo) et `MONGODB_DB` (une base distincte de celle de dev).
3. `docker compose up -d --build`
4. Ouvrir `http://<machine>:8080` : le premier écran crée le compte administrateur.

## Mise à jour
Dézipper la nouvelle version par-dessus (le `.env` est conservé, il n'est pas dans le zip) puis `docker compose up -d --build`.
Les index Mongo sont créés au démarrage, aucune migration manuelle.

## Variante réseau Docker
Si le port de Mongo n'est pas publié sur l'hôte, rattacher le conteneur au réseau de Mongo et utiliser son nom :
`MONGODB_URI=mongodb://<user>:<password>@<nom-du-conteneur-mongo>:27017/?authSource=admin`, puis ajouter dans `docker-compose.yml` :

```yaml
    networks: [mongo]
networks:
  mongo:
    external: true
    name: <réseau-du-mongo>
```

## Vérifier
- `docker compose ps` : le conteneur doit être `healthy`.
- `docker compose logs -f` : `[api] listening on ...` et le nom de la base.
