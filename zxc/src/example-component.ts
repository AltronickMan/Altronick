import * as ecs from '@8thwall/ecs'
import './arcane-strike'

ecs.registerComponent({
  name: 'example-component',
  add: () => {
    console.log('[8th Wall Studio] Arcane Strike runtime loaded.')
  },
})
