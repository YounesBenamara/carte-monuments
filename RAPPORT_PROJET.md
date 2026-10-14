# Ma Carte des Monuments — Bilan fonctionnel personnel

## Ce que tu peux déjà faire

L’application sert de carnet de visites culturelles sur une carte. Tu peux chercher un lieu par son nom ou son adresse, ou choisir directement une position sur la carte avec un clic droit.

Chaque lieu peut contenir un nom, une catégorie, un mois de visite, un souvenir écrit et une photo. Tu peux ensuite consulter sa fiche, la modifier ou la supprimer. La liste à gauche permet de retrouver un lieu et de centrer la carte dessus. Les filtres distinguent musées, monuments, sites historiques et autres lieux ; le compteur indique le nombre total de lieux enregistrés.

La carte s’ouvre sur la France, mais tu peux te déplacer ailleurs dans le monde. Les fiches et les photos restent sur ton ordinateur.

## Les fonctionnalités qui apporteraient le plus pour ton usage

| Priorité | Fonction à ajouter | À quoi elle te servirait |
| --- | --- | --- |
| 1 | Statuts « À visiter » et « Visité » | Garder tes idées de sorties sur la même carte que tes souvenirs, avec des marqueurs différents. |
| 2 | Recherche dans tes propres lieux et tri par date ou nom | Retrouver une visite déjà enregistrée sans passer par la recherche d’adresses. |
| 3 | Plusieurs photos par lieu | Conserver un petit album plutôt qu’une seule image. |
| 4 | Plusieurs visites du même lieu | Noter chaque retour dans un musée avec sa date, son exposition et ses souvenirs. |
| 5 | Regroupement par voyage ou séjour | Revoir, par exemple, tous les lieux d’un week-end à Rome ou d’un voyage au Japon. |
| 6 | Favoris et appréciation personnelle | Identifier les lieux que tu as préférés ou ceux où tu aimerais retourner. |
| 7 | Bilan de tes visites | Voir tes visites par année, par catégorie ou par pays, et parcourir une chronologie. |
| 8 | Vue de toute ta collection | Afficher tous tes lieux d’un clic et regrouper les marqueurs lorsqu’ils sont trop proches. |

Les fonctionnalités « À visiter / Visité », plusieurs photos et regroupement par voyage me semblent les plus intéressantes pour faire évoluer le projet vers un véritable carnet personnel. La recherche dans tes propres lieux devient surtout utile lorsque ta collection grandit.

## Quelques ajustements au quotidien

- Préremplir correctement les anciennes dates : la date « mai 2026 » du lieu actuel apparaît vide dans son formulaire de modification.
- Permettre une date précise ou simplement un mois, selon ce dont tu te souviens.
- Afficher « Aucun lieu dans cette catégorie » lorsqu’un filtre ne donne aucun résultat.
- Montrer combien de lieux correspondent au filtre sélectionné.
- Faciliter l’ajout par un appui sur la carte et rendre les boutons de modification visibles sur téléphone.

## Comment y accéder

Sur cet ordinateur, lorsque l’application est lancée, ouvre http://localhost:3000 dans ton navigateur.

Pour la relancer plus tard, ouvre un terminal dans le dossier du projet et saisis :

```powershell
npm start
```

Garde ce terminal ouvert pendant l’utilisation. L’application utilise Internet pour afficher le fond de carte et rechercher des lieux.

## Ce qui a été vérifié

L’application a été ouverte dans le navigateur. L’affichage de la carte, du lieu existant, des filtres et du formulaire de modification a été vérifié. Aucun lieu enregistré n’a été modifié pendant cette analyse. Les fonctionnalités proposées ci-dessus sont des évolutions à ajouter.
