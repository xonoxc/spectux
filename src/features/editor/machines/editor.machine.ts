import { setup } from 'xstate'

export const editorMachine = setup({
  types: {
    context: {} as {
      projectId: string | null
      error: string | null
    },
    events: {} as
      | { type: 'LOAD_PROJECT'; projectId: string }
      | { type: 'PROJECT_LOADED' }
      | { type: 'LOAD_FAILED'; error: string }
      | { type: 'START_EDITING' }
      | { type: 'SAVE' }
      | { type: 'SAVED' }
      | { type: 'SAVE_FAILED'; error: string }
      | { type: 'ERROR'; error: string }
      | { type: 'RETRY' },
  },
}).createMachine({
  id: 'editor',
  initial: 'idle',
  context: {
    projectId: null,
    error: null,
  },
  states: {
    idle: {
      on: {
        LOAD_PROJECT: {
          target: 'loadingProject',
          actions: ({ context, event }) => {
            context.projectId = event.projectId
          },
        },
      },
    },
    loadingProject: {
      on: {
        PROJECT_LOADED: 'editing',
        LOAD_FAILED: {
          target: 'error',
          actions: ({ context, event }) => {
            context.error = event.error
          },
        },
      },
    },
    editing: {
      on: {
        SAVE: 'saving',
        ERROR: {
          target: 'error',
          actions: ({ context, event }) => {
            context.error = event.error
          },
        },
      },
    },
    saving: {
      on: {
        SAVED: 'editing',
        SAVE_FAILED: {
          target: 'error',
          actions: ({ context, event }) => {
            context.error = event.error
          },
        },
      },
    },
    error: {
      on: {
        RETRY: {
          target: 'loadingProject',
        },
        LOAD_PROJECT: {
          target: 'loadingProject',
          actions: ({ context, event }) => {
            context.projectId = event.projectId
          },
        },
      },
    },
  },
})
