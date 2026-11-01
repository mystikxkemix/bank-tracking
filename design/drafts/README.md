# Pistes de design : suivi de budget

Ouvrir `index.html` dans un navigateur (fichier autonome, CSS et JS inline, aucune dépendance externe). Onglets en haut pour passer d'une direction à l'autre, bouton « Thème » pour forcer clair ou sombre (par défaut : préférence système).

Chaque direction contient : accueil desktop (1280 px), transactions, budgets + épargne + objectifs, répartition du foyer, mobile (390 px), sélecteur d'espace et état lecteur. Toutes les maquettes utilisent les mêmes données fictives (espace « Foyer », octobre 2026) pour être comparables.

## Les trois directions

| | 1 · Vue d'ensemble | 2 · Budget d'abord | 3 · Revue |
|---|---|---|---|
| Question d'accueil | Comment se passe le mois ? | Combien puis-je encore dépenser, et où ? | Qu'est-ce qui reste à traiter ? |
| Écran d'accueil | Dashboard : KPI, donut, 12 mois, budgets, objectifs | Table des budgets groupée par état (dépassé, presque épuisé, disponible) | File de l'import à revoir, au clavier |
| Inspirations | Bankin', Linxo, Finary, Monarch | YNAB, Actual Budget, Monarch | Copilot Money, Lunch Money, Firefly III (+ ⌘K façon Linear) |
| Répartition du foyer | Cartes résultat en tête + éditeur en deux colonnes | Le tableur : une colonne par personne (proche de l'Excel actuel) | Grille éditable + calcul détaillé + boutons « copier » |
| Profil idéal | Foyer avec lecteurs, usage mensuel | Foyer qui veut se discipliner | L'admin qui importe pour tout le monde |
| Rôle lecteur | Excellent | Bon | Faible (l'accueil n'a plus d'objet) |
| Mobile | Naturel | Très utile au quotidien | Limité à la revue en cartes |
| Vitesse de catégorisation | Moyenne | Moyenne (impact visible) | Maximale |
| Effort Radix Themes | Moyen | Bas à moyen | Moyen à élevé |
| Accent Radix | indigo | teal | violet |

## Recommandation : un mélange

**La 1 comme socle, la 2 pour les budgets et la répartition, la file de la 3 après chaque import.**

Pourquoi : les imports CSV arrivent une ou deux fois par mois, la revue est donc un *moment* et pas un écran d'accueil. En revanche, les membres du foyer (dont les lecteurs) ouvrent l'app pour *voir* où en est le mois, et les budgets doivent rester actionnables.

1. **Coque et accueil de la direction 1** : sidebar, sélecteur d'espace en haut, KPI, donut, tendance 12 mois. Un callout « X à catégoriser » mène à la file.
2. **Page Budgets de la direction 2** : « Reste à dépenser », groupes par état, repère du jour sur chaque barre, plafond éditable en ligne, copie du mois précédent.
3. **File « À revoir » de la direction 3**, ouverte automatiquement à la fin de l'assistant d'import, avec règle pré-remplie depuis le libellé et « Annuler l'import ».
4. **Répartition du foyer façon direction 2** (tableur, une colonne par personne, transition douce depuis l'Excel), avec les cartes résultat de la direction 1 en tête et les boutons « copier le montant » de la direction 3.
5. **Plus tard** : raccourcis J/K, 1 à 9 et palette ⌘K de la direction 3, ajoutés sans changer la mise en page.

Effort du mélange : **moyen**. V1 sans raccourcis clavier ; V2 avec raccourcis et ⌘K.

## Notes d'implémentation (Radix Themes)

- Tout est faisable avec les composants Radix Themes : Card, Table, Badge, Progress, Tabs, SegmentedControl, DropdownMenu, Select, Dialog, Popover, TextField, Callout, DataList, Checkbox, Kbd.
- Pas de Combobox dans Radix Themes : le sélecteur de catégorie avec recherche se fait avec Popover + TextField + liste filtrée (ou `cmdk`).
- Graphiques : Recharts (déjà dans `apps/web`) pour le donut, les barres 12 mois et l'aire du taux d'épargne.
- Repère « aujourd'hui » sur les barres de budget : un trait positionné en absolu au-dessus de `Progress`.
- Répartition : arrondir les contributions au centime et attribuer le reste d'arrondi à la dernière personne pour que la somme tombe juste.
- Les suggestions de catégorie « d'après l'historique » (direction 3) sont hors périmètre initial : commencer par les règles « libellé contient X ».
