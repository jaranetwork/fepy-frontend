<template>
  <v-container fluid class="pa-4">
    <v-row class="mb-4">
      <v-col cols="12">
        <h1 class="text-h4 font-weight-bold">
          <v-icon start color="primary">mdi-view-queue</v-icon>
          Estado de la Cola de Facturación
        </h1>
        <p class="text-subtitle-1 text-medium-emphasis">
          Monitoreo en tiempo real de procesos asíncronos
        </p>
      </v-col>
    </v-row>

    <!-- Tarjetas de Estadísticas -->
    <v-row class="mb-6">
      <v-col cols="12" sm="6" md="3">
        <v-card variant="outlined" class="mx-auto">
          <v-card-text class="text-center pa-4">
            <v-icon size="48" color="warning" class="mb-2">mdi-clock-outline</v-icon>
            <div class="text-h3 font-weight-bold">{{ queueStats.facturacion?.waiting || 0 }}</div>
            <div class="text-caption text-medium-emphasis">En Espera</div>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" sm="6" md="3">
        <v-card variant="outlined" class="mx-auto">
          <v-card-text class="text-center pa-4">
            <v-icon size="48" color="info" class="mb-2">mdi-cog-outline</v-icon>
            <div class="text-h3 font-weight-bold">{{ queueStats.facturacion?.active || 0 }}</div>
            <div class="text-caption text-medium-emphasis">Procesando</div>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" sm="6" md="3">
        <v-card variant="outlined" class="mx-auto">
          <v-card-text class="text-center pa-4">
            <v-icon size="48" color="success" class="mb-2">mdi-check-circle-outline</v-icon>
            <div class="text-h3 font-weight-bold">{{ queueStats.facturacion?.completed || 0 }}</div>
            <div class="text-caption text-medium-emphasis">Completados</div>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" sm="6" md="3">
        <v-card variant="outlined" class="mx-auto">
          <v-card-text class="text-center pa-4">
            <v-icon size="48" color="error" class="mb-2">mdi-alert-circle-outline</v-icon>
            <div class="text-h3 font-weight-bold">{{ queueStats.facturacion?.failed || 0 }}</div>
            <div class="text-caption text-medium-emphasis">Fallidos</div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Estado del Worker -->
    <v-row class="mb-6">
      <v-col cols="12">
        <v-card variant="outlined">
          <v-card-title class="bg-grey-lighten-5">
            <v-icon start color="primary">mdi-server</v-icon>
            Estado del Worker
          </v-card-title>
          <v-card-text>
            <v-row>
              <v-col cols="12" sm="6">
                <v-alert
                  :type="workerStatus === 'active' ? 'success' : 'warning'"
                  variant="tonal"
                  :icon="workerStatus === 'active' ? 'mdi-check-circle' : 'mdi-alert-circle'"
                >
                  <strong>Worker:</strong> {{ workerStatus === 'active' ? 'En línea' : 'Desconectado' }}
                </v-alert>
              </v-col>
              <v-col cols="12" sm="6">
                <v-alert type="info" variant="tonal" icon="mdi-refresh">
                  <strong>Actualización:</strong> {{ lastUpdate }}
                </v-alert>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Lista de Facturas Recientes -->
    <v-row>
      <v-col cols="12">
        <v-card variant="outlined">
          <v-card-title class="bg-grey-lighten-5 d-flex align-center">
            <v-icon start color="primary">mdi-receipt-text-outline</v-icon>
            Facturas Recientes
            <v-spacer></v-spacer>
            <v-btn
              icon="mdi-refresh"
              variant="text"
              size="small"
              @click="fetchData"
              :loading="loading"
            ></v-btn>
          </v-card-title>

          <v-card-text>
            <v-data-table
              :headers="headers"
              :items="facturas"
              :loading="loading"
              loading-text="Cargando facturas..."
              class="elevation-0"
              hide-default-footer
              :items-per-page="10"
            >
              <!-- Estado -->
              <template v-slot:item.estadoSifen="{ item }">
                <v-chip
                  :color="getEstadoColor(item.estadoSifen)"
                  size="small"
                  label
                >
                  <v-icon start size="small">{{ getEstadoIcon(item.estadoSifen) }}</v-icon>
                  {{ item.estadoSifen }}
                </v-chip>
              </template>

              <!-- CDC -->
              <template v-slot:item.cdc="{ item }">
                <span class="text-mono text-caption">
                  {{ item.cdc || '---' }}
                </span>
              </template>

              <!-- Total -->
              <template v-slot:item.total="{ item }">
                <strong>{{ formatCurrency(item.total) }}</strong>
              </template>

              <!-- Fecha -->
              <template v-slot:item.fechaCreacion="{ item }">
                {{ formatDate(item.fechaCreacion) }}
              </template>

              <!-- Acciones -->
              <template v-slot:item.actions="{ item }">
                <v-btn
                  icon="mdi-eye"
                  variant="text"
                  size="small"
                  @click="verDetalle(item)"
                ></v-btn>
              </template>
            </v-data-table>

            <v-empty-state
              v-if="!loading && facturas.length === 0"
              title="No hay facturas"
              text="Las facturas procesadas aparecerán aquí"
              icon="mdi-inbox-outline"
            ></v-empty-state>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Diálogo de Detalle -->
    <v-dialog v-model="dialog" max-width="800">
      <v-card>
        <v-card-title class="bg-primary">
          <v-icon start color="white">mdi-information-outline</v-icon>
          Detalle de Factura
        </v-card-title>
        <v-card-text class="pa-4">
          <v-row v-if="selectedFactura">
            <v-col cols="12" sm="6">
              <strong>Correlativo:</strong><br>
              {{ selectedFactura.correlativo }}
            </v-col>
            <v-col cols="12" sm="6">
              <strong>Estado:</strong><br>
              <v-chip :color="getEstadoColor(selectedFactura.estadoSifen)" size="small">
                {{ selectedFactura.estadoSifen }}
              </v-chip>
            </v-col>
            <v-col cols="12" sm="6">
              <strong>CDC:</strong><br>
              <span class="text-mono text-caption">{{ selectedFactura.cdc || '---' }}</span>
            </v-col>
            <v-col cols="12" sm="6">
              <strong>Cliente:</strong><br>
              {{ selectedFactura.cliente?.razonSocial || selectedFactura.cliente?.nombre || 'N/A' }}
            </v-col>
            <v-col cols="12" sm="6">
              <strong>Total:</strong><br>
              {{ formatCurrency(selectedFactura.total) }}
            </v-col>
            <v-col cols="12" sm="6">
              <strong>Fecha:</strong><br>
              {{ formatDate(selectedFactura.fechaCreacion) }}
            </v-col>
            <v-col cols="12" v-if="selectedFactura.codigoRetorno">
              <strong>Código de Retorno:</strong><br>
              <code>{{ selectedFactura.codigoRetorno }}</code>
            </v-col>
            <v-col cols="12" v-if="selectedFactura.mensajeRetorno">
              <strong>Mensaje:</strong><br>
              {{ selectedFactura.mensajeRetorno }}
            </v-col>
          </v-row>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="primary" @click="dialog = false">Cerrar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script>
