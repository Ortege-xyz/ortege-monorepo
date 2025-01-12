import { HyperlaneRouterChecker } from '@ortege/sdk';

import { HelloWorldApp } from '../app/app';
import { HelloWorldFactories } from '../app/contracts';

import { HelloWorldConfig } from './config';

export class HelloWorldChecker extends HyperlaneRouterChecker<
  HelloWorldFactories,
  HelloWorldApp,
  HelloWorldConfig
> {}
