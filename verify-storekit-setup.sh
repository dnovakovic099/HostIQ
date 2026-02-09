#!/bin/bash

# StoreKit Configuration Verification Script
# Run this to verify your setup before testing

echo ""
echo "═══════════════════════════════════════════════════════"
echo "  StoreKit Configuration Verification"
echo "═══════════════════════════════════════════════════════"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

ERRORS=0
WARNINGS=0

# Check 1: Products.storekit exists
echo "1. Checking if Products.storekit exists..."
if [ -f "ios/Products.storekit" ]; then
    echo -e "   ${GREEN}✅ Products.storekit found${NC}"
else
    echo -e "   ${RED}❌ Products.storekit NOT found${NC}"
    ERRORS=$((ERRORS + 1))
fi

# Check 2: Product ID in StoreKit file
echo ""
echo "2. Checking product ID in StoreKit file..."
if grep -q "hostiq_pro_subscription" "ios/Products.storekit"; then
    echo -e "   ${GREEN}✅ Product ID 'hostiq_pro_subscription' found${NC}"
else
    echo -e "   ${RED}❌ Product ID 'hostiq_pro_subscription' NOT found${NC}"
    ERRORS=$((ERRORS + 1))
fi

# Check 3: Xcode scheme file
echo ""
echo "3. Checking Xcode scheme configuration..."
if [ -f "ios/HostIQ.xcodeproj/xcshareddata/xcschemes/HostIQ.xcscheme" ]; then
    echo -e "   ${GREEN}✅ Scheme file found${NC}"
    
    # Check if StoreKit is configured
    if grep -q "StoreKitConfigurationFileReference" "ios/HostIQ.xcodeproj/xcshareddata/xcschemes/HostIQ.xcscheme"; then
        echo -e "   ${GREEN}✅ StoreKit configuration present in scheme${NC}"
        
        # Check the path
        STOREKIT_PATH=$(grep -A1 "StoreKitConfigurationFileReference" "ios/HostIQ.xcodeproj/xcshareddata/xcschemes/HostIQ.xcscheme" | grep "identifier" | sed 's/.*identifier = "\([^"]*\)".*/\1/')
        
        if [ "$STOREKIT_PATH" = "Products.storekit" ]; then
            echo -e "   ${GREEN}✅ StoreKit path is correct: $STOREKIT_PATH${NC}"
        elif [ "$STOREKIT_PATH" = "../Products.storekit" ]; then
            echo -e "   ${RED}❌ StoreKit path is WRONG: $STOREKIT_PATH${NC}"
            echo -e "      ${YELLOW}Should be: Products.storekit${NC}"
            ERRORS=$((ERRORS + 1))
        else
            echo -e "   ${YELLOW}⚠️  StoreKit path: $STOREKIT_PATH${NC}"
            WARNINGS=$((WARNINGS + 1))
        fi
    else
        echo -e "   ${RED}❌ StoreKit configuration NOT found in scheme${NC}"
        ERRORS=$((ERRORS + 1))
    fi
else
    echo -e "   ${RED}❌ Scheme file NOT found${NC}"
    ERRORS=$((ERRORS + 1))
fi

# Check 4: Product ID in code
echo ""
echo "4. Checking product ID in code..."
if grep -q "PRODUCT_ID = 'hostiq_pro_subscription'" "src/services/subscriptionService.js"; then
    echo -e "   ${GREEN}✅ Product ID matches in subscriptionService.js${NC}"
else
    echo -e "   ${YELLOW}⚠️  Product ID might not match in code${NC}"
    WARNINGS=$((WARNINGS + 1))
fi

# Check 5: Workspace file
echo ""
echo "5. Checking Xcode workspace..."
if [ -d "ios/HostIQ.xcworkspace" ]; then
    echo -e "   ${GREEN}✅ HostIQ.xcworkspace found${NC}"
    echo -e "      ${YELLOW}Remember: Open .xcworkspace NOT .xcodeproj${NC}"
else
    echo -e "   ${RED}❌ HostIQ.xcworkspace NOT found${NC}"
    ERRORS=$((ERRORS + 1))
fi

# Check 6: react-native-iap installed
echo ""
echo "6. Checking react-native-iap installation..."
if grep -q "react-native-iap" "package.json"; then
    VERSION=$(grep "react-native-iap" "package.json" | sed 's/.*: "\([^"]*\)".*/\1/')
    echo -e "   ${GREEN}✅ react-native-iap installed: $VERSION${NC}"
else
    echo -e "   ${RED}❌ react-native-iap NOT found in package.json${NC}"
    ERRORS=$((ERRORS + 1))
fi

# Summary
echo ""
echo "═══════════════════════════════════════════════════════"
echo "  Summary"
echo "═══════════════════════════════════════════════════════"

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✅ All checks passed!${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Open Xcode: open ios/HostIQ.xcworkspace"
    echo "2. Clean build folder: Product > Clean Build Folder (Shift+Cmd+K)"
    echo "3. Run from Xcode: Press Cmd+R"
    echo ""
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠️  $WARNINGS warning(s) found${NC}"
    echo "Your setup should work, but review warnings above."
    echo ""
else
    echo -e "${RED}❌ $ERRORS error(s) found${NC}"
    if [ $WARNINGS -gt 0 ]; then
        echo -e "${YELLOW}⚠️  $WARNINGS warning(s) found${NC}"
    fi
    echo ""
    echo "Please fix the errors above before proceeding."
    echo "See STOREKIT_FIX_CRITICAL.md for detailed instructions."
    echo ""
fi

echo "═══════════════════════════════════════════════════════"
echo ""
