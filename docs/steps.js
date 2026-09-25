/* ===========================================================================
   steps.js — the ONLY content source for the page.
   ===========================================================================
   index.html contains no prose. app.js contains no prose. Every sentence a
   reader sees is in this file, so adding a step or fixing a number is a
   single-file edit and cannot desynchronise the navigation from the content.

   BILINGUAL MODEL
   Every value is either:
     "a plain string"       language-neutral: code, commands, figures,
                            AWS service names, file paths, identifiers
     { en, fr }             localised

   There is one tree, not two. English and French sit on adjacent lines, so a
   missing translation is visible while editing rather than at runtime, and the
   two languages cannot drift apart structurally: they share the same arrays,
   the same order, the same number of items.

   NEVER TRANSLATED
   Commands, SQL, Terraform, AWS service names, Make targets, file and
   directory names, table and column names, identifiers, URLs, code.

   FACTS
   Every command, count and table name below was read out of the repository.
   The Pages workflow re-reads the Makefile and run_pipeline.sh at build time
   and fails if this file claims a command that does not exist, or claims that
   `make pipeline` runs a stage it does not run.

   HOUSE STYLE
   No em dashes. Short sentences. No marketing vocabulary.

   Block types understood by the renderer:
     prose      { text }
     note       { text }
     code       { caption, lang, text, does, matters?, expect? }
     decision   { title, options[], chosen, because }
     pitfall    { title, text }
     check      { caption, rows[[label, value]] }
     chain      { title, steps[{ label, note? }] }
     invariant  { name, why, test, failure }
   =========================================================================== */

export const languages = [
  { code: "en", label: "EN", name: "English" },
  { code: "fr", label: "FR", name: "Français" }
];

/* --- interface chrome ---------------------------------------------------- */

export const ui = {
  wordmark: "Data Lake",
  wordmarkTail: "/ AWS",
  pageTitle: {
    en: "E-commerce Data Lake on AWS · Technical case study",
    fr: "E-commerce Data Lake sur AWS · Étude de cas technique"
  },
  skip: { en: "Skip to the walkthrough", fr: "Aller au parcours" },
  sectionsNav: { en: "Sections", fr: "Sections" },
  viewSource: { en: "View source", fr: "Voir le code" },
  specification: { en: "Specification · Lionel Niyondiko",
                   fr: "Fiche technique · Lionel Niyondiko" },

  language: { en: "Language", fr: "Langue" },
  themeToLight: { en: "Switch to light theme", fr: "Passer au thème clair" },
  themeToDark: { en: "Switch to dark theme", fr: "Passer au thème sombre" },
  light: { en: "Light", fr: "Clair" },
  dark: { en: "Dark", fr: "Sombre" },

  nav: [
    { id: "views", label: { en: "Views", fr: "Vues" } },
    { id: "numbers", label: { en: "Figures", fr: "Chiffres" } },
    { id: "how-it-runs", label: { en: "Commands", fr: "Commandes" } },
    { id: "integrity", label: { en: "Integrity", fr: "Intégrité" } },
    { id: "architecture", label: { en: "Architecture", fr: "Architecture" } },
    { id: "walkthrough", label: { en: "Walkthrough", fr: "Parcours" } },
    { id: "questions", label: { en: "Business questions", fr: "Questions métier" } },
    { id: "decisions", label: { en: "Decisions", fr: "Décisions" } },
    { id: "summary", label: { en: "Summary", fr: "En résumé" } }
  ],

  /* the five parts of every operational step */
  why: { en: "Why", fr: "Pourquoi" },
  run: { en: "Run", fr: "Lancer" },
  whatHappens: { en: "What happens", fr: "Ce qui se passe" },
  check: { en: "Check", fr: "Vérifier" },
  whyItMatters: { en: "Why it matters", fr: "Ce que ça change" },
  keyIdea: { en: "Key idea", fr: "Idée clé" },
  noCommand: {
    en: "No command. This step is a decision.",
    fr: "Aucune commande. Cette étape est une décision."
  },
  inPipeline: { en: "In", fr: "Dans" },

  /* Interface labels only: they name the role of a passage (problem, decision,
     reason, outcome) or of a lane in the analytics step. No new claim. */
  problem: { en: "Problem", fr: "Problème" },
  decision: { en: "Decision", fr: "Décision" },
  reason: { en: "Reason", fr: "Raison" },
  outcome: { en: "Outcome", fr: "Résultat" },
  compute: { en: "Compute", fr: "Calcul" },
  computeNote: {
    en: "<code>make analytics</code> runs the queries in Athena and writes the report.",
    fr: "<code>make analytics</code> exécute les requêtes dans Athena et écrit le rapport."
  },
  present: { en: "Present", fr: "Présentation" },
  presentNote: {
    en: "<code>make analytics-view</code> serves the last report. It recomputes nothing.",
    fr: "<code>make analytics-view</code> sert le dernier rapport. Il ne recalcule rien."
  },
  openFull: { en: "Open full size", fr: "Ouvrir en taille réelle" },
  returned: { en: "Returned", fr: "Résultat" },

  copy: { en: "Copy", fr: "Copier" },
  copied: { en: "Copied", fr: "Copié" },
  copyFailed: { en: "Select it", fr: "Sélectionnez-le" },
  copyLabel: {
    en: "Copy command to clipboard",
    fr: "Copier la commande dans le presse-papiers"
  },

  steps: { en: "Steps", fr: "Étapes" },
  stepsNav: { en: "Walkthrough steps", fr: "Étapes du parcours" },
  stagesNav: { en: "Stages of the walkthrough", fr: "Phases du parcours" },
  keyboardHint: {
    en: "← → to move<br>between steps",
    fr: "← → pour naviguer<br>entre les étapes"
  },
  previous: { en: "Previous", fr: "Précédent" },
  next: { en: "Next", fr: "Suivant" },
  stepOf: { en: "Step %s of %t", fr: "Étape %s sur %t" },
  stepCount: { en: "%n steps", fr: "%n étapes" },
  stepCountOne: { en: "%n step", fr: "%n étape" },

  architectureChoice: { en: "Architecture choice", fr: "Choix d’architecture" },
  /* The block type is still called "pitfall" in the data model; the label
     the reader sees is a finding, not a warning. */
  pitfall: { en: "Finding", fr: "Constat" },
  invariant: { en: "Invariant", fr: "Invariant" },
  test: { en: "Test", fr: "Test" },
  failureMeans: { en: "Failure means", fr: "Un échec signifie" },
  expectedResult: { en: "Expected result", fr: "Résultat attendu" },
  usedHere: { en: "Used here", fr: "Utilisé ici" },
  no: { en: "No", fr: "Non" },
  usedInstead: { en: "Used instead", fr: "Utilisé à la place" },
  whyNotHere: { en: "Why not here", fr: "Pourquoi pas ici" },
  whenRelevant: { en: "What would change my mind", fr: "Ce qui me ferait changer d’avis" },

  plate: { en: "Plate 01 · Target architecture", fr: "Planche 01 · Architecture cible" },
  diagramFallback: {
    en: "Diagram shown as an image. Inline rendering needs the page to be served over http (make docs).",
    fr: "Diagramme affiché comme image. Le rendu en ligne nécessite une page servie en http (make docs)."
  },
  diagramAlt: {
    en: "Target architecture: three source files land in the bronze prefix of one S3 bucket, are transformed by Athena CTAS into silver then gold, and answer six business questions.",
    fr: "Architecture cible : trois fichiers sources arrivent dans le préfixe bronze d’un unique bucket S3, sont transformés par CTAS Athena en silver puis en gold, et répondent à six questions métier."
  },

  footProject: { en: "Project", fr: "Projet" },
  footStack: { en: "Stack", fr: "Stack" },
  footMethod: { en: "Method", fr: "Méthode" },
  repository: { en: "Repository", fr: "Dépôt" },
  footClaimLead: { en: "Built to be", fr: "Conçu pour être" },
  footClaimAccent: { en: "rebuilt.", fr: "reconstruit." },
  colophon: [
    { en: "MIT licence", fr: "Licence MIT" },
    { en: "Static site · HTML, CSS, vanilla JS, one SVG", fr: "Site statique · HTML, CSS, JavaScript natif, un SVG" },
    { en: "Published with GitHub Pages", fr: "Publié avec GitHub Pages" }
  ]
};

/* --- band headings ------------------------------------------------------- */

export const sections = {
  medallion: {
    title: { en: "Three layers, three guarantees", fr: "Trois couches, trois garanties" },
    note: {
      en: "Each layer earns its place with one guarantee. Without it, a layer is just another folder in the bucket.",
      fr: "Chaque couche justifie sa place par une garantie. Sans elle, ce ne serait qu’un dossier de plus dans le bucket."
    }
  },
  walkthrough: {
    title: { en: "The walkthrough", fr: "Le parcours" },
    note: {
      en: "From a clean clone to a fully removed AWS environment. Ten steps, one job each.",
      fr: "D’un clone propre jusqu’à un environnement AWS entièrement supprimé. Dix étapes, chacune avec un rôle précis."
    }
  },
  decisions: {
    note: {
      en: "Three tools I could have used and didn't: why I left them out, and what would make me add them.",
      fr: "Trois outils que j’aurais pu utiliser et que je n’ai pas retenus : pourquoi, et ce qui me ferait changer d’avis."
    }
  }
};

export const meta = {
  eyebrow: { en: "Technical case study", fr: "Étude de cas technique" },
  discipline: { en: "Cloud Data Engineering", fr: "Cloud Data Engineering" },
  titleLines: ["E-commerce", "Data Lake"],
  titleTail: { en: "on AWS", fr: "sur AWS" },
  title: "E-commerce Data Lake on AWS",
  tagline: {
    en: "Two sources. Imperfect data. An analytical model to build.",
    fr: "Deux sources. Des données imparfaites. Un modèle analytique à construire."
  },
  lede: {
    en: "An e-commerce company wants its data in the hands of its Marketing and BI team. Orders come out of the sales system as CSV. Products and customers come out of the application as JSON. Loading them into AWS is the easy part. The real work is finding out what is in them, deciding what to do with the inconsistencies, and building a model that gives the right answers.",
    fr: "Une entreprise e-commerce veut mettre ses données à disposition de son équipe Marketing et BI. Les commandes sortent du système de vente en CSV. Les produits et les clients sortent de l’application en JSON. Les charger dans AWS, c’est la partie facile. Le vrai travail consiste à comprendre ce qu’elles contiennent, à décider quoi faire des incohérences et à construire un modèle qui donne les bonnes réponses."
  },
  zonesLine: "Bronze → Silver → Gold",
  zonesNote: {
    en: "Bronze keeps the data as close to the source as possible. Silver cleans it, types it and deduplicates it. Gold turns it into a star schema the BI team can query directly. Everything, down to the IAM policy and the budget alert, is defined in Terraform.",
    fr: "Bronze garde les données au plus près de la source. Silver les nettoie, les type et les déduplique. Gold les organise en modèle en étoile, interrogeable directement par la BI. Tout, jusqu’à la politique IAM et l’alerte budgétaire, est défini dans Terraform."
  },
  explainIntro: {
    en: "Queries that return a result are not enough. I want to be able to explain:",
    fr: "Des requêtes qui renvoient un résultat, ça ne suffit pas. Je veux pouvoir expliquer :"
  },
  explainPoints: [
    { en: "what arrived from the sources;", fr: "ce qui est arrivé depuis les sources ;" },
    { en: "which anomalies were detected;", fr: "quelles anomalies ont été détectées ;" },
    { en: "which data was set aside, and why;", fr: "quelles données ont été écartées et pourquoi ;" },
    { en: "how the orphan keys were handled;", fr: "comment les clés orphelines ont été traitées ;" },
    { en: "and how to verify that the final model answers the business questions correctly.", fr: "et comment vérifier que le modèle final répond correctement aux questions métier." }
  ],
  explainClosing: {
    en: "This project walks through that chain, from the raw files to the answers.",
    fr: "Ce projet déroule toute cette chaîne, des fichiers bruts jusqu’aux réponses."
  },
  stack: ["AWS", "S3", "Glue", "Athena", "Terraform", "SQL", "Python"],
  repo: "https://github.com/Lionel-Niyondiko/aws-ecommerce-data-lake",
  links: [
    { label: { en: "View source", fr: "Voir le code" },
      href: "https://github.com/Lionel-Niyondiko/aws-ecommerce-data-lake" },
    { label: { en: "Start the walkthrough", fr: "Commencer le parcours" },
      href: "#walkthrough", internal: true }
  ],
  spec: [
    [{ en: "Domain", fr: "Domaine" }, { en: "Batch analytics, data lake", fr: "Analytique batch, data lake" }],
    [{ en: "Storage", fr: "Stockage" }, { en: "Amazon S3, one bucket, four prefixes", fr: "Amazon S3, un bucket, quatre préfixes" }],
    [{ en: "Catalog", fr: "Catalogue" }, "AWS Glue Data Catalog"],
    [{ en: "Engine", fr: "Moteur" }, "Amazon Athena"],
    [{ en: "Provisioning", fr: "Provisionnement" }, "Terraform"],
    [{ en: "Interface", fr: "Interface" }, { en: "Makefile, one target per step", fr: "Makefile, une cible par étape" }],
    [{ en: "Orchestration", fr: "Orchestration" }, "run_pipeline.sh"],
    [{ en: "Tests", fr: "Tests" }, { en: "29 offline + 17 on AWS", fr: "29 hors ligne + 17 sur AWS" }],
    ["CI", { en: "GitHub Actions, offline checks",
             fr: "GitHub Actions, contrôles hors ligne" }],
    [{ en: "Region", fr: "Région" }, "us-east-1"],
    [{ en: "Teardown", fr: "Destruction" }, "terraform destroy"],
    [{ en: "Licence", fr: "Licence" }, "MIT"]
  ],
  footer: {
    en: "Every figure here was measured on the source files before any AWS resource existed, then checked again by the tests.",
    fr: "Chaque chiffre a été mesuré sur les fichiers sources avant la création de la moindre ressource AWS, puis revérifié par les tests."
  }
};

/* ---------------------------------------------------------------------------
   01 · Two systems, one business question
   --------------------------------------------------------------------------- */

