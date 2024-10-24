<template>
  <div>
    <NuxtRouteAnnouncer />
    <h4><b>Date: </b>{{ parseDate(new Date()) }}</h4>
    <button @click="()=>sayHello('Johny')">Say hi</button>
  </div>
</template>
<script setup lang="ts">
import { parseDate } from '@cmn/utils/functions';
import {sayHello} from '@/src/utils/funcs'
// import second from 'first'
</script>