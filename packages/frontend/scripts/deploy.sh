#!/usr/bin/env bash
set -euo pipefail

#
# Deploy del frontend Wompi Store a S3 + CloudFront via Serverless Framework
#
# Uso:
#   ./scripts/deploy.sh                          # deploy a dev
#   ./scripts/deploy.sh staging                  # deploy a staging
#   ./scripts/deploy.sh prod                     # deploy a prod
#   NEXT_PUBLIC_API_URL=https://api.example.com ./scripts/deploy.sh prod
#

STAGE="${1:-dev}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m'

info()    { echo -e "${BLUE}[INFO]${NC} $*"; }
success() { echo -e "${GREEN}[OK]${NC} $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC} $*"; }
fail()    { echo -e "${RED}[ERROR]${NC} $*"; exit 1; }

# ---------- Validaciones ----------

command -v node  >/dev/null 2>&1 || fail "node no esta instalado"
command -v npm   >/dev/null 2>&1 || fail "npm no esta instalado"
command -v npx   >/dev/null 2>&1 || fail "npx no esta instalado"
command -v aws   >/dev/null 2>&1 || fail "AWS CLI no esta instalado"

# Verificar credenciales de AWS
aws sts get-caller-identity >/dev/null 2>&1 || fail "No hay credenciales de AWS configuradas. Ejecuta 'aws configure' o exporta AWS_ACCESS_KEY_ID y AWS_SECRET_ACCESS_KEY"

# ---------- Configuracion ----------

# URL del backend API segun stage
if [ -z "${NEXT_PUBLIC_API_URL:-}" ]; then
  case "$STAGE" in
    *)       NEXT_PUBLIC_API_URL="https://j4fq1wg98a.execute-api.us-east-1.amazonaws.com/dev" ;;
  esac
  warn "NEXT_PUBLIC_API_URL no definida, usando valor por defecto: $NEXT_PUBLIC_API_URL"
fi

export NEXT_PUBLIC_API_URL
export NEXT_EXPORT=true

info "=========================================="
info " Wompi Store Frontend - Deploy"
info "=========================================="
info " Stage:    $STAGE"
info " API URL:  $NEXT_PUBLIC_API_URL"
info " Region:   ${AWS_REGION:-us-east-1}"
info "=========================================="
echo ""

# ---------- Build ----------

info "Instalando dependencias..."
cd "$PROJECT_DIR"
npm ci --prefer-offline 2>/dev/null || npm install
success "Dependencias instaladas"

info "Construyendo aplicacion (static export)..."
npx next build
success "Build completado -> $PROJECT_DIR/out"

# Verificar que se genero el directorio out
[ -d "$PROJECT_DIR/out" ] || fail "El directorio 'out' no fue generado. Revisa errores del build."

# ---------- Deploy ----------

info "Desplegando infraestructura y archivos con Serverless Framework..."
npx serverless deploy --stage "$STAGE" --verbose
success "Deploy completado"

# ---------- Outputs ----------

echo ""
info "Obteniendo informacion del stack..."
npx serverless info --stage "$STAGE" 2>/dev/null || true

echo ""
success "=========================================="
success " Deploy finalizado exitosamente"
success "=========================================="
