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
                  :type="workerStatus === 'active' ? 'success' : 'error'"
                  variant="tonal"
                  :icon="workerStatus === 'active' ? 'mdi-check-circle' : 'mdi-alert-circle'"
                >
                  <strong>Worker:</strong> {{ workerStatus === 'active' ? 'En línea' : 'Desconectado' }}
                  <span v-if="workerStatus === 'active'" class="text-caption d-block mt-1">
                    <strong>Jobs activos:</strong> {{ queueStats.facturacion?.active || 0 }}
                  </span>
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

    <!-- Lista de Jobs Recientes -->
    <v-row>
      <v-col cols="12">
        <v-card variant="outlined">
          <v-card-title class="bg-grey-lighten-5 d-flex align-center">
            <v-icon start color="primary">mdi-receipt-text-outline</v-icon>
            Jobs Recientes
            <v-spacer></v-spacer>
            <v-menu v-model="menu" :close-on-content-click="false" location="start">
              <template v-slot:activator="{ props }">
                <v-btn
                  color="error"
                  variant="tonal"
                  size="small"
                  v-bind="props"
                  :loading="clearing"
                  class="mr-2"
                >
                  <v-icon start>mdi-delete-forever</v-icon>
                  Limpiar
                  <v-icon end>mdi-menu-down</v-icon>
                </v-btn>
              </template>
              <v-list density="compact">
                <v-list-item @click="clearJobs('completed')">
                  <template v-slot:prepend>
                    <v-icon color="success">mdi-check-circle</v-icon>
                  </template>
                  <v-list-item-title>Completados</v-list-item-title>
                </v-list-item>
                <v-list-item @click="clearJobs('failed')">
                  <template v-slot:prepend>
                    <v-icon color="error">mdi-alert-circle</v-icon>
                  </template>
                  <v-list-item-title>Fallidos</v-list-item-title>
                </v-list-item>
                <v-list-item @click="clearJobs('all')">
                  <template v-slot:prepend>
                    <v-icon color="error">mdi-delete-forever</v-icon>
                  </template>
                  <v-list-item-title>Todos</v-list-item-title>
                </v-list-item>
              </v-list>
            </v-menu>
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
              :items="jobs"
              :loading="loading"
              loading-text="Cargando jobs..."
              class="elevation-0"
              hide-default-footer
              :items-per-page="20"
            >
              <!-- Estado -->
              <template v-slot:item.estado="{ item }">
                <v-chip
                  :color="getJobEstadoColor(item.estado)"
                  size="small"
                  label
                >
                  <v-icon start size="small">{{ getJobEstadoIcon(item.estado) }}</v-icon>
                  {{ formatJobEstado(item.estado) }}
                </v-chip>
              </template>

              <!-- Cola -->
              <template v-slot:item.queue="{ item }">
                <v-chip
                  :color="item.queue === 'facturacion' ? 'primary' : 'accent'"
                  size="small"
                  variant="tonal"
                >
                  {{ item.queue }}
                </v-chip>
              </template>

              <!-- Error -->
              <template v-slot:item.error="{ item }">
                <v-tooltip v-if="item.error" location="top">
                  <template v-slot:activator="{ props }">
                    <v-icon color="error" v-bind="props">mdi-alert-circle</v-icon>
                  </template>
                  <span>{{ item.error }}</span>
                </v-tooltip>
                <span v-else class="text-medium-emphasis">—</span>
              </template>

              <!-- Intentos -->
              <template v-slot:item.attempts="{ item }">
                <v-chip
                  :color="item.attempts > 1 ? 'warning' : 'success'"
                  size="x-small"
                  variant="tonal"
                >
                  {{ item.attempts }}
                </v-chip>
              </template>

              <!-- Timestamp -->
              <template v-slot:item.timestamp="{ item }">
                {{ formatTimestamp(item.timestamp) }}
              </template>
            </v-data-table>

            <v-empty-state
              v-if="!loading && jobs.length === 0"
              title="No hay jobs recientes"
              text="Los jobs procesados aparecerán aquí"
              icon="mdi-inbox-outline"
            ></v-empty-state>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>

  <!-- Diálogo de Confirmación -->
  <v-dialog v-model="dialog" max-width="400" persistent>
    <v-card>
      <v-card-title class="text-h5 d-flex align-center" :class="dialogType === 'all' ? 'bg-error text-white' : 'bg-warning text-black'">
        <v-icon start>{{ dialogType === 'all' ? 'mdi-alert' : 'mdi-delete-sweep' }}</v-icon>
        {{ getDialogOption(dialogType)?.title }}
        <v-spacer></v-spacer>
        <v-btn
          icon="mdi-close"
          size="small"
          variant="text"
          @click="dialog = false"
          :disabled="clearing"
          :color="dialogType === 'all' ? 'white' : 'black'"
        ></v-btn>
      </v-card-title>
      <v-card-text class="mt-4">
        {{ getDialogOption(dialogType)?.text }}
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn
          color="grey"
          variant="text"
          @click="dialog = false"
          :disabled="clearing"
        >
          Cancelar
        </v-btn>
        <v-btn
          :color="dialogType === 'all' ? 'error' : 'warning'"
          variant="tonal"
          @click="executeClear"
          :loading="clearing"
        >
          Eliminar
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
import axios from 'axios'