export const challenge = {
  /* The illustration under the statement. The file is referenced from
     index.html so it loads without waiting for the module; only the two
     localised strings live here. */
  figure: {
    alt: {
      en: "Illustration of the pipeline: CSV, JSON, API, database and other sources on the left; an engineering block that ingests and transforms, validates and cleans, then orchestrates; a store labelled clean, conformed, trusted; and on the right the analytics and reports it feeds.",
      fr: "Illustration du pipeline : à gauche des sources CSV, JSON, API, base de données et autres ; au centre un bloc d’ingénierie qui ingère et transforme, valide et nettoie, puis orchestre ; un stockage étiqueté clean, conformed, trusted ; et à droite les analyses et rapports qu’il alimente."
    },
    caption: {
      en: "The same chain seen from the outside: raw sources on the left, the engineering work in the middle, a trusted model and the analyses it supports on the right.",
      fr: "La même chaîne vue de l’extérieur : les sources brutes à gauche, le travail d’ingénierie au centre, un modèle de confiance et les analyses qu’il permet à droite."
    }
  },
  title: { en: "Two systems, one business question", fr: "Deux systèmes, une même question métier" },
  question: {
    en: "How do we turn heterogeneous, imperfect data into a reliable analytical model, without silently losing the information a decision depends on?",
    fr: "Comment transformer des données hétérogènes et imparfaites en un modèle analytique fiable, sans perdre silencieusement l’information utile à la décision ?"
  },
  body: [
    { en: "An ERP order export arrives as CSV. Every column is stored as text, and 29 rows contain a date written <code>31/02/2026</code>.",
      fr: "Un export de commandes ERP arrive en CSV. Chaque colonne est stockée sous forme de texte et 29 lignes contiennent une date écrite <code>31/02/2026</code>." },
    { en: "A product and customer catalog arrives separately as NDJSON from an application API. The objects are nested and their schema is enforced by the source code.",
      fr: "Un catalogue de produits et de clients arrive séparément en NDJSON depuis une API applicative. Les objets sont imbriqués et leur schéma est imposé par le code source." },
    { en: "The two systems do not always tell the same story.",
      fr: "Les deux systèmes ne racontent pas toujours la même histoire." }
  ],
  points: [
    { en: "376 order lines reference a product or a customer that is absent from the catalog.",
      fr: "376 lignes de commande référencent un produit ou un client absent du catalogue." },
    { en: "Country names appear under 39 different spellings for 10 countries.",
      fr: "Les noms de pays apparaissent sous 39 orthographes différentes pour 10 pays." },
    { en: "Invoice numbers look like order keys, but several dates appear in 82% of cases.",
      fr: "Les numéros de facture ressemblent à des clés de commande, mais plusieurs dates apparaissent dans 82 % des cas." },
    { en: "Some of the data can be used as it is. The rest needs an explicit rule.",
      fr: "Une partie des données est utilisable telle quelle. Le reste demande une règle explicite." }
  ],
  closing: {
    en: "“Cleaning the data” undersells the job. The real questions are <strong>where each transformation belongs</strong>, what it changes, and whether any row disappears between two layers without a reason I can point to.",
    fr: "« Nettoyer les données » ne décrit pas vraiment le travail. Les vraies questions sont : <strong>où placer chaque transformation</strong>, ce qu’elle change, et si une ligne disparaît entre deux couches sans une raison que je puisse montrer."
  }
};

/* ---------------------------------------------------------------------------
   02 · Two views, two questions
   --------------------------------------------------------------------------- */

export const views = {
  title: { en: "Two views, two questions", fr: "Deux vues, deux questions" },
  note: {
    en: "There are two ways to read this project: the path the data takes, and the life of the environment it runs in. Some steps belong to one and not the other.",
    fr: "Ce projet se lit de deux façons : le chemin suivi par la donnée, et le cycle de vie de l’environnement dans lequel elle circule. Certaines étapes appartiennent à l’un sans appartenir à l’autre."
  },
  pipeline: {
    label: { en: "Data pipeline", fr: "Pipeline de données" },
    question: { en: "Where does the data go?", fr: "Où va la donnée ?" },
    stages: [
      { name: { en: "Source", fr: "Source" }, detail: { en: "3 files", fr: "3 fichiers" } },
      { name: "Bronze", detail: "7,956" },
      { name: { en: "Profiling", fr: "Profilage" }, detail: { en: "measure only", fr: "mesure seule" } },
      { name: "Silver", detail: "7,547" },
      { name: "Gold", detail: { en: "star schema", fr: "modèle en étoile" } },
      { name: { en: "Analysis", fr: "Analyse" }, detail: { en: "6 answers", fr: "6 réponses" } }
    ]
  },
  loop: {
    label: { en: "Environment", fr: "Environnement" },
    question: {
      en: "How is the environment built, verified and removed?",
      fr: "Comment l’environnement est-il construit, vérifié et supprimé ?"
    },
    stages: [
      { name: { en: "Provision", fr: "Provisionner" }, detail: "make deploy" },
      { name: { en: "Test", fr: "Tester" }, detail: "make test-aws" },
      { name: { en: "Destroy", fr: "Détruire" }, detail: "make destroy" }
    ]
  },
  explanation: {
    en: "Profiling reads the data and changes nothing. Terraform builds the environment and never touches a row. Some of the tests do not even reach AWS. I keep the two views apart so that a question about the data never gets mixed up with a question about the infrastructure.",
    fr: "Le profilage lit la donnée sans rien modifier. Terraform construit l’environnement sans toucher à une seule ligne. Certains tests n’atteignent même pas AWS. Je garde les deux vues séparées pour qu’une question sur la donnée ne se mélange jamais avec une question d’infrastructure."
  }
};

/* ---------------------------------------------------------------------------
   03 · Follow the numbers
   --------------------------------------------------------------------------- */

export const numbers = {
  title: { en: "Follow the numbers", fr: "Suivre les chiffres" },
  note: {
    en: "Each figure was measured on the source files or comes out of a specific pipeline step. Knowing that the pipeline produces 7,547 rows is not enough. I want to know why.",
    fr: "Chaque chiffre est mesuré sur les fichiers sources ou sort d’une étape précise du pipeline. Savoir que le pipeline produit 7 547 lignes ne suffit pas. Je veux savoir pourquoi."
  },
  pullquote: { en: "Why 7,547?", fr: "Pourquoi 7 547 ?" },
  items: [
    { value: "7,956", unit: { en: "rows", fr: "lignes" }, label: { en: "Raw rows", fr: "Lignes brutes" },
      why: { en: "Data coming directly from the two source systems.",
             fr: "Données provenant directement des deux systèmes sources." } },
    { value: "409", unit: { en: "removed", fr: "retirées" }, label: { en: "Rows removed", fr: "Lignes retirées" },
      why: { en: "Invalid dates, invalid prices, missing quantities, exact duplicates.",
             fr: "Dates invalides, prix invalides, quantités manquantes, doublons exacts." } },
    { value: "7,547", unit: { en: "rows", fr: "lignes" }, label: { en: "Silver rows", fr: "Lignes Silver" },
      why: { en: "Cleaned, typed and deduplicated data.",
             fr: "Données nettoyées, typées et dédupliquées." } },
    { value: "354", unit: { en: "rows", fr: "lignes" }, label: { en: "Dimension rows", fr: "Lignes de dimension" },
      why: { en: "91 dates, 131 products, 132 customers, plus the convention rows.",
             fr: "91 dates, 131 produits, 132 clients, plus les lignes de convention." } },
    { value: "$9,284,872.42", unit: { en: "net", fr: "net" }, label: { en: "Revenue", fr: "Chiffre d’affaires" },
      why: { en: "Amount calculated after the data has been processed.",
             fr: "Montant calculé après traitement des données." } },
    { value: "5.00%", unit: { en: "of revenue", fr: "du CA" }, label: { en: "On orphan rows", fr: "CA sur lignes orphelines" },
      why: { en: "Share of revenue carried by keys that are absent from the dimensions.",
             fr: "Part du chiffre d’affaires portée par des clés absentes des dimensions." },
      accent: true }
  ],
  closing: {
    en: "I use these numbers to follow the data from one layer to the next and to account for every gap. The one that matters most is not the final row count. It is the 5.00% of revenue sitting on orphan rows: imperfect data that still has to be counted.",
    fr: "Ces chiffres me servent à suivre la donnée d’une couche à l’autre et à expliquer chaque écart. Le plus important n’est pas le volume final. C’est le 5,00 % du chiffre d’affaires porté par des lignes orphelines : des données imparfaites, qu’il faut quand même compter."
  }
};

/* ---------------------------------------------------------------------------
   04 · How the project runs
   --------------------------------------------------------------------------- */

export const howItRuns = {
  title: { en: "How the project runs", fr: "Comment le projet s’exécute" },
  note: {
    en: "Every command goes through the Makefile. It is not an orchestrator and I do not use it as one: no scheduler, no automatic retry, no dependency graph. The pipeline is short and linear, and it needs none of that.",
    fr: "Toutes les commandes passent par le Makefile. Ce n’est pas un orchestrateur et je ne l’utilise pas comme tel : pas de scheduler, pas de retry automatique, pas de graphe de dépendances. Le pipeline est court et linéaire, il n’en a pas besoin."
  },
  layers: [
    { name: "Makefile",
      role: { en: "Command interface", fr: "Interface de commande" },
      detail: { en: "The command interface of the project.", fr: "Interface de commande du projet." } },
    { name: "run_pipeline.sh",
      role: { en: "Orchestration", fr: "Orchestration" },
      detail: { en: "Local orchestration of the pipeline steps.", fr: "Orchestration locale des étapes du pipeline." } },
    { name: "Terraform",
      role: { en: "Infrastructure", fr: "Infrastructure" },
      detail: { en: "Provisioning of the AWS infrastructure.", fr: "Provisionnement de l’infrastructure AWS." } },
    { name: "sql/*.sql",
      role: { en: "Transformations", fr: "Transformations" },
      detail: { en: "Transformations and analytical queries.", fr: "Transformations et requêtes analytiques." } },
    { name: "Athena",
      role: { en: "Query engine", fr: "Moteur de requête" },
      detail: { en: "Serverless SQL engine.", fr: "Moteur SQL serverless." } },
    { name: "pytest",
      role: { en: "Verification", fr: "Vérification" },
      detail: { en: "Automated verification of the expected behaviour.", fr: "Vérification automatisée du comportement attendu." } }
  ],
  principle: {
    en: "One command, one job. When you run it, you know what it touches.",
    fr: "Une commande, un rôle. Quand on la lance, on sait ce qu’elle touche."
  },

  /* Four cards, one vertical chain each. Only the commands that expand into
     something worth drawing get a card. The full list of commands lives in
     the three families below, which is the reference, and the per-command
     detail lives in the walkthrough step that runs it. One card per command produced
     a ragged grid and broke the code lines mid-word. */
  chainTitle: {
    en: "What a command actually triggers",
    fr: "Ce qu’une commande déclenche réellement"
  },
  chains: [
    { cmd: "make deploy",   steps: ["make", "terraform init", "terraform apply",
                                    { en: "AWS resources", fr: "ressources AWS" }] },
    { cmd: "make pipeline", steps: ["make", "run_pipeline.sh all", "ingest", "catalog", "silver", "gold"] },
    { cmd: "make quality",  steps: ["make", "run_pipeline.sh quality", "sql/02_quality.sql",
                                    { en: "read-only", fr: "lecture seule" }] },
    { cmd: "make test-aws", steps: ["make", "pytest -m aws",
                                    { en: "Athena queries", fr: "requêtes Athena" },
                                    { en: "17 tests", fr: "17 tests" }] }
  ],

  familiesTitle: { en: "The three families of command", fr: "Les trois familles de commandes" },
  familiesNote: {
    en: "The inspection and documentation commands are not part of the main pipeline.",
    fr: "Les commandes d’inspection et de documentation ne font pas partie du pipeline principal."
  },
  families: [
    {
      key: "workflow",
      name: { en: "Main workflow", fr: "Workflow principal" },
      note: { en: "Run these in order, from a clean clone.", fr: "À lancer dans cet ordre, depuis un clone propre." },
      items: [
        { cmd: "make deploy",    what: { en: "Create the infrastructure", fr: "Créer l’infrastructure" } },
        { cmd: "make pipeline",  what: { en: "ingest, catalog, silver, gold", fr: "ingest, catalog, silver, gold" } },
        { cmd: "make analytics", what: { en: "Answer the six business questions, generate the report", fr: "Répondre aux six questions métier, générer le rapport" } },
        { cmd: "make test-aws",  what: { en: "Verify the deployed lake", fr: "Vérifier le lac déployé" } },
        { cmd: "make destroy",   what: { en: "Remove everything", fr: "Tout supprimer" } }
      ]
    },
    {
      key: "inspection",
      name: { en: "Inspection and validation", fr: "Inspection et validation" },
      note: { en: "Optional. None of these is part of the main pipeline.", fr: "Facultatives. Aucune ne fait partie du pipeline principal." },
      items: [
        { cmd: "make quality",  what: { en: "Profile the raw data", fr: "Profiler les données brutes" } },
        { cmd: "make test",     what: { en: "29 tests, no AWS access", fr: "29 tests, sans accès AWS" } },
        { cmd: "make validate", what: { en: "Terraform format and syntax", fr: "Format et syntaxe Terraform" } },
        { cmd: "make fmt",      what: { en: "Reformat the Terraform files", fr: "Reformater les fichiers Terraform" } }
      ]
    },
    {
      key: "docs",
      name: { en: "Consultation", fr: "Consultation" },
      note: { en: "Local viewers. Neither recomputes anything or calls AWS.",
              fr: "Consultation locale. Aucune ne recalcule rien ni n’appelle AWS." },
      items: [
        { cmd: "make docs", what: { en: "This page, http://localhost:8000", fr: "Cette page, http://localhost:8000" } },
        { cmd: "make analytics-view", what: { en: "Last analytics report, http://localhost:8001/report.html",
                                              fr: "Dernier rapport analytique, http://localhost:8001/report.html" } }
      ]
    }
  ],

  warning: {
    title: { en: "An important distinction", fr: "Une distinction importante" },
    lead: { en: "<code>make pipeline</code> does not run everything. It runs only:",
            fr: "<code>make pipeline</code> n’exécute pas tout. Il lance uniquement :" },
    runs: "ingest\ncatalog\nsilver\ngold",
    notLead: { en: "It does not run:", fr: "Il n’exécute pas :" },
    notRuns: "quality\nanalytics\ntest",
    text: {
      en: "That is deliberate. Rebuilding the data should not quietly rerun the analysis or the tests. Each of those has its own command.",
      fr: "C’est voulu. Reconstruire les données ne doit pas relancer en douce l’analyse ou les tests. Chacun a sa propre commande."
    }
  }
};

/* ---------------------------------------------------------------------------
   05 · Data integrity
   --------------------------------------------------------------------------- */

