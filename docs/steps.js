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
  whyItMatters: { en: "Why it matters", fr: "Ce que cela apprend" },
  keyIdea: { en: "Key idea", fr: "Idée clé" },
  noCommand: {
    en: "No command. This step is a decision.",
    fr: "Aucune commande. Cette étape est une décision."
  },
  inPipeline: { en: "In", fr: "Dans" },

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
  pitfall: { en: "Findings", fr: "Constat fait" },
  invariant: { en: "Invariant", fr: "Invariant" },
  test: { en: "Test", fr: "Test" },
  failureMeans: { en: "Failure means", fr: "Un échec signifie" },
  expectedResult: { en: "Expected result", fr: "Résultat attendu" },
  usedHere: { en: "Used here", fr: "Utilisé ici" },
  no: { en: "No", fr: "Non" },
  usedInstead: { en: "Used instead", fr: "Utilisé à la place" },
  whyNotHere: { en: "Why not here", fr: "Pourquoi pas ici" },
  whenRelevant: { en: "When it becomes relevant", fr: "Quand cela devient pertinent" },

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
      en: "Each layer exists because it provides a specific guarantee. A layer with no identifiable guarantee is at risk of becoming one more folder in the bucket.",
      fr: "Chaque couche existe parce qu’elle apporte une garantie précise. Si une couche n’apporte aucune garantie identifiable, elle risque simplement de devenir un dossier supplémentaire dans le bucket."
    }
  },
  walkthrough: {
    title: { en: "The walkthrough", fr: "Le parcours" },
    note: {
      en: "The full path runs from a clean clone to a fully removed AWS environment. Each step has a precise responsibility.",
      fr: "Le parcours complet va d’un clone propre jusqu’à un environnement AWS entièrement supprimé. Chaque étape a une responsabilité précise."
    }
  },
  decisions: {
    note: {
      en: "The choices below are not the only possible solutions. The point is to understand why this architecture was chosen for this specific workflow, and when another option would become more appropriate.",
      fr: "Les choix présentés ici ne sont pas les seules solutions possibles. L’objectif est plutôt de comprendre pourquoi cette architecture a été retenue pour ce workflow précis, et dans quelles circonstances une autre solution deviendrait plus pertinente."
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
    en: "An e-commerce company wants to make its data available to the Marketing and BI team. Orders come from the sales system as CSV. Products and customers come from the application as JSON. The problem is not loading them into AWS. We first have to understand what they contain, identify the inconsistencies, define the processing rules, then build a model reliable enough to answer the business questions.",
    fr: "Une entreprise e-commerce souhaite mettre ses données à disposition de l’équipe Marketing/BI. Les commandes proviennent du système de vente sous forme de CSV. Les produits et les clients proviennent de l’application sous forme de JSON. Le problème n’est pas de les charger dans AWS. Il faut d’abord comprendre ce qu’elles contiennent, identifier les incohérences, définir les règles de traitement, puis construire un modèle suffisamment fiable pour répondre aux questions métier."
  },
  zonesLine: "Bronze → Silver → Gold",
  zonesNote: {
    en: "Bronze keeps the data as close to its source as possible. Silver cleans it, types it and deduplicates it. Gold organises it into a star schema the BI team can query directly. The architecture and its governance are defined entirely with Terraform.",
    fr: "La Bronze conserve les données au plus près de leur source. La Silver les nettoie, les type et les déduplique. La Gold les organise dans un modèle en étoile directement exploitable par la BI. L’architecture et sa gouvernance sont entièrement définies avec Terraform."
  },
  explainIntro: {
    en: "A successful transformation is not measured only by the fact that queries return a result. We also have to be able to explain:",
    fr: "Mais une transformation réussie ne se mesure pas uniquement au fait que les requêtes retournent un résultat. Il faut aussi pouvoir expliquer :"
  },
  explainPoints: [
    { en: "what arrived from the sources;", fr: "ce qui est arrivé depuis les sources ;" },
    { en: "which anomalies were detected;", fr: "quelles anomalies ont été détectées ;" },
    { en: "which data was set aside, and why;", fr: "quelles données ont été écartées et pourquoi ;" },
    { en: "how the orphan keys were handled;", fr: "comment les clés orphelines ont été traitées ;" },
    { en: "and how to verify that the final model answers the business questions correctly.", fr: "et comment vérifier que le modèle final répond correctement aux questions métier." }
  ],
  explainClosing: {
    en: "The project puts that whole chain into practice, from raw data to decision.",
    fr: "C’est cette chaîne complète, de la donnée brute jusqu’à la décision, que ce projet met en pratique."
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
    [{ en: "Interface", fr: "Interface" }, { en: "Makefile, 11 targets", fr: "Makefile, 11 cibles" }],
    [{ en: "Orchestration", fr: "Orchestration" }, "run_pipeline.sh"],
    [{ en: "Tests", fr: "Tests" }, { en: "26 offline + 17 on AWS", fr: "26 hors ligne + 17 sur AWS" }],
    ["CI", { en: "GitHub Actions, offline checks",
             fr: "GitHub Actions, contrôles hors ligne" }],
    [{ en: "Region", fr: "Région" }, "us-east-1"],
    [{ en: "Teardown", fr: "Destruction" }, "terraform destroy"],
    [{ en: "Licence", fr: "Licence" }, "MIT"]
  ],
  footer: {
    en: "Every figure in this project is measured on the source files before the AWS resources are created. The results are then verified by the project's tests.",
    fr: "Chaque chiffre présenté dans ce projet est mesuré sur les fichiers sources avant la création des ressources AWS. Les résultats sont ensuite vérifiés par les tests du projet."
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
    { en: "Some data is therefore usable as it stands, and some requires an explicit rule.",
      fr: "Certaines données sont donc exploitables telles quelles, d’autres nécessitent une règle explicite." }
  ],
  closing: {
    en: "The engineering work is not simply to “clean” the data. We have to decide <strong>where each transformation belongs</strong>, measure what changes, verify that the rules produce the expected result, and make sure no data disappears between two layers without an explanation.",
    fr: "Le travail d’ingénierie ne consiste pas simplement à « nettoyer » les données. Il faut décider <strong>où chaque transformation doit être effectuée</strong>, mesurer ce qui change, vérifier que les règles produisent le résultat attendu et s’assurer qu’aucune donnée ne disparaît entre deux couches sans explication."
  }
};

