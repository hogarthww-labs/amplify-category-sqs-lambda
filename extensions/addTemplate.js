const fs = require('fs');
const path = require('path');
const { copyFilesToS3 } = require('./helpers/template-staging');
const { getProjectName, generateQuestions, askLocationQuestions } = require('./helpers/template-question');
const { yamlParse, yamlDump } = require('yaml-cfn');

module.exports = (context) => {
    context.createTemplate = async () => {
      await createTemplate(context);
    };
};

async function createTemplate(context){
    const options = {
        service: 'sqs',
        providerPlugin: 'awscloudformation',
    };

    let lambdaName = await getLambdaName(context);
    let sqsName = await getSQSName(context);    
    let props = await askLocationQuestions();
    props.projectName = lambdaName;
    props.sqsName = sqsName;
    props.options = options;
    props.root = path.join(__dirname, 'templates/sqs-lambda-template.json')
    prepareCloudFormation(context,props);
}

async function prepareCloudFormation(context, props){
    let split = props.root.split('.');
    let ending = split[split.length-1];
    props.ending = ending
    if (ending.toLowerCase() === 'json'){
        await handleJSON(context, props);
    } else if (ending.toLowerCase() === 'yaml' || ending.toLowerCase() === 'yml'){
        await handleYAML(context, props);
    } else {
        console.log('Error! Can\'t find ending');
    }
    await stageRoot(context, props);
}

function replaceTemplateName(rootTemplate, props) {
    rootTemplate = rootTemplate.replace('<sqs-name>', props.sqsName)
    rootTemplate = rootTemplate.replace('<lambda-name>', props.projectName.toUpperCase())
    return rootTemplate    
}


async function handleYAML(context, props){
    let rootTemplate = yamlParse(fs.readFileSync(props.root,'utf8'));
    rootTemplate = await prepareTemplate(context, props, rootTemplate);
    rootTemplate = replaceTemplateName(rootTemplate, props)
    rootTemplate = await generateQuestions(context, rootTemplate);
    fs.writeFileSync(props.root, yamlDump(rootTemplate, null, 4));
}

async function handleJSON(context, props){
    let rootTemplate = JSON.parse(fs.readFileSync(props.root));
    rootTemplate = await prepareTemplate(context, props, rootTemplate);
    rootTemplate = replaceTemplateName(rootTemplate, props)
    rootTemplate = await generateQuestions(context, rootTemplate);
    fs.writeFileSync(props.root, JSON.stringify(rootTemplate, null, 4));
}

async function prepareTemplate(context, props, rootTemplate){
    const { amplify } = context;
    const targetBucket = amplify.getProjectMeta().providers.awscloudformation.DeploymentBucketName;

    if (!rootTemplate.Parameters){
        rootTemplate.Parameters = {}
    } 
    if (!rootTemplate.Parameters.env) {
        rootTemplate.Parameters.env = {
            Type :"String",
            Description: "The environment name. e.g. Dev, Test, or Production",
            Default: "NONE"
        }
    }
    if (props.isNestedTemplate === "YES"){
        Object.keys(rootTemplate.Resources).forEach(resource => {
            let urlSplit = rootTemplate.Resources[resource].Properties.TemplateURL.split('/');
            /* For making sure that we don't lose filenames */
            if (urlSplit.length == 0){
                rootTemplate.Resources[resource].Properties.TemplateURL = "https://s3.amazonaws.com/" + targetBucket + "/amplify-cfn-templates/" + props.projectName + "/" + rootTemplate.Resources[resource].Properties.TemplateURL;
            } else {
                let filename = urlSplit[urlSplit.length-1];
                rootTemplate.Resources[resource].Properties.TemplateURL = "https://s3.amazonaws.com/" + targetBucket + "/amplify-cfn-templates/" + props.projectName + "/" + filename;
            }
        });
    }
    return rootTemplate
}

async function stageRoot(context, props){
    const { amplify } = context;
    const targetDir = amplify.pathManager.getBackendDirPath();
    const copyJobs = [
        {
          dir: '/',
          template: `${props.root}`,
          target: `${targetDir}/function/${props.projectName}/${props.projectName}-sqs-template.${props.ending}`,
        },
      ];
      context.amplify.updateamplifyMetaAfterResourceAdd(
        "sqs",
        props.projectName,
        props.options,
      );
      await context.amplify.copyBatch(context, copyJobs, props);
      if (props.isNestedTemplate === "YES"){
        const fileuploads = fs.readdirSync(`${props.nestedFolder}`);

        if (!fs.existsSync(`${targetDir}/function/${props.projectName}/src/`)) {
            fs.mkdirSync(`${targetDir}/function/${props.projectName}/src/`);
        }

        fileuploads.forEach((filePath) => {
            fs.copyFileSync(`${props.nestedFolder}/${filePath}`, `${targetDir}/function/${props.projectName}/src/${filePath}`);
        });
        copyFilesToS3(context, props.options, props)
      }
      
}