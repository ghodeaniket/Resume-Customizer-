#!/bin/bash

# Apply Architecture Updates
# This script applies all the architecture improvements to the codebase

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Set the working directory to the project root
cd "$(dirname "$0")" || exit 1

echo -e "${YELLOW}Starting architecture improvements application...${NC}"

# 1. Apply new service registry
echo -e "${YELLOW}1. Applying new service registry...${NC}"
if [ -f "src/services/serviceRegistry.js.new" ]; then
  # For safety, backup the old file
  cp src/services/serviceRegistry.js src/services/serviceRegistry.js.bak
  
  # Apply the new service registry
  mv src/services/serviceRegistry.js.new src/services/serviceRegistry.js
  echo -e "${GREEN}   Service registry updated.${NC}"
else
  echo -e "${GREEN}   Service registry already updated (no .new file found).${NC}"
fi

# 2. Apply new app setup
echo -e "${YELLOW}2. Applying new app setup...${NC}"
if [ -f "src/app-setup.js.new" ]; then
  # For safety, backup the old file
  cp src/app-setup.js src/app-setup.js.bak
  
  # Apply the new app setup
  mv src/app-setup.js.new src/app-setup.js
  echo -e "${GREEN}   App setup updated.${NC}"
else
  echo -e "${GREEN}   App setup already updated (no .new file found).${NC}"
fi

# 3. Apply new app.js
echo -e "${YELLOW}3. Applying new app.js...${NC}"
if [ -f "src/app.js.new" ]; then
  # For safety, backup the old file
  cp src/app.js src/app.js.bak
  
  # Apply the new app.js
  mv src/app.js.new src/app.js
  echo -e "${GREEN}   app.js updated.${NC}"
else
  echo -e "${GREEN}   app.js already updated (no .new file found).${NC}"
fi

# 4. Install new dependencies
echo -e "${YELLOW}4. Installing new dependencies...${NC}"
dependencies_to_install=(
  "swagger-jsdoc"
  "swagger-ui-express"
  "winston-daily-rotate-file"
)

for dep in "${dependencies_to_install[@]}"; do
  if ! grep -q "\"$dep\"" package.json; then
    echo -e "   Installing $dep..."
    npm install --save "$dep"
  else
    echo -e "${GREEN}   $dep already installed.${NC}"
  fi
done

# 5. Update package.json scripts
echo -e "${YELLOW}5. Updating package.json scripts...${NC}"
# Add integration test script if it doesn't exist
if ! grep -q "\"test:integration\"" package.json; then
  # This is a simple sed approach - a more robust solution would use jq
  sed -i.bak '/\"test\": /a\\    \"test:integration\": \"jest --config jest.config.js --testMatch \\\"**/tests/integration/**/*.test.js\\\"\",' package.json
  echo -e "${GREEN}   Added test:integration script.${NC}"
else
  echo -e "${GREEN}   test:integration script already exists.${NC}"
fi

# 6. Print final message
echo -e "${GREEN}Architecture improvements applied successfully!${NC}"
echo -e "${YELLOW}Next steps:${NC}"
echo -e "1. Run 'npm install' to ensure all dependencies are installed"
echo -e "2. Run 'npm test' to verify that the changes don't break existing functionality"
echo -e "3. Run 'npm run test:integration' to run the new integration tests"
echo -e "4. Start the server with 'npm start' and check the Swagger docs at /api-docs"

exit 0
