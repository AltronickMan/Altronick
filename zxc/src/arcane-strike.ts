/**
 * Arcane Strike: WebAR Spirit Hunter - 8th Wall Studio ECS Component
 * Integrated with Niantic @8thwall/ecs for 8th Wall Studio Cloud / Local Build.
 */
import * as ecs from '@8thwall/ecs'

ecs.registerComponent({
  name: 'arcane-strike',
  schema: {
    maxSpirits: ecs.f32,
    cooldownDuration: ecs.f32,
  },
  schemaDefaults: {
    maxSpirits: 3,
    cooldownDuration: 0.85,
  },
  add: (world, component) => {
    console.log('[8th Wall Studio] Arcane Strike ECS Component Initialized.')

    // Listen for hand tracking events from 8th Wall engine
    world.events.addListener(world.events.globalId, 'xrhandfound', (e: any) => {
      console.log('[8th Wall Studio] Hand Detected:', e)
    })

    world.events.addListener(world.events.globalId, 'xrhandupdated', (e: any) => {
      // Hand attachment updates
    })

    world.events.addListener(world.events.globalId, 'xrhandlost', () => {
      console.log('[8th Wall Studio] Hand Lost.')
    })
  },
  tick: (world, component) => {
    // 8th Wall ECS tick loop
  },
  remove: (world, component) => {
    console.log('[8th Wall Studio] Arcane Strike Component Removed.')
  },
})
