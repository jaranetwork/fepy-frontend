<template>
  <v-container fluid>
    <v-row class="mb-4">
      <v-col cols="12">
        <v-app-bar flat color="transparent" class="px-0">
          <v-app-bar-title class="text-h4 font-weight-bold">
            <v-icon start color="primary">mdi-office-building</v-icon>
            Gestión de Empresas
          </v-app-bar-title>

          <v-spacer></v-spacer>

          <v-btn color="primary" @click="mostrarDialogoFormulario = true">
            <v-icon start>mdi-plus</v-icon>
            Nueva Empresa
          </v-btn>
        </v-app-bar>
      </v-col>
    </v-row>

    <!-- Tabla de empresas -->
    <v-row>
      <v-col cols="12">
        <v-card>
          <v-card-text>
            <v-data-table
              :headers="headers"
              :items="empresas"
              :loading="cargando"
              item-key="_id"
              class="elevation-0"
            >
              <!-- RUC -->
              <template #item.ruc="{ item }">
                <v-chip variant="outlined" size="small">
                  <v-icon start size="x-small">mdi-numeric</v-icon>
                  {{ item.ruc }}
                </v-chip>
              </template>

              <!-- Certificado -->
              <template #item.certificado="{ item }">
                <v-chip
                  :color="item.certificado?.activo ? 'success' : 'grey'"
                  size="small"
                  variant="flat"
                >
                  <v-icon start size="x-small">
                    {{ item.certificado?.activo ? 'mdi-check-circle' : 'mdi-circle-outline' }}
                  </v-icon>
                  {{ item.certificado?.activo ? 'Activo' : 'Inactivo' }}
                </v-chip>
              </template>

              <!-- Modo SIFEN -->
              <template #item.modo="{ item }">
                <v-chip
                  :color="item.configuracionSifen?.modo === 'produccion' ? 'error' : 'warning'"
                  size="small"
                  variant="outlined"
                >
                  <v-icon start size="x-small">
                    {{ item.configuracionSifen?.modo === 'produccion' ? 'mdi-lock' : 'mdi-wrench' }}
                  </v-icon>
                  {{ item.configuracionSifen?.modo?.toUpperCase() }}
                </v-chip>
              </template>

              <!-- Estado -->
              <template #item.activo="{ item }">
                <v-chip
                  :color="item.activo ? 'success' : 'error'"
                  size="small"
                  variant="tonal"
                >
                  {{ item.activo ? 'Activo' : 'Inactivo' }}
                </v-chip>
              </template>

              <!-- Acciones -->
              <template #item.acciones="{ item }">
                <v-btn
                  icon="mdi-pencil"
                  size="small"
                  variant="text"
                  @click="editarEmpresa(item)"
                  title="Editar"
                ></v-btn>

                <v-btn
                  icon="mdi-certificate"
                  size="small"
                  variant="text"
                  @click="abrirDialogoCertificado(item)"
                  title="Certificado"
                ></v-btn>

                <v-btn
                  icon="mdi-delete"
                  size="small"
                  variant="text"
                  color="error"
                  @click="confirmarEliminar(item)"
                  title="Eliminar"
                ></v-btn>
              </template>

              <!-- Mensaje cuando no hay datos -->
              <template #no-data>
                <div class="text-center py-8">
                  <v-icon size="64" color="grey-lighten-2">mdi-office-building-outline</v-icon>
                  <p class="text-grey mt-2">No hay empresas registradas</p>
                  <v-btn color="primary" class="mt-2" @click="mostrarDialogoFormulario = true">
                    <v-icon start>mdi-plus</v-icon>
                    Crear primera empresa
                  </v-btn>
                </div>
              </template>
            </v-data-table>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Diálogo: Formulario de empresa -->
    <v-dialog v-model="mostrarDialogoFormulario" max-width="800px" persistent>
      <v-card>
        <v-card-title class="bg-primary text-white">
          <v-icon start>mdi-office-building-plus</v-icon>
          {{ empresaEnEdicion ? 'Editar Empresa' : 'Nueva Empresa' }}
        </v-card-title>

        <v-card-text class="mt-4">
          <v-form ref="formRef" v-model="formularioValido">
            <v-row>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="formulario.ruc"
                  label="RUC *"
                  :rules="[
                    v => !!v || 'RUC requerido',
                    v => {
                      const sinGuiones = v.replace(/[^0-9]/g, '');
                      return sinGuiones.length >= 6 && sinGuiones.length <= 12 || 'RUC inválido (6-12 dígitos)';
                    }
                  ]"
                  maxlength="13"
                  counter="13"
                  placeholder="8001234-5"
                  type="text"
                  outlined
                  required
                ></v-text-field>
              </v-col>

              <v-col cols="12" md="6">
                <v-text-field
                  v-model="formulario.nombreFantasia"
                  label="Nombre de Fantasía *"
                  :rules="[v => !!v || 'Nombre requerido']"
                  outlined
                  required
                ></v-text-field>
              </v-col>

              <v-col cols="12">
                <v-text-field
                  v-model="formulario.razonSocial"
                  label="Razón Social *"
                  :rules="[v => !!v || 'Razón social requerida']"
                  outlined
                  required
                ></v-text-field>
              </v-col>

              <v-col cols="12" md="6">
                <v-text-field
                  v-model="formulario.direccion"
                  label="Dirección"
                  outlined
                ></v-text-field>
              </v-col>

              <v-col cols="12" md="6">
                <v-text-field
                  v-model="formulario.telefono"
                  label="Teléfono"
                  type="tel"
                  outlined
                ></v-text-field>
              </v-col>

              <v-col cols="12">
                <v-text-field
                  v-model="formulario.email"
                  label="Email"
                  type="email"
                  :rules="[v => !v || /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(v) || 'Email inválido']"
                  outlined
                ></v-text-field>
              </v-col>

              <v-divider class="my-4"></v-divider>

              <v-col cols="12" class="bg-grey-lighten-4 pa-4 rounded">
                <div class="text-subtitle-1 font-weight-bold mb-3">
                  <v-icon start color="primary">mdi-cog</v-icon>
                  Configuración SIFEN
                </div>

                <v-row>
                  <v-col cols="12" md="6">
                    <v-text-field
                      v-model="formulario.configuracionSifen.timbrado"
                      label="Número de Timbrado *"
                      :rules="[v => !!v || 'Requerido', v => /^\d{8}$/.test(v) || '8 dígitos']"
                      maxlength="8"
                      counter="8"
                      placeholder="12345678"
                      outlined
                    ></v-text-field>
                  </v-col>

                  <v-col cols="12" md="6">
                    <v-text-field
                      v-model="formulario.configuracionSifen.idCSC"
                      label="ID CSC *"
                      :rules="[v => !!v || 'Requerido', v => /^\d{1,4}$/.test(v) || '1-4 dígitos']"
                      maxlength="4"
                      counter="4"
                      placeholder="0001"
                      outlined
                    ></v-text-field>
                  </v-col>

                  <v-col cols="12" md="6">
                    <v-select
                      v-model="formulario.configuracionSifen.modo"
                      label="Modo de Operación *"
                      :items="[
                        { title: 'Test (Mock)', value: 'test' },
                        { title: 'Producción (SET Real)', value: 'produccion' }
                      ]"
                      :rules="[v => !!v || 'Modo requerido']"
                      outlined
                    ></v-select>
                  </v-col>

                  <v-col cols="12" md="6"></v-col>

                  <v-col cols="12">
                    <v-text-field
                      v-model="formulario.configuracionSifen.csc"
                      label="CSC (Código Secreto del Contribuyente) *"
                      :rules="[v => !!v || 'Requerido', v => /^[0-9A-F]{32}$/i.test(v) || '32 caracteres hexadecimales']"
                      maxlength="32"
                      counter="32"
                      placeholder="ABCD0000000000000000000000000000"
                      :type="mostrarCSC ? 'text' : 'password'"
                      :append-inner-icon="mostrarCSC ? 'mdi-eye-off' : 'mdi-eye'"
                      @click:append-inner="mostrarCSC = !mostrarCSC"
                      outlined
                    ></v-text-field>
                    <div class="text-caption text-grey mt-1">
                      ℹ️ El CSC es proporcionado por la SET al habilitar la facturación electrónica. Son 32 caracteres hexadecimales.
                    </div>
                  </v-col>
                </v-row>
              </v-col>
            </v-row>
          </v-form>
        </v-card-text>

        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn text @click="cerrarFormulario">Cancelar</v-btn>
          <v-btn color="primary" :loading="guardando" @click="guardarEmpresa">
            <v-icon start>{{ empresaEnEdicion ? 'mdi-content-save' : 'mdi-plus' }}</v-icon>
            {{ empresaEnEdicion ? 'Actualizar' : 'Crear' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Diálogo: Subir certificado -->
    <v-dialog v-model="mostrarDialogoCertificado" max-width="600px" persistent>
      <v-card>
        <v-card-title class="bg-primary text-white">
          <v-icon start>mdi-certificate</v-icon>
          Certificado Digital
        </v-card-title>

        <v-card-text class="mt-4">
          <v-alert
            v-if="empresaSeleccionada?.certificado?.activo"
            type="success"
            variant="tonal"
            class="mb-4"
          >
            <strong>Certificado activo cargado</strong>
            <div class="text-caption mt-1">
              Archivo: {{ empresaSeleccionada.certificado.nombreArchivo }}<br>
              Cargado: {{ new Date(empresaSeleccionada.certificado.fechaCarga).toLocaleDateString() }}
            </div>
          </v-alert>

          <v-form ref="formCertificado">
            <v-file-input
              v-model="archivoCertificado"
              label="Archivo .p12 *"
              accept=".p12"
              :rules="[v => !!v || 'Archivo requerido']"
              prepend-icon="mdi-file-upload"
              outlined
            ></v-file-input>

            <v-text-field
              v-model="contrasenaCertificado"
              label="Contraseña del certificado *"
              :rules="[v => !!v || 'Contraseña requerida']"
              :type="mostrarContrasena ? 'text' : 'password'"
              :append-inner-icon="mostrarContrasena ? 'mdi-eye-off' : 'mdi-eye'"
              @click:append-inner="mostrarContrasena = !mostrarContrasena"
              outlined
            ></v-text-field>

            <v-alert
              type="info"
              variant="tonal"
              class="mt-4"
            >
              <v-icon start>mdi-information</v-icon>
              El certificado digital (.p12) es proporcionado por la SET y es requerido para firmar
              electrónicamente las facturas.
            </v-alert>
          </v-form>
        </v-card-text>

        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn text @click="mostrarDialogoCertificado = false">Cancelar</v-btn>
          <v-btn color="primary" :loading="subiendoCertificado" @click="subirCertificado">
            <v-icon start>mdi-upload</v-icon>
            Subir Certificado
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Diálogo: Confirmar eliminación -->
    <v-dialog v-model="mostrarDialogoEliminar" max-width="500px" persistent>
      <v-card>
        <v-card-title class="bg-error text-white">
          <v-icon start>mdi-alert</v-icon>
          Confirmar Eliminación
        </v-card-title>

        <v-card-text class="mt-4">
          <p>¿Está seguro que desea eliminar la empresa <strong>{{ empresaSeleccionada?.nombreFantasia }}</strong>?</p>
          <v-alert
            v-if="empresaSeleccionada"
            type="warning"
            variant="tonal"
            class="mt-4"
          >
            <v-icon start>mdi-alert</v-icon>
            Esta acción no se puede deshacer. Asegúrese de que no haya facturas asociadas.
          </v-alert>
        </v-card-text>

        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn text @click="mostrarDialogoEliminar = false">Cancelar</v-btn>
          <v-btn color="error" :loading="eliminando" @click="eliminarEmpresa">
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
      :timeout="4000"
      location="top"
    >
      {{ snackbarText }}
      <template v-slot:actions>
        <v-btn variant="text" @click="snackbar = false">Cerrar</v-btn>
      </template>
    </v-snackbar>
  </v-container>
</template>

<script>
import { ref, onMounted } from 'vue';
import axios from 'axios';

export default {
  name: 'EmpresasView',
  setup() {
    // Estado
    const empresas = ref([]);
    const cargando = ref(false);
    const guardando = ref(false);
    const subiendoCertificado = ref(false);
    const eliminando = ref(false);
    
    // Diálogos
    const mostrarDialogoFormulario = ref(false);
    const mostrarDialogoCertificado = ref(false);
    const mostrarDialogoEliminar = ref(false);
    
    // Formulario
    const formRef = ref(null);
    const formularioValido = ref(false);
    const empresaEnEdicion = ref(null);
    const formulario = ref({
      ruc: '',
      nombreFantasia: '',
      razonSocial: '',
      direccion: '',
      telefono: '',
      email: '',
      configuracionSifen: {
        codigoEstablecimiento: '001',
        codigoPuntoEmision: '001',
        numeroTimbrado: '12345678',
        modo: 'test'
      }
    });
    
    // Certificado
    const archivoCertificado = ref(null);
    const contrasenaCertificado = ref('');
    const mostrarContrasena = ref(false);
    const mostrarCSC = ref(false);
    
    // Empresa seleccionada
    const empresaSeleccionada = ref(null);
    
    // Snackbar
    const snackbar = ref(false);
    const snackbarText = ref('');
    const snackbarColor = ref('success');
    
    // Headers de la tabla
    const headers = [
      { title: 'Nombre Fantasía', key: 'nombreFantasia', sortable: true },
      { title: 'RUC', key: 'ruc', sortable: true },
      { title: 'Razón Social', key: 'razonSocial', sortable: false },
      { title: 'Certificado', key: 'certificado', sortable: false },
      { title: 'Modo', key: 'modo', sortable: false },
      { title: 'Estado', key: 'activo', sortable: true },
      { title: 'Acciones', key: 'acciones', sortable: false, align: 'end' }
    ];
    
    // Cargar empresas
    const cargarEmpresas = async () => {
      cargando.value = true;
      try {
        const response = await axios.get('/api/empresas');
        empresas.value = response.data.data || [];
      } catch (error) {
        mostrarSnackbar('Error cargando empresas: ' + error.message, 'error');
      } finally {
        cargando.value = false;
      }
    };
    
    // Mostrar snackbar
    const mostrarSnackbar = (texto, color = 'success') => {
      snackbarText.value = texto;
      snackbarColor.value = color;
      snackbar.value = true;
    };
    
    // Abrir formulario para nueva empresa
    const nuevaEmpresa = () => {
      empresaEnEdicion.value = null;
      formulario.value = {
        ruc: '',
        nombreFantasia: '',
        razonSocial: '',
        direccion: '',
        telefono: '',
        email: '',
        configuracionSifen: {
          timbrado: '12345678',
          idCSC: '0001',
          csc: '',
          modo: 'test'
        }
      };
      mostrarDialogoFormulario.value = true;
    };

    // Editar empresa
    const editarEmpresa = (empresa) => {
      empresaEnEdicion.value = empresa;
      formulario.value = {
        ruc: empresa.ruc,
        nombreFantasia: empresa.nombreFantasia,
        razonSocial: empresa.razonSocial,
        direccion: empresa.direccion || '',
        telefono: empresa.telefono || '',
        email: empresa.email || '',
        configuracionSifen: {
          timbrado: empresa.configuracionSifen?.timbrado || '12345678',
          idCSC: empresa.configuracionSifen?.idCSC || '0001',
          csc: empresa.configuracionSifen?.csc || '',
          modo: empresa.configuracionSifen?.modo || 'test'
        }
      };
      mostrarDialogoFormulario.value = true;
    };
    
    // Cerrar formulario
    const cerrarFormulario = () => {
      mostrarDialogoFormulario.value = false;
      empresaEnEdicion.value = null;
      if (formRef.value) {
        formRef.value.reset();
      }
    };
    
    // Guardar empresa
    const guardarEmpresa = async () => {
      if (!formRef.value || !formularioValido.value) {
        formRef.value?.validate();
        return;
      }
      
      guardando.value = true;
      try {
        if (empresaEnEdicion.value) {
          // Actualizar
          await axios.put(`/api/empresas/${empresaEnEdicion.value._id}`, formulario.value);
          mostrarSnackbar('Empresa actualizada exitosamente');
        } else {
          // Crear nueva
          await axios.post('/api/empresas', formulario.value);
          mostrarSnackbar('Empresa creada exitosamente');
        }
        
        cerrarFormulario();
        cargarEmpresas();
      } catch (error) {
        mostrarSnackbar(
          error.response?.data?.error || 'Error guardando empresa',
          'error'
        );
      } finally {
        guardando.value = false;
      }
    };
    
    // Mostrar diálogo de certificado
    const abrirDialogoCertificado = (empresa) => {
      empresaSeleccionada.value = empresa;
      archivoCertificado.value = null;
      contrasenaCertificado.value = '';
      mostrarDialogoCertificado.value = true;
    };
    
    // Subir certificado
    const subirCertificado = async () => {
      if (!archivoCertificado.value || !contrasenaCertificado.value) {
        mostrarSnackbar('Archivo y contraseña son requeridos', 'warning');
        return;
      }
      
      subiendoCertificado.value = true;
      try {
        const formData = new FormData();
        formData.append('certificado', archivoCertificado.value);
        formData.append('contrasena', contrasenaCertificado.value);
        
        await axios.post(
          `/api/empresas/${empresaSeleccionada.value._id}/certificado`,
          formData,
          {
            headers: {
              'Content-Type': 'multipart/form-data'
            }
          }
        );
        
        mostrarSnackbar('Certificado cargado exitosamente');
        mostrarDialogoCertificado.value = false;
        cargarEmpresas();
      } catch (error) {
        mostrarSnackbar(
          error.response?.data?.error || 'Error subiendo certificado',
          'error'
        );
      } finally {
        subiendoCertificado.value = false;
      }
    };
    
    // Confirmar eliminación
    const confirmarEliminar = (empresa) => {
      empresaSeleccionada.value = empresa;
      mostrarDialogoEliminar.value = true;
    };
    
    // Eliminar empresa
    const eliminarEmpresa = async () => {
      if (!empresaSeleccionada.value) return;
      
      eliminando.value = true;
      try {
        await axios.delete(`/api/empresas/${empresaSeleccionada.value._id}`);
        mostrarSnackbar('Empresa eliminada exitosamente');
        mostrarDialogoEliminar.value = false;
        cargarEmpresas();
      } catch (error) {
        mostrarSnackbar(
          error.response?.data?.error || error.response?.data?.mensaje || 'Error eliminando empresa',
          'error'
        );
      } finally {
        eliminando.value = false;
      }
    };
    
    // Cargar empresas al montar
    onMounted(cargarEmpresas);
    
    return {
      // Estado
      empresas,
      cargando,
      guardando,
      subiendoCertificado,
      eliminando,
      
      // Diálogos
      mostrarDialogoFormulario,
      mostrarDialogoCertificado,
      mostrarDialogoEliminar,
      
      // Formulario
      formRef,
      formularioValido,
      empresaEnEdicion,
      formulario,
      
      // Certificado
      archivoCertificado,
      contrasenaCertificado,
      mostrarContrasena,
      mostrarCSC,

      // Empresa seleccionada
      empresaSeleccionada,
      
      // Snackbar
      snackbar,
      snackbarText,
      snackbarColor,
      
      // Headers
      headers,
      
      // Métodos
      cargarEmpresas,
      mostrarSnackbar,
      nuevaEmpresa,
      editarEmpresa,
      cerrarFormulario,
      guardarEmpresa,
      abrirDialogoCertificado,
      subirCertificado,
      confirmarEliminar,
      eliminarEmpresa
    };
  }
};
</script>
