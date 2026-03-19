#!/data/data/com.termux/files/usr/bin/bash

# Script para descargar recovery-tool desde el servidor
# Autor: Tu Nombre
# Versión: 1.0

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuración
SERVER_URL="https://apollo-server-j3hy.onrender.com"
DEST_DIR="$HOME/fast-recovery"
TOOL_NAME="fast-recovery"
TOOL_PATH="$DEST_DIR/$TOOL_NAME"

# Función para mostrar banner
show_banner() {
    clear
    echo -e "${BLUE}╔═══════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║     📦 DOWNLOAD RECOVERY TOOL                      ║${NC}"
    echo -e "${BLUE}╚═══════════════════════════════════════════════════╝${NC}"
    echo ""
}

# Función para mostrar mensajes de éxito
success() {
    echo -e "${GREEN}✅ $1${NC}"
}

# Función para mostrar mensajes de error
error() {
    echo -e "${RED}❌ $1${NC}"
}

# Función para mostrar mensajes de información
info() {
    echo -e "${YELLOW}ℹ️ $1${NC}"
}

# Función para verificar conectividad
check_server() {
    info "Verificando conexión con el servidor..."
    
    if curl -s --head --request GET "$SERVER_URL" | grep "200 OK" > /dev/null; then
        success "Servidor accesible"
        return 0
    else
        error "No se puede conectar al servidor: $SERVER_URL"
        return 1
    fi
}

# Función para obtener información del archivo
get_file_info() {
    info "Obteniendo información del archivo..."
    
    # Usar el endpoint correcto /fast-recovery/info
    local info=$(curl -s "$SERVER_URL/fast-recovery/info")  # ← CAMBIADO
    
    if [ $? -eq 0 ]; then
        local disponible=$(echo "$info" | grep -o '"disponible": *[^,}]*' | cut -d':' -f2 | tr -d ' ')
        local tamaño=$(echo "$info" | grep -o '"tamaño_mb": *"[^"]*"' | cut -d'"' -f4)
        local version=$(echo "$info" | grep -o '"version": *"[^"]*"' | cut -d'"' -f4)
        
        if [ "$disponible" = "true" ]; then
            success "Archivo disponible en el servidor"
            info "Versión: $version"
            info "Tamaño: $tamaño MB"
            return 0
        else
            error "El archivo no está disponible en el servidor"
            return 1
        fi
    else
        error "No se pudo obtener información del archivo"
        return 1
    fi
}


# Función para crear directorio de destino
create_dest_dir() {
    if [ ! -d "$DEST_DIR" ]; then
        info "Creando directorio: $DEST_DIR"
        mkdir -p "$DEST_DIR"
        if [ $? -eq 0 ]; then
            success "Directorio creado"
        else
            error "No se pudo crear el directorio"
            return 1
        fi
    else
        info "El directorio $DEST_DIR ya existe"
    fi
    return 0
}

# Función para descargar el archivo
download_file() {
    info "Iniciando descarga..."
    echo ""
    
    # Usar el endpoint correcto /fast-recovery/download
    curl -L --progress-bar "$SERVER_URL/fast-recovery/download" -o "$TOOL_PATH.tmp"  # ← CAMBIADO
    
    if [ $? -eq 0 ]; then
        mv "$TOOL_PATH.tmp" "$TOOL_PATH"
        echo ""
        success "Archivo descargado exitosamente"
        return 0
    else
        echo ""
        error "Error durante la descarga"
        rm -f "$TOOL_PATH.tmp" 2>/dev/null
        return 1
    fi
}


# Función para verificar la descarga
verify_download() {
    if [ -f "$TOOL_PATH" ]; then
        local size=$(du -h "$TOOL_PATH" | cut -f1)
        info "Archivo guardado en: $TOOL_PATH"
        info "Tamaño del archivo: $size"
        
        # Dar permisos de ejecución
        chmod +x "$TOOL_PATH"
        if [ $? -eq 0 ]; then
            success "Permisos de ejecución asignados"
        else
            error "No se pudieron asignar permisos de ejecución"
        fi
        
        return 0
    else
        error "El archivo no se encontró después de la descarga"
        return 1
    fi
}

# Función para mostrar resumen
show_summary() {
    echo ""
    echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
    success "¡Descarga completada!"
    echo ""
    echo -e "📁 Ubicación: ${GREEN}$TOOL_PATH${NC}"
    echo -e "🔧 Para ejecutar: ${YELLOW}cd $DEST_DIR && ./$TOOL_NAME${NC}"
    echo ""
    echo -e "📋 Comandos útiles:"
    echo -e "   ${YELLOW}cd $DEST_DIR${NC} - Ir al directorio"
    echo -e "   ${YELLOW}./$TOOL_NAME${NC} - Ejecutar el programa"
    echo -e "   ${YELLOW}ls -la $TOOL_PATH${NC} - Ver detalles del archivo"
    echo ""
    echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
}

# Función para preguntar si ejecutar ahora
ask_run_now() {
    echo ""
    echo -n "¿Deseas ejecutar el programa ahora? (s/n): "
    read -r respuesta
    
    if [[ "$respuesta" =~ ^[Ss]$ ]]; then
        echo ""
        info "Ejecutando $TOOL_NAME..."
        echo ""
        cd "$DEST_DIR"
        ./"$TOOL_NAME"
    else
        echo ""
        info "Puedes ejecutarlo más tarde con: cd $DEST_DIR && ./$TOOL_NAME"
    fi
}

# Función principal
main() {
    show_banner
    
    # Verificar conectividad
    check_server || exit 1
    
    echo ""
    
    # Obtener información del archivo
    get_file_info || exit 1
    
    echo ""
    
    # Crear directorio de destino
    create_dest_dir || exit 1
    
    echo ""
    
    # Verificar si ya existe el archivo
    if [ -f "$TOOL_PATH" ]; then
        info "Ya existe una versión del archivo en $TOOL_PATH"
        echo -n "¿Deseas sobrescribirla? (s/n): "
        read -r overwrite
        
        if [[ ! "$overwrite" =~ ^[Ss]$ ]]; then
            info "Descarga cancelada"
            show_summary
            ask_run_now
            return
        fi
        echo ""
    fi
    
    # Descargar archivo
    download_file || exit 1
    
    # Verificar descarga
    verify_download
    
    # Mostrar resumen
    show_summary
    
    # Preguntar si ejecutar ahora
    ask_run_now
}

# Ejecutar función principal
main