<template>
  <v-select
    v-model="empresaActiva"
    :items="empresas"
    item-title="nombreFantasia"
    item-value="_id"
    label="Empresa"
    prepend-inner-icon="mdi-office-building"
    outlined
    dense
    hide-details
    @update:model-value="cambiarEmpresa"
  >
    <template #selection="{ item }">
      <div class="d-flex align-center">
        <v-icon start size="small">mdi-office-building</v-icon>
        <span class="text-truncate">{{ item.title }}</span>
      </div>
    </template>
    <template #item="{ props, item }">
      <v-list-item v-bind="props">
        <template #prepend>
          <v-icon>mdi-office-building</v-icon>
        </template>
        <template #title>{{ item.title }}</template>
        <template #subtitle>
          <div class="d-flex align-center">
            <v-icon start size="x-small">mdi-numeric</v-icon>
            RUC: {{ item.raw.ruc }}
          </div>
        </template>
      </v-list-item>
    </template>
  </v-select>
</template>

<script>
import { ref, onMounted } from 'vue';
import axios from 'axios';
import { guardarEmpresaActiva, obtenerEmpresaActiva } from '../auth';

export default {
  name: 'EmpresaSelector',
  emits: ['cambio-empresa'],
  setup(props, { emit }) {
    const empresas = ref([]);
    const empresaActiva = ref(null);
    const cargando = ref(false);

    const cargarEmpresas = async () => {
      cargando.value = true;
      try {
        const response = await axios.get('/api/empresas');
        empresas.value = response.data.data || [];
        
        // Restaurar empresa activa guardada
        const guardada = obtenerEmpresaActiva();
        if (guardada && empresas.value.find(e => e._id === guardada)) {
          empresaActiva.value = guardada;
        } else if (empresas.value.length > 0) {
          // Si no hay una guardada o la guardada ya no existe, usar la primera
          empresaActiva.value = empresas.value[0]._id;
          guardarEmpresaActiva(empresaActiva.value);
        }
        
        // Notificar al padre si se cargó una empresa
        if (empresaActiva.value) {
          emit('cambio-empresa', empresaActiva.value);
        }
      } catch (error) {
        console.error('Error cargando empresas:', error);
      } finally {
        cargando.value = false;
      }
    };

    const cambiarEmpresa = (id) => {
      guardarEmpresaActiva(id);
      emit('cambio-empresa', id);
    };

    onMounted(() => {
      // Solo cargar si hay más de una empresa potencial
      // Si el usuario solo tendrá una empresa, esto puede simplificarse
      cargarEmpresas();
    });

    return {
      empresas,
      empresaActiva,
      cargando,
      cambiarEmpresa
    };
  }
};
</script>

<style scoped>
/* Ajustes para que el selector se vea bien en el app bar */
:deep(.v-field__input) {
  min-height: 40px !important;
}

:deep(.v-selection-control) {
  flex: none !important;
}
</style>