/* ---------------------------------------------------------------------------
   02 · Two views, two questions
   --------------------------------------------------------------------------- */

export const views = {
  title: { en: "Two views, two questions", fr: "Deux vues, deux questions" },
  note: {
    en: "The project can be read in two ways. The first describes the path the data takes. The second describes how the environment is built, verified and removed. A step can belong to one of these paths without necessarily belonging to the other.",
    fr: "Le parcours peut être regardé de deux façons. La première décrit le chemin parcouru par la donnée. La seconde décrit la manière dont l’environnement est construit, vérifié et supprimé. Une étape peut donc appartenir à l’un de ces parcours sans nécessairement appartenir à l’autre."
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
    en: "This distinction matters. Profiling, for instance, observes the data without modifying it. Terraform creates the environment but transforms no data. The tests verify the behaviour of the project, some of them without even reaching AWS. Keeping the two views apart makes the system understandable without mixing data processing and infrastructure management.",
    fr: "Cette distinction est importante. Le profilage, par exemple, observe les données sans les modifier. Terraform crée l’environnement mais ne transforme aucune donnée. Les tests vérifient le comportement du projet, certains sans même accéder à AWS. Garder ces deux vues séparées permet de comprendre le système sans mélanger traitement des données et gestion de l’infrastructure."
  }
};

/* ---------------------------------------------------------------------------
   03 · Follow the numbers
   --------------------------------------------------------------------------- */

export const numbers = {
  title: { en: "Follow the numbers", fr: "Suivre les chiffres" },
  note: {
    en: "Every figure is measured directly on the source files or produced by an identifiable step of the pipeline. The point is not only to know that the pipeline produces 7,547 rows.",
    fr: "Chaque chiffre est mesuré directement sur les fichiers sources ou produit par une étape identifiable du pipeline. L’objectif n’est pas seulement de savoir que le pipeline produit 7 547 lignes."
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
    en: "These figures are not decorative values chosen for illustration. They exist to follow the data from one layer to the next and to explain the differences. The most important one is not the final volume: it is the 5.00% of revenue attached to orphan rows. Data can be imperfect and still matter to the analysis.",
    fr: "Ces chiffres ne sont pas des valeurs décoratives destinées à illustrer le propos. Ils servent à suivre la donnée d’une couche à l’autre et à expliquer les écarts. Le plus important n’est pas le volume final : c’est le 5,00 % de chiffre d’affaires associé aux lignes orphelines. Une donnée peut être imparfaite tout en restant importante pour l’analyse."
  }
};

/* ---------------------------------------------------------------------------
   04 · How the project runs
   --------------------------------------------------------------------------- */

