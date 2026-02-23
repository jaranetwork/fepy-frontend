<template>
  <v-container fluid>
    <!-- Snackbar para mostrar el resultado de la consulta de estado -->
    <v-snackbar
      v-model="statusSnackbar"
      :color="statusSnackbarColor"
      :timeout="4000"
      location="top"
      class="text-center"
    >
      <v-icon :start="statusSnackbarIcon" size="large">{{ statusSnackbarIcon }}</v-icon>
      {{ statusSnackbarText }}
      <template v-slot:actions>
        <v-btn variant="text" @click="statusSnackbar = false">Cerrar</v-btn>
      </template>
    </v-snackbar>

    <v-card>
      <v-card-title class="d-flex align-center flex-wrap">
        <h2>Lista de Facturas</h2>
        <v-spacer></v-spacer>
        
        <div class="d-flex align-center" style="gap: 8px; width: 100%; max-width: 800px;">
          <!-- Campo de búsqueda -->
          <v-text-field
            v-model="search"
            prepend-inner-icon="mdi-magnify"
            :label="`Buscar por ${searchTypeLabel}...`"
            single-line
            hide-details
            clearable
            style="max-width: 600px;"
          ></v-text-field>
          
          <!-- Selector de tipo de búsqueda -->
          <v-select
            v-model="searchType"
            :items="searchTypes"
            label="Tipo"
            single-line
            hide-details
            variant="outlined"
            density="compact"
            style="max-width: 130px;"
          ></v-select>
          
          <v-btn
            color="error"
            variant="outlined"
            @click="confirmClearDatabase"
          >
            <v-icon left>mdi-delete-empty</v-icon>
            Limpiar BD
          </v-btn>
        </div>
      </v-card-title>

      <v-card-text>
        <!-- Mensaje de no encontrado -->
        <v-alert
          v-if="!loading && filteredInvoices.length === 0 && search"
          type="info"
          variant="tonal"
          icon="mdi-information"
          class="mb-4"
        >
          <div class="text-body-1">
            <strong>No se encontraron facturas</strong>
          </div>
          <div class="text-body-2 mt-1">
            No hay facturas que coincidan con "{{ search }}" en {{ searchTypeLabel.toLowerCase() }}.
          </div>
        </v-alert>

        <v-data-table
          :headers="headers"
          :items="filteredInvoices"
          :loading="loading"
          :items-per-page="10"
          class="elevation-1"
          :no-data-text="!search ? 'No hay facturas registradas' : 'No se encontraron facturas'"
        >
          <template v-slot:item.facturaHash="{ item }">
            <v-chip size="small" variant="outlined" color="grey">
              {{ item.facturaHash?.substring(0, 8) }}...
            </v-chip>
          </template>

          <template v-slot:item.cliente.ruc="{ item }">
            <span class="font-weight-medium">{{ item.cliente?.ruc || '-' }}</span>
          </template>

          <template v-slot:item.estadoSifen="{ item }">
            <v-chip
              :color="getStatusColor(item.estadoSifen)"
              variant="flat"
            >
              {{ item.estadoSifen }}
            </v-chip>
          </template>

          <template v-slot:item.cdc="{ item }">
            <span v-if="item.cdc" :title="item.cdc">
              {{ item.cdc?.substring(0, 10) }}...
            </span>
            <span v-else class="text-grey">-</span>
          </template>

          <template v-slot:item.total="{ item }">
            Gs. {{ formatCurrency(item.total) }}
          </template>
          
          <template v-slot:item.createdAt="{ item }">
            {{ formatDate(item.createdAt) }}
          </template>
          
          <template v-slot:item.actions="{ item }">
            <v-btn
              color="success"
              size="small"
              variant="text"
              @click="downloadXml(item)"
              :disabled="!item.xmlPath"
              title="Descargar XML"
            >
              <v-icon>mdi-file-xml-box</v-icon>
            </v-btn>
            <v-btn
              color="accent"
              size="small"
              variant="text"
              @click="downloadPdf(item)"
              :disabled="!item.kudePath"
              title="Descargar PDF"
            >
              <v-icon>mdi-file-pdf-box</v-icon>
            </v-btn>
            <v-btn
              color="info"
              size="small"
              variant="text"
              @click="refreshInvoiceStatus(item)"
              :loading="item.refreshing"
              title="Consultar Estado"
            >
              <v-icon>mdi-refresh</v-icon>
            </v-btn>
            <v-btn
              color="primary"
              size="small"
              variant="text"
              @click="viewInvoice(item._id)"
              title="Ver Detalle"
            >
              <v-icon>mdi-eye</v-icon>
            </v-btn>

            <v-btn
              v-if="item.estadoSifen === 'error'"
              color="warning"
              size="small"
              variant="text"
              @click="retryInvoice(item._id)"
              title="Reintentar"
            >
              <v-icon>mdi-reload</v-icon>
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
import { ref, onMounted, computed } from 'vue';
import axios from 'axios';

