import { setup } from 'xstate'

export const playbackMachine = setup({
  types: {
    context: {} as {
      currentTime: number
      duration: number
    },
    events: {} as
      | { type: 'PLAY' }
      | { type: 'PAUSE' }
      | { type: 'SEEK'; time: number }
      | { type: 'TIME_UPDATE'; time: number }
      | { type: 'ENDED' },
  },
}).createMachine({
  id: 'playback',
  initial: 'paused',
  context: {
    currentTime: 0,
    duration: 0,
  },
  states: {
    paused: {
      on: {
        PLAY: {
          target: 'playing',
        },
        SEEK: {
          actions: ({ context, event }) => {
            context.currentTime = event.time
          },
        },
      },
    },
    playing: {
      on: {
        PAUSE: {
          target: 'paused',
        },
        SEEK: {
          target: 'seeking',
        },
        TIME_UPDATE: {
          actions: ({ context, event }) => {
            context.currentTime = event.time
          },
        },
        ENDED: {
          target: 'paused',
          actions: ({ context }) => {
            context.currentTime = 0
          },
        },
      },
    },
    seeking: {
      on: {
        TIME_UPDATE: {
          target: 'playing',
          actions: ({ context, event }) => {
            context.currentTime = event.time
          },
        },
        PAUSE: {
          target: 'paused',
        },
      },
    },
  },
})
