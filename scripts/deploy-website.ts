import chalk from "chalk";
import { writeFileSync, unlinkSync, existsSync, readFileSync } from 'fs';
import * as envfile from 'envfile';
import { envPath, graphQLConfigFilePath, graphQLConfigTemplate, webappDistPath, spawnChild } from "./utils";
import { envConfig } from "./config";

type ExportType = {
    ExportingStackId: string,
    Name: string,
    Value: string
}

const getRegion = async () => {
    // read a file in path 
    const response = await spawnChild('aws', ['configure', 'get', 'region']) as string
    if (!response)
        return ""
    return JSON.parse(response)["output"] as string
}
const graphQLSetup = async (apiID: string) => {
    try {

        const region = (await getRegion()).trim()

        const graphQLConfigFile = readFileSync(graphQLConfigTemplate, 'utf8')
        const updatedData = graphQLConfigFile.replace("API_ID", apiID).replace("REGION", region);
        console.log("🚀 ~ graphQLSetup ~ updatedData:", updatedData)
        if (existsSync(graphQLConfigFilePath)) {
            console.log("Deleting existing GraphQL config file");
            unlinkSync(graphQLConfigFilePath)
        }
        writeFileSync(graphQLConfigFilePath, updatedData);
        console.log(chalk.greenBright("GraphQl Config file created successfully! ✅\n"));
    } catch (error) {
        throw new Error("Unable to generate GraphQL config file: " + error)
    }
}

const deployWebApp = async () => {
    try {

        console.log(chalk.greenBright(`Deploying Website ... ⌛\n`));

        const response = await spawnChild('aws', ['cloudformation', 'list-exports', '--output', 'json']) as string
        const exportsArray = JSON.parse(JSON.parse(response)["output"])["Exports"] as ExportType[]
        const envObject = envConfig.reduce((acc, config) => {
            const exportItem = exportsArray.find((e) => e.Name.includes(config.exportKey))
            return {
                ...acc,
                [config.envKey]: exportItem?.Value ?? ""
            };
        }, {})
        console.log("🚀 ~ envObject ~ envObject:", envObject)
        if (existsSync(envPath)) {
            // delete existing env file 
            console.log("Deleting existing env file");
            unlinkSync(envPath)
        } else {
            console.log("No existing env file found. Skipping deletion");
        }

        const region = (await getRegion()).trim()
        writeFileSync(envPath, envfile.stringify({
            VITE_REGION: region,
            ...envObject
        }));

        // graphql codegen automation
        const gqlAPiID = exportsArray.find(e => e.Name.includes("config-appsync-api-id-output"))
        if (gqlAPiID) {
            console.log(chalk.greenBright(`GraphQL API ID found! Setting up GraphQl Config ... ⌛\n`));
            await graphQLSetup(gqlAPiID.Value)
            console.log(chalk.greenBright("Running GraphQl Codegen automation ..  ⌛\n"));
            try {
                await spawnChild("npm", ["run", "-w", "webapp", "codegen"])
                console.log(chalk.greenBright("GraphQl Codegen generated successfully! ✅\n"));
            } catch (err) {
                console.log(chalk.yellow("GraphQL codegen failed, but continuing with deployment..."));
            }
        }
        console.log(chalk.greenBright(`Env file created successfully! ✅\n`));

        // upload to S3
        console.log(chalk.greenBright("Uploading Webapp to S3 ..  ⌛\n"));
        const bucketName = exportsArray.find(e => e.Name.includes("config-website-s3-bucket-name"))
        if (!bucketName) {
            console.error(`\n 🛑 Unable to find website bucket.. Exiting ....\n`)
            process.exit(1)
        }
        await spawnChild("aws", ["s3", "sync", webappDistPath, bucketName.Value, "--delete"])
        console.log(chalk.greenBright("Webapp uploaded successfully! ✅\n"));

        // invalidate CloudFront 
        console.log(chalk.greenBright("Invalidating CloudFront  ⌛\n"));
        const distributionID = exportsArray.find(e => e.Name.includes("config-website-distribution-id"))
        if (!distributionID) {
            console.error(`\n 🛑 Unable to find CloudFront distribution.. Exiting ....\n`)
            process.exit(1)
        }
        await spawnChild("aws", ["cloudfront", "create-invalidation", "--distribution-id", distributionID.Value, "--paths", "/*"])
        console.log(chalk.greenBright("Webapp uploaded successfully! 🚀\n"));

    } catch (err) {
        console.error(`\n 🛑 Error deploying webapp: ${err}`)
        // Continue execution even if there's an error with codegen
        console.log(chalk.yellow("Continuing with deployment despite codegen error..."));
    }

}


deployWebApp()