export const integrity = {
  kicker: { en: "The orphan-key problem", fr: "Le problème des clés orphelines" },
  title: { en: "Data integrity", fr: "Intégrité des données" },
  figure: "5.00%",
  figureCaption: {
    en: "of revenue is carried by rows whose product or customer is no longer in the catalog.",
    fr: "du chiffre d’affaires est porté par des lignes dont le produit ou le client n’est plus dans le catalogue."
  },
  amount: "$464,547.61",
  amountLabel: { en: "at stake", fr: "en jeu" },
  rows: "376",
  rowsLabel: { en: "affected rows", fr: "lignes concernées" },
  body: [
    { en: "The catalog and the order export come from different systems, extracted at different times. 376 order lines reference a product or a customer that the catalog no longer contains.",
      fr: "Le catalogue et l’export de commandes proviennent de systèmes différents, extraits à des moments différents. 376 lignes de commande référencent un produit ou un client que le catalogue ne contient plus." }
  ],
  causes: [
    { en: "deleted account;", fr: "compte supprimé ;" },
    { en: "retired product;", fr: "produit retiré ;" },
    { en: "identifier absent from the source;", fr: "identifiant absent de la source ;" },
    { en: "order with no matching identifier.", fr: "commande sans identifiant correspondant." }
  ],
  innerTitle: { en: "What an INNER JOIN can make disappear", fr: "Ce qu’un INNER JOIN peut faire disparaître" },
  innerBody: {
    en: "An <code>INNER JOIN</code> on the dimensions drops every row that finds no match. No error, the report renders, the totals look plausible. About <strong>5% of revenue</strong> is simply gone.",
    fr: "Un <code>INNER JOIN</code> sur les dimensions supprime toutes les lignes sans correspondance. Aucune erreur, le rapport s’affiche, les totaux ont l’air plausibles. Environ <strong>5 % du chiffre d’affaires</strong> a tout simplement disparu."
  },
  comparison: {
    caption: { en: "The same query, two approaches", fr: "La même requête, deux approches" },
    measure: { en: "Measure", fr: "Mesure" },
    columns: [
      { en: "With convention keys", fr: "Avec clés de convention" },
      { en: "With INNER JOIN", fr: "Avec INNER JOIN" }
    ],
    rows: [
      [{ en: "Rows", fr: "Lignes" }, "7,547", "7,171"],
      [{ en: "Revenue", fr: "Chiffre d’affaires" }, "$9,284,872.42", "$8,820,324.81"],
      [{ en: "Orphan rows", fr: "Lignes orphelines" }, "376", { en: "removed", fr: "supprimées" }],
      [{ en: "Explicit detection", fr: "Détection explicite" }, { en: "Yes", fr: "Oui" }, { en: "No", fr: "Non" }]
    ]
  },
  preserve: {
    title: { en: "Preserving the business rows", fr: "Préserver les lignes métier" },
    body: [
      { en: "An orphan key is a referential integrity problem, not a reason to delete a sale. If the order happened, its revenue counts, even when the catalog has lost the product or the customer.",
        fr: "Une clé orpheline est un problème d’intégrité référentielle, pas une raison de supprimer une vente. Si la commande a eu lieu, son chiffre d’affaires compte, même quand le catalogue a perdu le produit ou le client." }
    ],
    keysLead: { en: "So I attach them to convention keys:", fr: "Je les rattache donc à des clés de convention :" },
    keys: "-1\n-2",
    keysNote: {
      en: "Any row without a real match gets one of these.",
      fr: "Toute ligne sans correspondance réelle reçoit l’une de ces valeurs."
    },
    sumLead: { en: "Revenue is then just:", fr: "Le chiffre d’affaires reste alors un simple :" },
    sumCode: "SUM(line_amount)",
    sumNote: {
      en: "and no sale drops out because a dimension is missing its key.",
      fr: "et aucune vente ne disparaît parce qu’une dimension n’a pas la clé."
    },
    isolateLead: { en: "And the orphans are still easy to find:", fr: "Et les orphelines restent faciles à retrouver :" },
    isolateCode: "WHERE product_id = -1",
    isolateNote: { en: "returns them.", fr: "les renvoie." }
  },
  reasons: {
    title: { en: "Why I keep them", fr: "Pourquoi je les garde" },
    lead: { en: "Each of these rows carries two separate facts:",
            fr: "Chacune de ces lignes porte deux informations distinctes :" },
    items: [
      { en: "<strong>the business reality</strong>, here the order and its amount;",
        fr: "<strong>la réalité métier</strong>, ici la commande et son montant ;" },
      { en: "<strong>the quality of the reference</strong>, here the missing match in the catalog.",
        fr: "<strong>la qualité de la référence</strong>, ici l’absence de correspondance dans le catalogue." }
    ]
  },
  closing: {
    en: "Deleting the row throws away the first fact to hide the second. With a convention key, I keep both and can deal with each one on its own.",
    fr: "Supprimer la ligne sacrifie la première information pour cacher la seconde. Avec une clé de convention, je garde les deux et je peux traiter chacune séparément."
  }
};

/* ---------------------------------------------------------------------------
   06 · Target architecture
   --------------------------------------------------------------------------- */

export const architecture = {
  title: { en: "Target architecture", fr: "Architecture cible" },
  note: {
    en: "One S3 bucket, four prefixes, one catalog and one query engine. Everything inside the infrastructure perimeter is created by Terraform and can be removed with <code>terraform destroy</code>.",
    fr: "Un bucket S3, quatre préfixes, un catalogue et un moteur de requête. Tout ce qui se trouve dans le périmètre de l’infrastructure est créé par Terraform et peut être supprimé avec <code>terraform destroy</code>."
  },
  zones: [
    { key: "bronze", path: "bronze/",
      title: { en: "Bronze", fr: "Bronze" },
      volume: { en: "7,956 rows · CSV + NDJSON", fr: "7 956 lignes · CSV + NDJSON" },
      text: { en: "The data exactly as the sources sent it. If a figure is ever questioned, this is where I go back to.",
              fr: "Les données telles que les sources les ont envoyées. Si un chiffre est contesté, c’est là que je reviens." } },
    { key: "silver", path: "silver/",
      title: { en: "Silver", fr: "Silver" },
      volume: { en: "7,547 rows · 39 spellings to 10", fr: "7 547 lignes · 39 orthographes vers 10" },
      text: { en: "Fixes the form of the data without changing what it means: types, formats, country spellings, duplicates and the edge cases found during profiling. 409 rows are removed by five numbered rules. The 376 orphan rows stay.",
              fr: "Silver corrige la forme des données sans toucher à leur sens métier : types, formats, orthographes de pays, doublons et cas limites repérés au profilage. 409 lignes sont retirées selon cinq règles numérotées. Les 376 lignes orphelines sont conservées." } },
    { key: "gold", path: "gold/",
      title: { en: "Gold", fr: "Gold" },
      volume: { en: "7,547 facts + 354 dimension rows", fr: "7 547 faits + 354 lignes de dimensions" },
      text: { en: "The star schema the analysts query. The checks make sure that joining the dimensions changes neither the row count nor the revenue.",
              fr: "Le modèle en étoile interrogé par les analystes. Les contrôles vérifient que la jointure avec les dimensions ne change ni le nombre de lignes ni le chiffre d’affaires." } },
    { key: "results", path: "athena-results/",
      title: { en: "Athena results", fr: "Résultats Athena" },
      volume: { en: "query output + reports", fr: "sorties de requêtes + rapports" },
      text: { en: "<code>queries/</code> holds the result files Athena writes for every query. <code>analytics/</code> holds the business report generated by <code>make analytics</code>: one folder per run, plus <code>latest/</code>.",
              fr: "<code>queries/</code> contient les fichiers de résultats écrits par Athena pour chaque requête. <code>analytics/</code> contient le rapport métier généré par <code>make analytics</code> : un dossier par exécution, plus <code>latest/</code>." } }
  ],
  closing: {
    en: "I kept the architecture small on purpose. Terraform owns the infrastructure, S3 stores, Glue describes, Athena computes, pytest checks, and GitHub Actions runs the checks on every push. It is sized for this project, not for everything it could grow into. If the constraints change, every choice is written down and easy to revisit.",
    fr: "J’ai volontairement gardé l’architecture petite. Terraform gère l’infrastructure, S3 stocke, Glue décrit, Athena calcule, pytest vérifie, et GitHub Actions lance les contrôles à chaque push. Elle est dimensionnée pour ce projet, pas pour tout ce qu’il pourrait devenir. Si les contraintes changent, chaque choix est écrit et facile à revoir."
  }
};

/* ---------------------------------------------------------------------------
   07 · Four layers, four guarantees
   --------------------------------------------------------------------------- */

export const medallion = [
  {
    n: "01", id: "bronze", name: "Bronze",
    guarantee: { en: "Guarantee: faithful to the source", fr: "Garantie : fidélité à la source" },
    attrs: [
      { en: "7,956 rows", fr: "7 956 lignes" },
      { en: "CSV + NDJSON", fr: "CSV + NDJSON" },
      { en: "raw data", fr: "données brutes" },
      { en: "kept as received", fr: "conservées telles que reçues" }
    ],
    volume: "7,956",
    format: { en: "rows, CSV + NDJSON", fr: "lignes, CSV + NDJSON" },
    principle: {
      en: "What did the source actually send, and when?",
      fr: "Qu’est-ce que la source a réellement envoyé, et quand ?"
    },
    guaranteeText: {
      en: "External tables let me query the files where they are. A <code>DROP</code> removes the table definition, never the files.",
      fr: "Les tables externes me permettent d’interroger les fichiers là où ils sont. Un <code>DROP</code> supprime la définition de la table, jamais les fichiers."
    }
  },
  {
    n: "02", id: "silver", name: "Silver",
    guarantee: { en: "Guarantee: cleaned, typed and deduplicated data",
                 fr: "Garantie : données nettoyées, typées et dédupliquées" },
    attrs: [
      { en: "Cleaned", fr: "Nettoyées" },
      { en: "Typed", fr: "Typées" },
      { en: "Deduplicated", fr: "Dédupliquées" },
      { en: "Normalised", fr: "Normalisées" }
    ],
    volume: "7,547",
    format: { en: "rows, Parquet + Snappy, 4 partitions", fr: "lignes, Parquet + Snappy, 4 partitions" },
    principle: {
      en: "The cleaning applies to the form of the data, not to its business meaning.",
      fr: "Le nettoyage porte sur la forme des données, pas sur leur sens métier."
    },
    guaranteeText: {
      en: "Every change follows a written rule. Orphan rows stay: not matching a dimension is not a cleaning problem.",
      fr: "Chaque modification suit une règle écrite. Les lignes orphelines restent : ne pas correspondre à une dimension n’est pas un problème de nettoyage."
    }
  },
  {
    n: "03", id: "gold", name: "Gold",
    guarantee: { en: "Guarantee: a dimensional model ready for analysis",
                 fr: "Garantie : modèle dimensionnel prêt pour l’analyse" },
    attrs: [
      { en: "Star schema", fr: "Modèle en étoile" },
      { en: "Facts", fr: "Faits" },
      { en: "Dimensions", fr: "Dimensions" },
      { en: "Checked joins", fr: "Jointures contrôlées" }
    ],
    volume: "7,547 + 354",
    format: { en: "facts and dimension rows", fr: "faits et lignes de dimensions" },
    principle: {
      en: "Answer the business questions while keeping the checks that prove nothing was lost.",
      fr: "Répondre aux questions métier tout en conservant les contrôles qui prouvent qu’il n’y a pas eu de perte."
    },
    guaranteeText: {
      en: "A star schema that answers the business questions, with checks that prove nothing was lost on the way.",
      fr: "Un modèle en étoile qui répond aux questions métier, avec des contrôles qui prouvent que rien ne s’est perdu en route."
    }
  }
];

/* ---------------------------------------------------------------------------
   08 · The walkthrough
   --------------------------------------------------------------------------- */

export const stages = [
  { id: "setup",    label: { en: "Setup", fr: "Mise en place" } },
  { id: "pipeline", label: { en: "Data pipeline", fr: "Pipeline de données" } },
  { id: "verify",   label: { en: "Verify", fr: "Vérifier" } },
  { id: "teardown", label: { en: "Teardown", fr: "Destruction" } }
];

export const quickstart = {
  title: { en: "The full AWS sequence", fr: "La séquence AWS complète" },
  note: { en: "From the root of the project.", fr: "Depuis la racine du projet." },
  cmd: `uv sync

cp terraform/terraform.tfvars.example terraform/terraform.tfvars

make deploy
make pipeline
make analytics
make test-aws
make destroy`
};

