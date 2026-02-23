import { reactive, readonly } from 'vue';

const state = reactive({
  usuario: null,
  token: null,
  autenticado: false,
  empresaActiva: null
});

// Cargar datos del localStorage al iniciar
export function cargarSesion() {
  const token = localStorage.getItem('token');
  const usuario = localStorage.getItem('usuario');
  const empresaActiva = localStorage.getItem('empresaActiva');

  if (token && usuario) {
    state.token = token;
    state.usuario = JSON.parse(usuario);
    state.autenticado = true;
    if (empresaActiva) {
      state.empresaActiva = empresaActiva;
    }
    return true;
  }
  return false;
}

// Guardar sesión
export function guardarSesion(token, usuario) {
  state.token = token;
  state.usuario = usuario;
  state.autenticado = true;
  localStorage.setItem('token', token);
  localStorage.setItem('usuario', JSON.stringify(usuario));
}

// Guardar empresa activa
export function guardarEmpresaActiva(empresaId) {
  state.empresaActiva = empresaId;
  localStorage.setItem('empresaActiva', empresaId);
}

// Obtener empresa activa
export function obtenerEmpresaActiva() {
  return state.empresaActiva || localStorage.getItem('empresaActiva');
}

// Limpiar empresa activa
export function limpiarEmpresaActiva() {
  state.empresaActiva = null;
  localStorage.removeItem('empresaActiva');
}

// Cerrar sesión
export function cerrarSesion() {
  state.token = null;
  state.usuario = null;
  state.autenticado = false;
  state.empresaActiva = null;
  localStorage.removeItem('token');
  localStorage.removeItem('usuario');
  localStorage.removeItem('empresaActiva');

  // Redirigir al login inmediatamente
  window.location.href = '/login';
}

// Obtener estado de autenticación
export function useAuth() {
  return {
    usuario: readonly(state.usuario),
    autenticado: readonly(state.autenticado),
    empresaActiva: readonly(state.empresaActiva)
  };
}

export default {
  state,
  cargarSesion,
  guardarSesion,
  guardarEmpresaActiva,
  obtenerEmpresaActiva,
  limpiarEmpresaActiva,
  cerrarSesion,
  useAuth
};
