<template>
  <v-container fluid>
    <v-row>
      <v-col cols="12" sm="6" md="3">
        <v-card color="primary" dark>
          <v-card-title class="text-h6">
            <v-icon left>mdi-file-document</v-icon>
            Total Facturas
          </v-card-title>
          <v-card-text class="text-h4">
            {{ stats.totalFacturas || 0 }}
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" sm="6" md="3">
        <v-card color="success" dark>
          <v-card-title class="text-h6">
            <v-icon left>mdi-check-circle</v-icon>
            Aceptadas
          </v-card-title>
          <v-card-text class="text-h4">
            {{ stats.facturasAceptadas || stats.facturasPorEstado?.find(s => s._id === 'aceptado')?.count || 0 }}
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" sm="6" md="3">
        <v-card color="warning" dark>
          <v-card-title class="text-h6">
            <v-icon left>mdi-timer-sand</v-icon>
            Procesando
          </v-card-title>
          <v-card-text class="text-h4">
            {{ stats.facturasProcesando || stats.facturasPorEstado?.find(s => s._id === 'procesando')?.count || 0 }}
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" sm="6" md="3">
        <v-card color="error" dark>
          <v-card-title class="text-h6">
            <v-icon left>mdi-alert-circle</v-icon>
            Errores/Rechazadas
          </v-card-title>
          <v-card-text class="text-h4">
            {{ (stats.facturasError || stats.facturasPorEstado?.find(s => s._id === 'error')?.count || 0) + (stats.facturasRechazadas || stats.facturasPorEstado?.find(s => s._id === 'rechazado')?.count || 0) }}
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <v-row>
      <v-col cols="12" md="8">
        <v-card>
          <v-card-title>Actividad Reciente</v-card-title>
          <v-card-text>
            <v-data-table
              :headers="recentActivityHeaders"
              :items="recentInvoices"
              :items-per-page="5"
              class="elevation-1"
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
                  dark
                >
                  {{ item.estadoSifen }}
                </v-chip>
              </template>
              <template v-slot:item.createdAt="{ item }">
                {{ formatDate(item.createdAt) }}
              </template>
              <template v-slot:item.actions="{ item }">
                <v-btn
                  color="primary"
                  size="small"
                  @click="viewInvoice(item._id)"
                >
                  Ver
                </v-btn>
              </template>
            </v-data-table>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" md="4">
        <v-card>
          <v-card-title>Estados de Facturas</v-card-title>
          <v-card-text>
            <v-list>
              <v-list-item
                v-for="estado in stats.facturasPorEstado"
                :key="estado._id"
              >
                <v-list-item-title>{{ estado._id }}</v-list-item-title>
                <v-list-item-subtitle>{{ estado.count }} facturas</v-list-item-subtitle>
                <template v-slot:prepend>
                  <v-chip
                    :color="getStatusColor(estado._id)"
                    size="small"
                    label
                  >
                    {{ estado.count }}
                  </v-chip>
                </template>
              </v-list-item>
            </v-list>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <v-row class="mt-4">
      <v-col cols="12">
        <v-card>
          <v-card-title>Tendencias de Facturación</v-card-title>
          <v-card-text>
            <div style="height: 300px;">
              <canvas ref="tendenciasChart"></canvas>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
import { ref, onMounted } from 'vue';
import axios from 'axios';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

export default {
  name: 'DashboardView',
  setup() {
    const stats = ref({});
    const recentInvoices = ref([]);
    const tendenciasChart = ref(null);
    let chartInstance = null;
    
    const recentActivityHeaders = [
      { title: 'Hash', key: 'facturaHash', sortable: false },
      { title: 'RUC', key: 'cliente.ruc' },
      { title: 'CDC', key: 'cdc' },
      { title: 'Cliente', key: 'cliente.nombre' },
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

    const formatDate = (dateString) => {
      const date = new Date(dateString);
      return date.toLocaleDateString();
    };

    const viewInvoice = (id) => {
      window.location.href = `/invoices/${id}`;
    };

    const loadStats = async () => {
      try {
        const statsResponse = await axios.get('/api/stats');
        stats.value = statsResponse.data;

        // Cargar las facturas recientes
        const invoicesResponse = await axios.get('/api/invoices?page=1&limit=5');
        recentInvoices.value = invoicesResponse.data.invoices;

        // Crear gráfico de tendencias
        crearGraficoTendencias(stats.value.tendenciasPorDia || []);
      } catch (error) {
        console.error('Error cargando estadísticas:', error);
      }
    };

    const crearGraficoTendencias = (tendencias) => {
      const ctx = tendenciasChart.value;
      if (!ctx) return;

      // Destruir gráfico anterior si existe
      if (chartInstance) {
        chartInstance.destroy();
      }

      // Preparar datos
      const labels = tendencias.map(t => {
        const fecha = new Date(t._id);
        return fecha.toLocaleDateString('es-PY', { day: '2-digit', month: '2-digit' });
      });
      const counts = tendencias.map(t => t.count);
      const totals = tendencias.map(t => t.total || 0);

      // Crear gráfico
      chartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: labels,
          datasets: [
            {
              label: 'Cantidad de Facturas',
              data: counts,
              backgroundColor: 'rgba(25, 118, 210, 0.7)',
              borderColor: 'rgba(25, 118, 210, 1)',
              borderWidth: 1,
              yAxisID: 'y'
            },
            {
              label: 'Total Facturado (Gs.)',
              data: totals,
              type: 'line',
              borderColor: 'rgba(76, 175, 80, 1)',
              backgroundColor: 'rgba(76, 175, 80, 0.1)',
              borderWidth: 2,
              pointBackgroundColor: 'rgba(76, 175, 80, 1)',
              yAxisID: 'y1'
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: {
            mode: 'index',
            intersect: false
          },
          plugins: {
            legend: {
              display: true,
              position: 'top'
            },
            tooltip: {
              callbacks: {
                label: function(context) {
                  let label = context.dataset.label || '';
                  if (label) {
                    label += ': ';
                  }
                  if (context.dataset.type === 'line') {
                    label += 'Gs. ' + new Intl.NumberFormat('es-PY').format(context.parsed.y);
                  } else {
                    label += context.parsed.y;
                  }
                  return label;
                }
              }
            }
          },
          scales: {
            y: {
              type: 'linear',
              display: true,
              position: 'left',
              title: {
                display: true,
                text: 'Cantidad de Facturas'
              },
              ticks: {
                stepSize: 1
              }
            },
            y1: {
              type: 'linear',
              display: true,
              position: 'right',
              title: {
                display: true,
                text: 'Total Facturado (Gs.)'
              },
              grid: {
                drawOnChartArea: false
              }
            }
          }
        }
      });
    };

    onMounted(() => {
      loadStats();
    });

    return {
      stats,
      recentInvoices,
      recentActivityHeaders,
      getStatusColor,
      formatDate,
      viewInvoice,
      tendenciasChart
    };
  }
};
</script>