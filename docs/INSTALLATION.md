# Simulateur de création de meubles, cuisines et dressings

## Hébergement

1. Installer Node.js 24 sur le poste de compilation et exécuter npm ci puis npm run build.
2. Transférer le contenu de build/ dans la racine documentaire du domaine choisi, sur un hébergement PHP 8.1 ou supérieur avec OpenSSL. Pour l’archive prête à transférer, utiliser le contenu de site/.
3. Conserver les règles de réécriture .htaccess existantes, les propriétaires et les droits. Ne pas transférer les sources dans le dossier public.
4. Le dossier privé voisin .macuisine_catalog contient les dossiers et réglages. Le conserver lors des mises à jour. La racine documentaire doit être dédiée au simulateur.
5. Utiliser HTTPS et la clé administrateur habituelle sur /admin. Pour une nouvelle installation, créer .macuisine_catalog/admin.key hors de la racine publique avec une clé aléatoire longue (32 octets ou plus), lisible seulement par le compte qui exécute PHP. Le répertoire privé doit être en 0700 et les fichiers en 0600.

## Identité de l’entreprise

Dans « Identité de la société », renseigner le nom, le logo PNG/JPEG/WebP (2 Mio, 16 mégapixels maximum), les liens du logo et de la boutique, le téléphone, l’e-mail, le site web et la couleur principale. Les coordonnées sont facultatives et ne figurent dans les nouveaux documents et mails que si elles sont remplies. Les textes blancs exigent une couleur suffisamment foncée, contrôlée à l’enregistrement.

Le nom initial est « Mon entreprise » avec une icône neutre. Aucun domaine ni contact commercial n’est préconfiguré. Les réglages déjà enregistrés sont conservés lors d’une mise à jour. Les fichiers branding.json et les logos importés restent dans le stockage privé. Pour retrouver les anciennes coordonnées d’une installation, les renseigner dans ce formulaire avant les nouveaux envois.

La signature Rafik DAOUD, e-mail, GitHub et LinkedIn apparaît en bas de la plateforme. Le libellé suit la langue choisie.

## SMTP et dossiers clients

Renseigner les paramètres de votre boîte : serveur, port, chiffrement (SSL/TLS 465 ou STARTTLS 587 selon votre prestataire), identifiant, mot de passe, adresse et nom d’expéditeur, puis URL HTTPS publique du simulateur. Le mode sans chiffrement est réservé au serveur local. Les certificats sont vérifiés. Le mot de passe n’est pas renvoyé au navigateur ; laisser le champ vide conserve le précédent.

Enregistrer en laissant les confirmations désactivées, envoyer un mail de test vers votre propre adresse, vérifier sa réception et les indésirables, puis activer les confirmations et enregistrer à nouveau. Aucun mail réel n’est envoyé automatiquement pendant l’installation.

Le formulaire « Enregistrer et envoyer » fournit l’adresse du client. Le serveur conserve le dossier et tente l’envoi avec PDF, DXF, PNG et récapitulatif. Le lien privé ouvre une copie de la version transmise, y compris sur un nouvel appareil ; les modifications locales suivantes ne modifient pas cette version. Toute personne disposant du lien peut ouvrir cette copie. Les coordonnées du formulaire ne sont pas exposées par le lien.

Les pièces jointes sont limitées à 15 Mio avant encodage, le texte à 1 Mio. Limites : 10 demandes par heure et par IP, 3 par heure et par destinataire. Les dossiers restent visibles si le SMTP est désactivé ou en échec. Après correction, utiliser le renvoi dans l’administration. « Accepté par le serveur SMTP » ne garantit pas la boîte principale.

## Vérifications

Compilation de production, syntaxe PHP et 76 tests ciblés. Tests locaux de l’administration, des fichiers MIME, des liens privés et de l’affichage ordinateur/mobile, sans mail externe. Le contrôle global de types conserve 14 erreurs connues dans quatre anciens tests. PHPMailer est livré avec sa licence et sa provenance.
