#!/bin/bash

# Cleanup old mock implementation
# This script safely removes the old mock approach

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}Cleaning up old mock implementation...${NC}"
echo -e "${YELLOW}════════════════════════════════════════════════${NC}"

# First, check if we can remove the old __mocks__ directory
if [ -d "__mocks__" ]; then
    echo -e "${YELLOW}Found old __mocks__ directory${NC}"
    
    # Check if tests are passing with the new approach
    echo -e "${GREEN}Running tests to ensure the new approach works...${NC}"
    npm test
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}Tests passed. It's safe to remove the old mocks.${NC}"
        
        # Backup old mocks directory just in case
        echo -e "${GREEN}Creating backup of old mocks...${NC}"
        mv __mocks__ __mocks__backup
        
        # Remove the dev.js file
        if [ -f "dev.js" ]; then
            echo -e "${GREEN}Moving dev.js to bck-dev.js...${NC}"
            mv dev.js bck-dev.js
        fi
        
        # Remove the dev:mock script from package.json
        echo -e "${GREEN}Updating package.json...${NC}"
        sed -i.bak '/"dev:mock"/d' package.json
        
        echo -e "${GREEN}Cleanup complete!${NC}"
        echo -e "${YELLOW}The old mocks have been backed up to __mocks__backup${NC}"
        echo -e "${YELLOW}The old dev.js has been backed up to bck-dev.js${NC}"
        echo -e "${YELLOW}You can delete these backup files after verifying everything works.${NC}"
    else
        echo -e "${RED}Tests failed. Not removing old mocks.${NC}"
        echo -e "${YELLOW}Please fix the tests before running this script again.${NC}"
        exit 1
    fi
else
    echo -e "${YELLOW}No old __mocks__ directory found. Nothing to clean up.${NC}"
fi

echo -e "${GREEN}Done!${NC}"
