#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { SimpleNoteStack } from '../lib/SimpleNoteStack';
import config from '../config/config.json';

const app = new cdk.App();

new SimpleNoteStack(app, 'SimpleNoteInfraStack', {
  env: {
    account: '192474940472',
    region: config.region,
  },
});
