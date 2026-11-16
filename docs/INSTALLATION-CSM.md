# CSM Création — identité de société, mails clients et menu lisible

Version complète du 16 novembre 2026, préparée et testée localement. Aucune publication ni configuration SMTP réelle effectuée sur le VPS.

## Ce qui change

- Menu principal agrandi : boutons de 44 px minimum, textes plus grands, retour à la ligne pour les actions et contrôle sur téléphone.
- Après « Enregistrer et envoyer », puis validation du formulaire, le dossier est conservé dans l’administration et un e-mail de remerciement est envoyé au client si le SMTP est activé.
- Le mail contient le lien privé du projet et quatre pièces jointes : PDF, DXF, PNG avec aperçu et dimensions, récapitulatif texte. Le PDF ajoute les éléments, dimensions et finitions. Le PNG limite les très longues listes et renvoie au PDF et au texte pour la suite.
- Coordonnées intégrées : 0553 553 553, contact@csmtaksit.dz et https://csmtaksit.dz.
- Le lien ouvre une copie modifiable de la version transmise, y compris sur un autre appareil. Les modifications ultérieures dans le navigateur ne changent pas cette version du serveur. Toute personne à qui le client transmet ce lien peut ouvrir le projet ; les coordonnées du formulaire ne sont pas retournées par ce lien.
- L’administration affiche le statut du mail. En cas d’échec ou de SMTP désactivé, le dossier reste enregistré et un bouton permet d’envoyer le mail après correction de la configuration. Un mail déjà accepté n’est pas automatiquement envoyé une deuxième fois.
- Toutes les modifications précédentes sont incluses : FR/AR/EN, mesures en cm, menu gauche retiré, meubles/cuisines/dressings précomposés, îlot indépendant, aperçu, finitions, ouverture des portes et rendu 3D amélioré.

## Installer avec WinSCP

1. Extraire cette archive.
2. Transférer TOUT LE CONTENU de site/ dans /home/csmtak11/macuisine.csmtaksit.dz/ et accepter les remplacements. Ce dossier peut rester associé à simulation.csmtaksit.dz.
3. Conserver le .htaccess, le propriétaire csmtak11, les droits existants et le dossier privé voisin .macuisine_catalog. Ne pas publier correctif-sources/ ni les outils de test.
4. Recharger le site avec Ctrl+F5. Le dossier api/vendor/PHPMailer doit également être transféré : il contient la bibliothèque d’envoi et sa licence.
5. Le serveur doit exécuter PHP avec l’extension OpenSSL pour le SMTP chiffré. Aucun Composer ni package Node à installer sur le VPS.

## Personnaliser la société

Dans l’administration, ouvrir « Identité de la société ». Modifier le nom, importer un logo PNG/JPEG/WebP (2 Mio maximum) et saisir les deux liens : clic sur le logo et bouton boutique. Enregistrer l’identité. Ces réglages sont partagés avec tous les visiteurs ; le nom figure aussi sur les nouveaux dossiers PDF/PNG et les mails clients. Le nom d’expéditeur SMTP reste réglable séparément dans la section SMTP.

Les fichiers branding.json et logo sont conservés dans le dossier privé .macuisine_catalog. Les modifications de l’identité ne changent ni le domaine ni les coordonnées de contact.

## Configurer le SMTP dans l’administration

Ouvrir https://simulation.csmtaksit.dz/admin/ et utiliser la clé administrateur habituelle.

Dans « Configuration SMTP » :

- Serveur et port : utiliser les paramètres indiqués par cPanel pour votre boîte mail ; généralement SSL/TLS sur 465 ou STARTTLS sur 587, selon l’hébergeur.
- Identifiant : généralement l’adresse complète de la boîte.
- Mot de passe : celui de la boîte mail. Le laisser vide lors d’une modification conserve celui déjà enregistré.
- Adresse d’expédition : contact@csmtaksit.dz si cette adresse est autorisée par le serveur choisi. Le nom proposé est CSM Taksit.
- Adresse HTTPS du simulateur : https://simulation.csmtaksit.dz ; elle sert à construire les liens envoyés aux clients.

Laisser l’envoi client désactivé au début, enregistrer la configuration, puis cliquer « Envoyer un mail de test » vers votre propre adresse. Vérifier la réception, y compris dans les indésirables. Après réception, cocher « Activer les e-mails de confirmation aux clients » et enregistrer à nouveau.

Les identifiants sont conservés dans /home/csmtak11/.macuisine_catalog/smtp.json, hors du dossier public, avec des droits privés. Aucun identifiant réel n’est inclus dans cette archive. Les certificats TLS/SSL sont vérifiés ; le mode sans chiffrement est limité à un serveur local.

L’enregistrement simple et l’enregistrement automatique restent locaux au navigateur : ils ne déclenchent pas de mail. Le mail part après le formulaire « Enregistrer et envoyer », qui fournit l’adresse du client et son accord.

## Réception et erreurs

« Accepté par le serveur SMTP » signifie que le serveur a accepté le message, sans garantir son arrivée en boîte principale. Vérifier l’adresse, les indésirables et les réglages d’expédition/DNS auprès de l’hébergeur si nécessaire.

Les pièces jointes sont limitées à 15 Mio avant encodage du mail. Un récapitulatif texte supérieur à 1 Mio est refusé. Les formulaires sont limités à 10 demandes par heure et par IP, et 3 par heure et par adresse destinataire. Les dossiers trop lourds ou un SMTP en échec restent visibles dans l’administration ; un renvoi ne réduit pas automatiquement leur taille.

Les anciens dossiers peuvent ne pas contenir de PNG ou de projet modifiable : ces fichiers sont nécessaires pour la nouvelle confirmation complète. Aucun ancien client n’est contacté automatiquement lors de l’installation.

## Contrôles réalisés

- 76 tests unitaires ciblés : conception, dimensions, langues, finitions, modèles, rendu et contenu des dossiers.
- PHP natif 8.4 et serveur SMTP de test local : authentification admin, configuration, mot de passe masqué et conservé, envoi MIME avec quatre pièces jointes, lien privé, mauvais jeton refusé, absence de coordonnées dans la réponse de partage, échec conservé et renvoi, SMTP désactivé et limites des formulaires.
- Identité : accès admin requis pour les changements, liens dangereux et faux fichiers image refusés ; nom, logo et liens conservés côté serveur.
- Chrome : écran SMTP et test, menu ordinateur/téléphone, génération réelle PDF/DXF/PNG, réception par le SMTP local, puis réouverture du projet dans un contexte navigateur neuf.
- Compilation de production réussie. Le contrôle global des types conserve 14 erreurs préexistantes dans quatre anciens fichiers de tests ; aucune erreur applicative au dernier contrôle.
- Aucun e-mail externe envoyé pendant ces tests. Le test final sur votre hébergement reste à effectuer après configuration de vos identifiants.

La bibliothèque PHPMailer 7.2.0 est incluse sous licence LGPL 2.1 ; sa licence, ses sources utilisées et le manifeste de provenance se trouvent dans api/vendor/PHPMailer/.

site/ contient le site compilé complet. correctif-sources/ contient seulement les fichiers modifiés/ajoutés comparés à la copie source locale du 26 octobre. fichiers-modifies.json contient les empreintes. Le bouton de l’eshop reste à intégrer séparément.
