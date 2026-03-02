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
        <v-menu v-model="menuOpen" :close-on-content-click="false" location="end">
          <template v-slot:activator="{ props }">
            <v-btn
              v-bind="props"
              color="error"
              variant="outlined"
              class="ml-2"
              :loading="clearing"
            >
              <v-icon start>mdi-delete-sweep</v-icon>
              Limpiar
            </v-btn>
          </template>
          <v-list>
            <v-list-item @click="confirmClearLogs('all')">
              <v-list-item-title>Todos los registros</v-list-item-title>
            </v-list-item>
            <v-divider></v-divider>
            <v-list-item @click="confirmClearLogs('error')">
              <v-list-item-title>Solo errores</v-list-item-title>
            </v-list-item>
            <v-list-item @click="confirmClearLogs('success')">
              <v-list-item-title>Solo éxitos</v-list-item-title>
            </v-list-item>
            <v-list-item @click="confirmClearLogs('warning')">
              <v-list-item-title>Solo advertencias</v-list-item-title>
            </v-list-item>
          </v-list>
        </v-menu>
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
          <template v-slot:item.invoiceId.correlativo="{ item }">
            <span v-if="item.invoiceId?.correlativo">{{ item.invoiceId.correlativo }}</span>
            <span v-else class="text-grey">N/A</span>
          </template>

          <template v-slot:item.invoiceId.cdc="{ item }">
            <span v-if="item.invoiceId?.cdc" style="font-family: monospace; font-size: 0.85em;">
              {{ item.invoiceId.cdc }}
            </span>
            <span v-else class="text-grey">N/A</span>
          </template>

          <template v-slot:item.tipoOperacion="{ item }">
            <v-chip
              :color="getLogStatusColor(item.tipoOperacion, item.estado)"
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
              v-if="item.invoiceId"
              color="primary"
              size="small"
              variant="text"
              @click="viewInvoice(item.invoiceId._id)"
            >
              Ver Factura
            </v-btn>
            <span v-else class="text-grey">N/A</span>
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

    <!-- Diálogo de confirmación para limpiar logs -->
    <v-dialog v-model="dialog" max-width="500" persistent>
      <v-card>
        <v-card-title class="text-white" :class="dialogType === 'error' ? 'bg-error' : 'bg-warning'">
          <v-icon start>mdi-alert</v-icon>
          {{ dialogTitle }}
        </v-card-title>
        <v-card-text class="pt-4">
          <v-alert
            v-if="dialogType === 'all'"
            type="warning"
            variant="tonal"
            density="compact"
            class="mb-3"
          >
            Esta acción eliminará todos los registros de operaciones.
          </v-alert>
          <v-alert
            v-else
            type="info"
            variant="tonal"
            density="compact"
            class="mb-3"
          >
            Esta acción eliminará solo los registros con estado <strong>{{ dialogType }}</strong>.
          </v-alert>
          <p>¿Está seguro de continuar?</p>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn
            variant="outlined"
            @click="dialog = false"
            :disabled="clearing"
          >
            Cancelar
          </v-btn>
          <v-btn
            color="error"
            variant="flat"
            @click="executeClearLogs"
            :loading="clearing"
          >
            <v-icon start>mdi-delete</v-icon>
            Eliminar
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Snackbar para notificaciones -->
    <v-snackbar
      v-model="snackbar"
      :color="snackbarColor"
      :timeout="3000"
      location="top right"
    >
      {{ snackbarMessage }}
      <template v-slot:actions>
        <v-btn
          variant="text"
          @click="snackbar = false"
        >
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </template>
    </v-snackbar>
  </v-container>
</template>

<script>
import { ref, computed, onMounted } from 'vue';
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
    const menuOpen = ref(false);
    const dialog = ref(false);
    const dialogType = ref('all');
    const clearing = ref(false);
    const snackbar = ref(false);
    const snackbarMessage = ref('');
    const snackbarColor = ref('success');

    const dialogTitle = computed(() => {
      const titulos = {
        all: 'Eliminar Todos los Registros',
        error: 'Eliminar Registros de Error',
        success: 'Eliminar Registros de Éxito',
        warning: 'Eliminar Registros de Advertencia'
      };
      return titulos[dialogType.value] || 'Eliminar Registros';
    });

    const filterOptions = [
      { title: 'Todos', value: 'all' },
      { title: 'Éxito', value: 'success' },
      { title: 'Error', value: 'error' },
      { title: 'Advertencia', value: 'warning' }
    ];
    
    const headers = [
      { title: 'Correlativo', key: 'invoiceId.correlativo' },
      { title: 'CDC', key: 'invoiceId.cdc' },
      { title: 'Tipo', key: 'tipoOperacion' },
      { title: 'Descripción', key: 'descripcion' },
      { title: 'Estado', key: 'estado' },
      { title: 'Fecha', key: 'fecha' },
      { title: 'Acciones', key: 'invoiceId', sortable: false }
    ];
    
    const getLogStatusColor = (tipo, estado) => {
      // Si el estado es error, mostrar en rojo independientemente del tipo
      if (estado === 'error') {
        return 'error';
      }
      if (estado === 'warning') {
        return 'warning';
      }

      switch(tipo) {
        case 'envio_exitoso':
        case 'inicio_proceso':
        case 'consulta_estado':
          return 'success';
        case 'error':
        case 'error_consulta_estado':
        case 'error_respuesta_set':
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

    const confirmClearLogs = (tipo) => {
      dialogType.value = tipo;
      dialog.value = true;
      menuOpen.value = false;
    };

    const executeClearLogs = async () => {
      clearing.value = true;
      try {
        const response = await axios.delete(`/api/logs/clear?tipo=${dialogType.value}`);
        
        snackbarMessage.value = response.data.message;
        snackbarColor.value = 'success';
        snackbar.value = true;
        dialog.value = false;
        
        // Recargar logs después de limpiar
        loadLogs();
      } catch (error) {
        console.error('Error al limpiar logs:', error);
        snackbarMessage.value = error.response?.data?.message || 'Error al limpiar logs';
        snackbarColor.value = 'error';
        snackbar.value = true;
      } finally {
        clearing.value = false;
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
      changePage,
      menuOpen,
      dialog,
      dialogType,
      dialogTitle,
      clearing,
      snackbar,
      snackbarMessage,
      snackbarColor,
      confirmClearLogs,
      executeClearLogs
    };
  }
};
</script>