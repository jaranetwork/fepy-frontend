<template>
  <v-app>
    <v-app-bar app color="primary" dark>
      <v-app-bar-nav-icon @click="drawer = !drawer"></v-app-bar-nav-icon>
      <v-toolbar-title>Sistema de Facturación Electrónica SIFEN</v-toolbar-title>

      <v-spacer></v-spacer>

      <!-- Selector de empresa -->
      <div v-if="autenticado" class="mr-4" style="max-width: 300px; min-width: 250px;">
        <EmpresaSelector @cambio-empresa="cambiarEmpresa" />
      </div>

      <v-chip :color="apiStatusColor" class="mr-2" variant="flat" size="small">
        <v-icon start size="small">{{ apiStatusIcon }}</v-icon>
        {{ apiStatusText }}
      </v-chip>

      <v-btn icon @click="checkApiConnection">
        <v-icon>mdi-refresh</v-icon>
      </v-btn>

      <!-- Menú de usuario -->
      <v-menu v-model="menu" :close-on-content-click="false" location="end">
        <template v-slot:activator="{ props }">
          <v-btn icon v-bind="props">
            <v-icon>mdi-account</v-icon>
          </v-btn>
        </template>

        <v-card min-width="250">
          <v-list-item>
            <template v-slot:prepend>
              <v-avatar color="primary" size="40">
                <v-icon color="white">mdi-account</v-icon>
              </v-avatar>
            </template>
            <v-list-item-title v-if="usuario">{{ usuario.nombre }} {{ usuario.apellido }}</v-list-item-title>
            <v-list-item-subtitle v-if="usuario">{{ usuario.email }}</v-list-item-subtitle>
          </v-list-item>

          <v-divider></v-divider>

          <v-list-item link @click="cerrarSesion">
            <template v-slot:prepend>
              <v-icon color="error">mdi-logout</v-icon>
            </template>
            <v-list-item-title class="text-error">Cerrar Sesión</v-list-item-title>
          </v-list-item>
        </v-card>
      </v-menu>
    </v-app-bar>

    <v-navigation-drawer v-model="drawer" app>
      <v-list>
        <v-list-item link to="/">
          <v-list-item-title class="text-h6 font-weight-bold">
            SIFEN Dashboard
          </v-list-item-title>
        </v-list-item>

        <v-divider class="my-4"></v-divider>

        <v-list-item link to="/" :active="route.path === '/'">
          <template v-slot:prepend>
            <v-icon>mdi-view-dashboard</v-icon>
          </template>
          <v-list-item-title>Dashboard</v-list-item-title>
        </v-list-item>

        <v-list-item link to="/invoices" :active="route.path === '/invoices'">
          <template v-slot:prepend>
            <v-icon>mdi-file-document-multiple</v-icon>
          </template>
          <v-list-item-title>Facturas</v-list-item-title>
        </v-list-item>

        <v-list-item link to="/empresas" :active="route.path === '/empresas'">
          <template v-slot:prepend>
            <v-icon>mdi-office-building</v-icon>
          </template>
          <v-list-item-title>Empresas</v-list-item-title>
        </v-list-item>

        <v-list-item link to="/api-keys" :active="route.path === '/api-keys'">
          <template v-slot:prepend>
            <v-icon>mdi-key</v-icon>
          </template>
          <v-list-item-title>API Keys</v-list-item-title>
        </v-list-item>

        <v-list-item link to="/queue-status" :active="route.path === '/queue-status'">
          <template v-slot:prepend>
            <v-icon>mdi-view-queue</v-icon>
          </template>
          <v-list-item-title>Cola de Procesos</v-list-item-title>
        </v-list-item>

        <v-list-item link to="/logs" :active="route.path === '/logs'">
          <template v-slot:prepend>
            <v-icon>mdi-clipboard-text-clock</v-icon>
          </template>
          <v-list-item-title>Registros</v-list-item-title>
        </v-list-item>
      </v-list>
    </v-navigation-drawer>

    <v-main>
      <router-view></router-view>
    </v-main>

    <v-footer app>
      <span>&copy; {{ new Date().getFullYear() }} Sistema de Facturación Electrónica - SIFEN</span>
    </v-footer>

    <v-snackbar v-model="snackbar" :color="snackbarColor" :timeout="3000">
      {{ snackbarText }}
      <template v-slot:actions>
        <v-btn variant="text" @click="snackbar = false">Cerrar</v-btn>
      </template>
    </v-snackbar>
  </v-app>
</template>

<script>
import { ref, onMounted, reactive, computed } from 'vue';
import { useRoute } from 'vue-router';
import axios from 'axios';
import { cerrarSesion } from './auth';
import EmpresaSelector from './components/EmpresaSelector.vue';

export default {
  name: 'App',
  components: {
    EmpresaSelector
  },
  setup() {
    const drawer = ref(null);
    const route = useRoute();
    const menu = ref(false);
    const usuario = ref(null);
    const apiConnected = ref(false);
    const loadingApi = ref(false);
    const snackbar = ref(false);
    const snackbarText = ref('');
    const snackbarColor = ref('info');

    const apiStatusColor = ref('grey');
    const apiStatusIcon = ref('mdi-help-circle');
    const apiStatusText = ref('Verificando...');

    // Estado de autenticación
    const autenticado = ref(false);

    // Cargar información del usuario
    const cargarUsuario = () => {
      const usuarioStr = localStorage.getItem('usuario');
      const token = localStorage.getItem('token');
      if (usuarioStr && token) {
        usuario.value = JSON.parse(usuarioStr);
        autenticado.value = true;
      } else {
        autenticado.value = false;
      }
    };

    // Cambiar empresa
    const cambiarEmpresa = (empresaId) => {
      console.log('Empresa cambiada:', empresaId);
      // Aquí se puede recargar datos o hacer otras acciones al cambiar de empresa
    };

    const checkApiConnection = async () => {
      loadingApi.value = true;
      apiStatusColor.value = 'grey';
      apiStatusIcon.value = 'mdi-loading';
      apiStatusText.value = 'Verificando...';

      try {
        await axios.get('/api/stats', { timeout: 5000 });
        apiConnected.value = true;
        apiStatusColor.value = 'success';
        apiStatusIcon.value = 'mdi-check-circle';
        apiStatusText.value = 'Conectado';
        // No mostrar mensaje cuando hay conexión exitosa
      } catch (error) {
        apiConnected.value = false;
        apiStatusColor.value = 'error';
        apiStatusIcon.value = 'mdi-close-circle';
        apiStatusText.value = 'Sin conexión';
        snackbarText.value = 'No se puede conectar con la API';
        snackbarColor.value = 'error';
        snackbar.value = true;
      } finally {
        loadingApi.value = false;
      }
    };

    onMounted(() => {
      cargarUsuario();
      checkApiConnection();
    });

    return {
      drawer,
      route,
      menu,
      usuario,
      autenticado,
      apiConnected,
      loadingApi,
      apiStatusColor,
      apiStatusIcon,
      apiStatusText,
      snackbar,
      snackbarText,
      snackbarColor,
      checkApiConnection,
      cerrarSesion,
      cambiarEmpresa
    };
  }
};
</script>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
</style>
