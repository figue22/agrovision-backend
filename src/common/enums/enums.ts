// ============================================
// ENUMS DEL SISTEMA - AgroVision Predictor
// Valores fijos que NO cambian (a diferencia
// de las tablas catálogo que sí pueden crecer)
// ============================================

export enum Rol {
  ADMIN = 'admin',
  TECNICO = 'tecnico',
  AGRICULTOR = 'agricultor',
}

export enum TipoSuelo {
  ARCILLOSO = 'arcilloso',
  ARENOSO = 'arenoso',
  LIMOSO = 'limoso',
  FRANCO = 'franco',
  MIXTO = 'mixto',
}

export enum RequerimientoAgua {
  BAJO = 'bajo',
  MEDIO = 'medio',
  ALTO = 'alto',
}

export enum EstadoCultivo {
  PLANIFICADO = 'planificado',
  ACTIVO = 'activo',
  COSECHADO = 'cosechado',
  FALLIDO = 'fallido',
  ABANDONADO = 'abandonado',
}

export enum NivelRiesgo {
  BAJO = 'bajo',
  MEDIO = 'medio',
  ALTO = 'alto',
  CRITICO = 'critico',
}

export enum Prioridad {
  BAJA = 'baja',
  MEDIA = 'media',
  ALTA = 'alta',
  URGENTE = 'urgente',
}

export enum EstadoImplementacion {
  PENDIENTE = 'pendiente',
  EN_PROGRESO = 'en_progreso',
  COMPLETADA = 'completada',
  DESCARTADA = 'descartada',
}

export enum Severidad {
  INFO = 'info',
  BAJA = 'baja',
  MEDIA = 'media',
  ALTA = 'alta',
  CRITICA = 'critica',
}

export enum EstadoRegistroWhatsapp {
  DESCONOCIDO = 'desconocido',
  INVITADO = 'invitado',
  EN_PROCESO = 'en_proceso',
  REGISTRADO = 'registrado',
  RECHAZADO = 'rechazado',
}

export enum EstadoIndexacion {
  PENDIENTE = 'pendiente',
  PROCESANDO = 'procesando',
  INDEXADO = 'indexado',
  FALLIDO = 'fallido',
  EXCLUIDO = 'excluido',
}

export enum EstadoIndiceRag {
  ACTIVO = 'activo',
  OBSOLETO = 'obsoleto',
  REINDEXANDO = 'reindexando',
  ELIMINADO = 'eliminado',
}