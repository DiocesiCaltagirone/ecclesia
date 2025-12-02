#!/bin/bash
# ============================================
# ECCLESIA - Script Deploy Automatico
# ============================================
# 
# Uso:
#   ./deploy.sh              # Deploy completo
#   ./deploy.sh --quick      # Solo pull + restart (no migrations, no build)
#   ./deploy.sh --migrations # Solo migrations
#   ./deploy.sh --build      # Solo build frontend
#
# ============================================

set -e  # Interrompi su errore

# Colori
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Directory progetto
PROJECT_DIR="/opt/ecclesia"
MIGRATIONS_DIR="$PROJECT_DIR/backend/migrations"

# ============================================
# FUNZIONI
# ============================================

print_header() {
    echo ""
    echo -e "${BLUE}╔═══════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║         ECCLESIA - Deploy Automatico                      ║${NC}"
    echo -e "${BLUE}╚═══════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

print_step() {
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${YELLOW}▶ $1${NC}"
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Backup database (opzionale)
backup_database() {
    print_step "Backup database..."
    BACKUP_FILE="/opt/ecclesia/backups/backup_$(date +%Y%m%d_%H%M%S).sql"
    mkdir -p /opt/ecclesia/backups
    
    docker exec parrocchia-postgres pg_dump -U parrocchia parrocchia_db > "$BACKUP_FILE" 2>/dev/null
    
    if [ $? -eq 0 ]; then
        print_success "Backup salvato: $BACKUP_FILE"
    else
        echo -e "${YELLOW}⚠️  Backup fallito (continuo comunque)${NC}"
    fi
}

# Pull da Git
git_pull() {
    print_step "Aggiornamento codice da Git..."
    cd "$PROJECT_DIR"
    
    # Scarta modifiche locali
    git checkout -- . 2>/dev/null || true
    
    # Pull
    git pull origin main
    
    print_success "Codice aggiornato"
}

# Esegui migrations
run_migrations() {
    print_step "Esecuzione migrations database..."
    
    # Copia script nel container
    docker cp "$MIGRATIONS_DIR/run_migrations.py" parrocchia-backend:/app/migrations/
    
    # Copia tutti i file .sql
    for sql_file in "$MIGRATIONS_DIR"/*.sql; do
        if [ -f "$sql_file" ]; then
            docker cp "$sql_file" parrocchia-backend:/app/migrations/
        fi
    done
    
    # Esegui migrations dentro il container
    docker exec parrocchia-backend python /app/migrations/run_migrations.py
    
    if [ $? -eq 0 ]; then
        print_success "Migrations completate"
    else
        print_error "Errore nelle migrations!"
        exit 1
    fi
}

# Build frontend
build_frontend() {
    print_step "Build frontend..."
    cd "$PROJECT_DIR/frontend"
    
    # Installa dipendenze se necessario
    if [ ! -d "node_modules" ]; then
        echo "   Installazione dipendenze npm..."
        npm install
    fi
    
    # Build
    npm run build
    
    print_success "Frontend compilato"
}

# Restart backend
restart_backend() {
    print_step "Restart backend..."
    docker restart parrocchia-backend
    
    # Aspetta che sia pronto
    echo "   Attendo avvio backend..."
    sleep 3
    
    # Verifica health
    if docker ps | grep -q parrocchia-backend; then
        print_success "Backend riavviato"
    else
        print_error "Backend non partito!"
        docker logs parrocchia-backend --tail 20
        exit 1
    fi
}

# Deploy completo
full_deploy() {
    print_header
    echo "📅 $(date '+%Y-%m-%d %H:%M:%S')"
    echo ""
    
    backup_database
    git_pull
    run_migrations
    build_frontend
    restart_backend
    
    echo ""
    echo -e "${GREEN}════════════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}✅ DEPLOY COMPLETATO CON SUCCESSO!${NC}"
    echo -e "${GREEN}════════════════════════════════════════════════════════════${NC}"
    echo ""
    echo "🌐 Sito: https://ecclesiaweb.net"
    echo ""
}

# Quick deploy (solo pull + restart)
quick_deploy() {
    print_header
    echo "⚡ Quick Deploy"
    echo ""
    
    git_pull
    restart_backend
    
    print_success "Quick deploy completato"
}

# ============================================
# MAIN
# ============================================

case "$1" in
    --quick)
        quick_deploy
        ;;
    --migrations)
        print_header
        run_migrations
        ;;
    --build)
        print_header
        build_frontend
        ;;
    --backup)
        print_header
        backup_database
        ;;
    --help)
        echo "Uso: ./deploy.sh [opzione]"
        echo ""
        echo "Opzioni:"
        echo "  (nessuna)     Deploy completo"
        echo "  --quick       Solo pull + restart"
        echo "  --migrations  Solo migrations database"
        echo "  --build       Solo build frontend"
        echo "  --backup      Solo backup database"
        echo "  --help        Mostra questo messaggio"
        ;;
    *)
        full_deploy
        ;;
esac