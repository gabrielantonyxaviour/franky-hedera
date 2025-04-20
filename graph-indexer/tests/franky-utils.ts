import { newMockEvent } from "matchstick-as"
import { ethereum, Address, BigInt, Bytes } from "@graphprotocol/graph-ts"
import {
  AgentCreated,
  ApiKeyRegenerated,
  DeviceRegistered,
  Initialized,
  MetalWalletConfigured
} from "../generated/Franky/Franky"

export function createAgentCreatedEvent(
  agentAddress: Address,
  deviceAddress: Address,
  avatar: string,
  subname: string,
  owner: Address,
  perApiCallFee: BigInt,
  secretsHash: Bytes,
  characterConfig: ethereum.Tuple,
  secrets: string,
  isPublic: boolean
): AgentCreated {
  let agentCreatedEvent = changetype<AgentCreated>(newMockEvent())

  agentCreatedEvent.parameters = new Array()

  agentCreatedEvent.parameters.push(
    new ethereum.EventParam(
      "agentAddress",
      ethereum.Value.fromAddress(agentAddress)
    )
  )
  agentCreatedEvent.parameters.push(
    new ethereum.EventParam(
      "deviceAddress",
      ethereum.Value.fromAddress(deviceAddress)
    )
  )
  agentCreatedEvent.parameters.push(
    new ethereum.EventParam("avatar", ethereum.Value.fromString(avatar))
  )
  agentCreatedEvent.parameters.push(
    new ethereum.EventParam("subname", ethereum.Value.fromString(subname))
  )
  agentCreatedEvent.parameters.push(
    new ethereum.EventParam("owner", ethereum.Value.fromAddress(owner))
  )
  agentCreatedEvent.parameters.push(
    new ethereum.EventParam(
      "perApiCallFee",
      ethereum.Value.fromUnsignedBigInt(perApiCallFee)
    )
  )
  agentCreatedEvent.parameters.push(
    new ethereum.EventParam(
      "secretsHash",
      ethereum.Value.fromFixedBytes(secretsHash)
    )
  )
  agentCreatedEvent.parameters.push(
    new ethereum.EventParam(
      "characterConfig",
      ethereum.Value.fromTuple(characterConfig)
    )
  )
  agentCreatedEvent.parameters.push(
    new ethereum.EventParam("secrets", ethereum.Value.fromString(secrets))
  )
  agentCreatedEvent.parameters.push(
    new ethereum.EventParam("isPublic", ethereum.Value.fromBoolean(isPublic))
  )

  return agentCreatedEvent
}

export function createApiKeyRegeneratedEvent(
  agentAddress: Address,
  keyHash: Bytes
): ApiKeyRegenerated {
  let apiKeyRegeneratedEvent = changetype<ApiKeyRegenerated>(newMockEvent())

  apiKeyRegeneratedEvent.parameters = new Array()

  apiKeyRegeneratedEvent.parameters.push(
    new ethereum.EventParam(
      "agentAddress",
      ethereum.Value.fromAddress(agentAddress)
    )
  )
  apiKeyRegeneratedEvent.parameters.push(
    new ethereum.EventParam("keyHash", ethereum.Value.fromFixedBytes(keyHash))
  )

  return apiKeyRegeneratedEvent
}

export function createDeviceRegisteredEvent(
  deviceAddress: Address,
  owner: Address,
  deviceModel: string,
  ram: string,
  storageCapacity: string,
  cpu: string,
  ngrokLink: string,
  hostingFee: BigInt
): DeviceRegistered {
  let deviceRegisteredEvent = changetype<DeviceRegistered>(newMockEvent())

  deviceRegisteredEvent.parameters = new Array()

  deviceRegisteredEvent.parameters.push(
    new ethereum.EventParam(
      "deviceAddress",
      ethereum.Value.fromAddress(deviceAddress)
    )
  )
  deviceRegisteredEvent.parameters.push(
    new ethereum.EventParam("owner", ethereum.Value.fromAddress(owner))
  )
  deviceRegisteredEvent.parameters.push(
    new ethereum.EventParam(
      "deviceModel",
      ethereum.Value.fromString(deviceModel)
    )
  )
  deviceRegisteredEvent.parameters.push(
    new ethereum.EventParam("ram", ethereum.Value.fromString(ram))
  )
  deviceRegisteredEvent.parameters.push(
    new ethereum.EventParam(
      "storageCapacity",
      ethereum.Value.fromString(storageCapacity)
    )
  )
  deviceRegisteredEvent.parameters.push(
    new ethereum.EventParam("cpu", ethereum.Value.fromString(cpu))
  )
  deviceRegisteredEvent.parameters.push(
    new ethereum.EventParam("ngrokLink", ethereum.Value.fromString(ngrokLink))
  )
  deviceRegisteredEvent.parameters.push(
    new ethereum.EventParam(
      "hostingFee",
      ethereum.Value.fromUnsignedBigInt(hostingFee)
    )
  )

  return deviceRegisteredEvent
}

export function createInitializedEvent(
  frankyENSRegistrar: Address
): Initialized {
  let initializedEvent = changetype<Initialized>(newMockEvent())

  initializedEvent.parameters = new Array()

  initializedEvent.parameters.push(
    new ethereum.EventParam(
      "frankyENSRegistrar",
      ethereum.Value.fromAddress(frankyENSRegistrar)
    )
  )

  return initializedEvent
}

export function createMetalWalletConfiguredEvent(
  deviceAddress: Address,
  metalUserAddress: Address
): MetalWalletConfigured {
  let metalWalletConfiguredEvent =
    changetype<MetalWalletConfigured>(newMockEvent())

  metalWalletConfiguredEvent.parameters = new Array()

  metalWalletConfiguredEvent.parameters.push(
    new ethereum.EventParam(
      "deviceAddress",
      ethereum.Value.fromAddress(deviceAddress)
    )
  )
  metalWalletConfiguredEvent.parameters.push(
    new ethereum.EventParam(
      "metalUserAddress",
      ethereum.Value.fromAddress(metalUserAddress)
    )
  )

  return metalWalletConfiguredEvent
}
