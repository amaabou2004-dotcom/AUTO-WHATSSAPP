#!/usr/bin/env bash
# Validation du contrat OpenAPI (Phase 2).
# Vérifie la syntaxe YAML, la conformité OpenAPI 3.1 et l'intégrité des $ref.
#
# Usage :  ./scripts/validate-openapi.sh [chemin.yaml]
# Prérequis : Node.js >= 20 + accès au registre npm (l'outil de validation est installé
# dans un répertoire temporaire, jamais dans le dépôt).
set -euo pipefail

FILE="${1:-docs/08-api-openapi.yaml}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TARGET="$ROOT/$FILE"

if [ ! -f "$TARGET" ]; then
  echo "Fichier introuvable : $TARGET" >&2
  exit 1
fi

WORK="$(mktemp -d)"
cleanup() { rm -rf "$WORK"; }
trap cleanup EXIT

echo "Installation de l'outil de validation (temporaire)..."
(cd "$WORK" && npm init -y >/dev/null 2>&1 && npm install --silent --no-audit --no-fund @apidevtools/swagger-parser@10 >/dev/null 2>&1)

cat > "$WORK/validate.cjs" <<'JS'
const Parser = require('@apidevtools/swagger-parser');
const file = process.argv[2];
Parser.validate(file)
  .then((api) => {
    const paths = Object.keys(api.paths || {});
    let ops = 0;
    const byTag = {};
    for (const p of paths) {
      for (const m of Object.keys(api.paths[p])) {
        if (['get', 'post', 'put', 'patch', 'delete'].includes(m)) {
          ops++;
          (api.paths[p][m].tags || []).forEach((t) => {
            byTag[t] = (byTag[t] || 0) + 1;
          });
        }
      }
    }
    const schemas = Object.keys((api.components && api.components.schemas) || {}).length;
    console.log('OK — ' + paths.length + ' chemins, ' + ops + ' opérations, ' + schemas + ' schémas.');
    console.log(byTag);
    console.log('Contrat valide.');
  })
  .catch((e) => {
    console.error('ECHEC — contrat OpenAPI invalide :');
    console.error(e.message);
    process.exit(1);
  });
JS

node "$WORK/validate.cjs" "$TARGET"