export const howItRuns = {
  title: { en: "How the project runs", fr: "Comment le projet s’exécute" },
  note: {
    en: "The project uses a Makefile as a standardised interface for local commands. The Makefile does not replace an orchestrator such as Airflow. It simply provides a consistent entry point for a short, linear workflow. There is no scheduler here, no automatic retry after failure, and no complex dependency graph. The project does not need them.",
    fr: "Le projet utilise un Makefile comme interface standardisée pour les commandes locales. Le Makefile ne remplace pas un orchestrateur comme Airflow. Il fournit simplement un point d’entrée cohérent pour un workflow court et linéaire. Il n’y a ici ni planificateur, ni reprise automatique après échec, ni graphe complexe de dépendances. Le projet n’en a pas besoin."
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
    en: "A command must have one clear, predictable responsibility.",
    fr: "Une commande doit avoir une responsabilité claire et prévisible."
  },

  /* Four cards, one vertical chain each. Only the commands that expand into
     something worth drawing get a card. The full list of ten commands lives in
     the three families below, which is the reference, and the per-command
     detail lives in the walkthrough step that runs it. Ten cards here produced
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
                                    { en: "17 assertions", fr: "17 assertions" }] }
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
        { cmd: "make analytics", what: { en: "Answer the six business questions", fr: "Répondre aux six questions métier" } },
        { cmd: "make test-aws",  what: { en: "Verify the deployed lake", fr: "Vérifier le lac déployé" } },
        { cmd: "make destroy",   what: { en: "Remove everything", fr: "Tout supprimer" } }
      ]
    },
    {
      key: "inspection",
      name: { en: "Inspection and validation", fr: "Inspection et validation" },
      note: { en: "Optional. None of these is part of the main pipeline.", fr: "Optionnelles. Aucune ne fait partie du pipeline principal." },
      items: [
        { cmd: "make quality",  what: { en: "Profile the raw data", fr: "Profiler les données brutes" } },
        { cmd: "make test",     what: { en: "26 assertions, no AWS access", fr: "26 assertions, sans accès AWS" } },
        { cmd: "make validate", what: { en: "Terraform format and syntax", fr: "Format et syntaxe Terraform" } },
        { cmd: "make fmt",      what: { en: "Reformat the Terraform files", fr: "Reformater les fichiers Terraform" } }
      ]
    },
    {
      key: "docs",
      name: { en: "Consultation", fr: "Consultation" },
      note: { en: "Serves this page locally.", fr: "Sert cette page en local." },
      items: [
        { cmd: "make docs", what: "http://localhost:8000" }
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
      en: "This separation is deliberate. It makes it possible to know exactly what happens when a command is run, and prevents an analysis or a validation from being triggered simply because someone wanted to rebuild the data.",
      fr: "Cette séparation est volontaire. Elle permet de savoir exactement ce qui se passe lorsqu’une commande est exécutée et d’éviter qu’une opération d’analyse ou de validation soit déclenchée simplement parce qu’on souhaite reconstruire les données."
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
    { en: "order with no matching identifier.", fr: "commande qui ne possède pas d’identifiant correspondant." }
  ],
  innerTitle: { en: "What an INNER JOIN can make disappear", fr: "Ce qu’un INNER JOIN peut faire disparaître" },
  innerBody: {
    en: "An <code>INNER JOIN</code> on the dimensions removes the rows that find no match. The query keeps working. It does not necessarily raise an error. The report renders. The totals look plausible. Yet part of the revenue has disappeared. Here that is about <strong>5% of revenue</strong>.",
    fr: "Un <code>INNER JOIN</code> sur les dimensions élimine les lignes qui ne trouvent pas de correspondance. La requête continue de fonctionner. Elle ne génère pas nécessairement d’erreur. Le rapport s’affiche. Les totaux semblent plausibles. Pourtant, une partie du chiffre d’affaires a disparu. Ici, cela représente environ <strong>5 % du chiffre d’affaires</strong>."
  },
  comparison: {
    caption: { en: "The same query, two approaches", fr: "La même requête, deux approches" },
    measure: { en: "Measure", fr: "Mesure" },
    columns: [
      { en: "With convention keys", fr: "Avec convention keys" },
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
      { en: "An orphan key is a referential integrity problem. It is not automatically a reason to delete the business data. If an order genuinely exists, it must keep contributing to revenue even when the matching dimension is incomplete.",
        fr: "Une clé orpheline est un problème d’intégrité référentielle. Ce n’est pas automatiquement une raison pour supprimer la donnée métier. Si une commande existe réellement, elle doit continuer à contribuer au chiffre d’affaires, même si la dimension correspondante est incomplète." }
    ],
    keysLead: { en: "The model therefore uses convention keys such as:", fr: "Le modèle utilise donc des clés de convention telles que :" },
    keys: "-1\n-2",
    keysNote: {
      en: "Orphan rows are attached to these values when no real match exists.",
      fr: "Les lignes orphelines sont rattachées à ces valeurs lorsqu’aucune correspondance réelle n’existe."
    },
    sumLead: { en: "Revenue can then be computed with:", fr: "On peut ainsi calculer :" },
    sumCode: "SUM(line_amount)",
    sumNote: {
      en: "without losing revenue simply because a dimension does not hold the matching key.",
      fr: "sans perdre le chiffre d’affaires simplement parce qu’une dimension ne possède pas la clé correspondante."
    },
    isolateLead: { en: "The problematic rows also stay identifiable. For example:", fr: "Les lignes problématiques restent également identifiables. Par exemple :" },
    isolateCode: "WHERE product_id = -1",
    isolateNote: { en: "isolates them.", fr: "permet de les isoler." }
  },
  reasons: {
    title: { en: "Why this decision matters", fr: "Pourquoi cette décision compte" },
    lead: { en: "The analytical model has to keep two different pieces of information:",
            fr: "Le modèle analytique doit conserver deux informations différentes :" },
    items: [
      { en: "<strong>the business reality</strong>, here the order and its amount;",
        fr: "<strong>la réalité métier</strong>, ici la commande et son montant ;" },
      { en: "<strong>the quality of the reference</strong>, here the missing match in the catalog.",
        fr: "<strong>la qualité de la référence</strong>, ici l’absence de correspondance dans le catalogue." }
    ]
  },
  closing: {
    en: "Deleting the row mixes the two problems together. Keeping it with a convention key makes it possible to treat them separately.",
    fr: "Supprimer la ligne mélange les deux problèmes. La conserver avec une clé de convention permet de les traiter séparément."
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
      text: { en: "Keeps the data as faithful to the sources as possible. The principle is to hold a raw reference that lets us go back to what was actually received.",
              fr: "La zone Bronze conserve les données aussi fidèlement que possible par rapport aux sources. Le principe est de disposer d’une référence brute permettant de revenir à ce qui a réellement été reçu." } },
    { key: "silver", path: "silver/",
      title: { en: "Silver", fr: "Silver" },
      volume: { en: "7,547 rows · 39 spellings to 10", fr: "7 547 lignes · 39 orthographes vers 10" },
      text: { en: "Cleans the form of the data without changing its business meaning: types, formats, country spellings, duplicates, and the edge cases found during profiling. 409 rows are removed by five numbered rules. The 376 orphan rows are kept.",
              fr: "La couche Silver nettoie la forme des données sans modifier leur sens métier : les types, les formats, les orthographes de pays, les doublons et les cas limites identifiés pendant le profilage. 409 lignes sont retirées selon cinq règles numérotées. Les 376 lignes orphelines, elles, sont conservées." } },
    { key: "gold", path: "gold/",
      title: { en: "Gold", fr: "Gold" },
      volume: { en: "7,547 facts + 354 dimension rows", fr: "7 547 faits + 354 lignes de dimensions" },
      text: { en: "The final analytical model. The star schema is ready for business analysis, and the checks verify in particular that joining the dimensions does not change the row count or the revenue unexpectedly.",
              fr: "La couche Gold constitue le modèle analytique final. Le modèle en étoile est prêt pour les analyses métier, et les contrôles vérifient notamment que les jointures avec les dimensions ne modifient pas de manière inattendue le nombre de lignes ou le chiffre d’affaires." } },
    { key: "results", path: "athena-results/",
      title: { en: "Athena results", fr: "Résultats Athena" },
      volume: { en: "query output", fr: "sorties de requêtes" },
      text: { en: "This prefix holds the result sets generated by Athena.",
              fr: "Ce préfixe contient les résultats générés par Athena." } }
  ],
  closing: {
    en: "The project stays deliberately compact. Terraform owns the infrastructure. Athena provides the SQL engine. Glue provides the metadata. S3 provides the storage. Python and pytest verify the behaviour. GitHub Actions automates the checks. Each component has an identifiable role. The result is not an architecture designed to cover every possible case. It is an architecture suited to this workflow, with choices explicit enough to be challenged when the constraints change.",
    fr: "Le projet reste volontairement compact. Terraform possède l’infrastructure. Athena fournit le moteur SQL. Glue fournit les métadonnées. S3 fournit le stockage. Python et pytest vérifient le comportement. GitHub Actions automatise les contrôles. Chaque composant a donc un rôle identifiable. Le résultat n’est pas une architecture conçue pour couvrir tous les cas possibles. C’est une architecture adaptée à ce workflow, avec des choix suffisamment explicites pour pouvoir être remis en question lorsque les contraintes changent."
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
    format: { en: "the question this layer answers", fr: "la question à laquelle cette couche répond" },
    principle: {
      en: "What did the source actually send, and when?",
      fr: "Qu’est-ce que la source a réellement envoyé, et quand ?"
    },
    guaranteeText: {
      en: "External tables make it possible to work on this data without moving its contents. A <code>DROP</code> removes the table definition, not the source files.",
      fr: "Les tables externes permettent de travailler sur ces données sans déplacer leur contenu. Un <code>DROP</code> supprime la définition de la table, pas les fichiers sources."
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
      en: "The data is transformed according to the rules the project defines. Orphan rows are therefore not deleted simply because they do not match the dimensions.",
      fr: "Les données sont transformées selon les règles définies par le projet. Les lignes orphelines ne sont donc pas supprimées simplement parce qu’elles ne correspondent pas aux dimensions."
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
      en: "The Gold layer organises the data into a star schema. It answers the business questions while keeping the checks needed to verify that the transformations introduced no unexpected loss.",
      fr: "La couche Gold organise les données dans un modèle en étoile. Elle permet de répondre aux questions métier tout en conservant les contrôles nécessaires pour vérifier que les transformations n’ont pas introduit de pertes inattendues."
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
      en: "the main objective is to verify that the local environment and the project are ready.",
      fr: "l'objectif principal est de vérifier que l’environnement local et le projet sont prêts."
    },
    why: {
      en: "A failure can come from two places: the local environment, or the project itself. It is better to rule out the environment first. The offline checks validate a significant part of the project without an AWS account and without generating any cost.",
      fr: "Un échec peut provenir de deux endroits : l’environnement local ou le projet lui-même. Il est préférable d’éliminer d’abord les problèmes liés à l’environnement. Les vérifications hors ligne permettent de valider une partie importante du projet sans compte AWS et sans générer de coût."
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
      { en: "26 offline assertions", fr: "26 assertions hors ligne" },
      "make validate",
      "terraform fmt -check",
      "terraform init -backend=false",
      "terraform validate"
    ],
    whatHappens: {
      en: "<code>uv sync</code> creates the project environment from <code>pyproject.toml</code> and <code>uv.lock</code>. It applies the project’s Python 3.13 requirement and installs the locked test dependencies. <code>make test</code> then runs the 26 assertions that read the source files and the SQL. They do not contact AWS. <code>make validate</code> checks Terraform formatting and syntax. The <code>-backend=false</code> option initialises Terraform without using the remote backend, so this check can be run without AWS credentials.",
      fr: "<code>uv sync</code> crée l’environnement du projet à partir de <code>pyproject.toml</code> et <code>uv.lock</code>. Il applique la contrainte Python 3.13 du projet et installe les dépendances de test verrouillées. <code>make test</code> exécute ensuite les 26 assertions qui lisent les fichiers sources et le SQL. Elles ne contactent pas AWS. <code>make validate</code> vérifie le formatage et la syntaxe Terraform. L’option <code>-backend=false</code> permet d’initialiser Terraform sans utiliser le backend distant : cette vérification peut donc être réalisée sans identifiants AWS."
    },
    check: {
      caption: { en: "Before going further", fr: "Avant d’aller plus loin" },
      rows: [
        [{ en: "Required tools", fr: "Outils nécessaires" }, "git, make, terraform, uv, jq"],
        ["uv run python --version", "Python 3.13.5"],
        ["uv run pytest --version", "pytest 9.1.1"],
        ["make test", "26 passed, 17 deselected"],
        [{ en: "AWS resources created", fr: "Ressources AWS créées" }, { en: "none at this stage", fr: "aucune à ce stade" }],
        [{ en: "Expected cost", fr: "Coût attendu" }, "$0.00"]
      ]
    },
    whyItMatters: {
      en: "This also lets CI run the offline tests on every push without generating AWS costs.",
      fr: "Cela permet également à la CI de lancer les tests hors ligne à chaque push sans générer de coûts AWS."
    },
    keyIdea: {
      en: "Verify locally everything that can be verified before deploying.",
      fr: "Vérifier localement tout ce qui peut l’être avant de déployer."
    },
    blocks: [
      {
        type: "pitfall",
        title: { en: "IMPORTANT", fr: "IMPORTANT" },
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
      en: "The deployment is described entirely in the Terraform code. Nothing is created by hand in the AWS console, which is what makes the environment reviewable and reproducible.",
      fr: "Le déploiement est entièrement décrit dans le code Terraform. Rien n’est créé à la main dans la console AWS, ce qui rend l’environnement relisible et reproductible."
    },
    run: {
      cmd: "aws sts get-caller-identity\ncp terraform/terraform.tfvars.example terraform/terraform.tfvars\nmake deploy",
      note: {
        en: "Confirm which AWS account is about to be billed, then copy the example file and fill in the required variables. Both belong to the deployment, which is why neither is needed for the local checks.",
        fr: "Confirmer quel compte AWS va être facturé, puis copier le fichier d’exemple et renseigner les variables nécessaires. Les deux relèvent du déploiement : ils ne sont donc pas nécessaires aux contrôles locaux."
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
        [{ en: "Prefixes", fr: "Préfixes" }, "bronze/ silver/ gold/ athena-results/"],
        [{ en: "Catalog", fr: "Catalogue" }, "AWS Glue Data Catalog"],
        [{ en: "Guardrails", fr: "Garde-fous" }, { en: "Budgets, SNS, CloudWatch", fr: "Budgets, SNS, CloudWatch" }],
        [{ en: "Console clicks", fr: "Clics dans la console" }, "0"]
      ]
    },
    whyItMatters: {
      en: "Infrastructure as code is not about avoiding the console. It makes the environment a reviewable artefact: the bucket name, the IAM policy and the budget threshold are all in a diff someone can read.",
      fr: "L’infrastructure as code ne sert pas à éviter la console. Elle fait de l’environnement un artefact relisible : le nom du bucket, la politique IAM et le seuil de budget sont tous dans un diff que quelqu’un peut lire."
    },
    keyIdea: {
      en: "If it is not in the code, it does not exist.",
      fr: "Si ce n’est pas dans le code, cela n’existe pas."
    },
    blocks: [
      {
        type: "code",
        caption: "terraform/main.tf",
        lang: "hcl",
        does: { en: "Creates the bucket and its four zone prefixes.", fr: "Crée le bucket et ses quatre préfixes de zone." },
        matters: {
          en: "<code>force_destroy</code> is what makes step 10 work. S3 refuses to delete a non-empty bucket, so without this line the teardown fails halfway and leaves billable resources behind.",
          fr: "<code>force_destroy</code> est ce qui fait fonctionner l’étape 10. S3 refuse de supprimer un bucket non vide : sans cette ligne, la destruction échoue à mi-parcours et laisse des ressources facturables."
        },
        expect: { en: "4 objects created, one per zone.", fr: "4 objets créés, un par zone." },
        text: `resource "aws_s3_bucket" "datalake" {
  bucket = local.bucket_name

  # Without this, destroy fails on a non-empty bucket and the lab leaves
  # billable resources behind. Correct for a lab, dangerous in production.
  force_destroy = true
}

resource "aws_s3_object" "zones" {
  for_each = toset(["bronze/", "silver/", "gold/", "athena-results/"])
  bucket   = aws_s3_bucket.datalake.id
  key      = each.value
}`
      },
      {
        type: "pitfall",
        title: { en: "Confirm the SNS subscription", fr: "Confirmez l’abonnement SNS" },
        text: {
          en: "The email subscription is created in state <code>PendingConfirmation</code>. Until you click the link AWS sends, the alarm fires into the void. Terraform reports success either way, because from its point of view the subscription exists.",
          fr: "L’abonnement e-mail est créé à l’état <code>PendingConfirmation</code>. Tant que vous n’avez pas cliqué sur le lien envoyé par AWS, l’alarme se déclenche dans le vide. Terraform signale un succès dans les deux cas, car de son point de vue l’abonnement existe."
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
      en: "The source files are placed in the Bronze zone. They are the raw representation of the data the system received.",
      fr: "Les fichiers sources sont déposés dans la zone Bronze. Ils constituent la représentation brute des données reçues par le système."
    },
    why: {
      en: "Bronze answers one question: what did the source send, and when? If ingestion also cleaned, we would lose the ability to prove what arrived, and every later count would be an opinion.",
      fr: "Bronze répond à une question : qu’a envoyé la source, et quand ? Si l’ingestion nettoyait aussi, on perdrait la capacité de prouver ce qui est arrivé, et chaque décompte ultérieur deviendrait une opinion."
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
      fr: "Bronze fonctionne en ajout seul. Relancer l’ingestion un autre jour ajoute une nouvelle partition à côté de la première, ce qui fait de la couche brute un enregistrement plutôt qu’un cache."
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
        [{ en: "Header leaked into the data", fr: "En-tête ayant fui dans les données" }, "0"],
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
          en: "This file contains 29 dates written <code>31/02/2026</code>. With a <code>date</code> column, one bad value fails the <em>whole</em> query with <code>HIVE_BAD_DATA</code>, so we lose the 7,927 good rows in order to read the 29 bad ones. Typing is a judgement about the data, and that judgement belongs to Silver, where <code>TRY_CAST</code> can count what it rejects. The two JSON files come from an API with a schema enforced in code, so they keep native types.",
          fr: "Ce fichier contient 29 dates écrites <code>31/02/2026</code>. Avec une colonne <code>date</code>, une seule mauvaise valeur fait échouer la requête <em>entière</em> avec <code>HIVE_BAD_DATA</code> : on perd les 7 927 bonnes lignes pour lire les 29 mauvaises. Typer est un jugement sur la donnée, et ce jugement appartient à Silver, où <code>TRY_CAST</code> peut compter ce qu’il rejette. Les deux fichiers JSON proviennent d’une API à schéma imposé par le code : ils conservent leurs types natifs."
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
      en: "The raw data is analysed before it is transformed. This step measures the anomalies and verifies that the cleaning rules match what is actually in the sources.",
      fr: "Les données brutes sont analysées avant leur transformation. Cette étape mesure les anomalies et permet de vérifier que les règles de nettoyage correspondent bien à ce qui se trouve réellement dans les sources."
    },
    why: {
      en: "A cleaning rule we cannot justify with a number is a rule we cannot defend when someone asks where the missing revenue went. Measuring first also turns Silver into a prediction that can be proved wrong.",
      fr: "Une règle de nettoyage qu’on ne peut pas justifier par un chiffre est une règle qu’on ne pourra pas défendre le jour où l’on demandera où est passé le chiffre d’affaires manquant. Mesurer d’abord transforme aussi Silver en une prédiction réfutable."
    },
    run: {
      cmd: "make quality",
      note: {
        en: "This command is not part of make pipeline. It is read-only: it writes nothing and drops nothing. Profiling shows the real state of the data before the transformation rules are applied; the analytical queries answer the business questions afterwards. These two uses of SQL are deliberately kept apart.",
        fr: "Cette commande ne fait pas partie de make pipeline. Elle est en lecture seule : elle n’écrit rien et ne supprime rien. Le profilage permet de comprendre l’état réel des données avant d’appliquer les règles de transformation ; les requêtes analytiques, elles, répondent ensuite aux questions métier. Ces deux usages de SQL sont volontairement séparés."
      }
    },
    flow: ["make quality", "run_pipeline.sh quality", "sql/02_quality.sql", "15 read-only queries"],
    whatHappens: {
      en: "Fifteen profiling queries read the bronze tables and count the defects by class. Nothing is written to S3, no table is created, and no row is removed. The output is a report we read before deciding anything.",
      fr: "Quinze requêtes de profilage lisent les tables bronze et comptent les défauts par classe. Rien n’est écrit sur S3, aucune table n’est créée, aucune ligne n’est retirée. Le résultat est un rapport que vous lisez avant de décider quoi que ce soit."
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
      en: "Three of these findings are not in the brief, and each one changes a later decision. Profiling is how we find them. Reading the specification is not.",
      fr: "Trois de ces constats ne figurent pas dans l’énoncé, et chacun modifie une décision ultérieure. Le profilage permet de les trouver. Lire la spécification, non."
    },
    keyIdea: {
      en: "Measure the data first, then decide how to transform it.",
      fr: "On mesure d’abord les données, puis on décide comment les transformer."
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
      en: "The raw layer is unusable for analysis. Every column is text, dates are unparseable, countries are spelled 39 ways. Silver fixes the form of the data so that a query can run. It does not decide what the data means.",
      fr: "La couche brute est inexploitable pour l’analyse. Chaque colonne est du texte, les dates sont inanalysables, les pays s’écrivent de 39 façons. Silver corrige la forme de la donnée pour qu’une requête puisse s’exécuter. Elle ne décide pas de ce que la donnée signifie."
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
      en: "The cleaning applies to the form of the data, not to its business meaning. Orphan rows are therefore not deleted simply because they do not match the dimensions.",
      fr: "Le nettoyage porte sur la forme des données, pas sur leur sens métier. Les lignes orphelines ne sont donc pas supprimées simplement parce qu’elles ne correspondent pas aux dimensions."
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
      en: "The Silver data is transformed into a dimensional model. The result is a star schema made of the facts and dimensions the analyses need.",
      fr: "Les données Silver sont transformées en modèle dimensionnel. Le résultat est un modèle en étoile composé des faits et dimensions nécessaires aux analyses."
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
      en: "The checks verify in particular that joining the dimensions does not change the row count or the revenue unexpectedly. That equality is the proof that no fact was lost or duplicated.",
      fr: "Les contrôles vérifient notamment que les jointures avec les dimensions ne modifient pas de manière inattendue le nombre de lignes ou le chiffre d’affaires. Cette égalité est la preuve qu’aucun fait n’a été perdu ni dupliqué."
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
    flow: ["make analytics", "run_pipeline.sh analytics", "sql/05_analytics.sql"],
    whatHappens: {
      en: "The analytical queries run against the Gold tables. Athena writes the result sets to the <code>athena-results/</code> prefix, where they can be read from the console or with <code>aws athena get-query-results</code>.",
      fr: "Les requêtes analytiques s’exécutent sur les tables Gold. Athena écrit les jeux de résultats dans le préfixe <code>athena-results/</code>, où ils peuvent être lus depuis la console ou avec <code>aws athena get-query-results</code>."
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
      en: "Two of these questions have an obvious wrong answer that looks right. Both are recorded below, because the value of a modelled layer is that it makes the wrong answer avoidable, not impossible.",
      fr: "Deux de ces questions ont une mauvaise réponse évidente qui a l’air juste. Les deux sont consignées ci-dessous, car l’intérêt d’une couche modélisée est de rendre la mauvaise réponse évitable, pas impossible."
    },
    keyIdea: {
      en: "A number without its caveat is a number someone will misuse.",
      fr: "Un chiffre sans sa réserve est un chiffre que quelqu’un utilisera de travers."
    },
    blocks: [
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
      en: "The tests are split into two groups: those that need no AWS access, and those that verify the behaviour of the lake once it is actually deployed.",
      fr: "Les tests sont séparés en deux groupes : ceux qui ne nécessitent aucun accès AWS, et ceux qui vérifient le comportement du lac réellement déployé."
    },
    why: {
      en: "This separation makes it possible to test the logic of the project quickly, then verify the integration with AWS separately.",
      fr: "Cette séparation permet de tester rapidement la logique du projet, puis de vérifier séparément l’intégration avec AWS."
    },
    run: { cmd: "make test\nmake test-aws" },
    flow: ["make test", "26 offline assertions", "make test-aws", "17 assertions on the deployed lake"],
    whatHappens: {
      en: "<code>make test</code> runs 26 assertions that read the source files and the SQL text. <code>make test-aws</code> reads the bucket name and database from the Terraform outputs, submits queries to Athena and compares the results to expected values written in the test file. The numbers are hard-coded on purpose: a test that recomputes the expected value with the same logic as the code under test proves nothing.",
      fr: "<code>make test</code> exécute 26 assertions qui lisent les fichiers sources et le texte SQL. <code>make test-aws</code> lit le nom du bucket et la base dans les sorties Terraform, soumet des requêtes à Athena et compare les résultats aux valeurs attendues écrites dans le fichier de test. Les chiffres sont en dur volontairement : un test qui recalcule la valeur attendue avec la même logique que le code testé ne prouve rien."
    },
    check: {
      caption: { en: "What the suite covers", fr: "Ce que couvre la suite" },
      rows: [
        [{ en: "Offline assertions", fr: "Assertions hors ligne" }, "26"],
        [{ en: "AWS assertions", fr: "Assertions AWS" }, "17"],
        [{ en: "Bronze fidelity", fr: "Fidélité Bronze" }, { en: "7,956 / 130 / 130", fr: "7 956 / 130 / 130" }],
        ["Silver", { en: "7,547 rows, 10 countries, 376 orphans kept", fr: "7 547 lignes, 10 pays, 376 orphelines conservées" }],
        ["Gold", { en: "no fan-out, no unhandled orphan key", fr: "aucun fan-out, aucune clé orpheline non traitée" }]
      ]
    },
    whyItMatters: {
      en: "The most valuable tests here are not the row counts. They are the invariants: properties that must hold no matter what the data looks like.",
      fr: "Les tests les plus utiles ici ne sont pas les décomptes de lignes. Ce sont les invariants : des propriétés qui doivent tenir quelle que soit la donnée."
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
      en: "Destruction is part of the normal workflow of the project, which is designed to be rebuilt.",
      fr: "La destruction fait partie du workflow normal du projet, qui est conçu pour être reconstruit."
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
      en: "Destroying is part of the run, not an afterthought. The AWS validation is manual from start to finish, so nothing tears the infrastructure down on its own: <code>deploy</code>, <code>pipeline</code>, <code>analytics</code>, <code>test-aws</code>, <code>destroy</code> is one sequence, and the last command is the one that stops the billing.",
      fr: "La destruction fait partie de l’exécution, pas d’un après-coup. La validation AWS est manuelle du début à la fin : rien ne démonte l’infrastructure tout seul. <code>deploy</code>, <code>pipeline</code>, <code>analytics</code>, <code>test-aws</code>, <code>destroy</code> forment une seule séquence, et la dernière commande est celle qui arrête la facturation."
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
          en: "S3 refuses to delete a non-empty bucket. Without <code>force_destroy = true</code>, destroy fails halfway, the state no longer matches reality, and billable resources are left behind. It is correct here and genuinely dangerous in production.",
          fr: "S3 refuse de supprimer un bucket non vide. Sans <code>force_destroy = true</code>, la destruction échoue à mi-parcours, le state ne correspond plus à la réalité, et des ressources facturables restent en place. C’est correct ici et réellement dangereux en production."
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
  title: { en: "The six business questions", fr: "Les 6 questions métier" },
  note: {
    en: "The six queries below are the ones in <code>sql/05_analytics.sql</code>, shown without their comments. The figures beside each question are measured, not estimated.",
    fr: "Les six requêtes ci-dessous sont celles du fichier <code>sql/05_analytics.sql</code>, présentées sans leurs commentaires. Les chiffres associés à chaque question sont mesurés, pas estimés."
  },
  source: "sql/05_analytics.sql",
  tableTitle: {
    en: "The six questions and what they returned",
    fr: "Les six questions et ce qu’elles ont retourné"
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
    en: "Use the simplest tool that fits the workflow.",
    fr: "Utiliser l’outil le plus simple adapté au workflow."
  },
  principle: {
    en: "Do not add an orchestration platform simply because a project has several steps.",
    fr: "N’ajoutez pas une plateforme d’orchestration simplement parce qu’un projet comporte plusieurs étapes."
  },
  items: [
    {
      tool: "Airflow",
      why: {
        en: "The pipeline is short, linear and run by a shell script with an exit code. Here, adding Airflow would mainly create more infrastructure to manage.",
        fr: "Le pipeline est court, linéaire et exécuté par un script shell avec un code de sortie. Ici, l’ajout d’Airflow créerait surtout une infrastructure supplémentaire à gérer."
      },
      when: {
        en: "Airflow would become relevant if the workflow had to handle many dependencies, scheduled runs, recovery after failure, more complex workflows, or more observability and operational management.",
        fr: "Airflow deviendrait pertinent si le workflow devait gérer de nombreuses dépendances, des exécutions planifiées, des reprises après échec, des workflows plus complexes, ou davantage d’observabilité et de gestion opérationnelle."
      },
      instead: { en: "run_pipeline.sh, called by the Makefile", fr: "run_pipeline.sh, appelé par le Makefile" }
    },
    {
      tool: "dbt",
      why: {
        en: "The SQL is executed directly by Athena. The choice therefore depends on the real complexity of the project, not on the popularity of the tool.",
        fr: "Le SQL est exécuté directement par Athena. Le choix dépend donc de la complexité réelle du projet, pas de la popularité de l’outil."
      },
      when: {
        en: "dbt would become relevant once the project had many SQL models, dependencies between models, tests built into the transformation cycle, documentation, and a team maintaining and sharing the transformations.",
        fr: "dbt deviendrait pertinent lorsque le projet comporterait de nombreux modèles SQL, des dépendances entre modèles, des tests intégrés au cycle de transformation, de la documentation, et une équipe amenée à maintenir et partager les transformations."
      },
      instead: { en: "Five numbered .sql files, run in order", fr: "Cinq fichiers .sql numérotés, exécutés dans l’ordre" }
    },
    {
      tool: { en: "Remote Terraform backend", fr: "Backend Terraform distant" },
      why: {
        en: "The project uses local Terraform state.",
        fr: "Le projet utilise un état Terraform local."
      },
      when: {
        en: "A remote backend becomes relevant when several people have to work on the same infrastructure, with shared state and appropriate locking.",
        fr: "Un backend distant devient pertinent lorsque plusieurs personnes doivent travailler sur la même infrastructure, avec un état partagé et des mécanismes de verrouillage adaptés."
      },
      instead: { en: "Local state, git-ignored", fr: "État local, ignoré par git" }
    }
  ]
};

/* ---------------------------------------------------------------------------
   13 · Built to be rebuilt
   --------------------------------------------------------------------------- */

export const reproducibility = {
  title: { en: "Built to be rebuilt", fr: "Conçu pour être reconstruit" },
  thesis: {
    en: "Reproducibility is not only a property of the deployment. It is what lets us understand what the system actually does.",
    fr: "La reproductibilité n’est pas seulement une propriété du déploiement. Elle permet de comprendre ce que fait réellement le système."
  },
  componentsTitle: { en: "What the project rests on", fr: "Ce sur quoi repose le projet" },
  components: [
    ["Terraform", { en: "Infrastructure as Code", fr: "Infrastructure as Code" }],
    [{ en: "AWS resources", fr: "Ressources AWS" }, "S3, Glue, IAM, Budgets, SNS, CloudWatch"],
    [{ en: "Pipeline", fr: "Pipeline" }, { en: "Executable shell script", fr: "Script shell exécutable" }],
    [{ en: "Python environment", fr: "Environnement Python" },
     { en: "Reproducible Python 3.13 environment via pyproject.toml and uv.lock",
       fr: "Environnement Python 3.13 reproductible via pyproject.toml et uv.lock" }],
    [{ en: "Tests", fr: "Tests" }, { en: "26 offline tests + 17 AWS tests", fr: "26 tests hors ligne + 17 tests AWS" }],
    ["CI", { en: "GitHub Actions, offline only", fr: "GitHub Actions, hors ligne uniquement" }],
    [{ en: "AWS validation", fr: "Validation AWS" },
     { en: "manual, make test-aws", fr: "manuelle, make test-aws" }],
    [{ en: "Teardown", fr: "Destruction" }, "terraform destroy"]
  ],
  claimsTitle: { en: "The guarantees sought", fr: "Les garanties recherchées" },
  claimsLead: {
    en: "On every change, the project must make it possible to verify that:",
    fr: "À chaque modification, le projet doit permettre de vérifier que :"
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
      en: "CI does not simply check that the files exist, it verifies the behaviour of the project. Two halves, and only one of them is automatic. <strong>The automatic half</strong> runs on every push and never touches AWS: Terraform <code>fmt</code>, <code>init</code>, <code>validate</code> and tflint, ShellCheck on the shell scripts, the offline test suite, and the guards that stop Gold from reading Bronze. It needs no credentials and costs nothing. <strong>The AWS half is manual</strong>: <code>make deploy</code>, <code>make pipeline</code>, <code>make analytics</code>, <code>make test-aws</code>, <code>make destroy</code>, run against a real account when there is a reason to run them. Nothing deploys or bills on a schedule.",
      fr: "La CI ne se contente pas de vérifier que les fichiers existent, elle vérifie le comportement du projet. Deux moitiés, dont une seule est automatique. <strong>La moitié automatique</strong> s’exécute à chaque push et ne touche jamais à AWS : Terraform <code>fmt</code>, <code>init</code>, <code>validate</code> et tflint, ShellCheck sur les scripts, la suite de tests hors ligne, et les gardes qui empêchent la Gold de lire la Bronze. Elle ne demande aucune clé et ne coûte rien. <strong>La moitié AWS est manuelle</strong> : <code>make deploy</code>, <code>make pipeline</code>, <code>make analytics</code>, <code>make test-aws</code>, <code>make destroy</code>, lancées sur un compte réel quand il y a une raison de les lancer. Rien ne se déploie ni ne se facture sur un calendrier."
    }
  },
  traceTitle: { en: "What reproducibility buys", fr: "Ce que la reproductibilité apporte" },
  traceLead: {
    en: "A reproducible environment makes it possible to tell apart:",
    fr: "Un environnement reproductible permet notamment de distinguer :"
  },
  trace: [
    { en: "what comes from the source data;", fr: "ce qui vient des données sources ;" },
    { en: "what comes from the transformations;", fr: "ce qui vient des transformations ;" },
    { en: "what comes from the infrastructure;", fr: "ce qui vient de l’infrastructure ;" },
    { en: "what comes from the quality rules;", fr: "ce qui vient des règles de qualité ;" },
    { en: "what comes from the business queries.", fr: "ce qui vient des requêtes métier." }
  ],
  traceClosing: {
    en: "That traceability is what makes it possible to understand the results rather than simply observe them.",
    fr: "C’est cette traçabilité qui permet de comprendre les résultats plutôt que de simplement les constater."
  }
};

