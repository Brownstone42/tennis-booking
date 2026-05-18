import { defineStore } from 'pinia'

export const useToastStore = defineStore('toast', {
    state: () => ({ toasts: [] }),
    actions: {
        show(message, type = 'info') {
            const id = Date.now() + Math.random()
            this.toasts.push({ id, message, type })
            setTimeout(() => this.dismiss(id), 3000)
        },
        success(message) { this.show(message, 'success') },
        error(message) { this.show(message, 'error') },
        dismiss(id) {
            const i = this.toasts.findIndex((t) => t.id === id)
            if (i !== -1) this.toasts.splice(i, 1)
        }
    }
})
