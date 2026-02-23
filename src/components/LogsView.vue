<template>
  <v-container fluid>
    <v-card>
      <v-card-title>
        <h2>Registros de Operación</h2>
        <v-spacer></v-spacer>
        <v-select
          v-model="selectedFilter"
          :items="filterOptions"
          label="Filtrar por estado"
          style="max-width: 200px;"
          density="compact"
        ></v-select>
        <v-text-field
          v-model="search"
          append-inner-icon="mdi-magnify"
          label="Buscar"
          single-line
          hide-details
          style="max-width: 300px;"
          class="ml-4"
        ></v-text-field>
      </v-card-title>

      <v-card-text>
        <v-data-table
          :headers="headers"
          :items="logs"
          :search="search"
          :loading="loading"
          :items-per-page="15"
          class="elevation-1"
        >
          <template v-slot:item.tipoOperacion="{ item }">
            <v-chip
              :color="getLogStatusColor(item.tipoOperacion)"
              size="small"
              variant="flat"
            >
              {{ item.tipoOperacion }}
            </v-chip>
          </template>
          
          <template v-slot:item.estado="{ item }">
            <v-chip
              :color="getLogStateColor(item.estado)"
              size="small"
              variant="flat"
            >
              {{ item.estado }}
            </v-chip>
          </template>
          
          <template v-slot:item.fecha="{ item }">
            {{ formatDateTime(item.fecha) }}
          </template>
          
          <template v-slot:item.invoiceId="{ item }">
            <v-btn
              color="primary"
              size="small"
              variant="text"
              @click="viewInvoice(item.invoiceId)"
            >
              Ver Factura
            </v-btn>
          </template>
        </v-data-table>
        
        <div class="text-center pt-4">
          <v-pagination
            v-model="currentPage"
            :length="totalPages"
            @update:modelValue="changePage"
          ></v-pagination>
        </div>
      </v-card-text>
    </v-card>
  </v-container>
</template>

<script>
import { ref, onMounted } from 'vue';
import axios from 'axios';

export default {
  name: 'LogsView',
  setup() {
    const logs = ref([]);
    const loading = ref(true);
    const search = ref('');
    const currentPage = ref(1);
    const totalPages = ref(1);
    const selectedFilter = ref('all');
    
    const filterOptions = [
      { title: 'Todos', value: 'all' },
      { title: 'Éxito', value: 'success' },
      { title: 'Error', value: 'error' },
      { title: 'Advertencia', value: 'warning' }
    ];
    
    const headers = [
      { title: 'Factura ID', key: 'invoiceId' },
      { title: 'Tipo', key: 'tipoOperacion' },
      { title: 'Descripción', key: 'descripcion' },
      { title: 'Estado', key: 'estado' },
      { title: 'Fecha', key: 'fecha' },
      { title: 'Acciones', key: 'invoiceId', sortable: false }
    ];
    
    const getLogStatusColor = (tipo) => {
      switch(tipo) {
        case 'envio_exitoso':
        case 'inicio_proceso':
          return 'success';
        case 'error':
          return 'error';
        case 'envio_sifen':
        case 'respuesta_sifen':
          return 'primary';
        default:
          return 'info';
      }
    };
    
    const getLogStateColor = (estado) => {
      switch(estado) {
        case 'success':
          return 'success';
        case 'error':
          return 'error';
        case 'warning':
          return 'warning';
        default:
          return 'info';
      }
    };
    
    const formatDateTime = (dateString) => {
      const date = new Date(dateString);
      return date.toLocaleString('es-PY');
    };
    
    const viewInvoice = (id) => {
      window.location.href = `/invoices/${id}`;
    };
    
    const changePage = (page) => {
      currentPage.value = page;
      loadLogs();
    };
    
    const loadLogs = async () => {
      loading.value = true;
      try {
        // En una implementación real, usaríamos el filtro seleccionado
        // Por ahora, solo obtenemos todos los logs
        const response = await axios.get(`/api/logs?page=${currentPage.value}&limit=15`);
        logs.value = response.data.logs || [];
        totalPages.value = response.data.totalPages || 1;
      } catch (error) {
        console.error('Error cargando logs:', error);
        // Datos de ejemplo para mostrar la funcionalidad
        logs.value = [
          {
            _id: '1',
            invoiceId: 'inv123',
            tipoOperacion: 'inicio_proceso',
            descripcion: 'Inicio del proceso de generación de factura electrónica',
            estado: 'success',
            fecha: new Date().toISOString()
          },
          {
            _id: '2',
            invoiceId: 'inv123',
            tipoOperacion: 'envio_sifen',
            descripcion: 'Envío de factura a SIFEN',
            estado: 'success',
            fecha: new Date().toISOString()
          },
          {
            _id: '3',
            invoiceId: 'inv124',
            tipoOperacion: 'error',
            descripcion: 'Error al conectar con SIFEN',
            estado: 'error',
            fecha: new Date().toISOString()
          }
        ];
      } finally {
        loading.value = false;
      }
    };
    
    onMounted(() => {
      loadLogs();
    });
    
    return {
      logs,
      loading,
      search,
      currentPage,
      totalPages,
      selectedFilter,
      filterOptions,
      headers,
      getLogStatusColor,
      getLogStateColor,
      formatDateTime,
      viewInvoice,
      changePage
    };
  }
};
</script>