# CSM Création — MaCuisine

Simulateur sur mesure CSM Taksit : cuisines, meubles et dressings, aperçu 2D/de face et 3D, finitions, portes et tiroirs ouvrants, et dossier client.

Site prévu : https://simulation.csmtaksit.dz

## Développement

Node.js 24 (voir .nvmrc), puis :

```sh
npm ci
npm run dev
npm run build
```

Le dossier build/ contient le site prêt à transférer sur un hébergement PHP. Le serveur de développement Vite seul n’exécute pas les API PHP.

## Hébergement et administration

Lire [le guide d’installation](docs/INSTALLATION-CSM.md). Le dossier privé .macuisine_catalog reste hors de la racine publique : dossiers clients, clé admin, réglages SMTP et identité de société. Aucun identifiant réel ni dossier client n’est inclus dans ce dépôt.

Dans /admin : nom de société, logo, liens du logo et de la boutique, configuration SMTP et dossiers reçus. Le SMTP doit être configuré, testé puis activé sur le serveur avant tout envoi client. « Enregistrer » seul reste local au navigateur ; « Enregistrer et envoyer » ouvre le formulaire client.

Le mail contient un lien privé vers une copie du projet transmis, PDF, DXF, PNG et récapitulatif texte avec dimensions en cm. Le site fonctionne en français, arabe et anglais. Les contacts par défaut sont 0553 553 553, contact@csmtaksit.dz et https://csmtaksit.dz.

## Vérification

76 tests unitaires ciblés passent ; compilation de production et parcours Chrome ordinateur/mobile vérifiés. Les API PHP et l’envoi MIME ont été testés avec PHP 8.4 et un faux SMTP local, sans mail externe. Le contrôle global npm run check signale encore 14 erreurs connues dans quatre anciens fichiers de tests (mocks PDF et anciens champs price), sans erreur dans le code applicatif au dernier contrôle. Le workflow GitHub exécute la compilation, la syntaxe PHP et les 76 tests ciblés.

Les scripts historiques de migration et les environnements de validation locaux ne sont pas publiés. Les tests unitaires, sources de l’application et ressources nécessaires à la compilation sont inclus.

## Origine et licences

Adaptation d’[OpenPlan3D / open3dFloorplan](https://github.com/theLodgeBots/open3dFloorplan). La licence MIT d’origine est conservée dans LICENSE ; documentation initiale : README.upstream.md. Sources des modèles : MODEL_SOURCES.md. PHPMailer 7.2.0 est inclus sous LGPL 2.1 avec licence et provenance dans static/api/vendor/PHPMailer/.