export const steps = [

  /* ------------------------------------------------------------------ 01 -- */
  {
    n: "01",
    id: "prerequisites",
    stage: "setup",
    label: { en: "Prepare", fr: "Préparer" },
    title: { en: "Prepare the workstation", fr: "Préparer le poste de travail" },
    duration: "~5 min",
    objective: {
      en: "Check that the machine and the project are ready before touching AWS.",
      fr: "Vérifier que le poste et le projet sont prêts avant de toucher à AWS."
    },
    why: {
      en: "When something fails, it is either the machine or the project. I rule out the machine first. The offline checks cover a good part of the project with no AWS account and no cost.",
      fr: "Quand quelque chose échoue, c’est soit le poste, soit le projet. J’élimine d’abord le poste. Les contrôles hors ligne couvrent une bonne partie du projet, sans compte AWS et sans coût."
    },
    run: {
      cmd: "uv sync\nmake test\nmake validate",
      note: {
        en: "Create the project environment from <code>pyproject.toml</code> and <code>uv.lock</code>, then run the zero-cost local checks.",
        fr: "Créer l’environnement du projet à partir de <code>pyproject.toml</code> et <code>uv.lock</code>, puis exécuter les contrôles locaux sans coût AWS."
      }
    },
    flow: [
      "uv sync",
      "make test",
      { en: "29 offline tests", fr: "29 tests hors ligne" },
      "make validate",
      "terraform fmt -check",
      "terraform init -backend=false",
      "terraform validate"
    ],
    whatHappens: {
      en: "<code>uv sync</code> creates the project environment from <code>pyproject.toml</code> and <code>uv.lock</code>. It applies the project’s Python 3.13 requirement and installs the locked test dependencies. <code>make test</code> then runs the 29 offline tests: they read the source files, the SQL and the repository configuration, and run the report generator on sample Athena results. They do not contact AWS. <code>make validate</code> checks Terraform formatting and syntax. The <code>-backend=false</code> option initialises Terraform without using the remote backend, so this check can be run without AWS credentials.",
      fr: "<code>uv sync</code> crée l’environnement du projet à partir de <code>pyproject.toml</code> et <code>uv.lock</code>. Il applique la contrainte Python 3.13 du projet et installe les dépendances de test verrouillées. <code>make test</code> exécute ensuite les 29 tests hors ligne : ils lisent les fichiers sources, le SQL et la configuration du dépôt, et font tourner le générateur de rapport sur des résultats Athena d’exemple. Ils ne contactent pas AWS. <code>make validate</code> vérifie le formatage et la syntaxe Terraform. L’option <code>-backend=false</code> permet d’initialiser Terraform sans utiliser le backend distant : cette vérification peut donc être réalisée sans identifiants AWS."
    },
    check: {
      caption: { en: "Before going further", fr: "Avant d’aller plus loin" },
      rows: [
        [{ en: "Required tools", fr: "Outils nécessaires" }, "git, make, terraform, uv, jq"],
        ["uv run python --version", "Python 3.13.x"],
        ["uv run pytest --version", "pytest 9.1.1"],
        ["make test", "29 passed, 17 deselected"],
        [{ en: "AWS resources created", fr: "Ressources AWS créées" }, { en: "none at this stage", fr: "aucune à ce stade" }],
        [{ en: "Expected cost", fr: "Coût attendu" }, "$0.00"]
      ]
    },
    whyItMatters: {
      en: "It is also why CI can run these tests on every push without an AWS bill.",
      fr: "C’est aussi ce qui permet à la CI de lancer ces tests à chaque push, sans facture AWS."
    },
    keyIdea: {
      en: "If it can be checked locally, check it before deploying.",
      fr: "Ce qui peut se vérifier en local se vérifie avant de déployer."
    },
    blocks: [
      {
        type: "pitfall",
        title: { en: "Set the alert email first", fr: "Renseigner l’e-mail d’alerte d’abord" },
        text: {
          en: "Fill in <code>budget_alert_email</code> in <code>terraform.tfvars</code> before deploying. AWS Budgets requires a real email address.",
          fr: "Renseignez <code>budget_alert_email</code> dans <code>terraform.tfvars</code> avant le déploiement. AWS Budgets exige une adresse e-mail réelle."
        }
      }
    ]
  },

  /* ------------------------------------------------------------------ 02 -- */
  {
    n: "02",
    id: "provision",
    stage: "setup",
    label: { en: "Provision", fr: "Provisionner" },
    title: { en: "Provision the infrastructure", fr: "Provisionner l’infrastructure" },
    duration: "~2 min",
    objective: {
      en: "Once the local checks pass, Terraform creates the AWS resources the project needs.",
      fr: "Une fois les contrôles locaux passés, Terraform crée les ressources AWS nécessaires au projet."
    },
    why: {
      en: "Everything is in the Terraform code. I create nothing by hand in the AWS console, so the environment can be reviewed and rebuilt.",
      fr: "Tout est dans le code Terraform. Je ne crée rien à la main dans la console AWS : l’environnement peut être relu et reconstruit."
    },
    run: {
      cmd: "aws sts get-caller-identity\ncp terraform/terraform.tfvars.example terraform/terraform.tfvars\nmake deploy",
      note: {
        en: "Confirm which AWS account is about to be billed, then copy the example file and fill in the required variables. Neither is needed for the local checks.",
        fr: "Confirmer quel compte AWS va être facturé, puis copier le fichier d’exemple et renseigner les variables nécessaires. Aucun des deux n’est nécessaire aux contrôles locaux."
      }
    },
    flow: ["make deploy", "terraform init", "terraform apply"],
    whatHappens: {
      en: "Terraform creates the S3 bucket, the Glue Data Catalog, the IAM resources, the budgets, the SNS notifications and CloudWatch. <code>apply</code> is interactive: it prints the plan and waits for confirmation.",
      fr: "Terraform crée le bucket S3, le Glue Data Catalog, les ressources IAM, les budgets, les notifications SNS et CloudWatch. <code>apply</code> est interactif : il affiche le plan et attend une confirmation."
    },
    check: {
      caption: { en: "After the apply", fr: "Après le apply" },
      rows: [
        [{ en: "Bucket", fr: "Bucket" }, "ecommerce-datalake-&lt;suffix&gt;"],
        [{ en: "Prefixes", fr: "Préfixes" }, "bronze/ silver/ gold/ athena-results/{queries,analytics}/"],
        [{ en: "Catalog", fr: "Catalogue" }, "AWS Glue Data Catalog"],
        [{ en: "Guardrails", fr: "Garde-fous" }, { en: "Budgets, SNS, CloudWatch", fr: "Budgets, SNS, CloudWatch" }],
        [{ en: "Console clicks", fr: "Clics dans la console" }, "0"]
      ]
    },
    whyItMatters: {
      en: "With Terraform, the bucket name, the IAM policy and the budget threshold all show up in a diff someone can review. That is the real benefit, more than staying out of the console.",
      fr: "Avec Terraform, le nom du bucket, la politique IAM et le seuil de budget apparaissent tous dans un diff que quelqu’un peut relire. C’est ça, le vrai intérêt, plus que d’éviter la console."
    },
    keyIdea: {
      en: "If it is not in the code, it does not exist.",
      fr: "Si ce n’est pas dans le code, ça n’existe pas."
    },
    blocks: [
      {
        type: "code",
        caption: "terraform/main.tf",
        lang: "hcl",
        does: { en: "Creates the bucket and its zone prefixes.", fr: "Crée le bucket et ses préfixes de zone." },
        matters: {
          en: "<code>force_destroy</code> is what makes step 10 work. S3 refuses to delete a non-empty bucket, so without this line the teardown fails halfway and leaves billable resources behind.",
          fr: "<code>force_destroy</code> est ce qui fait fonctionner l’étape 10. S3 refuse de supprimer un bucket non vide : sans cette ligne, la destruction échoue à mi-parcours et laisse des ressources facturables."
        },
        expect: { en: "One empty marker object per zone, plus <code>queries/</code> and <code>analytics/</code> under <code>athena-results/</code>.",
                  fr: "Un objet marqueur vide par zone, plus <code>queries/</code> et <code>analytics/</code> sous <code>athena-results/</code>." },
        text: `resource "aws_s3_bucket" "datalake" {
  bucket = local.bucket_name

  # Without this, destroy fails on a non-empty bucket and the lab leaves
  # billable resources behind. Correct for a lab, dangerous in production.
  force_destroy = true
}

resource "aws_s3_object" "zones" {
  for_each = toset([
    "bronze/",
    "silver/",
    "gold/",
    "athena-results/",
    "athena-results/queries/",
    "athena-results/analytics/",
  ])

  bucket = aws_s3_bucket.datalake.id
  key    = each.value
}`
      },
      {
        type: "pitfall",
        title: { en: "Confirm the SNS subscription", fr: "Confirmez l’abonnement SNS" },
        text: {
          en: "The email subscription is created in state <code>PendingConfirmation</code>. Until you click the link AWS sends, the alarm fires into the void. Terraform reports success either way, because from its point of view the subscription exists.",
          fr: "L’abonnement e-mail est créé à l’état <code>PendingConfirmation</code>. Tant que vous n’avez pas cliqué sur le lien envoyé par AWS, l’alarme se déclenche dans le vide. Terraform signale un succès dans les deux cas, car de son point de vue l’abonnement existe."
        }
      },
      {
        type: "note",
        text: {
          en: "Terraform also creates a least-privilege pipeline role that trusts the identity running <code>terraform apply</code>. How it is used depends on that identity. As an IAM user, <code>run_pipeline.sh</code> assumes the role for one hour, so every pipeline step runs with least privilege. If you already work through an assumed role (AWS SSO, <code>assume-role</code>, CI OIDC), the script does not chain roles: it runs with your current role, which then needs S3, Glue and Athena access to the project resources. <code>make test-aws</code> always runs with your current identity.",
          fr: "Terraform crée aussi un rôle de pipeline au moindre privilège, qui fait confiance à l’identité qui lance <code>terraform apply</code>. Son usage dépend de cette identité. Avec un utilisateur IAM, <code>run_pipeline.sh</code> assume le rôle pour une heure : chaque étape du pipeline s’exécute alors au moindre privilège. Si vous travaillez déjà via un rôle assumé (AWS SSO, <code>assume-role</code>, OIDC en CI), le script n’enchaîne pas les rôles : il s’exécute avec votre rôle courant, qui doit alors disposer des accès S3, Glue et Athena aux ressources du projet. <code>make test-aws</code> s’exécute toujours avec votre identité courante."
        }
      }
    ]
  },

  /* ------------------------------------------------------------------ 03 -- */
  {
    n: "03",
    id: "ingest",
    stage: "pipeline",
    partOfPipeline: true,
    label: { en: "Ingestion", fr: "Ingestion" },
    title: { en: "Land the source files", fr: "Déposer les fichiers sources" },
    duration: "~1 min",
    objective: {
      en: "Copy the three source files into Bronze, as they are.",
      fr: "Copier les trois fichiers sources dans Bronze, tels quels."
    },
    why: {
      en: "Bronze answers one question: what did the source send, and when? If ingestion also cleaned, I could no longer prove what arrived, and every later count would be an opinion.",
      fr: "Bronze répond à une question : qu’a envoyé la source, et quand ? Si l’ingestion nettoyait aussi, je ne pourrais plus prouver ce qui est arrivé, et chaque décompte ultérieur deviendrait une opinion."
    },
    run: { cmd: "./scripts/run_pipeline.sh ingest" },
    flow: ["run_pipeline.sh ingest", "aws s3 cp × 3", "bronze/…/ingestion_date=YYYY-MM-DD/"],
    whatHappens: {
      en: "Three <code>aws s3 cp</code> calls, nothing more. The files land under <code>bronze/orders/ingestion_date=…/</code> and equivalents. The Hive-style <code>key=value</code> prefix is not decoration: Glue reads the partition value out of the path itself.",
      fr: "Trois appels <code>aws s3 cp</code>, rien de plus. Les fichiers arrivent sous <code>bronze/orders/ingestion_date=…/</code> et équivalents. Le préfixe <code>clé=valeur</code> à la mode Hive n’est pas décoratif : Glue lit la valeur de partition dans le chemin lui-même."
    },
    check: {
      caption: { en: "On S3", fr: "Sur S3" },
      rows: [
        [{ en: "Files", fr: "Fichiers" }, "orders.csv, products.jsonl, users.jsonl"],
        [{ en: "Prefix shape", fr: "Forme du préfixe" }, "bronze/orders/ingestion_date=…/"],
        [{ en: "Rows altered", fr: "Lignes modifiées" }, "0"],
        [{ en: "Second run", fr: "Deuxième exécution" }, { en: "adds a partition, overwrites nothing", fr: "ajoute une partition, n’écrase rien" }]
      ]
    },
    whyItMatters: {
      en: "Bronze is append-only. Running the ingestion again on another day adds a new partition next to the first, which is what makes the raw layer a record rather than a cache.",
      fr: "Bronze est en append-only. Relancer l’ingestion un autre jour ajoute une nouvelle partition à côté de la première : la couche brute devient un historique, pas un cache."
    },
    keyIdea: {
      en: "Store what arrived, exactly as it arrived.",
      fr: "Stocker ce qui est arrivé, exactement tel que c’est arrivé."
    },
    blocks: []
  },

  /* ------------------------------------------------------------------ 04 -- */
  {
    n: "04",
    id: "catalog",
    stage: "pipeline",
    partOfPipeline: true,
    label: { en: "Catalog", fr: "Catalogue" },
    title: { en: "Catalog the raw data", fr: "Cataloguer les données brutes" },
    duration: "~1 min",
    objective: {
      en: "AWS Glue Data Catalog holds the metadata needed to query the data: the schemas, the formats and the partitions.",
      fr: "AWS Glue Data Catalog contient les métadonnées nécessaires pour interroger les données : les schémas, les formats et les partitions."
    },
    why: {
      en: "Files on S3 are not queryable on their own. Athena needs a schema, a format and a location, and Glue is where that metadata lives. No data moves in this step.",
      fr: "Des fichiers sur S3 ne sont pas interrogeables en tant que tels. Athena a besoin d’un schéma, d’un format et d’un emplacement, et c’est dans Glue que vivent ces métadonnées. Aucune donnée ne bouge à cette étape."
    },
    run: { cmd: "./scripts/run_pipeline.sh catalog" },
    flow: ["run_pipeline.sh catalog", "sql/01_bronze.sql", "3 × CREATE EXTERNAL TABLE", "3 × MSCK REPAIR TABLE"],
    whatHappens: {
      en: "The script strips SQL comments, splits the file on semicolons and submits each statement to Athena in order. Eleven statements run: three table definitions, three partition repairs and five verification queries.",
      fr: "Le script retire les commentaires SQL, découpe le fichier sur les points-virgules et soumet chaque instruction à Athena dans l’ordre. Onze instructions s’exécutent : trois définitions de table, trois réparations de partitions et cinq requêtes de vérification."
    },
    check: {
      caption: { en: "Bronze must be faithful to the source", fr: "Bronze doit être fidèle à la source" },
      rows: [
        ["orders_raw", { en: "7,956 rows", fr: "7 956 lignes" }],
        ["products_raw / users_raw", "130 / 130"],
        [{ en: "Header read as data", fr: "En-tête lu comme une donnée" }, "0"],
        [{ en: "Data location", fr: "Emplacement des données" }, { en: "still S3, Glue stores metadata only", fr: "toujours S3, Glue ne stocke que des métadonnées" }]
      ]
    },
    whyItMatters: {
      en: "<strong>Glue Data Catalog does not store the data itself.</strong> The data stays in S3. <code>DROP TABLE</code> removes the definition and never the files, which is what makes the raw layer immutable by construction rather than by discipline.",
      fr: "<strong>Glue Data Catalog ne stocke pas les données elles-mêmes.</strong> Les données restent dans S3. <code>DROP TABLE</code> supprime la définition et jamais les fichiers, ce qui rend la couche brute immuable par construction et non par discipline."
    },
    keyIdea: {
      en: "The catalog describes files. It does not own them.",
      fr: "Le catalogue décrit des fichiers. Il ne les possède pas."
    },
    blocks: [
      {
        type: "decision",
        title: { en: "Type the CSV columns, or keep everything as text?", fr: "Typer les colonnes du CSV, ou tout garder en texte ?" },
        options: [
          { en: "Native types in Bronze. Cleaner schema, arithmetic works immediately.",
            fr: "Types natifs en Bronze. Schéma plus propre, arithmétique immédiate." },
          { en: "Everything as text. Plainer schema, but no query can fail on a bad value.",
            fr: "Tout en texte. Schéma plus fruste, mais aucune requête ne peut échouer sur une mauvaise valeur." }
        ],
        chosen: { en: "Everything as text, in the CSV only", fr: "Tout en texte, uniquement pour le CSV" },
        because: {
          en: "This file contains 29 dates written <code>31/02/2026</code>. With a <code>date</code> column, one bad value fails the <em>whole</em> query with <code>HIVE_BAD_DATA</code>, so 29 bad rows cost you the 7,927 good ones. Typing is a judgement about the data, and that judgement belongs to Silver, where <code>TRY_CAST</code> can count what it rejects. The two JSON files come from an API with a schema enforced in code, so they keep native types.",
          fr: "Ce fichier contient 29 dates écrites <code>31/02/2026</code>. Avec une colonne <code>date</code>, une seule mauvaise valeur fait échouer la requête <em>entière</em> avec <code>HIVE_BAD_DATA</code> : 29 mauvaises lignes font perdre les 7 927 bonnes. Typer est un jugement sur la donnée, et ce jugement appartient à Silver, où <code>TRY_CAST</code> peut compter ce qu’il rejette. Les deux fichiers JSON proviennent d’une API à schéma imposé par le code : ils conservent leurs types natifs."
        }
      },
      {
        type: "code",
        caption: "sql/01_bronze.sql",
        lang: "sql",
        does: { en: "Declares the orders table over the CSV files and registers its partitions.",
                fr: "Déclare la table des commandes sur les fichiers CSV et enregistre ses partitions." },
        matters: {
          en: "Two lines carry the whole step. <code>skip.header.line.count</code> stops the header becoming a data row, silently, because <code>\"InvoiceNo\"</code> is a perfectly valid string. <code>MSCK REPAIR TABLE</code> registers the partitions, and without it a partitioned table returns zero rows even though the files are there.",
          fr: "Deux lignes portent toute l’étape. <code>skip.header.line.count</code> empêche l’en-tête de devenir une ligne de données, silencieusement, car <code>\"InvoiceNo\"</code> est une chaîne parfaitement valide. <code>MSCK REPAIR TABLE</code> enregistre les partitions, et sans lui une table partitionnée renvoie zéro ligne alors que les fichiers sont là."
        },
        expect: { en: "7,956 rows, and 0 rows where invoiceno = 'InvoiceNo'.",
                  fr: "7 956 lignes, et 0 ligne où invoiceno = 'InvoiceNo'." },
        text: `CREATE EXTERNAL TABLE IF NOT EXISTS orders_raw (
  invoiceno   string,
  productid   string,
  quantity    string,
  invoicedate string,
  unitprice   string,
  customerid  string,
  country     string
)
PARTITIONED BY (ingestion_date string)
ROW FORMAT SERDE 'org.apache.hadoop.hive.serde2.OpenCSVSerde'
STORED AS TEXTFILE
LOCATION 's3://\${BUCKET}/bronze/orders/'
TBLPROPERTIES ('skip.header.line.count' = '1');

MSCK REPAIR TABLE orders_raw;`
      }
    ]
  },

  /* ------------------------------------------------------------------ 05 -- */
  {
    n: "05",
    id: "profile",
    stage: "pipeline",
    label: { en: "Profiling", fr: "Profilage" },
    title: { en: "Profile the raw data", fr: "Profiler les données brutes" },
    duration: "~3 min",
    objective: {
      en: "Measure the anomalies before writing a single cleaning rule.",
      fr: "Mesurer les anomalies avant d’écrire la moindre règle de nettoyage."
    },
    why: {
      en: "A cleaning rule I cannot back with a number is a rule I cannot defend when someone asks where the missing revenue went. Measuring first also turns Silver into a prediction that can be proved wrong.",
      fr: "Une règle de nettoyage que je ne peux pas justifier par un chiffre, je ne pourrai pas la défendre le jour où l’on me demandera où est passé le chiffre d’affaires manquant. Mesurer d’abord fait aussi de Silver une prédiction qu’on peut prendre en défaut."
    },
    run: {
      cmd: "make quality",
      note: {
        en: "Not part of make pipeline, and read-only: it writes nothing and drops nothing. Profiling looks at the data before the rules; the analytics queries answer the business questions once the model exists. I keep the two apart.",
        fr: "Ne fait pas partie de make pipeline, et en lecture seule : rien n’est écrit, rien n’est supprimé. Le profilage regarde la donnée avant les règles ; les requêtes analytiques répondent aux questions métier une fois le modèle construit. Je garde les deux séparés."
      }
    },
    flow: ["make quality", "run_pipeline.sh quality", "sql/02_quality.sql", "15 read-only queries"],
    whatHappens: {
      en: "Fifteen profiling queries read the bronze tables and count the defects by class. Nothing is written to S3, no table is created, and no row is removed. The output is a report I read before deciding anything.",
      fr: "Quinze requêtes de profilage lisent les tables bronze et comptent les défauts par classe. Rien n’est écrit sur S3, aucune table n’est créée, aucune ligne n’est retirée. Le résultat est un rapport que je lis avant de décider quoi que ce soit."
    },
    check: {
      caption: { en: "Measured on 7,956 raw rows", fr: "Mesuré sur 7 956 lignes brutes" },
      rows: [
        [{ en: "Invalid dates", fr: "Dates invalides" }, { en: "36 blank + 29 in DD/MM/YYYY", fr: "36 vides + 29 en JJ/MM/AAAA" }],
        [{ en: "Invalid prices", fr: "Prix invalides" }, { en: "45 zero + 29 negative", fr: "45 à zéro + 29 négatifs" }],
        [{ en: "Missing quantities", fr: "Quantités manquantes" }, "116"],
        [{ en: "Missing customer id", fr: "Identifiant client manquant" }, "157"],
        [{ en: "Exact duplicates", fr: "Doublons exacts" }, { en: "154 rows, 310 involved", fr: "154 lignes, 310 concernées" }],
        [{ en: "Country spellings", fr: "Orthographes de pays" }, { en: "39, for 10 real countries", fr: "39, pour 10 pays réels" }],
        [{ en: "Orphan references", fr: "Références orphelines" }, { en: "376 rows, $464,547.61", fr: "376 lignes, 464 547,61 $" }]
      ]
    },
    whyItMatters: {
      en: "Three of these findings were not in the brief, and each one changed a later decision. I found them by profiling, not by reading the spec.",
      fr: "Trois de ces constats ne figuraient pas dans l’énoncé, et chacun a changé une décision par la suite. Je les ai trouvés en profilant, pas en lisant la spécification."
    },
    keyIdea: {
      en: "Measure the data first, then decide how to transform it.",
      fr: "D’abord mesurer les données, ensuite décider comment les transformer."
    },
    blocks: [
      {
        type: "pitfall",
        title: { en: "Negative prices are not returns", fr: "Les prix négatifs ne sont pas des retours" },
        text: {
          en: "The obvious hypothesis is that a negative price marks a refund. The cross-tab disproves it: all 29 negative prices sit on normal invoices, none on a <code>C</code>-prefixed return. They are a data-entry defect, so dropping them is correct. Had they been returns, dropping them would have destroyed real business events.",
          fr: "L’hypothèse évidente est qu’un prix négatif signale un remboursement. Le tableau croisé la réfute : les 29 prix négatifs sont tous sur des factures normales, aucun sur un retour préfixé <code>C</code>. C’est un défaut de saisie, les supprimer est donc correct. S’il s’était agi de retours, les supprimer aurait détruit de véritables événements métier."
        }
      },
      {
        type: "pitfall",
        title: { en: "InvoiceNo is not an order key", fr: "InvoiceNo n’est pas une clé de commande" },
        text: {
          en: "82% of invoice numbers appear on more than one date. <code>COUNT(DISTINCT invoiceno)</code> per month therefore sums to 4,986 for 2,214 real invoices. A metric whose parts do not sum to its whole will eventually be shown next to the whole. An order is the pair <code>(invoiceno, date)</code>.",
          fr: "82 % des numéros de facture apparaissent à plusieurs dates. <code>COUNT(DISTINCT invoiceno)</code> par mois totalise donc 4 986 pour 2 214 factures réelles. Une métrique dont les parties ne somment pas au tout finira affichée à côté du tout. Une commande, c’est le couple <code>(invoiceno, date)</code>."
        }
      },
      {
        type: "chain",
        title: { en: "Where the 376 orphan keys come from", fr: "D’où viennent les 376 clés orphelines" },
        steps: [
          { label: { en: "Bronze holds the raw orders", fr: "Bronze contient les commandes brutes" } },
          { label: { en: "Each order references a ProductID and a CustomerID", fr: "Chaque commande référence un ProductID et un CustomerID" } },
          { label: { en: "The catalog no longer contains some of those ids", fr: "Le catalogue ne contient plus certains de ces identifiants" },
            note: { en: "deleted accounts, retired products, orders with no id at all", fr: "comptes supprimés, produits retirés, commandes sans identifiant" } },
          { label: { en: "Profiling counts 376 orphan rows", fr: "Le profilage compte 376 lignes orphelines" },
            note: { en: "$464,547.61, about 5% of revenue", fr: "464 547,61 $, environ 5 % du chiffre d’affaires" } },
          { label: { en: "Silver keeps them", fr: "Silver les conserve" },
            note: { en: "a broken lookup is not a reason to delete a sale", fr: "une jointure qui échoue n’est pas une raison de supprimer une vente" } },
          { label: { en: "Gold attaches them to convention keys", fr: "Gold les rattache à des clés de convention" },
            note: { en: "revenue stays complete and the orphans stay findable", fr: "le chiffre d’affaires reste complet et les orphelines restent identifiables" } }
        ]
      }
    ]
  },

  /* ------------------------------------------------------------------ 06 -- */
  {
    n: "06",
    id: "silver",
    stage: "pipeline",
    partOfPipeline: true,
    label: "Silver",
    title: { en: "Transform Bronze into Silver", fr: "Transformer Bronze en Silver" },
    duration: "~2 min",
    objective: {
      en: "Athena CTAS transforms the Bronze data into Silver data: cleaned, typed, deduplicated and normalised.",
      fr: "Athena CTAS transforme les données Bronze en données Silver : nettoyées, typées, dédupliquées et normalisées."
    },
    why: {
      en: "The raw layer is unusable for analysis. Every column is text, some dates cannot be parsed, countries are spelled 39 ways. Silver fixes the form of the data so that a query can run. It does not decide what the data means.",
      fr: "La couche brute est inexploitable pour l’analyse. Chaque colonne est du texte, certaines dates sont impossibles à parser, les pays s’écrivent de 39 façons. Silver corrige la forme de la donnée pour qu’une requête puisse s’exécuter. Elle ne décide pas de ce que la donnée signifie."
    },
    run: { cmd: "./scripts/run_pipeline.sh silver" },
    flow: ["run_pipeline.sh silver", "DROP TABLE + clear the prefix", "sql/03_silver.sql", "3 CTAS to Parquet"],
    whatHappens: {
      en: "The script drops each Silver table and clears its S3 prefix, then runs three CTAS statements that write Parquet with Snappy compression. Both the drop and the clear are needed: Athena refuses a CTAS into a non-empty location, and <code>DROP TABLE</code> on an external table does not delete files.",
      fr: "Le script supprime chaque table Silver et vide son préfixe S3, puis exécute trois instructions CTAS qui écrivent du Parquet compressé en Snappy. La suppression et le vidage sont tous deux nécessaires : Athena refuse un CTAS vers un emplacement non vide, et <code>DROP TABLE</code> sur une table externe ne supprime pas les fichiers."
    },
    check: {
      caption: { en: "Silver invariants", fr: "Invariants Silver" },
      rows: [
        [{ en: "Rows", fr: "Lignes" }, "7,547"],
        [{ en: "Rows removed", fr: "Lignes retirées" }, { en: "409, by five numbered rules", fr: "409, selon cinq règles numérotées" }],
        [{ en: "Revenue", fr: "Chiffre d’affaires" }, "$9,284,872.42"],
        [{ en: "Country spellings", fr: "Orthographes de pays" }, { en: "39 reduced to 10", fr: "39 ramenées à 10" }],
        [{ en: "Unmapped countries", fr: "Pays non mappés" }, "0"],
        [{ en: "Orphan rows kept", fr: "Lignes orphelines conservées" }, "376"],
        [{ en: "Bronze, after all this", fr: "Bronze, après tout cela" }, { en: "7,956, untouched", fr: "7 956, intactes" }]
      ]
    },
    whyItMatters: {
      en: "Silver fixes form, not meaning. An orphan row is well formed; it just points at something the catalog lost. So it stays.",
      fr: "Silver corrige la forme, pas le sens. Une ligne orpheline est bien formée ; elle pointe simplement vers quelque chose que le catalogue a perdu. Elle reste donc."
    },
    keyIdea: {
      en: "Silver cleans the form. Gold models the meaning.",
      fr: "Silver nettoie la forme. Gold modélise le sens."
    },
    blocks: [
      {
        type: "code",
        caption: "sql/03_silver.sql",
        lang: "sql",
        does: { en: "Removes exact duplicates by grouping on the seven business columns.",
                fr: "Retire les doublons exacts en groupant sur les sept colonnes métier." },
        matters: {
          en: "<code>SELECT DISTINCT *</code> would include <code>ingestion_date</code>. Run the ingestion twice and every row exists under two partition dates, which makes each pair distinct, so <code>DISTINCT *</code> deduplicates nothing and doubles the table.",
          fr: "<code>SELECT DISTINCT *</code> inclurait <code>ingestion_date</code>. Lancez l’ingestion deux fois et chaque ligne existe sous deux dates de partition, ce qui rend chaque paire distincte : <code>DISTINCT *</code> ne déduplique alors rien et double la table."
        },
        expect: { en: "154 duplicate rows removed.", fr: "154 lignes en doublon retirées." },
        text: `WITH deduplicated AS (
    SELECT invoiceno, productid, quantity, invoicedate,
           unitprice, customerid, country,
           MAX(ingestion_date) AS source_ingestion_date
    FROM orders_raw
    GROUP BY 1, 2, 3, 4, 5, 6, 7
)`
      },
      {
        type: "code",
        caption: "sql/03_silver.sql",
        lang: "sql",
        does: { en: "Normalises 39 country spellings into 10 countries.",
                fr: "Normalise 39 orthographes de pays en 10 pays." },
        matters: {
          en: "Unknown spellings become <code>NULL</code> instead of silently becoming a new country. <code>ELSE country</code> would let a forgotten spelling flow into revenue-by-country as an eleventh country nobody notices.",
          fr: "Les orthographes inconnues deviennent <code>NULL</code> au lieu de devenir silencieusement un nouveau pays. <code>ELSE country</code> laisserait une orthographe oubliée s’écouler dans le CA par pays comme un onzième pays que personne ne remarque."
        },
        expect: { en: "The verification query asserts that the number of unmapped countries is 0.",
                  fr: "La requête de vérification impose que le nombre de pays non mappés soit 0." },
        text: `CASE LOWER(TRIM(country))
    WHEN 'switzerland' THEN 'Switzerland'
    WHEN 'suisse'      THEN 'Switzerland'
    WHEN 'frnace'      THEN 'France'
    -- ... 39 spellings in total
    ELSE NULL
END AS country`
      },
      {
        type: "note",
        text: {
          en: "Seeing 0 orphans at this stage would be a failure, not a success. Silver deleting them would mean a business decision was taken by a cleaning script.",
          fr: "Voir 0 orpheline à ce stade serait un échec, pas un succès. Que Silver les supprime signifierait qu’une décision métier a été prise par un script de nettoyage."
        }
      }
    ]
  },

  /* ------------------------------------------------------------------ 07 -- */
  {
    n: "07",
    id: "gold",
    stage: "pipeline",
    partOfPipeline: true,
    label: "Gold",
    title: { en: "Build the dimensional model", fr: "Construire le modèle dimensionnel" },
    duration: "~2 min",
    objective: {
      en: "Turn Silver into a star schema: one fact table, three dimensions.",
      fr: "Transformer Silver en modèle en étoile : une table de faits, trois dimensions."
    },
    why: {
      en: "Silver is queryable but not modelled. Gold gives the data a shape an analyst can use without knowing how it was cleaned: measures on the fact, context on the dimensions, and a defined answer for every key that does not resolve.",
      fr: "Silver est interrogeable mais non modélisée. Gold donne à la donnée une forme utilisable par un analyste sans rien savoir du nettoyage : les mesures sur le fait, le contexte sur les dimensions, et une réponse définie pour chaque clé qui ne se résout pas."
    },
    run: { cmd: "./scripts/run_pipeline.sh gold" },
    flow: ["run_pipeline.sh gold", "sql/04_gold.sql", "dim_date, dim_produit, dim_client", "fact_ventes"],
    whatHappens: {
      en: "Four CTAS statements in a fixed order: the three dimensions first, then the fact table, which joins them to detect orphans. Reversing the order fails with “Table not found”. Verification queries follow.",
      fr: "Quatre instructions CTAS dans un ordre fixe : d’abord les trois dimensions, puis la table de faits, qui les joint pour détecter les orphelines. Inverser l’ordre échoue avec « Table not found ». Des requêtes de vérification suivent."
    },
    check: {
      caption: { en: "The model", fr: "Le modèle" },
      rows: [
        ["fact_ventes", { en: "7,547 rows", fr: "7 547 lignes" }],
        ["dim_date", { en: "91 rows", fr: "91 lignes" }],
        ["dim_produit", { en: "131 rows, including convention key -1", fr: "131 lignes, dont la clé de convention -1" }],
        ["dim_client", { en: "132 rows, including convention keys -1 and -2", fr: "132 lignes, dont les clés de convention -1 et -2" }],
        [{ en: "Revenue after joining", fr: "CA après jointure" }, { en: "$9,284,872.42, unchanged", fr: "9 284 872,42 $, inchangé" }],
        [{ en: "Unhandled orphan keys", fr: "Clés orphelines non traitées" }, "0"]
      ]
    },
    whyItMatters: {
      en: "The check I care about most: joining the dimensions must change neither the row count nor the revenue. If both numbers hold, no fact was lost or duplicated.",
      fr: "Le contrôle auquel je tiens le plus : joindre les dimensions ne doit changer ni le nombre de lignes ni le chiffre d’affaires. Si les deux chiffres tiennent, aucun fait n’a été perdu ni dupliqué."
    },
    keyIdea: {
      en: "Give every unresolved key a defined answer.",
      fr: "Donner à chaque clé non résolue une réponse définie."
    },
    blocks: [
      {
        type: "chain",
        title: { en: "The order to work in", fr: "L’ordre dans lequel travailler" },
        steps: [
          { label: { en: "What is the business event?", fr: "Quel est l’événement métier ?" },
            note: { en: "a product sold on an invoice", fr: "un produit vendu sur une facture" } },
          { label: { en: "What does one row represent?", fr: "Que représente une ligne ?" },
            note: { en: "one line of one invoice, for one product", fr: "une ligne d’une facture, pour un produit" } },
          { label: { en: "What are the measures?", fr: "Quelles sont les mesures ?" },
            note: { en: "quantity and line_amount are additive, unit_price is not",
                    fr: "quantity et line_amount sont additives, unit_price ne l’est pas" } },
          { label: { en: "What are the dimensions?", fr: "Quelles sont les dimensions ?" },
            note: { en: "date, product, customer", fr: "date, produit, client" } },
          { label: { en: "Build the dimensions, then the fact table", fr: "Construire les dimensions, puis la table de faits" } },
          { label: { en: "Test the joins", fr: "Tester les jointures" },
            note: { en: "joining must not change the row count", fr: "joindre ne doit pas changer le nombre de lignes" } }
        ]
      },
      {
        type: "code",
        caption: "sql/04_gold.sql",
        lang: "sql",
        does: { en: "Builds the fact table and resolves the two kinds of missing key.",
                fr: "Construit la table de faits et résout les deux types de clé manquante." },
        matters: {
          en: "An <code>INNER JOIN</code> here removes 376 rows and $464,547.61 with no error, no warning and no log line. The <code>LEFT JOIN</code> keeps the row and yields <code>NULL</code>, and the <code>COALESCE</code> and <code>CASE</code> attach it to a convention key.",
          fr: "Un <code>INNER JOIN</code> retire ici 376 lignes et 464 547,61 $ sans erreur, sans avertissement et sans ligne de log. Le <code>LEFT JOIN</code> conserve la ligne et produit <code>NULL</code>, et le <code>COALESCE</code> et le <code>CASE</code> la rattachent à une clé de convention."
        },
        expect: { en: "7,547 rows in, 7,547 rows out. 139 with product -1, 82 with customer -1, 155 with customer -2.",
                  fr: "7 547 lignes en entrée, 7 547 en sortie. 139 avec produit -1, 82 avec client -1, 155 avec client -2." },
        text: `SELECT
    ROW_NUMBER() OVER (
        ORDER BY o.invoice_timestamp, o.invoiceno, o.product_id
    )                                AS vente_id,
    o.invoiceno,
    COALESCE(p.product_id, -1)       AS product_id,
    CASE
        WHEN o.customer_id IS NULL THEN -2   -- no id on the order
        WHEN c.customer_id IS NULL THEN -1   -- id present, account deleted
        ELSE o.customer_id
    END                              AS customer_id,
    o.quantity, o.unit_price, o.line_amount,
    o.year, o.month
FROM orders_clean o
LEFT JOIN dim_produit p ON p.product_id  = o.product_id
LEFT JOIN dim_client  c ON c.customer_id = o.customer_id;`
      },
      {
        type: "decision",
        title: { en: "Why -1 and -2 rather than 9999?", fr: "Pourquoi -1 et -2 plutôt que 9999 ?" },
        options: [
          { en: "9999. Conventional and readable.", fr: "9999. Conventionnel et lisible." },
          { en: "Negative integers. Outside the natural key space.", fr: "Entiers négatifs. Hors de l’espace des clés naturelles." }
        ],
        chosen: "-1 / -2",
        because: {
          en: "The real orphan product ids in this dataset run from 9002 to 9992. A technical key at 9999 would live in the same value space, so a future orphan could <em>be</em> 9999 and join silently to a real dimension row. A negative integer can never collide with a positive natural key. Two codes rather than one because the situations differ: <code>-1</code> is a deleted account, <code>-2</code> is an order that never carried an identifier.",
          fr: "Les véritables identifiants produits orphelins de ce jeu de données vont de 9002 à 9992. Une clé technique à 9999 vivrait dans le même espace de valeurs : un futur orphelin pourrait <em>être</em> 9999 et se joindre silencieusement à une vraie ligne de dimension. Un entier négatif ne peut jamais entrer en collision avec une clé naturelle positive. Deux codes plutôt qu’un parce que les situations diffèrent : <code>-1</code> est un compte supprimé, <code>-2</code> une commande qui n’a jamais porté d’identifiant."
        }
      }
    ]
  },

  /* ------------------------------------------------------------------ 08 -- */
  {
    n: "08",
    id: "analytics",
    stage: "pipeline",
    label: { en: "Analysis", fr: "Analyse" },
    title: { en: "Answer the business questions", fr: "Répondre aux questions métier" },
    duration: "~2 min",
    objective: {
      en: "Athena answers the six business questions the model was built for.",
      fr: "Athena répond aux six questions métier pour lesquelles le modèle a été construit."
    },
    why: {
      en: "A star schema is not the deliverable. The answers are. This step is also where the modelling decisions pay off, because each query is short enough to read in one screen.",
      fr: "Un modèle en étoile n’est pas le livrable. Les réponses le sont. C’est aussi à cette étape que les décisions de modélisation portent leurs fruits, car chaque requête tient sur un écran."
    },
    run: {
      cmd: "make analytics",
      note: {
        en: "Separate from make pipeline. The model can be rebuilt without re-running the analysis, and the analysis re-run without rebuilding the model.",
        fr: "Distinct de make pipeline. Le modèle peut être reconstruit sans relancer l’analyse, et l’analyse relancée sans reconstruire le modèle."
      }
    },
    flow: ["make analytics", "run_pipeline.sh analytics", "sql/05_analytics.sql",
           "generate_analytics_report.py", "HTML · Markdown · JSON · CSV"],
    whatHappens: {
      en: "The 12 statements of <code>sql/05_analytics.sql</code>, grouped under the six business questions, run against the Gold tables. Athena writes its native result files to <code>athena-results/queries/</code>, and the script saves each result as JSON. <code>scripts/generate_analytics_report.py</code> then turns them into one report in four formats: HTML to read, Markdown to share, JSON for programmatic use, CSV for a spreadsheet. The report is uploaded to <code>athena-results/analytics/&lt;run&gt;/</code> and <code>athena-results/analytics/latest/</code>, and copied to <code>reports/</code> on your machine.",
      fr: "Les 12 requêtes de <code>sql/05_analytics.sql</code>, regroupées sous les six questions métier, s’exécutent sur les tables Gold. Athena écrit ses fichiers de résultats natifs dans <code>athena-results/queries/</code>, et le script enregistre chaque résultat en JSON. <code>scripts/generate_analytics_report.py</code> les transforme ensuite en un rapport sous quatre formats : HTML pour la lecture, Markdown pour le partage, JSON pour un usage programmatique, CSV pour un tableur. Le rapport est déposé dans <code>athena-results/analytics/&lt;run&gt;/</code> et <code>athena-results/analytics/latest/</code>, et copié dans <code>reports/</code> sur votre poste."
    },
    check: {
      caption: { en: "The six questions", fr: "Les six questions" },
      rows: [
        ["1", { en: "revenue by country", fr: "chiffre d’affaires par pays" }],
        ["2", { en: "top products", fr: "meilleurs produits" }],
        ["3", { en: "monthly trend", fr: "évolution mensuelle" }],
        ["4", { en: "average basket", fr: "panier moyen" }],
        ["5", { en: "top customers", fr: "meilleurs clients" }],
        ["6", { en: "orphan keys", fr: "clés orphelines" }]
      ]
    },
    whyItMatters: {
      en: "Two of these questions have an obvious answer that looks right and is wrong. I wrote both down below. A good model makes the wrong answer avoidable. It cannot make it impossible.",
      fr: "Deux de ces questions ont une réponse évidente qui a l’air juste et qui est fausse. Je les ai notées ci-dessous. Un bon modèle rend la mauvaise réponse évitable. Il ne peut pas la rendre impossible."
    },
    keyIdea: {
      en: "A number without its caveat is a number someone will misuse.",
      fr: "Un chiffre sans sa réserve est un chiffre que quelqu’un utilisera de travers."
    },
    blocks: [
      {
        type: "code",
        caption: "reports/",
        lang: "text",
        does: { en: "What one run of make analytics leaves on your machine.",
                fr: "Ce qu’une exécution de make analytics laisse sur votre poste." },
        matters: {
          en: "Each run keeps its own folder with the raw Athena results, so a figure in the report can be traced back to the query that produced it. The same files are archived in S3.",
          fr: "Chaque exécution conserve son propre dossier avec les résultats Athena bruts : un chiffre du rapport peut donc être rattaché à la requête qui l’a produit. Les mêmes fichiers sont archivés dans S3."
        },
        text: `reports/
  analytics_<YYYY-MM-DD_HHMMSS>/
    raw/<query>.json
    report.html  report.md  report.json  report.csv
  report.html
  analytics_latest.md  analytics_latest.json  analytics_latest.csv`
      },
      {
        type: "code",
        caption: "Makefile",
        lang: "bash",
        does: { en: "Opens the last local report in the browser.",
                fr: "Ouvre le dernier rapport local dans le navigateur." },
        matters: {
          en: "<code>make analytics-view</code> recomputes nothing and calls neither Athena nor any other AWS service. It only serves the <code>reports/</code> folder, which is convenient for a demonstration. To refresh the figures, run <code>make analytics</code> again.",
          fr: "<code>make analytics-view</code> ne recalcule rien et n’appelle ni Athena ni aucun autre service AWS. Il sert uniquement le dossier <code>reports/</code>, ce qui est pratique pour une démonstration. Pour actualiser les chiffres, relancez <code>make analytics</code>."
        },
        expect: {
          en: "http://localhost:8001/report.html, in French like the SQL model. Stop with Ctrl+C.",
          fr: "http://localhost:8001/report.html, en français comme le modèle SQL. Arrêt avec Ctrl+C."
        },
        text: "make analytics-view"
      },
      {
        type: "pitfall",
        title: { en: "Counting orders by invoice number overcounts by 125%",
                 fr: "Compter les commandes par numéro de facture surestime de 125 %" },
        text: {
          en: "<code>COUNT(DISTINCT invoiceno)</code> gives monthly figures that sum to 4,986 against a real total of 2,214. No single month reveals it. Counting <code>(invoiceno, date)</code> gives months that sum to 7,439, exactly the total.",
          fr: "<code>COUNT(DISTINCT invoiceno)</code> donne des chiffres mensuels totalisant 4 986 pour un total réel de 2 214. Aucun mois pris isolément ne le révèle. Compter <code>(invoiceno, date)</code> donne des mois dont la somme fait 7 439, exactement le total."
        }
      },
      {
        type: "pitfall",
        title: { en: "Average basket needs two aggregations", fr: "Le panier moyen exige deux agrégations" },
        text: {
          en: "<code>AVG(line_amount)</code> straight off the fact table returns the average <em>line</em>, about $1,230, not the average <em>order</em>, $1,248.13. Aggregate to the order first, then take the average.",
          fr: "<code>AVG(line_amount)</code> directement sur la table de faits renvoie la <em>ligne</em> moyenne, environ 1 230 $, pas la <em>commande</em> moyenne, 1 248,13 $. Agréger d’abord à la commande, puis faire la moyenne."
        }
      },
      {
        type: "check",
        caption: { en: "Question 6 in detail: where the orphan revenue sits",
                   fr: "Question 6 en détail : où se situe le CA orphelin" },
        rows: [
          [{ en: "Unknown product (-1)", fr: "Produit inconnu (-1)" }, { en: "139 rows, $183,284.04", fr: "139 lignes, 183 284,04 $" }],
          [{ en: "Deleted customer (-1)", fr: "Client supprimé (-1)" }, { en: "82 rows, $115,751.57", fr: "82 lignes, 115 751,57 $" }],
          [{ en: "Unrecorded customer (-2)", fr: "Client non renseigné (-2)" }, { en: "155 rows, $165,512.00", fr: "155 lignes, 165 512,00 $" }],
          [{ en: "At least one orphan key", fr: "Au moins une clé orpheline" }, { en: "376 rows, $464,547.61, 5.00%", fr: "376 lignes, 464 547,61 $, 5,00 %" }]
        ]
      }
    ]
  },

  /* ------------------------------------------------------------------ 09 -- */
  {
    n: "09",
    id: "test",
    stage: "verify",
    label: { en: "Test", fr: "Tester" },
    title: { en: "Test the project", fr: "Tester le projet" },
    duration: "~2 min",
    objective: {
      en: "Two groups of tests: the ones that need no AWS access, and the ones that check the lake once it is deployed.",
      fr: "Deux groupes de tests : ceux qui n’ont besoin d’aucun accès AWS, et ceux qui vérifient le lac une fois déployé."
    },
    why: {
      en: "The logic gets checked in seconds on every push. The AWS integration gets checked when a lake is actually running.",
      fr: "La logique se vérifie en quelques secondes à chaque push. L’intégration AWS se vérifie quand un lac tourne réellement."
    },
    run: { cmd: "make test\nmake test-aws" },
    flow: ["make test", { en: "29 offline tests", fr: "29 tests hors ligne" }, "make test-aws", { en: "17 tests on the deployed lake", fr: "17 tests sur le lac déployé" }],
    whatHappens: {
      en: "<code>make test</code> runs 29 tests that read the source files, the SQL text and the repository configuration, and check the report generator. <code>make test-aws</code> reads the bucket name and database from the Terraform outputs, submits queries to Athena and compares the results to expected values written in the test file. The numbers are hard-coded on purpose: a test that recomputes the expected value with the same logic as the code under test proves nothing.",
      fr: "<code>make test</code> exécute 29 tests qui lisent les fichiers sources, le texte SQL et la configuration du dépôt, et vérifient le générateur de rapport. <code>make test-aws</code> lit le nom du bucket et la base dans les sorties Terraform, soumet des requêtes à Athena et compare les résultats aux valeurs attendues écrites dans le fichier de test. Les chiffres sont en dur volontairement : un test qui recalcule la valeur attendue avec la même logique que le code testé ne prouve rien."
    },
    check: {
      caption: { en: "What the suite covers", fr: "Ce que couvre la suite" },
      rows: [
        [{ en: "Offline tests", fr: "Tests hors ligne" }, "29"],
        [{ en: "AWS tests", fr: "Tests AWS" }, "17"],
        [{ en: "Bronze fidelity", fr: "Fidélité Bronze" }, { en: "7,956 / 130 / 130", fr: "7 956 / 130 / 130" }],
        ["Silver", { en: "7,547 rows, 10 countries, 376 orphans kept", fr: "7 547 lignes, 10 pays, 376 orphelines conservées" }],
        ["Gold", { en: "no fan-out, no unhandled orphan key", fr: "aucun fan-out, aucune clé orpheline non traitée" }]
      ]
    },
    whyItMatters: {
      en: "The tests I rely on most are not the row counts. They are the invariants: properties that must hold whatever the data looks like.",
      fr: "Les tests sur lesquels je compte le plus ne sont pas les décomptes de lignes. Ce sont les invariants : des propriétés qui doivent tenir quelle que soit la donnée."
    },
    keyIdea: {
      en: "Test the logic offline, then the integration on AWS.",
      fr: "Tester la logique hors ligne, puis l’intégration sur AWS."
    },
    blocks: [
      {
        type: "invariant",
        name: { en: "Joining the dimensions must not change the row count",
                fr: "Joindre les dimensions ne doit pas changer le nombre de lignes" },
        why: { en: "If a dimension holds a duplicate key, every matching fact is silently multiplied and revenue inflates with no error anywhere in the stack.",
               fr: "Si une dimension contient une clé en double, chaque fait correspondant est silencieusement multiplié et le chiffre d’affaires gonfle sans la moindre erreur." },
        test: { en: "Compare row count and SUM(line_amount) before and after joining all three dimensions.",
                fr: "Comparer le nombre de lignes et SUM(line_amount) avant et après jointure des trois dimensions." },
        failure: { en: "A duplicate dimension key exists, and every reported total is too high.",
                   fr: "Une clé de dimension est dupliquée, et chaque total rapporté est trop élevé." }
      },
      {
        type: "invariant",
        name: { en: "No fact may reference an unhandled key",
                fr: "Aucun fait ne doit référencer une clé non traitée" },
        why: { en: "This is what the convention keys exist for.",
               fr: "C’est la raison d’être des clés de convention." },
        test: { en: "LEFT JOIN the three dimensions and count the NULL results. All three must be 0.",
                fr: "Faire un LEFT JOIN des trois dimensions et compter les résultats NULL. Les trois doivent valoir 0." },
        failure: { en: "An orphan key slipped past the COALESCE and CASE, so some revenue has no dimensional context.",
                   fr: "Une clé orpheline a échappé au COALESCE et au CASE : du chiffre d’affaires n’a plus de contexte dimensionnel." }
      },
      {
        type: "note",
        text: {
          en: "The offline half of the suite guards the SQL text itself. One assertion fails the build if any file contains <code>NOT IN (</code>, because <code>NOT IN</code> against a nullable column returns NULL and reports zero orphans on a dataset that has 376.",
          fr: "La moitié hors ligne de la suite surveille le texte SQL lui-même. Une assertion casse le build si un fichier contient <code>NOT IN (</code>, car <code>NOT IN</code> sur une colonne nullable renvoie NULL et signale zéro orpheline sur un jeu de données qui en compte 376."
        }
      }
    ]
  },

  /* ------------------------------------------------------------------ 10 -- */
  {
    n: "10",
    id: "destroy",
    stage: "teardown",
    label: { en: "Destroy", fr: "Détruire" },
    title: { en: "Remove the infrastructure", fr: "Supprimer l’infrastructure" },
    duration: "~1 min",
    objective: {
      en: "Once the walkthrough is finished, Terraform removes the resources it provisioned.",
      fr: "Une fois le parcours terminé, Terraform supprime les ressources qu’il a provisionnées."
    },
    why: {
      en: "Tearing down is part of the normal run. The project is meant to be rebuilt from scratch.",
      fr: "La destruction fait partie de l’exécution normale. Le projet est fait pour être reconstruit de zéro."
    },
    run: { cmd: "make destroy" },
    flow: ["make destroy", "terraform destroy", "0 resources in state"],
    whatHappens: {
      en: "Everything goes: the bucket and its contents, the Glue database and its tables, the IAM resources, the budget, the alarm, the SNS topic. Running the whole walkthrough again reproduces the same 7,547 facts and the same $9,284,872.42.",
      fr: "Tout disparaît : le bucket et son contenu, la base Glue et ses tables, les ressources IAM, le budget, l’alarme, le topic SNS. Réexécuter tout le parcours reproduit les mêmes 7 547 faits et les mêmes 9 284 872,42 $."
    },
    check: {
      caption: { en: "Cost of one full run", fr: "Coût d’une exécution complète" },
      rows: [
        [{ en: "S3 storage", fr: "Stockage S3" }, { en: "a few MB for a few hours", fr: "quelques Mo pendant quelques heures" }],
        ["Athena", { en: "well under 1 GB scanned", fr: "bien moins d’1 Go scanné" }],
        ["Glue, IAM, SNS, CloudWatch, Budgets", { en: "free at this volume", fr: "gratuits à ce volume" }],
        [{ en: "Total", fr: "Total" }, { en: "under $0.10", fr: "moins de 0,10 $" }],
        [{ en: "Resources left in state", fr: "Ressources restantes dans le state" }, "0"]
      ]
    },
    whyItMatters: {
      en: "Nothing tears the infrastructure down on its own: the AWS validation is manual from start to finish. <code>deploy</code>, <code>pipeline</code>, <code>analytics</code>, <code>test-aws</code>, <code>destroy</code> is one sequence, and the last command is the one that stops the billing.",
      fr: "Rien ne démonte l’infrastructure tout seul : la validation AWS est manuelle du début à la fin. <code>deploy</code>, <code>pipeline</code>, <code>analytics</code>, <code>test-aws</code>, <code>destroy</code> forment une seule séquence, et la dernière commande est celle qui arrête la facturation."
    },
    keyIdea: {
      en: "The project is designed to be rebuilt.",
      fr: "Le projet est conçu pour être reconstruit."
    },
    blocks: [
      {
        type: "pitfall",
        title: { en: "force_destroy is what makes this work", fr: "C’est force_destroy qui rend cela possible" },
        text: {
          en: "S3 refuses to delete a non-empty bucket. Without <code>force_destroy = true</code>, destroy fails halfway, the state no longer matches reality, and billable resources are left behind. Fine here. Dangerous in production.",
          fr: "S3 refuse de supprimer un bucket non vide. Sans <code>force_destroy = true</code>, la destruction échoue à mi-parcours, le state ne correspond plus à la réalité, et des ressources facturables restent en place. Acceptable ici. Dangereux en production."
        }
      }
    ]
  }
];

