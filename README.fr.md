# E-commerce Data Lake sur AWS

[English](README.md) · **Français**

Une étude de cas Cloud Data Engineering sur AWS. Deux sources déconnectées, un export de commandes ERP et un catalogue applicatif, sont déposées dans S3, nettoyées et réconciliées selon une architecture médaillon bronze → silver → gold, modélisées en schéma en étoile, interrogées avec Athena et contrôlées par des tests automatisés. L’ensemble de l’environnement est provisionné avec Terraform et supprimé en une seule commande.

**AWS · Terraform · Amazon S3 · AWS Glue Data Catalog · Amazon Athena · SQL · Python · pytest · Ruff · uv · Taskfile · GitHub Actions**

[![CI](https://github.com/Lionel-Niyondiko/aws-ecommerce-data-lake/actions/workflows/ci.yml/badge.svg)](https://github.com/Lionel-Niyondiko/aws-ecommerce-data-lake/actions/workflows/ci.yml)

📘 **[Parcours guidé →](https://lionel-niyondiko.github.io/aws-ecommerce-data-lake/)** (anglais / français)

[Validation locale](#validation-locale-sans-aws) · [Reproduction sur AWS](#reproduire-sur-aws) · [Architecture](#architecture) · [Analytics](#rapport-analytique) · [Tests et CI](#tests-et-ci) · [Tâches](#tâches-taskfile)

![Architecture](docs/architecture.svg)

---

## En bref

**Problème.** Les commandes et le catalogue proviennent de deux systèmes qui ne partagent pas leurs clés de manière fiable. Le fichier de commandes contient des dates invalides, des nombres stockés en texte, des prix négatifs, 39 orthographes pour 10 pays, ainsi que des identifiants produit ou client absents du catalogue. Un modèle naïf échoue sur les lignes défectueuses ou perd du chiffre d’affaires sans le signaler.

**Ce que le projet démontre**

- Une architecture médaillon sur S3 : bronze brut, silver typé et dédupliqué, gold dimensionnel
- Un profilage des données avant nettoyage, avec un nombre de lignes silver prévu avant d’être produit
- Une modélisation dimensionnelle : une table de faits, trois dimensions, un grain déclaré et testé
- Un traitement des clés orphelines par des lignes de convention, plutôt qu’un `INNER JOIN` qui fait disparaître du chiffre d’affaires
- Des contrôles d’intégrité automatisés : pas de démultiplication par jointure, clés de dimension uniques, aucune clé orpheline non traitée
- L’Infrastructure as Code, avec un IAM au moindre privilège, des garde-fous de coût et un `terraform destroy` propre
- Un workflow reproductible : environnement Python verrouillé, Ruff et pytest pour le code Python, une interface Taskfile unique, une CI hors ligne

**Résultats** (vérifiés par la suite de tests AWS sur le lac déployé)

| Couche | Contenu | Format |
|---|---|---|
| `bronze/` | 7 956 lignes de commande, 130 produits, 130 clients | CSV + NDJSON, tels que reçus |
| `silver/` | 7 547 lignes de commande (409 retirées par des règles de nettoyage explicites) | Parquet + Snappy, 4 partitions mensuelles |
| `gold/` | 7 547 faits + 354 lignes de dimensions | Parquet, schéma en étoile |

- Chiffre d’affaires net : **9 284 872,42 $** pour 7 439 commandes.
- **5,00 % du chiffre d’affaires (464 547,61 $, 376 lignes)** portent sur des lignes dont le produit ou le client est absent du catalogue. Ces lignes sont conservées et rattachées à des clés de convention explicites (`-1`, `-2`). Un `INNER JOIN` les supprimerait sans lever la moindre erreur.

---

## Architecture

```text
data/ (CSV + NDJSON)
   │  aws s3 cp
   ▼
S3 bronze/   tables externes, typées en string      sql/01_bronze.sql
   │  Athena CTAS
   ▼
S3 silver/   typé, nettoyé, dédupliqué, Parquet     sql/03_silver.sql
   │  Athena CTAS
   ▼
S3 gold/     fact_ventes + dim_date, dim_produit, dim_client   sql/04_gold.sql
   │
   ▼
Six questions métier (sql/05_analytics.sql) → rapport HTML / Markdown / JSON / CSV
```

- **Stockage :** un bucket S3 avec quatre préfixes : `bronze/`, `silver/`, `gold/`, `athena-results/` (divisé en `queries/` pour les résultats natifs d’Athena et `analytics/` pour les rapports générés).
- **Catalogue et moteur :** AWS Glue Data Catalog pour les métadonnées, Amazon Athena pour toutes les transformations. Aucun job Glue ni crawler : les tables sont créées en SQL.
- **Orchestration :** `scripts/run_pipeline.sh`, appelé par `task pipeline`. `sql/02_quality.sql` est une étape de profilage distincte, en lecture seule.
- **Garde-fous :** un rôle IAM au moindre privilège pour le pipeline, une alerte AWS Budgets et une alarme CloudWatch sur la taille du bucket, notifiée via SNS.

Le [parcours guidé](https://lionel-niyondiko.github.io/aws-ecommerce-data-lake/) explique chaque couche, le modèle dimensionnel et les décisions de conception, étape par étape.

---

## Validation locale (sans AWS)

C’est la première étape recommandée. Elle ne nécessite aucun compte AWS, ne crée rien et ne coûte rien.

```bash
git clone https://github.com/Lionel-Niyondiko/aws-ecommerce-data-lake.git
cd aws-ecommerce-data-lake

uv sync         # environnement Python 3.13 depuis pyproject.toml + uv.lock (pytest, Ruff)
task lint       # lint Ruff du code Python
task test       # tests hors ligne
task validate   # terraform fmt -check, init -backend=false, validate
```

Résultat attendu :

```text
task lint       All checks passed!
task test       29 passed, 17 deselected
task validate   Success! The configuration is valid.
```

`task check` lance tous les contrôles hors ligne d’un coup : formatage et validation Terraform, tflint, ShellCheck, lint Ruff, contrôle de formatage Ruff et tests hors ligne. Il n’appelle jamais AWS : c’est le contrôle à passer avant un commit.

`task validate` télécharge les providers AWS et random depuis le Terraform Registry : il faut donc un accès Internet, mais aucun identifiant AWS.

---

## Reproduire sur AWS

### Prérequis

| Outil | Version | Utilisé par |
|---|---|---|
| Git | récente | tout le projet |
| [Task](https://taskfile.dev/installation/) | 3.x | toutes les commandes `task` |
| uv | récente | tests, Ruff, génération du rapport, serveurs web locaux (installe Python 3.13 si nécessaire) |
| Terraform | ≥ 1.5 (la CI utilise 1.9.8) | `task validate`, `deploy`, `destroy`, et la lecture des outputs par le pipeline et les tests AWS |
| AWS CLI | v2 | `task pipeline`, `analytics`, `test-aws` |
| jq | récente | `task pipeline`, `quality`, `analytics` |
| Bash | récente | `task pipeline`, `quality`, `analytics` (ils lancent `scripts/run_pipeline.sh`) |
| tflint, ShellCheck | récente | `task check` (la CI les exécute aussi) |

Sous Windows, les tâches locales (`check`, `lint`, `test`, `validate`, `fmt`, `docs`) se lancent depuis n’importe quel terminal. Les tâches du pipeline AWS exécutent un script Bash : lancez-les depuis Git Bash, avec `jq` installé, pour que `bash` désigne Git Bash et non WSL. Clonez le dépôt dans un chemin sans espaces (par exemple `C:\dev\aws-ecommerce-data-lake`) ; les chemins contenant des espaces perturbent la résolution des commandes par Bash.

### Identité AWS et permissions

Configurez l’AWS CLI avec la méthode de votre choix (clés d’utilisateur IAM, AWS IAM Identity Center/SSO, rôle assumé), puis vérifiez quel compte sera facturé :

```bash
aws sts get-caller-identity
```

- **Déploiement :** l’identité qui lance `task deploy` doit pouvoir créer et supprimer des ressources S3, Glue, IAM (rôle et politique inline), AWS Budgets, SNS et CloudWatch. Le dépôt ne fournit pas de politique de déploiement ; un compte bac à sable avec un accès administrateur est la configuration la plus simple.
- **Rôle du pipeline :** Terraform crée `ecommerce-datalake-pipeline`, un rôle au moindre privilège limité au bucket du projet, à la base Glue du projet et au workgroup Athena `primary`. Par défaut, il fait confiance à l’identité exacte qui a lancé `terraform apply` (modifiable avec `trusted_principal_arn`).
- **L’usage de ce rôle par `run_pipeline.sh` dépend du type d’identité :**
  - **Utilisateur IAM** (identifiants permanents ou obtenus par `get-session-token`) : le script assume le rôle du pipeline pour une heure, et chaque étape du pipeline s’exécute au moindre privilège.
  - **Rôle déjà assumé** (SSO, `assume-role`, OIDC en CI, tout ARN contenant `:assumed-role/`) : le script n’enchaîne pas vers le rôle du pipeline. Il s’exécute avec votre rôle courant, qui doit lui-même disposer des accès S3, Glue et Athena aux ressources du projet. Le rôle au moindre privilège est bien déployé, mais il n’est pas utilisé dans ce cas.
- **Tests AWS :** `task test-aws` s’exécute toujours avec votre identité courante.
- **Région :** définie par `aws_region` (par défaut `us-east-1`, la région testée). Le pipeline et les tests la lisent dans les outputs Terraform.

Le pipeline et les tests AWS lisent le bucket, la base et la région dans le state Terraform local : lancez-les depuis le clone qui a exécuté `task deploy`.

### Configurer

```bash
cp terraform/terraform.tfvars.example terraform/terraform.tfvars
```

Renseignez `budget_alert_email` avec une adresse que vous consultez. C’est la seule variable obligatoire ; les autres ont des valeurs par défaut documentées dans le fichier d’exemple. `terraform.tfvars` est ignoré par Git et ne doit jamais être commité.

### Exécuter

```bash
task deploy      # terraform init + apply (interactif : relire le plan, taper yes)
task pipeline    # ingest → catalog → silver → gold
task analytics   # six questions métier + rapport
task test-aws    # 17 contrôles sur le lac déployé
task destroy     # suppression de toutes les ressources gérées par Terraform
```

1. **`task deploy`** crée le bucket et ses préfixes, la base Glue, le rôle du pipeline, le budget, le topic SNS et l’alarme CloudWatch. AWS envoie ensuite une **confirmation d’abonnement SNS** à `budget_alert_email` : cliquez sur le lien, sinon l’alarme sur la taille du bucket reste silencieuse.
2. **`task pipeline`** dépose les trois fichiers sources dans `bronze/…/ingestion_date=YYYY-MM-DD/`, déclare les tables bronze, puis reconstruit silver et gold avec des requêtes CTAS Athena. Il ne lance ni le profilage, ni l’analytics, ni les tests.
3. **`task quality`** (optionnel, lecture seule) exécute les requêtes de profilage qui justifient les règles silver.
4. **`task analytics`** répond aux six questions métier et génère le rapport décrit [plus bas](#rapport-analytique).
5. **`task test-aws`** vérifie les volumes, le chiffre d’affaires, le grain, l’unicité des clés de dimension, l’absence de démultiplication par jointure et de clé orpheline non traitée, la continuité du calendrier et le stockage Parquet partitionné.
6. **`task destroy`** supprime tout, y compris le contenu du bucket (`force_destroy = true`). `terraform -chdir=terraform state list` ne doit ensuite plus rien afficher.

### Coût

Une exécution complète se chiffre en centimes à ce volume (quelques Mo dans S3, bien moins d’1 Go scanné par Athena), mais la tarification AWS dépend de votre compte et de votre région : considérez ce chiffre comme une estimation. L’alerte AWS Budgets porte sur l’ensemble du compte, pas uniquement sur ce projet. Lancez `task destroy` une fois terminé.

---

## Rapport analytique

`task analytics` et `task analytics-view` ont des rôles différents.

| Commande | Appelle AWS | Rôle |
|---|---|---|
| `task analytics` | oui | Exécute dans Athena les 12 requêtes de `sql/05_analytics.sql` (six questions métier) et génère le rapport |
| `task analytics-view` | non | Sert le dernier rapport local sur `http://localhost:8001/report.html`. Ne recalcule rien, n’exécute aucune requête |

À chaque exécution, `task analytics` produit :

```text
reports/analytics_<YYYY-MM-DD_HHMMSS>/          dossier local de l’exécution
  raw/<requête>.json                            résultat Athena de chaque requête
  report.html · report.md · report.json · report.csv

reports/report.html                             copie de la dernière exécution
reports/analytics_latest.{md,json,csv}

s3://<bucket>/athena-results/analytics/<run>/   copie archivée de l’exécution
s3://<bucket>/athena-results/analytics/latest/  toujours la dernière exécution
s3://<bucket>/athena-results/queries/           fichiers de résultats natifs d’Athena
```

Le rapport est généré par `scripts/generate_analytics_report.py` à partir des résultats JSON d’Athena : HTML pour la lecture, Markdown pour le partage, JSON pour un usage programmatique et CSV au format long pour les tableurs. Son contenu (titres, synthèse, noms de colonnes) est en français, comme le modèle SQL. `reports/` est ignoré par Git.

`task analytics-view` nécessite un `task analytics` préalable dans le même clone, et s’arrête avec un message explicite sinon. Arrêtez le serveur avec `Ctrl+C`.

---

## Tests et CI

```bash
uv run pytest --collect-only -q   # 46 tests collectés
task test                         # 29 tests hors ligne
task test-aws                     # 17 tests sur le lac déployé
```

- **Hors ligne (29) :** forme et anomalies des fichiers sources, règles SQL (pas de `NOT IN`, gold ne lit jamais bronze, `LEFT JOIN` pour la table de faits, colonnes de partition en dernier, aucune colonne perdue entre bronze et gold), sécurité du dépôt (pas d’identifiant de compte en dur, state et tfvars ignorés) et générateur de rapport sur des résultats Athena d’exemple.
- **AWS (17) :** les chiffres clés ci-dessus et les invariants du modèle. Les valeurs attendues sont écrites en dur volontairement : une régression ne peut pas se cacher derrière la logique qu’elle teste.

| Workflow | Besoin d’AWS | Déclenchement | Ce qu’il exécute |
|---|---|---|---|
| `ci.yml` | non | chaque push et PR | Terraform fmt/init/validate + tflint, ShellCheck, lint et contrôle de formatage Ruff, tests hors ligne, gardes SQL et secrets |
| `pages.yml` | non | push sur `main` modifiant `docs/`, `Taskfile.yml` ou `run_pipeline.sh` | vérifie le parcours guidé contre `Taskfile.yml` et `run_pipeline.sh`, puis le publie |

La partie AWS est volontairement manuelle : rien ne se déploie ni ne se facture de manière planifiée.

---

## Tâches Taskfile

`Taskfile.yml` est l’interface de commande du projet. Il ne contient aucune logique propre : chaque tâche délègue à l’outil responsable du travail.

```text
Taskfile.yml
  ├── Terraform        fmt, validate, tflint, apply, destroy
  ├── Ruff             lint et formatage du code Python
  ├── pytest           tests hors ligne et AWS
  ├── ShellCheck       le script shell
  ├── docs/            le parcours guidé, servi en local
  └── scripts/run_pipeline.sh
        ingest · catalog · quality · silver · gold · analytics · sql FILE
```

`task` ou `task help` affiche la liste dans l’ordre du workflow ; `task --list` l’affiche par ordre alphabétique.

| Tâche | Besoin d’AWS | Description |
|---|---|---|
| `task check` | non | Tous les contrôles hors ligne : `validate`, `tflint`, `shellcheck`, `lint`, `fmt-python-check`, `test` |
| `task test` | non | Lancer les tests hors ligne |
| `task lint` | non | Analyser le code Python (`ruff check`) |
| `task validate` | non | Vérifier le formatage et la syntaxe Terraform |
| `task tflint` | non | Analyser le code Terraform |
| `task shellcheck` | non | Analyser les scripts shell |
| `task fmt` | non | Reformater les fichiers Terraform et Python (`fmt-terraform` + `fmt-python`) |
| `task fmt-python-check` | non | Vérifier le formatage Python (`ruff format --check`) sans modifier les fichiers |
| `task docs` | non | Servir le parcours guidé sur `http://localhost:8000` |
| `task deploy` | oui | Provisionner l’infrastructure AWS (`terraform init` + `apply`) |
| `task pipeline` | oui | Ingestion, catalogage, nettoyage, modélisation (bronze → silver → gold) : `run_pipeline.sh all` |
| `task quality` | oui | Profiler les données brutes (optionnel, lecture seule) : `run_pipeline.sh quality` |
| `task analytics` | oui | Exécuter les six questions métier et générer le rapport : `run_pipeline.sh analytics` |
| `task test-aws` | oui | Vérifier le lac déployé par rapport aux chiffres attendus |
| `task destroy` | oui | Supprimer toutes les ressources AWS gérées par Terraform |
| `task analytics-view` | non | Servir le dernier rapport local sur `http://localhost:8001/report.html` |

`task check` ne déploie rien, ne détruit rien et n’appelle jamais AWS. Pour exécuter un seul fichier SQL sur le lac, appelez directement le script : `./scripts/run_pipeline.sh sql sql/02_quality.sql`.

Ruff est configuré dans `pyproject.toml` (Python 3.13, lignes de 100 caractères, jeux de règles E, W, F, I, B, UP, PT). `ruff check` détecte les bugs probables et les idiomes dépassés ; `ruff format` ne réécrit que la mise en forme. Aucun des deux ne remplace pytest, qui vérifie le comportement.

---

## Décisions de conception

- **Bronze est typé en `string`.** Une seule date invalide dans une colonne typée fait échouer toute la requête Athena ; le typage relève de silver, où `TRY_CAST` permet de compter ce qui est rejeté.
- **Les orphelines sont conservées, pas filtrées.** Silver conserve les 376 lignes orphelines ; gold les rattache à des clés de convention, afin que chaque fait reste joignable et que chaque dollar reste comptabilisé.
- **Une commande = numéro de facture + date.** Les numéros de facture sont réutilisés sur plusieurs dates : `COUNT(DISTINCT invoiceno)` n’est donc pas additif par mois.
- **Pas d’Airflow.** Le pipeline est court, linéaire, s’exécute en quelques minutes, sans branchement ni reprise d’historique. Un Taskfile et un script shell l’expriment avec moins de charge opérationnelle.
- **State Terraform local.** Un seul opérateur, une infrastructure jetable ; un backend distant serait l’étape suivante pour une équipe.

Le parcours guidé documente ces décisions, avec les alternatives écartées.

---

## Structure du dépôt

```text
terraform/   S3, Glue, IAM, Budgets, SNS, CloudWatch + terraform.tfvars.example
sql/         01_bronze → 02_quality → 03_silver → 04_gold → 05_analytics
scripts/     run_pipeline.sh (point d’entrée du pipeline), generate_analytics_report.py
data/        les trois fichiers sources, versionnés volontairement pour la reproductibilité
tests/       suites pytest hors ligne et AWS
docs/        le parcours guidé bilingue publié sur GitHub Pages
.github/     workflows CI et Pages
Taskfile.yml    l’interface de commande du projet
pyproject.toml  configuration Python 3.13, pytest et Ruff (verrouillée par uv.lock)
```

Fichiers locaux, ignorés par Git : `.venv/`, `terraform/.terraform/`, `*.tfstate*`, `terraform/terraform.tfvars`, `reports/`.

---

## Périmètre et limites

Il s’agit d’un projet de portfolio, pas d’une plateforme de production. Il fonctionne sur un petit jeu de données statique, avec un state Terraform local, un seul opérateur et une validation AWS déclenchée manuellement. Il n’y a ni planificateur, ni chargement incrémental, ni alerting au-delà des garde-fous de budget et de taille du bucket. Les choix sont dimensionnés pour ce périmètre et documentés afin de pouvoir être réexaminés lorsque les contraintes changent.

---

## Dépannage

| Symptôme | Solution |
|---|---|
| `task: command not found` | Installer Task ([taskfile.dev/installation](https://taskfile.dev/installation/), par exemple `winget install Task.Task` ou `brew install go-task`), puis redémarrer le terminal |
| `jq not found` (Windows) | Installer `jq` pour Git Bash, puis redémarrer le terminal ou VS Code |
| `bash: C:\Users\...: No such file or directory` | Déplacer le clone dans un chemin sans espaces |
| `Unable to locate credentials` | Configurer l’AWS CLI, puis `aws sts get-caller-identity` |
| `task deploy` demande `var.budget_alert_email` | `terraform/terraform.tfvars` est absent : le copier depuis `terraform.tfvars.example` et le compléter |
| `No Terraform outputs. Run 'task deploy' first.` | Déployer d’abord, depuis ce clone |
| `assume-role failed` | Vous utilisez un utilisateur IAM différent de celui auquel le rôle fait confiance : redéployer avec cette identité ou renseigner `trusted_principal_arn` |
| `AccessDenied` pendant le pipeline avec SSO ou un rôle assumé | Votre rôle courant exécute directement le pipeline ; il lui faut les accès S3, Glue et Athena aux ressources du projet |
| `No local report yet` | Lancer `task analytics` avant `task analytics-view` |

---

## Licence

[MIT](LICENSE)
