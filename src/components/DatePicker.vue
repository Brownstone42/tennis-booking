<template>
    <flat-pickr
        :model-value="modelValue"
        :config="config"
        class="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-ant-blue bg-white cursor-pointer"
        @update:model-value="$emit('update:modelValue', $event)"
    />
</template>

<script>
import FlatPickr from 'vue-flatpickr-component'
import 'flatpickr/dist/flatpickr.min.css'

export default {
    components: { FlatPickr },
    props: {
        modelValue: { type: String, default: '' },
        placeholder: { type: String, default: 'วว/ดด/ปปปป' }
    },
    emits: ['update:modelValue'],
    computed: {
        config() {
            const placeholder = this.placeholder
            return {
                dateFormat: 'Y-m-d',
                altInput: true,
                altFormat: 'd/m/Y',
                allowInput: true,
                disableMobile: true,
                onReady(_dates, _str, instance) {
                    if (instance.altInput) instance.altInput.placeholder = placeholder
                }
            }
        }
    }
}
</script>