/* ---------------------------------------------------------------------------
   10 · The dimensional model
   --------------------------------------------------------------------------- */
/* The diagram file is referenced from index.html so it loads without waiting
   for the module. Only the localised strings live here. */

export const dimensionalModel = {
  title: { en: "Dimensional model", fr: "Modèle dimensionnel" },
  grainTitle: {
    en: "The grain, a three-term key",
    fr: "Le grain, une clé à trois termes"
  },
  grain: {
    en: "Selected grain: one row in <code>fact_ventes</code> = one product (<code>product_id</code>) billed under an invoice number (<code>invoiceno</code>) at a given timestamp (<code>invoice_timestamp</code>).",
    fr: "Grain retenu : une ligne de <code>fact_ventes</code> = un produit (<code>product_id</code>) facturé sous un numéro de facture (<code>invoiceno</code>) à un horodatage donné (<code>invoice_timestamp</code>)."
  },
  diagramAlt: {
    en: "Entity relationship diagram of the star schema: fact_ventes at the centre, joined to dim_produit, dim_client and dim_date.",
    fr: "Diagramme entité-association du modèle en étoile : fact_ventes au centre, joint à dim_produit, dim_client et dim_date."
  }
};

/* ---------------------------------------------------------------------------
   11 · The six business questions
   --------------------------------------------------------------------------- */
