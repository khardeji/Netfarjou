# Amis et appels privés Netfarjou

## Ce qui sera ajouté
- Une page **Mon profil et amis**, accessible depuis le compte, avec un identifiant unique à copier. Les comptes existants recevront aussi leur identifiant.
- Un bouton **Ajouter un ami** : saisir son identifiant, envoyer une demande, puis accepter ou refuser. L’administrateur peut être ajouté comme n’importe quel utilisateur ; cela ne donne aucun droit d’administration.
- Une liste d’amis avec appel individuel ou sélection de plusieurs amis pour un appel de groupe.
- Une invitation d’appel avec **Accepter** et **Refuser**. Le microphone ne s’active qu’après acceptation et autorisation du navigateur.
- Des commandes pour couper le microphone, quitter l’appel et voir les participants. L’appel reste actif lorsqu’on ouvre une autre page ou une salle de cinéma.
- Le partage d’une séance dans l’appel : chaque ami peut ouvrir le même film, en respectant les inscriptions et horaires existants. Le film reste synchronisé ; les conversations vocales restent séparées du chat public.
- Les nouveaux textes en français, anglais et arabe tunisien.

## Confidentialité
Seuls les amis invités et ayant accepté peuvent participer et s’entendre. Aucun autre spectateur ne reçoit le son de l’appel. Aucun enregistrement audio ne sera ajouté. Les demandes d’amitié nécessitent une acceptation pour éviter les appels non sollicités.

## Point à prévoir pour les appels
Les appels doivent disposer d’un service de relais audio pour fonctionner également entre téléphones et réseaux différents. S’il nécessite une activation, des identifiants ou des frais, cette étape sera présentée séparément ; aucune souscription payante ne sera lancée sans accord. La fonctionnalité ne sera pas annoncée comme entièrement vérifiée avant un véritable test entre plusieurs comptes.

## Détails techniques
- Étendre les profils avec un identifiant public unique ; ne pas rendre les adresses e-mail ni tous les profils accessibles.
- Stocker demandes d’amitié, invitations et participants d’appel avec autorisations contrôlées côté base et serveur. Réserver la recherche au seul identifiant saisi.
- Utiliser des fonctions authentifiées pour les opérations privées et un fournisseur WebRTC avec relais pour le transport audio. Vérifier l’appartenance à l’appel avant de délivrer tout accès audio.
- Monter la gestion de l’appel au niveau partagé de l’application afin de préserver la connexion pendant les changements de page ; arrêter les pistes audio à la sortie ou à la déconnexion.
- Ajouter des tests concrets pour l’amitié réciproque, les invitations, le refus d’accès aux non-participants et le respect des conditions d’entrée au film, puis vérifier les parcours connectés sur ordinateur et téléphone.