export default {
  name: 'QueueStatusView',
  
  data() {
    return {
      loading: false,
      clearing: false,
      menu: false,
      dialog: false,
      dialogType: null,
      queueStats: {
        facturacion: {},
        kude: {}
      },
      jobs: [],
      workerStatus: 'unknown',
      lastUpdate: '',
      refreshInterval: null,
      headers: [
        { title: 'ID', key: 'id', sortable: true, align: 'center' },
        { title: 'Cola', key: 'queue', sortable: true, align: 'center' },
        { title: 'Estado', key: 'estado', sortable: true, align: 'center' },
        { title: 'Correlativo', key: 'correlativo', sortable: true },
        { title: 'RUC', key: 'ruc', sortable: true },
        { title: 'Intentos', key: 'attempts', sortable: true, align: 'center' },
        { title: 'Error', key: 'error', sortable: false, align: 'center' },
        { title: 'Fecha', key: 'timestamp', sortable: true }
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

        // Obtener jobs recientes
        const jobsResponse = await axios.get('/api/queue/jobs?limit=20')
        this.jobs = jobsResponse.data.data || []

        // Verificar estado del worker
        // El worker está "active" (en línea) si Redis está conectado
        // No significa que haya jobs activos necesariamente
        this.workerStatus = 'active'  // Asumimos que está conectado si llegamos acá

        this.lastUpdate = new Date().toLocaleTimeString()
      } catch (error) {
        console.error('Error al obtener datos:', error)
        this.workerStatus = 'error'
      } finally {
        this.loading = false
      }
    },

    getJobEstadoColor(estado) {
      const colors = {
        'completed': 'success',
        'failed': 'error',
        'active': 'info',
        'waiting': 'warning'
      }
      return colors[estado] || 'grey'
    },

    getJobEstadoIcon(estado) {
      const icons = {
        'completed': 'mdi-check-circle',
        'failed': 'mdi-alert-circle',
        'active': 'mdi-cog-outline',
        'waiting': 'mdi-clock-outline'
      }
      return icons[estado] || 'mdi-help-circle'
    },

    formatJobEstado(estado) {
      const estados = {
        'completed': 'Completado',
        'failed': 'Fallido',
        'active': 'Procesando',
        'waiting': 'En Espera'
      }
      return estados[estado] || estado
    },

    formatTimestamp(timestamp) {
      if (!timestamp) return '---'
      const date = new Date(timestamp)
      return date.toLocaleString('es-PY', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      })
    },

    getDialogOption(type) {
      const options = {
        completed: {
          title: 'Limpiar Jobs Completados',
          text: '¿Estás seguro de que deseas eliminar todos los jobs completados? Esta acción no se puede deshacer.',
          endpoint: '/api/queue/clear-completed'
        },
        failed: {
          title: 'Limpiar Jobs Fallidos',
          text: '¿Estás seguro de que deseas eliminar todos los jobs fallidos? Esta acción no se puede deshacer.',
          endpoint: '/api/queue/clear-failed'
        },
        all: {
          title: 'Limpiar TODOS los Jobs',
          text: '⚠️ ¿Estás SEGURO de que deseas eliminar TODOS los jobs (completados, fallidos, en espera y activos)? Esta acción no se puede deshacer.',
          endpoint: '/api/queue/clear-all'
        }
      }
      return options[type]
    },

    clearJobs(type) {
      // Cerrar menú y abrir diálogo
      this.menu = false
      this.dialogType = type
      this.dialog = true
    },

    async executeClear() {
      const option = this.getDialogOption(this.dialogType)
      if (!option) return

      try {
        const response = await axios.post(option.endpoint, { queue: 'facturacion' })

        this.$snackbar.show({
          message: response.data.message,
          color: 'success',
          timeout: 3000
        })

        this.dialog = false
        this.dialogType = null

        // Recargar datos después de limpiar
        await this.fetchData()
      } catch (error) {
        console.error('Error al limpiar jobs:', error)
        this.$snackbar.show({
          message: error.response?.data?.error || 'Error al limpiar jobs',
          color: 'error',
          timeout: 5000
        })
      } finally {
        this.clearing = false
      }
    }
  }
}
</script>

<style scoped>
.text-mono {
  font-family: 'Courier New', Courier, monospace;
}
</style>
