# Décision de design (2026-11-01)

Choix du propriétaire : **le mélange recommandé, page par page**. Référence visuelle : `design/drafts/index.html` (onglets 1, 2, 3).
Ce fichier fait foi pour les agents : en cas de doute, ouvrir la maquette correspondante et s'en rapprocher avec les composants Radix Themes.

| Page / zone | Direction | Ce qu'on reprend |
|---|---|---|
| Coque (sidebar, sélecteur d'espace, menu utilisateur, mobile) | 1 Vue d'ensemble | Sidebar actuelle (`AppLayout`), accent **indigo**, gris slate |
| Tableau de bord (accueil d'un espace) | 1 | KPI (Revenus, Dépenses, Épargne + taux), donut des dépenses par catégorie, tendance 12 mois, budgets proches de la limite, objectifs, callout « X transactions à catégoriser » qui mène à la file de revue |
| Transactions | 1 (liste) + 3 (densité) | Liste groupée par jour, filtres en URL, changement de catégorie en ligne (Popover + recherche), sélection multiple + catégoriser en lot |
| File « À revoir » | 3 Revue | Ouverte automatiquement à la fin de l'import (et via le callout du tableau de bord) : transactions non catégorisées de l'import, une ligne active, catégorie en un clic, « Créer une règle » pré-remplie depuis le libellé, bandeau avec compteurs et « Annuler l'import ». Route `/s/:spaceId/review?importId=...` (sans importId : toutes les non catégorisées) |
| Import | 3 (bandeau) + assistant | Assistant en étapes (Fichier, Correspondance pour CSV, Aperçu), résultat puis redirection vers la file À revoir |
| Budgets | 2 Budget d'abord | « Reste à dépenser » en tête, lignes groupées Dépassé / Presque épuisé / Disponible, repère du jour sur chaque barre, plafond éditable en ligne. Pas de « copier le mois précédent » : le plafond est le même chaque mois dans le modèle actuel |
| Objectifs | 1 | Grille de cartes avec progression, dialog de détail avec versements |
| Répartition du foyer | 2 (tableur) + cartes résultat de 1 + boutons « copier » de 3 | Cartes « À garder sur le commun » et « À virer à X » en tête avec bouton copier le montant, puis tableur : lignes de charges / épargne avec fréquence et équivalent mensuel, une colonne par personne pour les revenus et contributions, total des parts contrôlé en direct, historique des mois |
| Réglages, partage, profil, admin | 1 | Cartes sobres, tables Radix, dialogs |

Hors périmètre V1 : raccourcis clavier J/K et 1 à 9, palette ⌘K, suggestions de catégorie « d'après l'historique ».
