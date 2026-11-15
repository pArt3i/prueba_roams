<script setup lang="ts">
import { useId } from 'vue'
import type { Currency } from '@/types/simulation'

const currency = defineModel<Currency>({ required: true })
const id = useId()
</script>

<template>
  <div class="field">
    <label :for="id">Divisa</label>
    <select :id="id" v-model="currency">
      <option value="EUR">EUR (euro)</option>
      <option value="USD">USD (dólar)</option>
      <option value="GBP">GBP (libra)</option>
    </select>
  </div>
</template>
