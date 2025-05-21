#!/bin/bash
set -e

# Color codes for better readability
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Dental Assistant Application Bootstrap and Deployment ===${NC}"

# Check prerequisites
echo -e "${YELLOW}Checking prerequisites...${NC}"

# Check AWS CLI
if ! command -v aws &> /dev/null; then
    echo -e "${RED}AWS CLI is not installed. Please install it first.${NC}"
    echo "Visit: https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html"
    exit 1
fi

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}Node.js is not installed. Please install Node.js 22 or later.${NC}"
    echo "Visit: https://docs.npmjs.com/downloading-and-installing-node-js-and-npm"
    exit 1
fi

# Check npm
if ! command -v npm &> /dev/null; then
    echo -e "${RED}npm is not installed. Please install npm.${NC}"
    echo "Visit: https://docs.npmjs.com/downloading-and-installing-node-js-and-npm"
    exit 1
fi

# Check Docker
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Docker is not installed. Please install Docker.${NC}"
    echo "Visit: https://www.docker.com/get-started/"
    exit 1
fi

# Check if Docker is running
if ! docker info &> /dev/null; then
    echo -e "${RED}Docker is not running. Please start Docker.${NC}"
    exit 1
fi

# Check AWS configuration
echo -e "${YELLOW}Checking AWS configuration...${NC}"
if ! aws sts get-caller-identity &> /dev/null; then
    echo -e "${RED}AWS credentials are not configured or are invalid.${NC}"
    echo "Please run 'aws configure' to set up your AWS credentials."
    exit 1
fi

# Get current AWS region
AWS_REGION=$(aws configure get region)
if [ -z "$AWS_REGION" ]; then
    echo -e "${YELLOW}AWS region is not set. Please enter your preferred AWS region (e.g., us-east-1):${NC}"
    read -r AWS_REGION
    aws configure set region "$AWS_REGION"
    echo -e "${GREEN}AWS region set to $AWS_REGION${NC}"
fi

echo -e "${GREEN}Using AWS region: $AWS_REGION${NC}"

# Check if Anthropic Claude Sonnet 3.5 v2 is enabled
echo -e "${YELLOW}Checking if Anthropic Claude Sonnet 3.5 v2 is enabled in Amazon Bedrock...${NC}"
echo -e "${YELLOW}Note: This script cannot automatically verify model access. Please ensure you've enabled the model in the Bedrock console.${NC}"
echo -e "${YELLOW}Have you enabled Anthropic Claude Sonnet 3.5 v2 in Amazon Bedrock? (y/n)${NC}"
read -r MODEL_ENABLED

if [[ "$MODEL_ENABLED" != "y" && "$MODEL_ENABLED" != "Y" ]]; then
    echo -e "${RED}Please enable Anthropic Claude Sonnet 3.5 v2 in Amazon Bedrock before proceeding.${NC}"
    echo "Visit: https://docs.aws.amazon.com/bedrock/latest/userguide/model-access.html"
    exit 1
fi

# Bootstrap CDK environment
echo -e "${YELLOW}Bootstrapping CDK environment...${NC}"
npx cdk bootstrap "aws://${AWS_ACCOUNT_ID:-$(aws sts get-caller-identity --query Account --output text)}/$AWS_REGION"

# Install npm packages
echo -e "${YELLOW}Installing npm packages...${NC}"
npm run install-packages

# Deploy the application
echo -e "${YELLOW}Deploying the application...${NC}"
npm run deploy-all

echo -e "${GREEN}Deployment completed!${NC}"
echo -e "${YELLOW}To access the application, find the CloudFront distribution URL with:${NC}"
echo "aws cloudformation describe-stacks --stack-name \$(aws cloudformation list-stacks --stack-status-filter CREATE_COMPLETE UPDATE_COMPLETE | jq -r '.StackSummaries[] | select(.StackName | startswith(\"DentalAssistantwebsitewafstack\")) | .StackName') --query 'Stacks[0].Outputs[?OutputKey==\`configwebsitedistributiondomain\`].OutputValue' --output text"

echo -e "${YELLOW}Remember to create a Cognito user to access the application.${NC}"
echo -e "${GREEN}Deployment process completed successfully!${NC}"
