import {
  AgentCreated as AgentCreatedEvent,
  ApiKeyRegenerated as ApiKeyRegeneratedEvent,
  DeviceRegistered as DeviceRegisteredEvent,
  ServerWalletConfigured as ServerWalletConfiguredEvent,
  Initialized as InitializedEvent,
} from "../generated/Franky/Franky"

import { agent as Agent, device as Device, user as User } from "../generated/schema"

export function handleAgentCreated(event: AgentCreatedEvent): void {
  let userId = event.params.owner.toHexString()
  let user = User.load(userId)
  let deviceId = event.params.deviceAddress.toHexString()
  let device = Device.load(deviceId)
  if (device && user) {
    let agentId = event.params.agentAddress.toHexString()
    let agent = new Agent(agentId)
    agent.deviceAddress = event.params.deviceAddress.toHexString()
    agent.owner = userId
    agent.avatar = event.params.avatar
    agent.subname = event.params.subname
    agent.perApiCallFee = event.params.perApiCallFee
    agent.characterConfig = event.params.characterConfig
    agent.isPublic = event.params.isPublic
    agent.createdAt = event.block.timestamp
    agent.updatedAt = event.block.timestamp
    agent.save()
  }
}

export function handleApiKeyRegenerated(event: ApiKeyRegeneratedEvent): void {
  let agentId = event.params.agentAddress.toHexString()
  let agent = Agent.load(agentId)
  if (agent) {
    agent.keyHash = event.params.keyHash
    agent.updatedAt = event.block.timestamp
    agent.save()
  }
}

export function handleDeviceRegistered(event: DeviceRegisteredEvent): void {
  let userId = event.params.owner.toHexString()
  let user = User.load(userId)
  if (!user) {
    user = new User(userId)
    user.createdAt = event.block.timestamp
    user.updatedAt = event.block.timestamp
    user.save()
  }

  let deviceId = event.params.deviceAddress.toHexString()
  let device = new Device(deviceId)
  device.owner = userId
  device.deviceMetadata = event.params.deviceMetadata
  device.ngrokLink = event.params.ngrokLink
  device.hostingFee = event.params.hostingFee
  device.createdAt = event.block.timestamp
  device.updatedAt = event.block.timestamp
  device.save()
}

export function handleServerWalletConfigured(event: ServerWalletConfiguredEvent): void {
  let userId = event.params.embeddedWalletAddress.toHexString()
  let user = User.load(userId)
  if (!user) {
    user = new User(userId)
    user.createdAt = event.block.timestamp
  }
  user.serverWalletAddress = event.params.serverWalletAddress
  user.updatedAt = event.block.timestamp
  user.save()
}
export function handleInitialized(event: InitializedEvent): void { }