/* The six queries are copied from sql/05_analytics.sql with their comments
   removed, nothing else. The file holds companion queries for Q2, Q3 and Q6
   (the overlap count, the additivity proof, the INNER JOIN cost); the one
   shown here is the query that answers the question itself. */

export const questions = {
  title: { en: "The six business questions", fr: "Les six questions métier" },
  note: {
    en: "The six queries below are the ones in <code>sql/05_analytics.sql</code>, shown without their comments. The figures beside each question are measured, not estimated.",
    fr: "Les six requêtes ci-dessous sont celles du fichier <code>sql/05_analytics.sql</code>, présentées sans leurs commentaires. Les chiffres associés à chaque question sont mesurés, pas estimés."
  },
  source: "sql/05_analytics.sql",
  tableTitle: {
    en: "The six questions and what they returned",
    fr: "Les six questions et ce qu’elles ont renvoyé"
  },
  items: [
    {
      n: "Q1",
      question: {
        en: "Total revenue, and revenue by country, over the last three months.",
        fr: "Chiffre d’affaires total et par pays sur les 3 derniers mois."
      },
      sql: `WITH bounds AS (
    SELECT MAX(d.full_date) AS last_day
    FROM fact_ventes f JOIN dim_date d ON d.date_id = f.date_id
)
SELECT
    f.country,
    COUNT(*)                                            AS rows,
    ROUND(SUM(f.line_amount), 2)                        AS revenue,
    ROUND(100.0 * SUM(f.line_amount)
          / SUM(SUM(f.line_amount)) OVER (), 2)         AS pct_revenue
FROM fact_ventes f
JOIN dim_date d ON d.date_id = f.date_id
CROSS JOIN bounds b
WHERE d.full_date > DATE_ADD('month', -3, b.last_day)
GROUP BY f.country
ORDER BY revenue DESC;`,
      result: {
        en: "Ten countries between 8.8% and 10.9%. No market dominates. The three-month window covers 100% of the data.",
        fr: "Dix pays entre 8,8 % et 10,9 %. Aucun marché ne domine. La fenêtre de trois mois couvre 100 % du jeu de données."
      }
    },
    {
      n: "Q2",
      question: {
        en: "Top 10 products by revenue and top 10 by quantity sold, then the comparison.",
        fr: "Top 10 produits par chiffre d’affaires et top 10 par quantité vendue, puis comparaison."
      },
      sql: `SELECT p.product_id, p.title, p.category,
       ROUND(SUM(f.line_amount), 2) AS revenue,
       SUM(f.quantity)              AS quantity,
       ROUND(AVG(f.unit_price), 2)  AS avg_price
FROM fact_ventes f
JOIN dim_produit p ON p.product_id = f.product_id
WHERE p.product_id <> -1
GROUP BY p.product_id, p.title, p.category
ORDER BY revenue DESC
LIMIT 10;`,
      result: {
        en: "Seven of the ten products appear in both rankings. The three differences come down to unit price.",
        fr: "Sept produits sur dix figurent dans les deux classements. Les trois écarts s’expliquent par le prix unitaire."
      }
    },
    {
      n: "Q3",
      question: {
        en: "Monthly trend of revenue and order count.",
        fr: "Évolution mensuelle du chiffre d’affaires et du nombre de commandes."
      },
      sql: `SELECT
    d.year, d.month, d.month_name,
    ROUND(SUM(f.line_amount), 2) AS revenue,
    COUNT(*)                     AS rows,
    COUNT(DISTINCT f.invoiceno || '|' || CAST(f.date_id AS varchar)) AS orders,
    COUNT(DISTINCT f.invoiceno)  AS raw_invoice_numbers,
    ROUND(SUM(f.line_amount)
          / COUNT(DISTINCT f.invoiceno || '|' || CAST(f.date_id AS varchar)), 2)
                                 AS avg_basket
FROM fact_ventes f
JOIN dim_date d ON d.date_id = f.date_id
GROUP BY d.year, d.month, d.month_name
ORDER BY d.year, d.month;`,
      result: {
        en: "April and July are partial months. On the complete months, May to June: revenue +3.0%, average basket +6.9%, on fewer orders.",
        fr: "Avril et juillet sont des mois partiels. Sur les mois complets, de mai à juin : chiffre d’affaires +3,0 %, panier moyen +6,9 %, sur moins de commandes."
      }
    },
    {
      n: "Q4",
      question: {
        en: "Average basket by country.",
        fr: "Panier moyen par pays."
      },
      sql: `WITH orders AS (
    SELECT f.invoiceno, f.date_id, f.country,
           SUM(f.line_amount) AS order_amount,
           SUM(f.quantity)    AS order_items
    FROM fact_ventes f
    GROUP BY f.invoiceno, f.date_id, f.country
)
SELECT country,
       COUNT(*)                                          AS orders,
       ROUND(SUM(order_amount), 2)                       AS revenue,
       ROUND(AVG(order_amount), 2)                       AS avg_basket,
       ROUND(APPROX_PERCENTILE(order_amount, 0.5), 2)    AS median_basket,
       ROUND(AVG(order_items), 2)                        AS avg_items
FROM orders
GROUP BY country
ORDER BY avg_basket DESC;`,
      result: {
        en: "Global average basket $1,248.13. Switzerland is second by revenue and last by basket: it earns through order volume, not order value.",
        fr: "Panier moyen global de 1 248,13 $. La Suisse est deuxième en chiffre d’affaires et dernière en panier moyen : elle gagne par le volume de commandes, pas par leur valeur."
      }
    },
    {
      n: "Q5",
      question: {
        en: "Top 5 customers by cumulative revenue.",
        fr: "Top 5 clients par chiffre d’affaires cumulé."
      },
      sql: `SELECT c.customer_id,
       c.firstname || ' ' || c.lastname AS customer,
       c.email, c.city, c.company_name,
       ROUND(SUM(f.line_amount), 2)     AS revenue,
       COUNT(*)                         AS rows,
       COUNT(DISTINCT f.invoiceno || '|' || CAST(f.date_id AS varchar)) AS orders
FROM fact_ventes f
JOIN dim_client c ON c.customer_id = f.customer_id
WHERE c.customer_id > 0
GROUP BY c.customer_id, c.firstname, c.lastname, c.email, c.city, c.company_name
ORDER BY revenue DESC
LIMIT 5;`,
      result: {
        en: "Liam Smith leads with $139,567.96. Identified customers carry 96.97% of revenue.",
        fr: "Liam Smith arrive en tête avec 139 567,96 $. Les clients identifiés portent 96,97 % du chiffre d’affaires."
      }
    },
    {
      n: "Q6",
      question: {
        en: "Order lines whose product or customer is absent from the catalog: volume, revenue, and how the orphan keys are handled.",
        fr: "Lignes de commande avec produit ou client absent du catalogue, volume, chiffre d’affaires et traitement des clés orphelines."
      },
      sql: `SELECT
    CASE
        WHEN product_id = -1 AND customer_id < 0 THEN 'Product AND customer missing'
        WHEN product_id = -1                     THEN 'Product removed from catalog'
        WHEN customer_id = -1                    THEN 'Customer deleted from catalog'
        WHEN customer_id = -2                    THEN 'Customer not recorded'
        ELSE                                          'Complete keys'
    END                                                       AS population,
    COUNT(*)                                                  AS rows,
    ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 2)        AS pct_rows,
    SUM(quantity)                                             AS quantity,
    ROUND(SUM(line_amount), 2)                                AS revenue,
    ROUND(100.0 * SUM(line_amount)
          / SUM(SUM(line_amount)) OVER (), 2)                 AS pct_revenue
FROM fact_ventes
GROUP BY 1
ORDER BY revenue DESC;`,
      result: {
        en: "376 rows, 4.98% of rows, $464,547.61, that is 5.00% of revenue. Attached to the convention rows, not excluded.",
        fr: "376 lignes, 4,98 % des lignes, 464 547,61 $, soit 5,00 % du chiffre d’affaires. Rattachées aux lignes de convention, pas exclues."
      }
    }
  ]
};

