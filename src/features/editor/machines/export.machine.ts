import { setup } from 'xstate'

export const exportMachine = setup({
  types: {
    context: {} as {
      progress: number
      error: string | null
      outputBlob: Blob | null
    },
    events: {} as
      | { type: 'START_EXPORT' }
      | { type: 'PROGRESS'; progress: number }
      | { type: 'COMPLETE'; blob: Blob }
      | { type: 'FAILED'; error: string }
      | { type: 'RESET' },
  },
}).createMachine({
  id: 'export',
  initial: 'idle',
  context: {
    progress: 0,
    error: null,
    outputBlob: null,
  },
  states: {
    idle: {
      on: {
        START_EXPORT: 'preparing',
      },
    },
    preparing: {
      entry: ({ context }) => {
        context.progress = 0
        context.error = null
        context.outputBlob = null
      },
      after: {
        100: 'encoding',
      },
    },
    encoding: {
      on: {
        PROGRESS: {
          actions: ({ context, event }) => {
            context.progress = event.progress
          },
        },
        COMPLETE: {
          target: 'completed',
          actions: ({ context, event }) => {
            context.outputBlob = event.blob
            context.progress = 1
          },
        },
        FAILED: {
          target: 'failed',
          actions: ({ context, event }) => {
            context.error = event.error
          },
        },
      },
    },
    completed: {
      on: {
        RESET: 'idle',
      },
    },
    failed: {
      on: {
        RESET: 'idle',
        START_EXPORT: 'preparing',
      },
    },
  },
})
