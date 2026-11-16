# Simulateur de création de meubles, cuisines et dressings

Plateforme de conception sur mesure : configurations précomposées, vue de face et 3D, ouverture des portes et tiroirs, finitions, export PDF/DXF/PNG et transmission des dossiers clients.

## Personnalisation

Aucune marque commerciale ni coordonnée d’entreprise n’est imposée. Dans /admin, configurer : nom de société, logo, couleur principale, téléphone, e-mail de contact, site web, lien du logo et lien de la boutique. Les coordonnées vides sont omises des documents et e-mails. Le SMTP et l’adresse HTTPS publique du simulateur sont réglables séparément. Les réglages restent privés sur votre serveur et ne sont pas enregistrés dans GitHub.

Le pied de page conserve la signature de création de Rafik DAOUD. Français, arabe (RTL) et anglais sont disponibles.

## Installation et développement

Node.js 24 (voir .nvmrc), puis :

```sh
npm ci
npm run dev
npm run build
```

Le dossier build/ contient le site à transférer sur un hébergement PHP. Vite seul n’exécute pas les API PHP. Lire [le guide d’installation](docs/INSTALLATION.md).

Les dossiers clients, la clé admin, le SMTP et l’identité de l’entreprise restent dans .macuisine_catalog, hors de la racine publique. Ce nom technique historique et les identifiants internes des modèles sont conservés pour la compatibilité des projets enregistrés. Aucune donnée client ni aucun secret SMTP n’est publié.

## Enregistrement et mail client

« Enregistrer » seul conserve le projet dans le navigateur. « Enregistrer et envoyer » ouvre un formulaire et transmet le dossier à l’administration. Après configuration et activation du SMTP, le client reçoit un lien privé vers une copie modifiable de la version envoyée, ainsi que PDF, DXF, PNG et récapitulatif avec éléments et dimensions en cm. Un échec du mail ne supprime pas le dossier ; le renvoi est accessible à l’administrateur.

## Vérification

76 tests unitaires ciblés, compilation de production, syntaxe PHP et parcours Chrome ordinateur/mobile vérifiés. L’envoi a été testé avec PHP 8.4 et un SMTP local, sans mail externe. Le contrôle global npm run check conserve 14 erreurs connues dans quatre anciens fichiers de tests (mocks PDF et anciens champs price) ; ce point est distinct du workflow ciblé. Les scripts historiques de migration et les environnements de validation locaux ne sont pas publiés.

## Création de la plateforme

Plateforme créée par **Rafik DAOUD** — [rafikdaoud@gmail.com](mailto:rafikdaoud@gmail.com) · [GitHub](https://github.com/rafikdaoud-cpu) · [LinkedIn](https://www.linkedin.com/in/rafik-daoud/).

## Origine et licences

Adaptation d’[OpenPlan3D / open3dFloorplan](https://github.com/theLodgeBots/open3dFloorplan). Licence MIT d’origine conservée dans LICENSE ; documentation initiale : README.upstream.md. Sources des modèles : MODEL_SOURCES.md. PHPMailer 7.2.0 est inclus sous LGPL 2.1 avec licence et provenance dans static/api/vendor/PHPMailer/.
