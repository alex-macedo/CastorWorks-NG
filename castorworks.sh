#!/bin/bash

# CastorWorks-NG Development Server Management Script
# Usage: ./castorworks.sh {start|stop|restart|clean}
# Runs on port 5181 so it can run in parallel with CastorWorks (port 5173).

PROJECT_DIR="$PWD"
DEFAULT_PORT=5181
VITE_PID_FILE="$PROJECT_DIR/.vite.pid"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper function to print colored messages
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if a process is using a specific port
check_port() {
    local port=$1
    lsof -ti:$port 2>/dev/null
}

# Function to kill processes using a specific port
kill_port_process() {
    local port=$1
    local pids=$(check_port $port)

    if [ -n "$pids" ]; then
        log_warning "Found processes using port $port: $pids"
        log_info "Killing processes on port $port..."

        # Try graceful termination first
        echo "$pids" | xargs kill -TERM 2>/dev/null
        sleep 2

        # Force kill if still running
        local remaining_pids=$(check_port $port)
        if [ -n "$remaining_pids" ]; then
            log_warning "Force killing remaining processes..."
            echo "$remaining_pids" | xargs kill -KILL 2>/dev/null
        fi

        sleep 1

        # Verify port is free
        if [ -n "$(check_port $port)" ]; then
            log_error "Failed to free port $port"
            return 1
        else
            log_success "Port $port is now free"
        fi
    fi
}

# Function to kill Vite development server
kill_vite_server() {
    log_info "Stopping Vite development server..."

    # Kill by PID file if exists
    if [ -f "$VITE_PID_FILE" ]; then
        local stored_pid=$(cat "$VITE_PID_FILE" 2>/dev/null)
        if [ -n "$stored_pid" ] && kill -0 "$stored_pid" 2>/dev/null; then
            log_info "Killing Vite server with PID $stored_pid..."
            kill -TERM "$stored_pid" 2>/dev/null
            sleep 2
            if kill -0 "$stored_pid" 2>/dev/null; then
                kill -KILL "$stored_pid" 2>/dev/null
            fi
        fi
        rm -f "$VITE_PID_FILE"
    fi

    # Kill by process name pattern
    pkill -f "vite.*$PROJECT_DIR" 2>/dev/null

    # Kill by port (only NG port and nearby fallbacks; do not touch 5173 used by CastorWorks)
    kill_port_process $DEFAULT_PORT

    for port in 5182 5183; do
        local pids=$(check_port $port)
        if [ -n "$pids" ]; then
            log_info "Also found Vite server on port $port, killing..."
            kill_port_process $port
        fi
    done

    log_success "Vite server stopped"
}

# Function to start the development server
start_server() {
    log_info "Starting CastorWorks-NG development server..."

    # Change to project directory
    cd "$PROJECT_DIR" || {
        log_error "Failed to change to project directory: $PROJECT_DIR"
        exit 1
    }

    # Check if already running (only our port; 5173 may be used by CastorWorks)
    local existing_pids=$(check_port $DEFAULT_PORT)
    if [ -n "$existing_pids" ]; then
        log_warning "Port $DEFAULT_PORT is already in use"
        log_info "Stopping existing CastorWorks-NG server first..."
        kill_vite_server
    fi

    log_info "Installing dependencies (if needed)..."
    npm install --silent

    log_info "Starting Vite development server on port $DEFAULT_PORT and Translation API on port 3001..."

    # Export port for Vite to use
    export VITE_PORT=$DEFAULT_PORT

    # Start the server in background and capture PID
    nohup npm run dev:full > /dev/null 2>&1 &
    local vite_pid=$!
    echo $vite_pid > "$VITE_PID_FILE"

    # Wait a moment for server to start
    sleep 3

    # Verify server is running
    if kill -0 "$vite_pid" 2>/dev/null; then
        # Check if it's actually serving on the expected port
        local actual_port=$DEFAULT_PORT
        local port_check=$(check_port $DEFAULT_PORT)

        if [ -z "$port_check" ]; then
            for port in 5182 5183; do
                if [ -n "$(check_port $port)" ]; then
                    actual_port=$port
                    break
                fi
            done
        fi

        log_success "CastorWorks-NG development server started successfully!"
        log_info "Server URL: http://localhost:$actual_port"
        log_info "PID: $vite_pid"
    else
        log_error "Failed to start CastorWorks-NG development server"
        rm -f "$VITE_PID_FILE"
        exit 1
    fi
}

# Function to stop the development server
stop_server() {
    log_info "Stopping CastorWorks-NG development server..."
    kill_vite_server
}

# Function to restart the development server
restart_server() {
    log_info "Restarting CastorWorks-NG development server..."
    stop_server
    sleep 1
    start_server
}

# Function to clean build and start fresh
clean_start() {
    log_info "Performing clean build and start..."

    # Change to project directory
    cd "$PROJECT_DIR" || {
        log_error "Failed to change to project directory: $PROJECT_DIR"
        exit 1
    }

    # Stop any existing server
    stop_server

    # Clean previous builds
    log_info "Cleaning previous builds..."
    rm -rf dist/ .vite/

    # Install dependencies
    log_info "Installing dependencies..."
    npm install --silent

    # Run build to verify everything compiles
    log_info "Building project to verify compilation..."
    if npm run build; then
        log_success "Build completed successfully"
    else
        log_error "Build failed. Please fix compilation errors before starting CastorWorks-NG development server."
        exit 1
    fi

    # Start development server
    log_info "Starting clean CastorWorks-NG development server..."
    start_server
}

# Function to show usage
show_usage() {
    echo "CastorWorks-NG Development Server Management"
    echo ""
    echo "Usage: $0 {start|stop|restart|clean}"
    echo ""
    echo "Commands:"
    echo "  start   - Start the development server"
    echo "  stop    - Stop the development server"
    echo "  restart - Restart the development server"
    echo "  clean   - Clean build, compile, and start fresh server"
    echo ""
    echo "The server will run on http://localhost:5181 (CastorWorks-NG; CastorWorks uses 5173)"
}

# Function to show status
show_status() {
    log_info "CastorWorks-NG Development Server Status"
    echo ""

    # Check PID file
    if [ -f "$VITE_PID_FILE" ]; then
        local stored_pid=$(cat "$VITE_PID_FILE" 2>/dev/null)
        if [ -n "$stored_pid" ] && kill -0 "$stored_pid" 2>/dev/null; then
            echo "✅ Server running (PID: $stored_pid)"
        else
            echo "❌ Server not running (stale PID file)"
            rm -f "$VITE_PID_FILE"
        fi
    else
        echo "❌ Server not running (no PID file)"
    fi

    # Check ports (5181 = NG; 5173 = legacy CastorWorks)
    for port in 5181 5182 5183 5173; do
        local pids=$(check_port $port)
        if [ -n "$pids" ]; then
            local label=""
            [ "$port" = "5181" ] && label=" (CastorWorks-NG)"
            [ "$port" = "5173" ] && label=" (CastorWorks)"
            echo "🌐 Port $port in use (PID: $pids) - http://localhost:$port$label"
        fi
    done
}

# Main script logic
case "$1" in
    start)
        start_server
        ;;
    stop)
        stop_server
        ;;
    restart)
        restart_server
        ;;
    clean)
        clean_start
        ;;
    status)
        show_status
        ;;
    *)
        show_usage
        exit 1
        ;;
esac

exit 0