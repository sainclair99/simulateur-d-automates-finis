# Simulateur d'automates (Electron + TypeScript)

## Commandes
- `npm install`
- `npm run dev` : serveur Vite + Electron (rechargement à chaud de l'interface)
- `npm test` : tests unitaires + test d'architecture
- `npm run typecheck` : vérification TypeScript (main/core/application + renderer)
- `npm start` : build complet puis lancement de l'application

## Architecture (règle de dépendance : tout pointe vers `core`)
renderer → application → core ← infrastructure ; main/preload = adaptateurs Electron
(le renderer n'importe jamais `core` directement : test d'architecture)

- `core/`            domaine pur (aucune dépendance externe) : modèle, regex, algorithmes
- `application/`     cas d'usage et ports (interfaces)
- `infrastructure/`  adaptateurs (fichiers JSON, IPC)
- `main/`, `preload/` processus Electron (contextIsolation activé, nodeIntegration désactivé)
- `renderer/`        interface (étapes : Définition → Construction → Simulation)

## Syntaxe des expressions régulières
Union `|`, concaténation, étoile `*`, `+` (x x*), `?` (x | ε), parenthèses, `ε` (mot vide).
Les symboles doivent appartenir à l'alphabet défini par l'utilisateur.

## Modèle du domaine (core)
- `LanguageDefinition` : résultat de l'étape 1 (regex + alphabet + états), toujours valide.
- `Automaton` : **immuable** ; `withTransition` / `withoutTransition` renvoient une nouvelle instance
  (annuler/rétablir = simple pile d'instances). Le non-déterminisme est permis mais signalé.
- `diagnose(automaton)` : aide à la construction (états inaccessibles, non-déterminisme, transitions manquantes).
- Toute violation de règle lève une `DomainError` avec un `code` exploitable par l'UI.
- Les fichiers `*.fixture.ts` sont réservés aux tests (exclus du build).

## Simulation
- `simulate(automaton, word)` (core) : fonction pure → trace pas à pas + verdict.
  Accepté ⇔ mot lu en entier ET au moins un état courant final. Sinon rejeté, avec la raison
  (`NOT_IN_FINAL_STATE`, `NO_TRANSITION`, `SYMBOL_NOT_IN_ALPHABET`). Gère le non-déterminisme (ensemble d'états).
- `runWord(automaton, word)` (application) : cas d'usage → `SimulationPlayback`, curseur immuable
  (`next`, `previous`, `toStart`, `toEnd`) et `visualOf(état)` ∈ idle | active | accepted (vert) | rejected (rouge).
  Le verdict n'est exposé qu'à la fin de la lecture.

## Écran « Définition » (étape 1)
- `DefinitionDraft` (application) : brouillon immuable du formulaire (alphabet, regex, états).
- `validateDefinitionDraft` : répartit les erreurs par zone (alphabet, regex avec position, noms d'états, règles globales)
  ou produit la `LanguageDefinition`. Les règles restent dans `core`.
- `renderer/steps/DefinitionStep` + `AlphabetField`, `RegexField`, `StatesEditor` : composants sans logique métier.

## Écran « Construction » (étape 2)
- `ConstructionState` (application) : automate + positions + flèches encore vides. Immuable.
  Une flèche sans symbole n'est pas une transition : elle sert de cible pour y déposer des symboles.
- `ConstructionHistory` : annuler / rétablir (Ctrl+Z, Ctrl+Y). Un déplacement n'est enregistré qu'au relâchement.
- Gestes : états glissés de la palette vers le canevas ; symboles glissés sur une flèche (ou sur un état = boucle) ;
  liaison tirée depuis le point ● d'un état. Équivalents au clavier dans le panneau « Liaison ».
- `renderer/canvas/AutomatonCanvas` : SVG générique (lecture seule sans callbacks), réutilisé pour la simulation
  via `visualOf` (idle / active / accepted / rejected).
- `renderer/canvas/geometry.ts` : calcul pur des flèches (droites, courbes si flèche inverse, boucles), testé.

## Dépannage : écran blanc
- F12 (ou Ctrl+Maj+I) ouvre la console ; en `npm run dev` elle s'ouvre toute seule.
- Les erreurs du renderer sont aussi recopiées dans le terminal (préfixe `[renderer]`).
- Un composant qui plante affiche son erreur (écran « Une erreur est survenue ») ;
  si le texte « Chargement de l'application… » reste affiché, le script de l'interface ne s'est pas exécuté.
- Vérifier d'abord : `npm run build` termine sans erreur, puis `npm start` (version construite) ;
  pour `npm run dev`, le terminal doit montrer Vite sur http://localhost:5173.
- Erreur « Invalid or unexpected token » sur un fichier de `node_modules/.vite` alors que le même
  `http://localhost:5173` s'ouvre dans Chrome : cache d'Electron périmé. `npm run dev` le vide désormais ;
  sinon View → Force Reload (Ctrl+Maj+R), ou supprimer `%APPDATA%\automata-simulator\Cache`.

## Écran « Simulation » (étape 3)
- `runWord` → `SimulationPlayback` (curseur immuable) ; `tape` (ruban), `goTo`, `visualOf`.
- `describeVerdict` / `describeStep` (application) : textes en français ; le verdict n'existe qu'à la fin de la lecture.
- Couleurs : état d'arrêt **vert** si le mot est accepté, **rouge** sinon (toujours doublé d'un texte ✓ / ✗).
- Lecture automatique (vitesse réglable), pas à pas, accès direct par la trace, flèches ← → au clavier.

## Vérification : automate ↔ regex
- `RegexNfa` (core) : construction de Thompson (regex → AFN-ε), `accepts(mot)`.
- `compareWithRegex` (core) : parcours en largeur du produit (ensemble d'états regex × ensemble d'états automate),
  sans exiger d'automate déterministe ni complet. Renvoie `equivalent`, `different` avec le **plus court** contre-exemple
  (premier dans l'ordre de l'alphabet), ou `inconclusive` si la limite d'exploration est atteinte.
- `Verification` (application) : résultat lié à l'automate vérifié (`appliesTo` : périmé dès qu'on le modifie).
- Depuis la Construction : « Vérifier l'automate », puis « Tester ce mot en simulation » rejoue le contre-exemple.
- En Simulation, une ligne confronte le verdict de l'automate à celui de la regex (`describeAgreement`).

## Fichiers : enregistrer et ouvrir (`*.automate.json`)
- Format JSON versionné (`format`, `version`, `definition`, `construction`) ; relecture défensive (`parseProject` ne lève
  jamais d'exception sur un contenu invalide) ; versions plus récentes refusées avec un message clair.
- Barre « Nouveau / Ouvrir… (Ctrl+O) / Enregistrer… (Ctrl+S) » sur tous les écrans ; le titre de la fenêtre affiche le nom
  du fichier et « • » s'il y a des modifications non enregistrées ; une confirmation protège « Nouveau » et « Ouvrir ».
- Architecture : port `ProjectFiles` (application) ← adaptateur Electron (dialogues natifs via IPC : `shared/projectIpc`,
  `preload`, `main/projectFiles` testé avec de faux dialogues/disque) ou adaptateur navigateur (téléchargement + sélecteur).
- Sécurité : le renderer ne fournit jamais de chemin (nom proposé seulement, assaini) ; les canaux IPC vérifient l'origine
  de l'appelant ; taille limitée à 5 Mo ; le preload « sandboxé » n'importe rien à l'exécution (noms de canaux recopiés,
  un test garantit qu'ils restent identiques).
- « Enregistrer » depuis l'écran de définition enregistre la dernière définition validée (bouton « Continuer »).

## Export d'image (SVG / PNG)
- `buildAutomatonSvg` (renderer/export) : fonction pure → document SVG autonome (couleurs en dur, fond blanc, recadré sur
  le contenu, noms d'états échappés). Les flèches encore vides ne sont pas dessinées.
- PNG : le SVG est rastérisé à l'échelle 2 (plafonné à 8192 px) via une URL `data:` (compatible avec la CSP).
- Port `ImageFiles` (application) ← adaptateur Electron (canal IPC `project:export-image`, le processus principal contrôle
  le format, la taille et la signature du fichier avant d'écrire) ou adaptateur navigateur (téléchargement).
- Les états non placés sont disposés pour l'image seulement : l'export ne modifie pas le projet.

## Déterminisation (AFN → AFD)
- `determinize` (core) : construction par sous-ensembles, en largeur dans l'ordre de l'alphabet (résultat déterministe).
  États nommés comme des ensembles (`{q0,q1}`, noms rendus uniques si besoin), final si l'ensemble contient un état final,
  option `complete` (état puits `∅`), plafond de 256 états. Cas refusés avec un message : trop grand, aucun état final accessible.
- Le test central compare l'AFD à l'AFN sur 300 automates aléatoires (tous les mots jusqu'à 7 symboles, avec et sans puits).
- `convertToDfa` (application) produit un NOUVEAU projet (même regex et alphabet, nouveaux états, disposition automatique) ;
  l'application le substitue à l'ancien et garde l'AFN d'origine : « Revenir à l'AFN » reste proposé tant que l'AFD
  n'a pas été modifié. L'AFD reste conforme à la regex (la vérification le confirme).
- Les noms d'états longs sont adaptés au cercle (police réduite, puis abrégés avec infobulle) à l'écran comme dans l'export.
