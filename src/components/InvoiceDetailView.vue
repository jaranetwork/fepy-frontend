<template>
  <v-container fluid>
    <!-- Snackbar para mostrar el resultado de la consulta de estado -->
    <v-snackbar
      v-model="statusSnackbar"
      :color="statusSnackbarColor"
      :timeout="5000"
      location="top"
      class="text-center"
    >
      <v-icon :start="statusSnackbarIcon" size="large">{{ statusSnackbarIcon }}</v-icon>
      {{ statusSnackbarText }}
      <template v-slot:actions>
        <v-btn variant="text" @click="statusSnackbar = false">Cerrar</v-btn>
      </template>
    </v-snackbar>

    <v-row>
      <v-col cols="12">
        <v-card>
          <v-card-title>
            <h2>Detalle de Factura: {{ invoice.correlativo }}</h2>
            <v-spacer></v-spacer>
            <v-chip
              :color="getStatusColor(invoice.estadoSifen)"
              variant="flat"
            >
              {{ invoice.estadoSifen }}
            </v-chip>
            <v-btn
              color="info"
              variant="outlined"
              class="ml-2"
              @click="refreshStatus"
              :loading="refreshingStatus"
            >
              <v-icon left>mdi-refresh</v-icon>
              Consultar Estado
            </v-btn>
            <v-btn
              color="error"
              variant="outlined"
              class="ml-2"
              @click="confirmDeleteInvoice"
            >
              <v-icon left>mdi-delete</v-icon>
              Eliminar
            </v-btn>
          </v-card-title>

          <v-card-text>
            <v-row>
              <v-col cols="12" md="6">
                <v-card outlined>
                  <v-card-title class="text-h6">Información de la Factura</v-card-title>
                  <v-card-text>
                    <p><strong>Correlativo:</strong> {{ invoice.correlativo }}</p>
                    <p><strong>Total:</strong> Gs. {{ formatCurrency(invoice.total) }}</p>
                    <p><strong>Fecha de Creación:</strong> {{ formatDate(invoice.fechaCreacion) }}</p>
                    <p v-if="invoice.fechaEnvio"><strong>Fecha de Envío:</strong> {{ formatDate(invoice.fechaEnvio) }}</p>
                    <p v-if="invoice.fechaProceso"><strong>Fecha de Proceso:</strong> {{ formatDateTime(invoice.fechaProceso) }}</p>
                    <p><strong>Estado en SIFEN:</strong> {{ invoice.estadoSifen }}</p>
                    <p v-if="invoice.cdc"><strong>CDC:</strong> <span class="text-mono">{{ invoice.cdc }}</span></p>
                    <p v-if="invoice.codigoRetorno"><strong>Código de Retorno:</strong> {{ invoice.codigoRetorno }}</p>
                    <p v-if="invoice.mensajeRetorno"><strong>Mensaje:</strong> {{ invoice.mensajeRetorno }}</p>
                    <p>
                      <strong>Digest Value:</strong>
                      <span v-if="invoice.digestValue" class="text-mono text-caption d-block mt-1" style="word-break: break-all;">
                        {{ invoice.digestValue }}
                      </span>
                      <span v-else class="text-caption text-grey">
                        No disponible
                      </span>
                    </p>
                  </v-card-text>
                </v-card>
              </v-col>

              <v-col cols="12" md="6">
                <v-card outlined>
                  <v-card-title class="text-h6">Datos del Cliente</v-card-title>
                  <v-card-text>
                    <p><strong>RUC:</strong> {{ invoice.cliente?.ruc || 'N/A' }}</p>
                    <p><strong>Nombre:</strong> {{ invoice.cliente?.nombre || invoice.cliente?.nombrerazonsocial || 'N/A' }}</p>
                    <p v-if="invoice.cliente?.direccion"><strong>Dirección:</strong> {{ invoice.cliente.direccion }}</p>
                    <p v-if="invoice.cliente?.telefono"><strong>Teléfono:</strong> {{ invoice.cliente.telefono }}</p>
                    <p v-if="invoice.cliente?.email"><strong>Email:</strong> {{ invoice.cliente.email }}</p>
                  </v-card-text>
                </v-card>
              </v-col>
            </v-row>

            <v-row class="mt-4">
              <v-col cols="12">
                <v-card outlined>
                  <v-card-title class="text-h6">Datos de la Factura</v-card-title>
                  <v-card-text>
                    <pre style="white-space: pre-wrap; word-break: break-all;">{{ JSON.stringify(invoice.datosFactura, null, 2) }}</pre>
                  </v-card-text>
                </v-card>
              </v-col>
            </v-row>

            <v-row class="mt-4">
              <v-col cols="12">
                <v-card outlined>
                  <v-card-title class="text-h6">Archivos</v-card-title>
                  <v-card-text>
                    <div class="d-flex flex-wrap gap-2">
                      <v-btn
                        v-if="invoice.xmlPath"
                        color="success"
                        @click="downloadXml"
                      >
                        <v-icon left>mdi-file-xml-box</v-icon>
                        Descargar XML
                      </v-btn>
                      <v-btn
                        v-if="invoice.kudePath"
                        color="accent"
                        @click="downloadPdf"
                      >
                        <v-icon left>mdi-file-pdf-box</v-icon>
                        Descargar PDF
                      </v-btn>
                    </div>
                    <div v-if="!invoice.xmlPath && !invoice.kudePath" class="mt-2">
                      <v-alert type="info">
                        No hay archivos disponibles aún.
                      </v-alert>
                    </div>
                  </v-card-text>
                </v-card>
              </v-col>
            </v-row>

            <v-row class="mt-4">
              <v-col cols="12">
                <v-card outlined>
                  <v-card-title class="text-h6">
                    Registros de Operación
                    <v-btn
                      v-if="invoice.estadoSifen === 'error'"
                      color="warning"
                      variant="text"
                      @click="retryInvoice"
                      class="ml-4"
                    >
                      <v-icon left>mdi-reload</v-icon>
                      Reintentar Envío
                    </v-btn>
                  </v-card-title>
                  <v-card-text>
                    <v-data-table
                      :headers="logHeaders"
                      :items="logs"
                      class="elevation-1"
                    >
                      <template v-slot:item.tipoOperacion="{ item }">
                        <v-chip
                          :color="getLogStatusColor(item.tipoOperacion, item.estado)"
                          size="small"
                          variant="flat"
                        >
                          {{ item.tipoOperacion }}
                        </v-chip>
                      </template>
                      
                      <template v-slot:item.fecha="{ item }">
                        {{ formatDateTime(item.fecha) }}
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
                    </v-data-table>
                  </v-card-text>
                </v-card>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import axios from 'axios';

