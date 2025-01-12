import { AgentConnectionType } from '@ortege/sdk';

import { DockerConfig } from './agent';

export interface LiquidityLayerRelayerConfig {
  docker: DockerConfig;
  namespace: string;
  connectionType: AgentConnectionType.Http | AgentConnectionType.HttpQuorum;
  prometheusPushGateway: string;
}
