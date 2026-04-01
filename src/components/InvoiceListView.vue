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

    <!-- Diálogo de Confirmación para Limpiar BD -->
    <v-dialog v-model="clearDialog" max-width="450" persistent>
      <v-card>
        <v-card-title class="text-h5 d-flex align-center bg-error text-white">
          <v-icon start>mdi-database-remove</v-icon>
          Eliminar TODAS las Facturas
          <v-spacer></v-spacer>
          <v-btn
            icon="mdi-close"
            size="small"
            variant="text"
            @click="clearDialog = false"
            :disabled="clearing"
            color="white"
          ></v-btn>
        </v-card-title>
        <v-card-text class="mt-4">
          <v-alert type="warning" variant="tonal" icon="mdi-alert" class="mb-3">
            <strong>⚠️ Advertencia:</strong> Esta acción eliminará permanentemente todas las facturas de la base de datos.
          </v-alert>
          <p class="text-body-1">
            ¿Estás <strong>SEGURO</strong> de que deseas continuar?
          </p>
          <p class="text-body-2 text-medium-emphasis">
            Esta acción <strong>no se puede deshacer</strong>. Se eliminarán:
          </p>
          <ul class="text-body-2 text-medium-emphasis">
            <li>Todas las facturas registradas</li>
            <li>Los logs de operaciones asociados</li>
            <li>Las referencias a archivos XML y PDF</li>
          </ul>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn
            color="grey"
            variant="text"
            @click="clearDialog = false"
            :disabled="clearing"
          >
            Cancelar
          </v-btn>
          <v-btn
            color="error"
            variant="tonal"
            @click="executeClearDatabase"
            :loading="clearing"
          >
            <v-icon start>mdi-delete-forever</v-icon>
            Eliminar Todo
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Diálogo de Confirmación para Reintentar Factura -->
    <v-dialog v-model="retryDialog" max-width="400" persistent>
      <v-card>
        <v-card-title class="text-h5 d-flex align-center bg-warning text-white">
          <v-icon start>mdi-reload</v-icon>
          Reintentar Envío
          <v-spacer></v-spacer>
          <v-btn
            icon="mdi-close"
            size="small"
            variant="text"
            @click="retryDialog = false"
            :disabled="retrying"
            color="white"
          ></v-btn>
        </v-card-title>
        <v-card-text class="mt-4">
          <p class="text-body-1 mb-2">
            ¿Estás seguro de reintentar el envío de esta factura?
          </p>
          <v-alert type="info" variant="tonal" icon="mdi-information" class="mb-2">
            <strong>Factura:</strong> {{ retryInvoiceData?.correlativo }}
          </v-alert>
          <p class="text-body-2 text-medium-emphasis">
            El sistema volverá a enviar el XML a SIFEN para actualizar el estado.
          </p>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn
            color="grey"
            variant="text"
            @click="retryDialog = false"
            :disabled="retrying"
          >
            Cancelar
          </v-btn>
          <v-btn
            color="warning"
            variant="tonal"
            @click="executeRetryInvoice"
            :loading="retrying"
          >
            <v-icon start>mdi-reload</v-icon>
            Reintentar
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

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

          <template v-slot:item.cdc="{ item }">
            <span class="text-mono text-caption">{{ item.cdc || '-' }}</span>
          </template>

          <template v-slot:item.estado="{ item }">
            <v-chip
              :color="getEstadoVisualColor(item.estadoVisual, item.codigoRetorno, item.estado)"
              variant="flat"
            >
              {{ getEstadoVisualTexto(item.estadoVisual, item.codigoRetorno, item.estado) }}
            </v-chip>
          </template>

          <template v-slot:item.proceso="{ item }">
            <v-chip
              :color="getProcesoColor(item.proceso)"
              variant="flat"
              size="small"
            >
              {{ getProcesoTexto(item.proceso) }}
            </v-chip>
          </template>

          <template v-slot:item.total="{ item }">
            Gs. {{ formatCurrency(item.total) }}
          </template>
          
          <template v-slot:item.createdAt="{ item }">
            {{ formatDate(item.createdAt) }}
          </template>
          
          <template v-slot:item.actions="{ item }">
            <v-menu v-model="item.menuOpen" :close-on-content-click="false" location="start">
              <template v-slot:activator="{ props }">
                <v-btn
                  color="primary"
                  size="small"
                  variant="tonal"
                  v-bind="props"
                  title="Acciones"
                >
                  <v-icon>mdi-dots-vertical</v-icon>
                </v-btn>
              </template>
              <v-list density="compact" min-width="200">
                <v-list-item @click="downloadXml(item); item.menuOpen = false" :disabled="!item.xmlPath">
                  <template v-slot:prepend>
                    <v-icon color="success" size="small">mdi-file-xml-box</v-icon>
                  </template>
                  <v-list-item-title>Descargar XML</v-list-item-title>
                </v-list-item>
                <v-list-item @click="downloadPdf(item); item.menuOpen = false" :disabled="!item.kudePath">
                  <template v-slot:prepend>
                    <v-icon color="error" size="small">mdi-file-pdf-box</v-icon>
                  </template>
                  <v-list-item-title>Descargar PDF</v-list-item-title>
                </v-list-item>
                <v-divider></v-divider>
                <v-list-item @click="refreshInvoiceStatus(item); item.menuOpen = false">
                  <template v-slot:prepend>
                    <v-icon color="info" size="small">mdi-refresh</v-icon>
                  </template>
                  <v-list-item-title>Consultar Estado</v-list-item-title>
                </v-list-item>
                <v-list-item @click="viewInvoice(item._id); item.menuOpen = false">
                  <template v-slot:prepend>
                    <v-icon color="primary" size="small">mdi-eye</v-icon>
                  </template>
                  <v-list-item-title>Ver Detalle</v-list-item-title>
                </v-list-item>
                <v-divider></v-divider>
                <v-list-item
                  v-if="item.estado === 'error'"
                  @click="confirmRetryInvoice(item); item.menuOpen = false"
                >
                  <template v-slot:prepend>
                    <v-icon color="warning" size="small">mdi-reload</v-icon>
                  </template>
                  <v-list-item-title class="text-warning">Reintentar</v-list-item-title>
                </v-list-item>
              </v-list>
            </v-menu>
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
    const clearDialog = ref(false);
    const retryDialog = ref(false);
    const retrying = ref(false);
    const retryInvoiceData = ref(null);
    const clearing = ref(false);

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
      { title: 'Estado', key: 'estado' },
      { title: 'Proceso', key: 'proceso' },
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

    // Función para determinar el estado visual según código de retorno SIFEN v150
    // Retorna: 'aceptado', 'observado', o 'rechazado'
    const getEstadoVisual = (estadoVisual, codigoRetorno, estado) => {
      // Si ya tenemos estadoVisual, usarlo directamente
      if (estadoVisual) {
        return estadoVisual;
      }

      // Si no hay estadoVisual, determinar por el estado SIFEN
      // Estados que se muestran como aceptado (verde)
      if (estado === 'aceptado' || estado === 'enviado') {
        return 'aceptado';
      }
      // Estados que se muestran como observado (ámbar)
      if (estado === 'observado' || estado === 'procesando') {
        return 'observado';
      }
      // Todos los demás como rechazado (rojo)
      return 'rechazado';
    };

    // Función para obtener el color del estado visual
    const getEstadoVisualColor = (estadoVisual, codigoRetorno, estado) => {
      const visual = getEstadoVisual(estadoVisual, codigoRetorno, estado);
      switch(visual) {
        case 'aceptado':
          return 'success';  // Verde
        case 'observado':
          return 'amber';    // Amarillo
        case 'rechazado':
          return 'error';    // Rojo
        default:
          return 'info';
      }
    };

    // Función para obtener el texto del estado visual
    const getEstadoVisualTexto = (estadoVisual, codigoRetorno, estado) => {
      const visual = getEstadoVisual(estadoVisual, codigoRetorno, estado);
      return visual;
    };

    // Funciones para el campo proceso
    const getProcesoColor = (proceso) => {
      if (proceso === 'Terminado') {
        return 'success';  // Verde - XML y PDF generados
      } else if (proceso === 'Fallido') {
        return 'error';    // Rojo - Error en generación
      } else {
        return 'warning';  // Amarillo - En proceso (null)
      }
    };

    const getProcesoTexto = (proceso) => {
      if (proceso === 'Terminado') {
        return '✅ Terminado';
      } else if (proceso === 'Fallido') {
        return '❌ Fallido';
      } else {
        return '⏳ Pendiente';
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
        // Registrar el inicio de la consulta en consola (el backend guardará el log en BD)
        console.log(`📋 Consultando estado de factura: ${invoice.correlativo} (ID: ${invoice._id})`);

        const response = await axios.post(`/api/invoices/${invoice._id}/refresh-status`);

        // Verificar si es estado final (no se consultó SET)
        if (response.data.esEstadoFinal && !response.data.consultoSET) {
          const estadoData = response.data.data;
          const color = estadoData.estadoVisual === 'aceptado' ? 'success' :
                        estadoData.estadoVisual === 'rechazado' ? 'error' : 'warning';
          const icono = 'mdi-check-circle';
          statusSnackbarText.value = `✅ ${invoice.correlativo}: Estado final (${estadoData.estado}) - No se consultó SET`;
          statusSnackbarColor.value = color;
          statusSnackbarIcon.value = icono;
          statusSnackbar.value = true;
          return;
        }

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
        console.error('Error al consultar estado:', error);

        // Determinar el mensaje de error según el tipo de error
        let errorMessage = `❌ Error al consultar ${invoice.correlativo}`;

        if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
          errorMessage = `⏱️ Timeout: El servidor no respondió a tiempo`;
        } else if (error.response?.status === 500) {
          // Error del servidor (ej: SET no responde)
          const backendError = error.response?.data;
          if (backendError?.message?.includes('SET')) {
            errorMessage = `🔌 Error de conexión con SET: ${backendError.message}`;
          } else {
            errorMessage = `❌ Error del servidor: ${backendError?.message || error.message}`;
          }
        } else if (!error.response && error.request) {
          // La solicitud se envió pero no se recibió respuesta
          errorMessage = `🔌 Sin respuesta del servidor. Verifique que el backend esté en ejecución.`;
        } else if (error.message) {
          errorMessage = `❌ Error: ${error.message}`;
        }
        
        statusSnackbarText.value = errorMessage;
        statusSnackbarColor.value = 'error';
        statusSnackbarIcon.value = 'mdi-alert-circle';
        statusSnackbar.value = true;
        
        // Recargar la lista para mostrar el estado actualizado (posiblemente 'error')
        loadInvoices();
      } finally {
        invoice.refreshing = false;
      }
    };

    const confirmClearDatabase = () => {
      clearDialog.value = true;
    };

    const executeClearDatabase = async () => {
      clearing.value = true;
      try {
        const response = await axios.delete('/api/invoices/clear');

        statusSnackbarText.value = `✅ ${response.data.message}`;
        statusSnackbarColor.value = 'success';
        statusSnackbarIcon.value = 'mdi-check-circle';
        statusSnackbar.value = true;

        clearDialog.value = false;
        loadInvoices();
      } catch (error) {
        console.error('Error limpiando base de datos:', error);
        statusSnackbarText.value = `❌ Error al limpiar la base de datos: ${error.response?.data?.message || error.message}`;
        statusSnackbarColor.value = 'error';
        statusSnackbarIcon.value = 'mdi-alert-circle';
        statusSnackbar.value = true;
      } finally {
        clearing.value = false;
      }
    };

    const confirmRetryInvoice = (invoice) => {
      retryInvoiceData.value = invoice;
      retryDialog.value = true;
    };

    const executeRetryInvoice = async () => {
      if (!retryInvoiceData.value) return;
      
      retrying.value = true;
      try {
        await axios.post(`/api/invoices/${retryInvoiceData.value._id}/retry`);
        statusSnackbarText.value = `✅ Reintento de envío iniciado: ${retryInvoiceData.value.correlativo}`;
        statusSnackbarColor.value = 'success';
        statusSnackbarIcon.value = 'mdi-check-circle';
        statusSnackbar.value = true;
        retryDialog.value = false;
        retryInvoiceData.value = null;
        loadInvoices();
      } catch (error) {
        console.error('Error reintentando factura:', error);
        statusSnackbarText.value = `❌ Error al reintentar el envío: ${retryInvoiceData.value.correlativo}`;
        statusSnackbarColor.value = 'error';
        statusSnackbarIcon.value = 'mdi-alert-circle';
        statusSnackbar.value = true;
        retryDialog.value = false;
        retryInvoiceData.value = null;
      } finally {
        retrying.value = false;
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
      getEstadoVisual,
      getEstadoVisualColor,
      getEstadoVisualTexto,
      getProcesoColor,
      getProcesoTexto,
      formatCurrency,
      formatDate,
      viewInvoice,
      downloadXml,
      downloadPdf,
      refreshInvoiceStatus,
      confirmRetryInvoice,
      executeRetryInvoice,
      changePage,
      confirmClearDatabase,
      executeClearDatabase,
      clearDialog,
      retryDialog,
      retrying,
      retryInvoiceData,
      clearing,
      statusSnackbar,
      statusSnackbarText,
      statusSnackbarColor,
      statusSnackbarIcon
    };
  }
};
</script>