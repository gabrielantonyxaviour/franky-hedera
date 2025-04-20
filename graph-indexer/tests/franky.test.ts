import {
  assert,
  describe,
  test,
  clearStore,
  beforeAll,
  afterAll
} from "matchstick-as/assembly/index"
import { Address, BigInt, Bytes } from "@graphprotocol/graph-ts"
import { AgentCreated } from "../generated/schema"
import { AgentCreated as AgentCreatedEvent } from "../generated/Franky/Franky"
import { handleAgentCreated } from "../src/franky"
import { createAgentCreatedEvent } from "./franky-utils"

// Tests structure (matchstick-as >=0.5.0)
// https://thegraph.com/docs/en/developer/matchstick/#tests-structure-0-5-0

describe("Describe entity assertions", () => {
  beforeAll(() => {
    let agentAddress = Address.fromString(
      "0x0000000000000000000000000000000000000001"
    )
    let deviceAddress = Address.fromString(
      "0x0000000000000000000000000000000000000001"
    )
    let avatar = "Example string value"
    let subname = "Example string value"
    let owner = Address.fromString("0x0000000000000000000000000000000000000001")
    let perApiCallFee = BigInt.fromI32(234)
    let secretsHash = Bytes.fromI32(1234567890)
    let characterConfig = "ethereum.Tuple Not implemented"
    let secrets = "Example string value"
    let isPublic = "boolean Not implemented"
    let newAgentCreatedEvent = createAgentCreatedEvent(
      agentAddress,
      deviceAddress,
      avatar,
      subname,
      owner,
      perApiCallFee,
      secretsHash,
      characterConfig,
      secrets,
      isPublic
    )
    handleAgentCreated(newAgentCreatedEvent)
  })

  afterAll(() => {
    clearStore()
  })

  // For more test scenarios, see:
  // https://thegraph.com/docs/en/developer/matchstick/#write-a-unit-test

  test("AgentCreated created and stored", () => {
    assert.entityCount("AgentCreated", 1)

    // 0xa16081f360e3847006db660bae1c6d1b2e17ec2a is the default address used in newMockEvent() function
    assert.fieldEquals(
      "AgentCreated",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1",
      "agentAddress",
      "0x0000000000000000000000000000000000000001"
    )
    assert.fieldEquals(
      "AgentCreated",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1",
      "deviceAddress",
      "0x0000000000000000000000000000000000000001"
    )
    assert.fieldEquals(
      "AgentCreated",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1",
      "avatar",
      "Example string value"
    )
    assert.fieldEquals(
      "AgentCreated",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1",
      "subname",
      "Example string value"
    )
    assert.fieldEquals(
      "AgentCreated",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1",
      "owner",
      "0x0000000000000000000000000000000000000001"
    )
    assert.fieldEquals(
      "AgentCreated",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1",
      "perApiCallFee",
      "234"
    )
    assert.fieldEquals(
      "AgentCreated",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1",
      "secretsHash",
      "1234567890"
    )
    assert.fieldEquals(
      "AgentCreated",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1",
      "characterConfig",
      "ethereum.Tuple Not implemented"
    )
    assert.fieldEquals(
      "AgentCreated",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1",
      "secrets",
      "Example string value"
    )
    assert.fieldEquals(
      "AgentCreated",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1",
      "isPublic",
      "boolean Not implemented"
    )

    // More assert options:
    // https://thegraph.com/docs/en/developer/matchstick/#asserts
  })
})
