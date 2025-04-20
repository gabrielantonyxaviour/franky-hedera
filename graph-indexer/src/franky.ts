import {
  AgentCreated as AgentCreatedEvent,
  ApiKeyRegenerated as ApiKeyRegeneratedEvent,
  DeviceRegistered as DeviceRegisteredEvent,
  Initialized as InitializedEvent,
  ServerWalletConfigured as ServerWalletConfiguredEvent,
} from "../generated/Franky/Franky"
import {
  AgentCreated,
  ApiKeyRegenerated,
  DeviceRegistered,
  Initialized,
  MetalWalletConfigured
} from "../generated/schema"

export function handleAgentCreated(event: AgentCreatedEvent): void {
  let entity = new AgentCreated(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.agentAddress = event.params.agentAddress
  entity.deviceAddress = event.params.deviceAddress
  entity.avatar = event.params.avatar
  entity.subname = event.params.subname
  entity.owner = event.params.owner
  entity.perApiCallFee = event.params.perApiCallFee
  entity.secretsHash = event.params.secretsHash
  entity.characterConfig_name = event.params.characterConfig.name
  entity.characterConfig_description = event.params.characterConfig.description
  entity.characterConfig_personality = event.params.characterConfig.personality
  entity.characterConfig_scenario = event.params.characterConfig.scenario
  entity.characterConfig_first_mes = event.params.characterConfig.first_mes
  entity.characterConfig_mes_example = event.params.characterConfig.mes_example
  entity.characterConfig_creatorcomment =
    event.params.characterConfig.creatorcomment
  entity.characterConfig_tags = event.params.characterConfig.tags
  entity.characterConfig_talkativeness =
    event.params.characterConfig.talkativeness
  entity.secrets = event.params.secrets
  entity.isPublic = event.params.isPublic

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleApiKeyRegenerated(event: ApiKeyRegeneratedEvent): void {
  let entity = new ApiKeyRegenerated(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.agentAddress = event.params.agentAddress
  entity.keyHash = event.params.keyHash

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleDeviceRegistered(event: DeviceRegisteredEvent): void {
  let entity = new DeviceRegistered(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.deviceAddress = event.params.deviceAddress
  entity.owner = event.params.owner
  entity.deviceModel = event.params.deviceModel
  entity.ram = event.params.ram
  entity.storageCapacity = event.params.storageCapacity
  entity.cpu = event.params.cpu
  entity.ngrokLink = event.params.ngrokLink
  entity.hostingFee = event.params.hostingFee

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleInitialized(event: InitializedEvent): void {
  let entity = new Initialized(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.frankyENSRegistrar = event.params.frankyENSRegistrar

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleMetalWalletConfigured(
  event: MetalWalletConfiguredEvent
): void {
  let entity = new MetalWalletConfigured(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.deviceAddress = event.params.deviceAddress
  entity.metalUserAddress = event.params.metalUserAddress

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}