/* ---------------------------------------------------------------------------
   11 · Architecture decisions
   --------------------------------------------------------------------------- */

export const decisions = {
  title: { en: "Architecture decisions", fr: "Décisions d’architecture" },
  thesis: {
    en: "No Airflow, no dbt, no remote state.",
    fr: "Pas d’Airflow, pas de dbt, pas de state distant."
  },
  principle: {
    en: "I did not leave them out to look minimal. I left them out because this project does not need them yet.",
    fr: "Je ne les ai pas écartés pour faire minimaliste. Je les ai écartés parce que ce projet n’en a pas encore besoin."
  },
  items: [
    {
      tool: "Airflow",
      why: {
        en: "The pipeline is short and linear, and run_pipeline.sh already stops at the first failure. Airflow would mostly have been one more piece of infrastructure to run and maintain.",
        fr: "Le pipeline est court et linéaire, et run_pipeline.sh s’arrête déjà à la première erreur. Airflow aurait surtout été une infrastructure de plus à faire tourner et à maintenir."
      },
      when: {
        en: "If the pipeline had to run on a schedule, retry after a failure, handle several dependencies or be monitored in production, the answer would be different.",
        fr: "S’il fallait planifier le pipeline, le relancer automatiquement après un échec, gérer plusieurs dépendances ou le superviser en production, la réponse serait différente."
      },
      instead: { en: "run_pipeline.sh, called by the Makefile", fr: "run_pipeline.sh, appelé par le Makefile" }
    },
    {
      tool: "dbt",
      why: {
        en: "Five SQL files, run in order by Athena. At that size, dbt would have added a tool and a project structure without solving a problem I actually had.",
        fr: "Cinq fichiers SQL, exécutés dans l’ordre par Athena. À cette taille, dbt aurait ajouté un outil et une structure de projet sans résoudre un problème que j’avais réellement."
      },
      when: {
        en: "With dozens of models depending on each other, or a team sharing the transformations, I would move to dbt.",
        fr: "Avec des dizaines de modèles qui dépendent les uns des autres, ou une équipe qui partage les transformations, je passerais à dbt."
      },
      instead: { en: "Five numbered .sql files, run in order", fr: "Cinq fichiers .sql numérotés, exécutés dans l’ordre" }
    },
    {
      tool: { en: "Remote Terraform backend", fr: "Backend Terraform distant" },
      why: {
        en: "I am the only one applying this infrastructure, and it is destroyed after each run. Local state, kept out of git, is enough.",
        fr: "Je suis le seul à appliquer cette infrastructure, et elle est détruite après chaque exécution. Un state local, exclu de git, suffit."
      },
      when: {
        en: "As soon as a second person has to apply the same infrastructure, the state moves to a shared remote backend with locking.",
        fr: "Dès qu’une deuxième personne doit appliquer la même infrastructure, le state passe sur un backend distant partagé, avec verrouillage."
      },
      instead: { en: "Local state, git-ignored", fr: "State local, ignoré par git" }
    }
  ]
};

