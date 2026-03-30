<template>
    <div
        v-if="slot"
        class="slot-item"
        :class="[slot.status, { selected: isSelected }]"
        @click="handleClick"
    >
        <div class="selection-indicator" v-if="isSelected">
            <span class="check-icon">✓</span>
        </div>
        <div class="slot-status-dot"></div>
        <div class="slot-price">฿{{ slot.price }}</div>
        <div class="slot-status-text">{{ statusLabel }}</div>
    </div>
    <div v-else class="slot-empty">ไม่มีข้อมูล</div>
</template>

<script>
export default {
    props: ['slot', 'isSelectionMode', 'isSelected'],
    computed: {
        statusLabel() {
            if (!this.slot) return ''
            const labels = {
                pending: 'Pending',
                available: 'Available',
                closed: 'Closed',
                locked: 'Locked',
                booked: 'Booked'
            }
            return labels[this.slot.status] || this.slot.status
        }
    },
    methods: {
        handleClick() {
            if (this.isSelectionMode) {
                this.$emit('toggle-selection', this.slot.id)
            } else {
                this.toggleStatus()
            }
        },
        toggleStatus() {
            if (!this.slot || this.slot.status === 'booked') return

            const states = ['pending', 'available', 'closed', 'locked']
            const currentIndex = states.indexOf(this.slot.status)
            const nextIndex = (currentIndex + 1) % states.length
            this.$emit('update', { id: this.slot.id, status: states[nextIndex] })
        }
    }
}
</script>

<style scoped>
.slot-item {
    height: 100%;
    border-radius: 6px;
    padding: 6px;
    cursor: pointer;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    transition: all 0.2s;
    position: relative;
    overflow: hidden;
    border: 2px solid transparent;
}
.slot-item:hover {
    transform: scale(1.02);
    z-index: 1;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

/* Selection Styling */
.slot-item.selected {
    border-color: #1890ff;
    background-color: #e6f7ff !important;
    box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
}
.selection-indicator {
    position: absolute;
    top: 2px;
    right: 2px;
    background: #1890ff;
    color: white;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 10px;
    font-weight: bold;
    z-index: 2;
}
.slot-status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #ccc;
    margin-bottom: 4px;
}
.slot-price {
    font-size: 0.85rem;
    font-weight: bold;
}
.slot-status-text {
    font-size: 0.7rem;
    text-transform: uppercase;
    opacity: 0.8;
}

.pending {
    background-color: #f5f5f5;
    color: #8c8c8c;
    border: 1px dashed #d9d9d9;
}
.pending .slot-status-dot {
    background: #bfbfbf;
}
.available {
    background-color: #f6ffed;
    color: #389e0d;
    border: 1px solid #b7eb8f;
}
.available .slot-status-dot {
    background: #52c41a;
}
.closed {
    background-color: #fff1f0;
    color: #cf1322;
    border: 1px solid #ffa39e;
}
.closed .slot-status-dot {
    background: #f5222d;
}
.locked {
    background-color: #fff7e6;
    color: #d46b08;
    border: 1px solid #ffd591;
}
.locked .slot-status-dot {
    background: #faad14;
}
.booked {
    background-color: #e6f7ff;
    color: #096dd9;
    border: 1px solid #91d5ff;
    cursor: not-allowed;
}
.booked .slot-status-dot {
    background: #1890ff;
}
.slot-empty {
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.75rem;
    color: #ccc;
    font-style: italic;
}
</style>
