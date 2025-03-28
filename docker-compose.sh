#!/bin/bash

# Script to manage docker-compose environments for Resume Customizer Backend

# Set default values
ENV="dev"
ACTION="up"

# Function to display usage information
function show_usage() {
  echo "Usage: $0 [options]"
  echo "Options:"
  echo "  -e, --env ENV      Environment (dev|prod|monitoring), default: dev"
  echo "  -a, --action ACT   Action (up|down|restart|logs|build), default: up"
  echo "  -d, --detach       Run containers in detached mode"
  echo "  -h, --help         Show this help message"
  echo ""
  echo "Examples:"
  echo "  $0 -e dev -a up        # Start development environment"
  echo "  $0 -e prod -a up -d    # Start production environment in detached mode"
  echo "  $0 -e monitoring -a up # Start monitoring environment"
  echo "  $0 -a logs             # Show logs for development environment"
  exit 1
}

# Parse command line options
DETACH=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    -e|--env)
      ENV="$2"
      shift 2
      ;;
    -a|--action)
      ACTION="$2"
      shift 2
      ;;
    -d|--detach)
      DETACH="-d"
      shift
      ;;
    -h|--help)
      show_usage
      ;;
    *)
      echo "Unknown option: $1"
      show_usage
      ;;
  esac
done

# Validate environment
if [[ "$ENV" != "dev" && "$ENV" != "prod" && "$ENV" != "monitoring" ]]; then
  echo "Error: Environment must be 'dev', 'prod', or 'monitoring'"
  show_usage
fi

# Set compose file based on environment
if [[ "$ENV" == "dev" ]]; then
  COMPOSE_FILES="-f docker-compose.yml -f docker-compose.dev.yml"
elif [[ "$ENV" == "prod" ]]; then
  COMPOSE_FILES="-f docker-compose.yml -f docker-compose.prod.yml"
else
  COMPOSE_FILES="-f docker-compose.monitoring.yml"
fi

# Execute docker-compose command
case "$ACTION" in
  up)
    echo "Starting $ENV environment..."
    docker-compose $COMPOSE_FILES up $DETACH
    ;;
  down)
    echo "Stopping $ENV environment..."
    docker-compose $COMPOSE_FILES down
    ;;
  restart)
    echo "Restarting $ENV environment..."
    docker-compose $COMPOSE_FILES restart
    ;;
  logs)
    echo "Showing logs for $ENV environment..."
    docker-compose $COMPOSE_FILES logs -f
    ;;
  build)
    echo "Building $ENV environment..."
    docker-compose $COMPOSE_FILES build
    ;;
  *)
    echo "Error: Unknown action '$ACTION'"
    show_usage
    ;;
esac
