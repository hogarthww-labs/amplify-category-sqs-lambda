# Amplify SQS Template
<p>
  <a href="https://www.npmjs.com/package/amplify-sqs-lambda-template">
      <img src="https://img.shields.io/npm/v/amplify-sqs-lambda-template.svg" />
  </a>
</p>

An easy way to add CloudFormation SQS templates to your Amplify Project

## Installation

This plugin assumes that the Amplify CLI is already installed. For installation help, please see step 2 of the [getting-started docs](https://aws-amplify.github.io/docs/).

To install, simply enter the following command in your terminal:

`npm i -g amplify-sqs-lambda-template`

## Usage

| Command                      | Description |
| ---------------------------- | ----------- |
| `amplify add sqs-function`       | Adds an SQS triggered function resource template to your project. |
| `amplify remove sqs-function`    | Removes a specified SQS triggered function resource template from your project. |

## Usage notes

Note that you can apply this template on an existing function generated via amplify.
The resource will assume the function codes can be found in `./src` relative to the template, typically in `./src/index.js`

## SQS usage

You can use the [sqs-utils](https://github.com/hogarthww-labs/sqs-utils) module to facilitate working with SQS, including [Producer](https://www.npmjs.com/package/sqs-producer) and [Consumer](https://www.npmjs.com/package/sqs-consumer).