/* ---------------------------------------------------------------------------
   14 · In summary
   --------------------------------------------------------------------------- */

export const summary = {
  title: { en: "In summary", fr: "En résumé" },
  thesis: {
    en: "A reliable data pipeline is not just moving data from one system to another.",
    fr: "Un pipeline Data fiable ne se résume pas à faire passer les données d’un système à un autre."
  },
  lead: { en: "We have to know:", fr: "Il faut savoir :" },
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
    en: "The project uses a deliberately limited set of tools:",
    fr: "Le projet utilise pour cela un ensemble volontairement limité d’outils :"
  },
  stack: ["AWS", "S3", "Glue", "Athena", "Terraform", "SQL", "Python", "pytest", "GitHub Actions"],
  stackNote: {
    en: "What makes the project interesting is less the number of services used than the way they are assembled and verified.",
    fr: "L’intérêt du projet est moins le nombre de services utilisés que la manière dont ils sont assemblés et vérifiés."
  },
  closing: {
    en: "Every figure is measured on the source files before any AWS resource exists, then verified by the test suite. The infrastructure is defined by Terraform. The transformations are defined in SQL. The workflow commands are standardised by the Makefile. The checks are automated by the tests. The environment can be destroyed and created again. That combination is what turns a simple data transformation exercise into a Data Engineering project that can genuinely be examined, explained and reproduced.",
    fr: "Chaque chiffre est mesuré sur les fichiers sources avant l’existence de toute ressource AWS, puis vérifié par la suite des tests d’exécution. L’infrastructure est définie par Terraform. Les transformations sont définies en SQL. Les commandes du workflow sont standardisées par le Makefile. Les contrôles sont automatisés par les tests. L’environnement peut être détruit puis recréé. C’est cette combinaison qui permet de passer d’un simple exercice de transformation de données à un projet Data Engineering que l’on peut réellement examiner, expliquer et reproduire."
  }
};