/* ---------------------------------------------------------------------------
   13 · Built to be rebuilt
   --------------------------------------------------------------------------- */

export const reproducibility = {
  title: { en: "Built to be rebuilt", fr: "Conçu pour être reconstruit" },
  thesis: {
    en: "If I can rebuild everything from scratch and get the same numbers, I can explain those numbers.",
    fr: "Si je peux tout reconstruire de zéro et retrouver les mêmes chiffres, je peux expliquer ces chiffres."
  },
  componentsTitle: { en: "What the project rests on", fr: "Ce sur quoi repose le projet" },
  components: [
    ["Terraform", { en: "Infrastructure as Code", fr: "Infrastructure as Code" }],
    [{ en: "AWS resources", fr: "Ressources AWS" }, "S3, Glue, IAM, Budgets, SNS, CloudWatch"],
    [{ en: "Pipeline", fr: "Pipeline" }, { en: "Executable shell script", fr: "Script shell exécutable" }],
    [{ en: "Python environment", fr: "Environnement Python" },
     { en: "Reproducible Python 3.13 environment via pyproject.toml and uv.lock",
       fr: "Environnement Python 3.13 reproductible via pyproject.toml et uv.lock" }],
    [{ en: "Tests", fr: "Tests" }, { en: "29 offline tests + 17 AWS tests", fr: "29 tests hors ligne + 17 tests AWS" }],
    ["CI", { en: "GitHub Actions, offline only", fr: "GitHub Actions, hors ligne uniquement" }],
    [{ en: "AWS validation", fr: "Validation AWS" },
     { en: "manual, make test-aws", fr: "manuelle, make test-aws" }],
    [{ en: "Teardown", fr: "Destruction" }, "terraform destroy"]
  ],
  claimsTitle: { en: "What I check, and with what", fr: "Ce que je vérifie, et avec quoi" },
  claimsLead: {
    en: "Each claim has a command behind it:",
    fr: "Chaque affirmation a une commande derrière elle :"
  },
  claims: [
    [{ en: "the infrastructure can be recreated", fr: "l’infrastructure peut être recréée" }, "terraform apply"],
    [{ en: "the SQL transformations run in the intended order", fr: "les transformations SQL s’exécutent dans l’ordre prévu" }, "run_pipeline.sh"],
    [{ en: "the expected results are verifiable", fr: "les résultats attendus sont vérifiables" }, "pytest"],
    [{ en: "the offline tests can run without an AWS account", fr: "les tests hors ligne peuvent tourner sans compte AWS" }, "make test"],
    [{ en: "the AWS tests can validate the deployed environment, by hand", fr: "les tests AWS peuvent valider l’environnement réellement déployé, à la main" }, "make test-aws"],
    [{ en: "the resources can be removed cleanly", fr: "les ressources peuvent être supprimées proprement" }, "make destroy"]
  ],
  ci: {
    title: { en: "What CI actually does", fr: "Ce que fait réellement la CI" },
    body: {
      en: "CI checks behaviour, not just that files exist. Only half of the checks are automatic. <strong>The automatic half</strong> runs on every push and never touches AWS: Terraform <code>fmt</code>, <code>init</code>, <code>validate</code> and tflint, ShellCheck on the shell scripts, the offline test suite, and the guards that stop Gold from reading Bronze. It needs no credentials and costs nothing. <strong>The AWS half is manual</strong>: <code>make deploy</code>, <code>make pipeline</code>, <code>make analytics</code>, <code>make test-aws</code>, <code>make destroy</code>, run against a real account when there is a reason to. Nothing deploys or bills on a schedule.",
      fr: "La CI vérifie le comportement, pas seulement la présence des fichiers. Seule la moitié des contrôles est automatique. <strong>La moitié automatique</strong> s’exécute à chaque push et ne touche jamais à AWS : Terraform <code>fmt</code>, <code>init</code>, <code>validate</code> et tflint, ShellCheck sur les scripts, la suite de tests hors ligne, et les gardes qui empêchent la Gold de lire la Bronze. Elle ne demande aucune clé et ne coûte rien. <strong>La moitié AWS est manuelle</strong> : <code>make deploy</code>, <code>make pipeline</code>, <code>make analytics</code>, <code>make test-aws</code>, <code>make destroy</code>, lancées sur un compte réel quand il y a une raison de les lancer. Rien ne se déploie ni ne se facture sur un calendrier."
    }
  },
  traceTitle: { en: "What it lets me tell apart", fr: "Ce que cela me permet de distinguer" },
  traceLead: {
    en: "When a number moves, I can tell whether it comes from:",
    fr: "Quand un chiffre bouge, je peux dire s’il vient :"
  },
  trace: [
    { en: "the source data;", fr: "des données sources ;" },
    { en: "the transformations;", fr: "des transformations ;" },
    { en: "the infrastructure;", fr: "de l’infrastructure ;" },
    { en: "the quality rules;", fr: "des règles de qualité ;" },
    { en: "or the business queries.", fr: "ou des requêtes métier." }
  ],
  traceClosing: {
    en: "That is the difference between explaining a result and just reporting it.",
    fr: "C’est la différence entre expliquer un résultat et simplement le constater."
  }
};

/* ---------------------------------------------------------------------------
   14 · In summary
   --------------------------------------------------------------------------- */

export const summary = {
  title: { en: "In summary", fr: "En résumé" },
  thesis: {
    en: "Moving data from one system to another is the easy part.",
    fr: "Faire passer des données d’un système à un autre, c’est la partie facile."
  },
  lead: { en: "The real work is being able to say:", fr: "Le vrai travail, c’est de pouvoir dire :" },
  points: [
    { en: "what came in;", fr: "ce qui est entré ;" },
    { en: "what was removed;", fr: "ce qui a été retiré ;" },
    { en: "why it was removed;", fr: "pourquoi cela a été retiré ;" },
    { en: "what was transformed;", fr: "ce qui a été transformé ;" },
    { en: "where each transformation was performed;", fr: "où chaque transformation a été effectuée ;" },
    { en: "what was kept despite the anomalies;", fr: "ce qui a été conservé malgré les anomalies ;" },
    { en: "how the result was verified;", fr: "comment le résultat a été vérifié ;" },
    { en: "how the infrastructure can be rebuilt or removed.", fr: "comment l’infrastructure peut être reconstruite ou supprimée." }
  ],
  stackLead: {
    en: "With a deliberately short list of tools:",
    fr: "Avec une liste d’outils volontairement courte :"
  },
  stack: ["AWS", "S3", "Glue", "Athena", "Terraform", "SQL", "Python", "pytest", "GitHub Actions"],
  stackNote: {
    en: "The interesting part is not the number of services. It is how they fit together and how each result gets checked.",
    fr: "L’intérêt n’est pas le nombre de services. C’est la façon dont ils s’assemblent et dont chaque résultat est vérifié."
  },
  closing: {
    en: "Every figure was measured on the source files before any AWS resource existed, then checked by the tests. Terraform defines the infrastructure, SQL defines the transformations, the Makefile runs them and the tests check them. The whole environment can be destroyed and rebuilt. That is what I wanted to show: a pipeline someone else can examine, question and reproduce.",
    fr: "Chaque chiffre a été mesuré sur les fichiers sources avant l’existence de la moindre ressource AWS, puis vérifié par les tests. Terraform définit l’infrastructure, le SQL définit les transformations, le Makefile les lance et les tests les vérifient. Tout l’environnement peut être détruit puis reconstruit. C’est ce que je voulais montrer : un pipeline que quelqu’un d’autre peut examiner, remettre en question et reproduire."
  }
};