import axios from 'axios'

export default {
  name: 'QueueStatusView',
  
  data() {
    return {
      loading: false,
      dialog: false,
      selectedFactura: null,
      queueStats: {
        facturacion: {},
        kude: {}
      },
      facturas: [],
      workerStatus: 'unknown',
      lastUpdate: '',
      refreshInterval: null,
      headers: [
        { title: 'Correlativo', key: 'correlativo', sortable: true },
        { title: 'Estado', key: 'estadoSifen', sortable: true },
        { title: 'CDC', key: 'cdc', sortable: false },
        { title: 'Cliente', key: 'cliente.razonSocial', sortable: true },
        { title: 'Total', key: 'total', sortable: true, align: 'right' },
        { title: 'Fecha', key: 'fechaCreacion', sortable: true },
        { title: 'Acciones', key: 'actions', sortable: false, align: 'center' }
      ]
    }
  },

  mounted() {
    this.fetchData()
    // Actualizar cada 5 segundos
    this.refreshInterval = setInterval(this.fetchData, 5000)
  },

  beforeUnmount() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval)
    }
  },

  methods: {
    async fetchData() {
      this.loading = true
      try {
        // Obtener estadísticas de la cola
        const statsResponse = await axios.get('/api/queue/stats')
        this.queueStats = statsResponse.data.data || {}
        
        // Obtener últimas facturas
        const invoicesResponse = await axios.get('/api/invoices?limit=10')
        this.facturas = invoicesResponse.data.data?.invoices || []
        
        // Verificar estado del worker (si hay jobs activos)
        const activeJobs = this.queueStats.facturacion?.active || 0
        this.workerStatus = activeJobs > 0 ? 'active' : 'idle'
        
        this.lastUpdate = new Date().toLocaleTimeString()
      } catch (error) {
        console.error('Error al obtener datos:', error)
        this.workerStatus = 'error'
      } finally {
        this.loading = false
      }
    },

    getEstadoColor(estado) {
      const colors = {
        'encolado': 'grey',
        'procesando': 'info',
        'enviado': 'warning',
        'aceptado': 'success',
        'rechazado': 'error',
        'error': 'error'
      }
      return colors[estado] || 'grey'
    },

    getEstadoIcon(estado) {
      const icons = {
        'encolado': 'mdi-clock-outline',
        'procesando': 'mdi-cog-outline',
        'enviado': 'mdi-send-outline',
        'aceptado': 'mdi-check-circle',
        'rechazado': 'mdi-close-circle',
        'error': 'mdi-alert-circle'
      }
      return icons[estado] || 'mdi-help-circle'
    },

    formatCurrency(value) {
      if (!value) return 'Gs. 0'
      return new Intl.NumberFormat('es-PY', {
        style: 'currency',
        currency: 'PYG',
        minimumFractionDigits: 0
      }).format(value)
    },

    formatDate(dateString) {
      if (!dateString) return '---'
      const date = new Date(dateString)
      return date.toLocaleString('es-PY', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    },

    verDetalle(factura) {
      this.selectedFactura = factura
      this.dialog = true
    }
  }
}
</script>

<style scoped>
.text-mono {
  font-family: 'Courier New', Courier, monospace;
}
</style>
