const questions = require('./questions.json');
const inquirer = require('inquirer');
const fs = require('fs');

async function getSQSName(context){
    const { amplify } = context;
    const inputs = questions.template.inputs;
    const nameProject = [
        {
          type: inputs[0].type,
          name: inputs[0].key,
          message: inputs[0].question,
          validate: amplify.inputValidation(inputs[0]),
          default: amplify.getProjectDetails().projectConfig.projectName,
    }];

    let resource = await inquirer.prompt(nameProject);

    return resource.name;
}

async function getLambdaDetails(context){
    const { amplify } = context;
    const inputs = questions.template.inputs;
    const lambdaQuestions = [
        {
          type: inputs[1].type,
          name: inputs[1].key,
          message: inputs[1].question,
          validate: amplify.inputValidation(inputs[1]),
          default: amplify.getProjectDetails().projectConfig.projectName,
    }, {
        type: inputs[2].type,
        name: inputs[2].key,
        message: inputs[2].question,
        validate: amplify.inputValidation(inputs[2]),
        default: 'nodejs12.x'
    },{
        type: inputs[3].type,
        name: inputs[3].key,
        message: inputs[3].question,
        validate: amplify.inputValidation(inputs[3]),
        default: 60
    }];

    return await inquirer.prompt(lambdaQuestions);
}

async function askLocationQuestions(){
    const inputs = questions.template.inputs;
    let results = {};
    const isNestedTemplateQ = [
        {
          type: inputs[2].type,
          name: inputs[2].key,
          message: inputs[2].question,
          choices: inputs[2].options,
          default: "NO"
        },
    ];

    const nestedFolderQ = [
        {
          type: inputs[4].type,
          name: inputs[4].key,
          message: inputs[4].question,
          choices: inputs[4].options,
          default: ""
        },
    ];

    const isNestedTemplate = await inquirer.prompt(isNestedTemplateQ);
    results.isNestedTemplate = isNestedTemplate.nestedTemplate;
    if (isNestedTemplate.nestedTemplate === "YES"){
        while (results.nestedFolder === undefined){
            let nestedFolder = await inquirer.prompt(nestedFolderQ);
            if(fs.existsSync(nestedFolder.folderLocation)){
                results.nestedFolder = nestedFolder.folderLocation;
            }
        }
    }

    return results;
}

async function generateQuestions(context, rootTemplate){
    const { amplify } = context;
    let questions = []

    Object.keys(rootTemplate.Parameters).forEach(key => {
        if (key === "env") return;
        let question = {};
        let param = rootTemplate.Parameters[key];
        question.name = key;
        question.message = `${param.Description}`;
        question.default = (param.Default != undefined) ? param.Default : "";
        if (param.Type === "String" && param.AllowedPattern != undefined){
            let regex = param.AllowedPattern;
            question.type = "input";
            question.validation = {};
            question.validation.operator = "regex";
            
            let lengthRegex = "";
            if (param.MinLength != undefined || param.MaxLength != undefined ){
                lengthRegex = ((param.MinLength != undefined) ? `{${param.MinLength},` : "{,") + ((param.MaxLength != undefined) ? `${param.MaxLength}}` : "}");
                if (param.MaxLength == param.MinLength){
                    lengthRegex = `{${param.MaxLength}}`
                }
                if (regex[regex.length-1] === '*'){
                     regex = regex.slice(0,-1);
                }
            }
            question.validation.value = `^${regex}` + ((lengthRegex != "") ? lengthRegex : "") + "$";
            question.validation.onErrorMesg = param.ConstraintDescription;
            question.validate = amplify.inputValidation(question);
            questions.push(question);
        } else if ((param.Type === "String" || param.Type === "Number") && param.AllowedValues != undefined){
            question.type = "list";
            question.choices = param.AllowedValues;
            questions.push(question);
        } else if (param.Type === "Number"){
            question.type = "number";
            question.validation = {};
            question.validation.operator = "range";
            question.validation.value = {};
            question.validation.value.min = ((param.MinValue != undefined) ? param.MinValue : Number.NEGATIVE_INFINITY);
            question.validation.value.max = ((param.MaxValue != undefined) ? param.MaxValue : Number.POSITIVE_INFINITY);
            question.validation.onErrorMesg = param.ConstraintDescription;
            question.validate = amplify.inputValidation(question);
            questions.push(question);
        } else {
            //Ignore and keep default :)
        }
        
    });

    const answers = await inquirer.prompt(questions);

    Object.keys(answers).forEach(key => {
        rootTemplate.Parameters[key].Default = answers[key];
    });
    return rootTemplate;
}

module.exports = {
    getSQSName,
    getLambdaDetails,
    generateQuestions,
    askLocationQuestions
}