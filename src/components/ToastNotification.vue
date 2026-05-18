<template>
    <teleport to="body">
        <div class="fixed top-5 right-5 flex flex-col gap-3 z-[9999] pointer-events-none">
            <transition-group name="toast">
                <div
                    v-for="toast in toasts"
                    :key="toast.id"
                    class="flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium pointer-events-auto min-w-[260px] max-w-[360px]"
                    :class="toastClass(toast.type)"
                    @click="dismiss(toast.id)"
                >
                    <svg v-if="toast.type === 'success'" class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                    </svg>
                    <svg v-else-if="toast.type === 'error'" class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                    <svg v-else class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                    <span>{{ toast.message }}</span>
                </div>
            </transition-group>
        </div>
    </teleport>
</template>

<script>
import { mapState, mapActions } from 'pinia'
import { useToastStore } from '../stores/toast'

export default {
    computed: {
        ...mapState(useToastStore, ['toasts'])
    },
    methods: {
        ...mapActions(useToastStore, ['dismiss']),
        toastClass(type) {
            if (type === 'success') return 'bg-[#f6ffed] text-[#389e0d] border border-[#b7eb8f]'
            if (type === 'error') return 'bg-[#fff2f0] text-[#cf1322] border border-[#ffa39e]'
            return 'bg-white text-gray-700 border border-gray-200'
        }
    }
}
</script>

<style scoped>
.toast-enter-active { transition: all 0.25s ease; }
.toast-leave-active { transition: all 0.2s ease; }
.toast-enter-from { opacity: 0; transform: translateX(40px); }
.toast-leave-to { opacity: 0; transform: translateX(40px); }
</style>
