<template>
    <div
        v-if="slot"
        class="h-10 rounded-md px-2 cursor-pointer flex flex-col justify-center items-center text-center transition-all duration-200 relative overflow-hidden border-2"
        :class="slotClass"
        @click="handleClick"
    >
        <div v-if="slot.booking" class="text-[0.65rem] leading-tight mb-1 font-semibold">
            <div>{{ slot.booking.displayName }}</div>
            <div class="opacity-60 text-[0.6rem]">{{ slot.booking.phone }}</div>
        </div>
        <div v-if="!slot.booking" class="w-1.5 h-1.5 rounded-full mb-1" :class="dotClass"></div>
        <div v-if="!slot.booking" class="text-[0.85rem] font-bold">฿{{ slot.price }}</div>
        <div class="text-[0.65rem] uppercase font-bold opacity-80">
            {{ slot.booking ? 'BOOKED' : statusLabel }}
        </div>

        <div
            v-if="isSelected"
            class="absolute top-1 right-1 bg-ant-blue text-white w-[18px] h-[18px] rounded-full flex items-center justify-center text-[11px] font-bold z-[2] shadow-sm"
        >✓</div>
    </div>
    <div v-else class="h-full flex items-center justify-center text-xs text-gray-300 italic">
        ไม่มีข้อมูล
    </div>
</template>

<script>
export default {
    props: ['slot', 'isSelectionMode', 'isSelected'],
    emits: ['update', 'toggle-selection'],
    computed: {
        statusLabel() {
            if (!this.slot) return ''
            const labels = { pending: 'Pending', available: 'Available', closed: 'Closed', locked: 'Locked', booked: 'Booked' }
            return labels[this.slot.status] || this.slot.status
        },
        isPaidBooking() { return this.slot?.booking?.status === 'paid' },
        isPendingBooking() { return this.slot?.booking?.status === 'pending' },
        slotClass() {
            if (this.isSelected) return 'border-ant-blue bg-[#e6f7ff] shadow-[0_0_0_2px_rgba(24,144,255,0.2)] hover:scale-[1.02] hover:z-[1] hover:shadow-md'
            if (this.isPaidBooking) return 'bg-[#e6f7ff] text-[#1890ff] border-[#91d5ff] cursor-not-allowed'
            if (this.isPendingBooking) return 'bg-[#fff7e6] text-[#faad14] border-[#ffd591] border-dashed cursor-not-allowed'
            const statusClasses = {
                pending:   'bg-gray-100 text-gray-500 border border-dashed border-gray-300 hover:scale-[1.02] hover:z-[1] hover:shadow-md',
                available: 'bg-[#f6ffed] text-[#389e0d] border border-[#b7eb8f] hover:scale-[1.02] hover:z-[1] hover:shadow-md',
                closed:    'bg-[#fff1f0] text-[#cf1322] border border-[#ffa39e] hover:scale-[1.02] hover:z-[1] hover:shadow-md',
                locked:    'bg-[#fff7e6] text-[#d46b08] border border-[#ffd591] hover:scale-[1.02] hover:z-[1] hover:shadow-md',
                booked:    'bg-[#e6f7ff] text-[#096dd9] border border-[#91d5ff] cursor-not-allowed'
            }
            return statusClasses[this.slot?.status] || 'border-transparent'
        },
        dotClass() {
            const dots = {
                pending:   'bg-gray-400',
                available: 'bg-[#52c41a]',
                closed:    'bg-[#f5222d]',
                locked:    'bg-[#faad14]',
                booked:    'bg-ant-blue'
            }
            return dots[this.slot?.status] || 'bg-gray-300'
        }
    },
    methods: {
        handleClick() {
            if (this.isPaidBooking) return
            if (this.isSelectionMode) {
                this.$emit('toggle-selection', this.slot.id)
            } else {
                this.toggleStatus()
            }
        },
        toggleStatus() {
            if (!this.slot || this.slot.status === 'booked' || this.isPaidBooking) return
            const states = ['pending', 'available', 'closed', 'locked']
            const currentIndex = states.indexOf(this.slot.status)
            const nextIndex = (currentIndex + 1) % states.length
            this.$emit('update', { id: this.slot.id, status: states[nextIndex] })
        }
    }
}
</script>