export default {
  name: 'InvoiceListView',
  setup() {
    const invoices = ref([]);
    const loading = ref(true);
    const search = ref('');
    const searchType = ref('ruc');
    const currentPage = ref(1);
    const totalPages = ref(1);
    const totalItems = ref(0);
    const statusSnackbar = ref(false);
    const statusSnackbarText = ref('');
    const statusSnackbarColor = ref('info');
    const statusSnackbarIcon = ref('mdi-information');

    const searchTypes = [
      { title: 'RUC', value: 'ruc' },
      { title: 'Nombre', value: 'nombre' },
      { title: 'CDC', value: 'cdc' }
    ];

    const searchTypeLabel = computed(() => {
      const type = searchTypes.find(t => t.value === searchType.value);
      return type?.title || 'RUC';
    });

    // Propiedad computada para filtrar las facturas
    const filteredInvoices = computed(() => {
      if (!search.value) {
        return invoices.value;
      }
      
      const searchLower = search.value.toLowerCase();
      
      return invoices.value.filter(invoice => {
        const ruc = (invoice.cliente?.ruc || '').toLowerCase();
        const nombre = (invoice.cliente?.nombre || '').toLowerCase();
        const cdc = (invoice.cdc || '').toLowerCase();
        
        // Filtrar según el tipo de búsqueda seleccionado
        switch (searchType.value) {
          case 'ruc':
            return ruc.includes(searchLower);
          case 'nombre':
            return nombre.includes(searchLower);
          case 'cdc':
            return cdc.includes(searchLower);
          default:
            return ruc.includes(searchLower);
        }
      });
    });

    const headers = [
      { title: 'Hash', key: 'facturaHash', sortable: false },
      { title: 'RUC', key: 'cliente.ruc' },
      { title: 'CDC', key: 'cdc' },
      { title: 'Cliente', key: 'cliente.nombre' },
      { title: 'Total', key: 'total' },
      { title: 'Estado', key: 'estadoSifen' },
      { title: 'Fecha', key: 'createdAt' },
      { title: 'Acciones', key: 'actions', sortable: false }
    ];
    
    const getStatusColor = (status) => {
      switch(status) {
        case 'enviado':
        case 'aceptado':
          return 'success';
        case 'procesando':
          return 'warning';
        case 'error':
        case 'rechazado':
          return 'error';
        default:
          return 'info';
      }
    };

    const formatCurrency = (amount) => {
      return new Intl.NumberFormat('es-PY').format(amount);
    };
    
    const formatDate = (dateString) => {
      const date = new Date(dateString);
      return date.toLocaleDateString('es-PY');
    };
    
    const viewInvoice = (id) => {
      window.location.href = `/invoices/${id}`;
    };

    const downloadXml = async (invoice) => {
      if (!invoice.xmlPath) {
        alert('⚠️ XML no disponible para esta factura');
        return;
      }

      try {
        // Crear un blob con la respuesta
        const response = await axios.get(`/api/invoices/${invoice._id}/download-xml`, {
          responseType: 'blob'
        });

        // Crear URL del blob
        const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/xml' }));
        
        // Crear enlace temporal para descargar
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `${invoice.xmlPath.split('/').pop()}`);
        document.body.appendChild(link);
        link.click();
        
        // Limpiar
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        
        // Mostrar mensaje de éxito
        statusSnackbarText.value = `✅ XML descargado: ${invoice.correlativo}`;
        statusSnackbarColor.value = 'success';
        statusSnackbarIcon.value = 'mdi-check-circle';
        statusSnackbar.value = true;
      } catch (error) {
        console.error('Error descargando XML:', error);
        statusSnackbarText.value = `❌ Error al descargar XML: ${invoice.correlativo}`;
        statusSnackbarColor.value = 'error';
        statusSnackbarIcon.value = 'mdi-alert-circle';
        statusSnackbar.value = true;
      }
    };

    const downloadPdf = async (invoice) => {
      if (!invoice.kudePath) {
        alert('⚠️ PDF no disponible para esta factura');
        return;
      }

      try {
        // Crear un blob con la respuesta
        const response = await axios.get(`/api/invoices/${invoice._id}/download-pdf`, {
          responseType: 'blob'
        });

        // Crear URL del blob
        const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
        
        // Crear enlace temporal para descargar
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `${invoice.kudePath.split('/').pop()}`);
        document.body.appendChild(link);
        link.click();
        
        // Limpiar
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        
        // Mostrar mensaje de éxito
        statusSnackbarText.value = `✅ PDF descargado: ${invoice.correlativo}`;
        statusSnackbarColor.value = 'success';
        statusSnackbarIcon.value = 'mdi-check-circle';
        statusSnackbar.value = true;
      } catch (error) {
        console.error('Error descargando PDF:', error);
        statusSnackbarText.value = `❌ Error al descargar PDF: ${invoice.correlativo}`;
        statusSnackbarColor.value = 'error';
        statusSnackbarIcon.value = 'mdi-alert-circle';
        statusSnackbar.value = true;
      }
    };

    const refreshInvoiceStatus = async (invoice) => {
      invoice.refreshing = true;
      try {
        const response = await axios.post(`/api/invoices/${invoice._id}/refresh-status`);
        
        if (response.data.estadoCambio) {
          statusSnackbarText.value = `✅ ${invoice.correlativo}: ${response.data.estadoAnterior} → ${response.data.estadoActual}`;
          statusSnackbarColor.value = 'success';
          statusSnackbarIcon.value = 'mdi-check-circle';
          statusSnackbar.value = true;
          loadInvoices();
        } else {
          // Mensaje más descriptivo según el estado actual
          const estadoActual = response.data.estadoActual;
          let mensajeEstado = '';
          let color = 'info';
          let icono = 'mdi-information';
          
          switch(estadoActual) {
            case 'procesando':
              mensajeEstado = `⏳ ${invoice.correlativo}: Procesando en SIFEN`;
              color = 'warning';
              icono = 'mdi-timer-sand';
              break;
            case 'aceptado':
              mensajeEstado = `✅ ${invoice.correlativo}: Aprobada por SIFEN`;
              color = 'success';
              icono = 'mdi-check-circle';
              break;
            case 'rechazado':
              mensajeEstado = `❌ ${invoice.correlativo}: Rechazada por SIFEN`;
              color = 'error';
              icono = 'mdi-alert-circle';
              break;
            case 'enviado':
              mensajeEstado = `📤 ${invoice.correlativo}: Enviada a SIFEN`;
              color = 'info';
              icono = 'mdi-send';
              break;
            default:
              mensajeEstado = `ℹ️ ${invoice.correlativo}: ${estadoActual}`;
          }
          
          statusSnackbarText.value = mensajeEstado;
          statusSnackbarColor.value = color;
          statusSnackbarIcon.value = icono;
          statusSnackbar.value = true;
        }
      } catch (error) {
        statusSnackbarText.value = `❌ Error al consultar ${invoice.correlativo}`;
        statusSnackbarColor.value = 'error';
        statusSnackbarIcon.value = 'mdi-alert-circle';
        statusSnackbar.value = true;
      } finally {
        invoice.refreshing = false;
      }
    };

    const confirmClearDatabase = () => {
      if (confirm('⚠️ ¿Está SEGURO de que desea eliminar TODAS las facturas de la base de datos?\n\nEsta acción NO se puede deshacer.')) {
        if (confirm('⚠️ ¿Realmente desea continuar? Esto eliminará todos los registros.')) {
          clearDatabase();
        }
      }
    };

    const clearDatabase = async () => {
      try {
        const response = await axios.delete('/api/invoices/clear');
        alert('✅ ' + response.data.message + `\n${response.data.deletedCount} facturas eliminadas.`);
        loadInvoices();
      } catch (error) {
        console.error('Error limpiando base de datos:', error);
        alert('❌ Error al limpiar la base de datos: ' + (error.response?.data?.message || error.message));
      }
    };

    const retryInvoice = async (id) => {
      if (confirm('¿Está seguro de reintentar el envío de esta factura?')) {
        try {
          await axios.post(`/api/invoices/${id}/retry`);
          alert('Reintento de envío iniciado');
          loadInvoices();
        } catch (error) {
          console.error('Error reintentando factura:', error);
          alert('Hubo un error al reintentar el envío');
        }
      }
    };

    const changePage = (page) => {
      currentPage.value = page;
      loadInvoices();
    };

    const loadInvoices = async () => {
      loading.value = true;
      try {
        const response = await axios.get(`/api/invoices?page=${currentPage.value}&limit=10`);
        invoices.value = response.data.invoices;
        totalPages.value = response.data.totalPages;
        totalItems.value = response.data.total;
      } catch (error) {
        console.error('Error cargando facturas:', error);
      } finally {
        loading.value = false;
      }
    };

    onMounted(() => {
      loadInvoices();
    });

    return {
      invoices,
      loading,
      search,
      searchType,
      searchTypes,
      searchTypeLabel,
      filteredInvoices,
      currentPage,
      totalPages,
      totalItems,
      headers,
      getStatusColor,
      formatCurrency,
      formatDate,
      viewInvoice,
      downloadXml,
      downloadPdf,
      refreshInvoiceStatus,
      retryInvoice,
      changePage,
      confirmClearDatabase,
      statusSnackbar,
      statusSnackbarText,
      statusSnackbarColor,
      statusSnackbarIcon
    };
  }
};
</script>