export default {
  name: 'InvoiceDetailView',
  setup() {
    const route = useRoute();
    const invoice = ref({});
    const logs = ref([]);
    const refreshingStatus = ref(false);
    const statusSnackbar = ref(false);
    const statusSnackbarText = ref('');
    const statusSnackbarColor = ref('info');
    const statusSnackbarIcon = ref('mdi-information');

    const logHeaders = [
      { title: 'Tipo', key: 'tipoOperacion' },
      { title: 'Descripción', key: 'descripcion' },
      { title: 'Fecha', key: 'fecha' },
      { title: 'Estado', key: 'estado' },
      { title: 'Detalles', key: 'detalle' }
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
    
    const formatCurrency = (amount) => {
      return new Intl.NumberFormat('es-PY').format(amount);
    };
    
    const formatDate = (dateString) => {
      const date = new Date(dateString);
      return date.toLocaleDateString('es-PY');
    };
    
    const formatDateTime = (dateString) => {
      const date = new Date(dateString);
      return date.toLocaleString('es-PY');
    };
    
    const loadInvoice = async () => {
      try {
        const token = localStorage.getItem('token');
        console.log('🔑 Token en localStorage:', token ? 'Existe' : 'No existe');
        console.log('📋 Cargando factura ID:', route.params.id);

        const response = await axios.get(`/api/invoices/${route.params.id}`);
        console.log('✅ Respuesta de factura:', response.data);
        invoice.value = response.data.data;  // ← Los datos están en response.data.data
        
        // Debug: Verificar digestValue
        console.log('🔐 DigestValue recibido:', invoice.value.digestValue || 'NO DISPONIBLE');
        console.log('📋 Todos los campos de la factura:', Object.keys(invoice.value));
      } catch (error) {
        console.error('❌ Error cargando factura:', error);
        console.error('Detalles:', error.response?.data);
      }
    };
    
    const loadLogs = async () => {
      try {
        const response = await axios.get(`/api/invoices/${route.params.id}/logs`);
        logs.value = response.data;
      } catch (error) {
        console.error('Error cargando logs:', error);
      }
    };
    
    const retryInvoice = async () => {
      if (confirm('¿Está seguro de reintentar el envío de esta factura?')) {
        try {
          await axios.post(`/api/invoices/${route.params.id}/retry`);
          alert('Reintento de envío iniciado');
          loadInvoice();
          loadLogs();
        } catch (error) {
          console.error('Error reintentando factura:', error);
          alert('Hubo un error al reintentar el envío');
        }
      }
    };

    const confirmDeleteInvoice = () => {
      if (confirm(`⚠️ ¿Está SEGURO de que desea eliminar esta factura?\n\nCorrelativo: ${invoice.value.correlativo}\n\nEsta acción NO se puede deshacer.`)) {
        deleteInvoice();
      }
    };

    const deleteInvoice = async () => {
      try {
        const response = await axios.delete(`/api/invoices/${route.params.id}`);
        alert('✅ ' + response.data.message);
        window.location.href = '/invoices';
      } catch (error) {
        console.error('Error eliminando factura:', error);
        alert('❌ Error al eliminar la factura: ' + (error.response?.data?.message || error.message));
      }
    };

    const downloadXml = async () => {
      if (!invoice.value.xmlPath) {
        alert('⚠️ XML no disponible');
        return;
      }
      
      try {
        const response = await axios.get(`/api/invoices/${route.params.id}/download-xml`, {
          responseType: 'blob'
        });
        
        const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/xml' }));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `${invoice.value.xmlPath.split('/').pop()}`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        
        statusSnackbarText.value = '✅ XML descargado exitosamente';
        statusSnackbarColor.value = 'success';
        statusSnackbarIcon.value = 'mdi-check-circle';
        statusSnackbar.value = true;
      } catch (error) {
        console.error('Error descargando XML:', error);
        statusSnackbarText.value = '❌ Error al descargar XML';
        statusSnackbarColor.value = 'error';
        statusSnackbarIcon.value = 'mdi-alert-circle';
        statusSnackbar.value = true;
      }
    };

    const downloadPdf = async () => {
      if (!invoice.value.kudePath) {
        alert('⚠️ PDF no disponible');
        return;
      }
      
      try {
        const response = await axios.get(`/api/invoices/${route.params.id}/download-pdf`, {
          responseType: 'blob'
        });
        
        const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `${invoice.value.kudePath.split('/').pop()}`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        
        statusSnackbarText.value = '✅ PDF descargado exitosamente';
        statusSnackbarColor.value = 'success';
        statusSnackbarIcon.value = 'mdi-check-circle';
        statusSnackbar.value = true;
      } catch (error) {
        console.error('Error descargando PDF:', error);
        statusSnackbarText.value = '❌ Error al descargar PDF';
        statusSnackbarColor.value = 'error';
        statusSnackbarIcon.value = 'mdi-alert-circle';
        statusSnackbar.value = true;
      }
    };

    const refreshStatus = async () => {
      refreshingStatus.value = true;
      try {
        const response = await axios.post(`/api/invoices/${route.params.id}/refresh-status`);
        
        if (response.data.estadoCambio) {
          statusSnackbarText.value = `Estado actualizado: ${response.data.estadoAnterior} → ${response.data.estadoActual}`;
          statusSnackbarColor.value = 'success';
          statusSnackbarIcon.value = 'mdi-check-circle';
        } else {
          // Mensaje más descriptivo según el estado actual
          const estadoActual = response.data.estadoActual;
          let mensajeEstado = '';
          
          switch(estadoActual) {
            case 'procesando':
              mensajeEstado = 'La factura está siendo procesada por SIFEN';
              break;
            case 'aceptado':
              mensajeEstado = 'La factura fue aprobada por SIFEN';
              break;
            case 'rechazado':
              mensajeEstado = 'La factura fue rechazada por SIFEN';
              break;
            case 'enviado':
              mensajeEstado = 'La factura fue enviada a SIFEN';
              break;
            default:
              mensajeEstado = `Estado actual: ${estadoActual}`;
          }
          
          statusSnackbarText.value = mensajeEstado;
          statusSnackbarColor.value = estadoActual === 'aceptado' ? 'success' : 
                                      estadoActual === 'rechazado' ? 'error' : 
                                      estadoActual === 'procesando' ? 'warning' : 'info';
          statusSnackbarIcon.value = estadoActual === 'aceptado' ? 'mdi-check-circle' :
                                     estadoActual === 'rechazado' ? 'mdi-alert-circle' :
                                     estadoActual === 'procesando' ? 'mdi-timer-sand' : 'mdi-information';
        }
        statusSnackbar.value = true;
        
        if (response.data.estadoCambio) {
          await loadInvoice();
          await loadLogs();
        }
      } catch (error) {
        statusSnackbarText.value = 'Error al consultar el estado: ' + (error.response?.data?.message || error.message);
        statusSnackbarColor.value = 'error';
        statusSnackbarIcon.value = 'mdi-alert-circle';
        statusSnackbar.value = true;
      } finally {
        refreshingStatus.value = false;
      }
    };

    onMounted(async () => {
      await Promise.all([loadInvoice(), loadLogs()]);
    });

    return {
      invoice,
      logs,
      logHeaders,
      getStatusColor,
      getLogStatusColor,
      getLogStateColor,
      formatCurrency,
      formatDate,
      formatDateTime,
      retryInvoice,
      confirmDeleteInvoice,
      downloadXml,
      downloadPdf,
      refreshStatus,
      refreshingStatus,
      statusSnackbar,
      statusSnackbarText,
      statusSnackbarColor,
      statusSnackbarIcon
    };
  }
};
</script>

<style scoped>
.text-mono {
  font-family: 'Courier New', Courier, monospace;
}
</style>