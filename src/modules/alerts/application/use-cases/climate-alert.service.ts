import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Alerta } from '@modules/alerts/domain/entities/alerta.entity';
import { DatoClimatico } from '@modules/weather/domain/entities/dato-climatico.entity';
import { Parcela } from '@modules/parcels/domain/entities/parcela.entity';
import { CatTipoAlerta } from '@modules/catalogs/domain/entities/cat-tipo-alerta.entity';
import { Severidad } from '@common/enums/enums';
import { CultivoParcela } from '@modules/crops/domain/entities/cultivo-parcela.entity';

interface AlertaEvaluada {
  tipo_codigo: string;
  titulo: string;
  mensaje: string;
  severidad: Severidad;
  accion_requerida: string;
}

@Injectable()
export class ClimateAlertService {
  private readonly logger = new Logger(ClimateAlertService.name);

  constructor(
    @InjectRepository(Alerta)
    private readonly alertaRepo: Repository<Alerta>,
    @InjectRepository(DatoClimatico)
    private readonly datoClimaticoRepo: Repository<DatoClimatico>,
    @InjectRepository(Parcela)
    private readonly parcelaRepo: Repository<Parcela>,
    @InjectRepository(CatTipoAlerta)
    private readonly tipoAlertaRepo: Repository<CatTipoAlerta>,
    @InjectRepository(CultivoParcela)
    private readonly cultivoRepo: Repository<CultivoParcela>,
  ) {}

  // ── Evaluar alertas para todas las parcelas ──
  async evaluarTodasLasParcelas(): Promise<{ evaluadas: number; alertas_generadas: number }> {
    const parcelas = await this.parcelaRepo.find({
      relations: ['agricultor'],
    });

    let alertas_generadas = 0;

    for (const parcela of parcelas) {
      try {
        const alertas = await this.evaluarParcela(parcela.parcela_id);
        alertas_generadas += alertas;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.error(`Error evaluando alertas para parcela ${parcela.parcela_id}: ${msg}`);
      }
    }

    this.logger.log(`Evaluación completada: ${parcelas.length} parcelas, ${alertas_generadas} alertas generadas`);
    return { evaluadas: parcelas.length, alertas_generadas };
  }

  // ── Evaluar alertas para una parcela específica ──
  async evaluarParcela(parcelaId: string): Promise<number> {
    const parcela = await this.parcelaRepo.findOne({
      where: { parcela_id: parcelaId },
      relations: ['agricultor'],
    });

    if (!parcela) return 0;

    // Obtener datos climáticos recientes (últimos 7 días)
    const hace7dias = new Date();
    hace7dias.setDate(hace7dias.getDate() - 7);

    const datosRecientes = await this.datoClimaticoRepo.find({
      where: { parcela_id: parcelaId },
      order: { fecha: 'DESC' },
      take: 30,
    });

    if (datosRecientes.length === 0) return 0;

    const ultimoDato = datosRecientes[0];
    const alertasDetectadas = this.detectarAlertas(datosRecientes, ultimoDato);

    let alertasCreadas = 0;
    for (const alerta of alertasDetectadas) {
      const creada = await this.crearAlertaSiNoExiste(parcela, alerta);
      if (creada) alertasCreadas++;
    }

    return alertasCreadas;
  }

  // ── Detectar condiciones de alerta ──
  private detectarAlertas(datos: DatoClimatico[], ultimo: DatoClimatico): AlertaEvaluada[] {
    const alertas: AlertaEvaluada[] = [];

    // 1. HELADA — temperatura < 2°C
    const tempMin = Number(ultimo.temp_minima ?? ultimo.temp_promedio ?? 99);
    if (tempMin < 2) {
      alertas.push({
        tipo_codigo: 'helada',
        titulo: `⚠️ Riesgo de helada — ${tempMin}°C`,
        mensaje: `La temperatura mínima registrada es ${tempMin}°C, por debajo del umbral de riesgo de helada (2°C). Los cultivos pueden sufrir daños severos.`,
        severidad: tempMin < 0 ? Severidad.CRITICA : Severidad.ALTA,
        accion_requerida: 'Cubrir cultivos sensibles, activar sistemas de riego antihelada si disponibles. Revisar cultivos al amanecer.',
      });
    }

    // 2. SEQUÍA — sin lluvia en los últimos 7 días
    const diasSinLluvia = datos.filter((d) =>
      Number(d.precipitacion_mm ?? 0) === 0 &&
      d.fuente !== 'openweathermap_forecast',
    ).length;

    if (diasSinLluvia >= 7) {
      alertas.push({
        tipo_codigo: 'sequia',
        titulo: `🌵 Alerta de sequía — ${diasSinLluvia} días sin lluvia`,
        mensaje: `Se han registrado ${diasSinLluvia} días consecutivos sin precipitación. Los cultivos pueden estar bajo estrés hídrico.`,
        severidad: diasSinLluvia >= 14 ? Severidad.CRITICA : diasSinLluvia >= 10 ? Severidad.ALTA : Severidad.MEDIA,
        accion_requerida: 'Aumentar frecuencia de riego. Monitorear signos de marchitamiento. Considerar mulching para retener humedad.',
      });
    }

    // 3. LLUVIA FUERTE — precipitación > 50mm/día
    const precipitacion = Number(ultimo.precipitacion_mm ?? 0);
    if (precipitacion > 50) {
      alertas.push({
        tipo_codigo: 'lluvia_fuerte',
        titulo: `🌧️ Lluvia fuerte — ${precipitacion} mm`,
        mensaje: `Se registraron ${precipitacion} mm de precipitación, superando el umbral de lluvia fuerte (50 mm/día). Riesgo de inundación y erosión.`,
        severidad: precipitacion > 100 ? Severidad.CRITICA : Severidad.ALTA,
        accion_requerida: 'Verificar drenajes. Evitar labores en el campo. Revisar taludes y zonas propensas a deslizamientos.',
      });
    }

    // 4. VIENTO FUERTE — velocidad > 60 km/h (16.67 m/s)
    const viento = Number(ultimo.velocidad_viento ?? 0);
    const vientoKmh = viento * 3.6; // convertir m/s a km/h
    if (vientoKmh > 60) {
      alertas.push({
        tipo_codigo: 'viento',
        titulo: `💨 Viento fuerte — ${Math.round(vientoKmh)} km/h`,
        mensaje: `Se registraron vientos de ${Math.round(vientoKmh)} km/h, superando el umbral de riesgo (60 km/h). Posibles daños a cultivos y estructuras.`,
        severidad: vientoKmh > 90 ? Severidad.CRITICA : Severidad.ALTA,
        accion_requerida: 'Asegurar tutores y estructuras. Proteger cultivos frágiles. Suspender fumigaciones y labores con maquinaria.',
      });
    }

    // 5. PLAGA — condiciones favorables (humedad > 80% + temp 20-30°C por varios días)
    const diasCondicionesPlaga = datos.filter((d) =>
      Number(d.humedad_pct ?? 0) > 80 &&
      Number(d.temp_promedio ?? 0) >= 20 &&
      Number(d.temp_promedio ?? 0) <= 30,
    ).length;

    if (diasCondicionesPlaga >= 3) {
      alertas.push({
        tipo_codigo: 'plaga',
        titulo: `🦟 Condiciones favorables para plagas — ${diasCondicionesPlaga} días`,
        mensaje: `Se han registrado ${diasCondicionesPlaga} días con condiciones favorables para aparición de plagas (humedad > 80%, temperatura 20-30°C).`,
        severidad: diasCondicionesPlaga >= 7 ? Severidad.ALTA : Severidad.MEDIA,
        accion_requerida: 'Inspeccionar cultivos en busca de plagas y enfermedades. Considerar aplicación preventiva de fungicidas/insecticidas.',
      });
    }

    return alertas;
  }

  // ── Crear alerta solo si no existe una igual en las últimas 24h ──
  private async crearAlertaSiNoExiste(
    parcela: Parcela,
    alertaData: AlertaEvaluada,
  ): Promise<boolean> {
    const tipoAlerta = await this.tipoAlertaRepo.findOne({
      where: { codigo: alertaData.tipo_codigo },
    });

    if (!tipoAlerta) {
      this.logger.warn(`Tipo de alerta no encontrado: ${alertaData.tipo_codigo}`);
      return false;
    }

    // Verificar si ya existe alerta del mismo tipo para esta parcela en las últimas 24h
    const hace24h = new Date();
    hace24h.setHours(hace24h.getHours() - 24);

    const existe = await this.alertaRepo
      .createQueryBuilder('alerta')
      .where('alerta.parcela_id = :parcelaId', { parcelaId: parcela.parcela_id })
      .andWhere('alerta.tipo_alerta_id = :tipoId', { tipoId: tipoAlerta.id })
      .andWhere('alerta.creado_en > :hace24h', { hace24h })
      .getOne();

    if (existe) {
      this.logger.debug(`Alerta ${alertaData.tipo_codigo} ya existe para parcela ${parcela.parcela_id}`);
      return false;
    }

    // Crear alerta para el agricultor dueño de la parcela
    const usuarioId = parcela.agricultor?.usuario_id;
    if (!usuarioId) {
      this.logger.warn(`Parcela ${parcela.parcela_id} no tiene agricultor asociado`);
      return false;
    }

    const expira = new Date();
    expira.setHours(expira.getHours() + 48); // expira en 48h

    const alerta = this.alertaRepo.create({
      parcela_id: parcela.parcela_id,
      usuario_id: usuarioId,
      tipo_alerta_id: tipoAlerta.id,
      titulo: alertaData.titulo,
      mensaje: alertaData.mensaje,
      severidad: alertaData.severidad,
      accion_requerida: alertaData.accion_requerida,
      esta_leida: false,
      canales_enviados: 'sistema',
      expira_en: expira,
    });

    await this.alertaRepo.save(alerta);
    this.logger.log(`Alerta creada: ${alertaData.tipo_codigo} para parcela ${parcela.parcela_id}`);
    return true;
  }

    // ── Recordatorios de cosecha próxima ──
    async evaluarRecordatorios(): Promise<number> {
    const hoy = new Date();
    const en7dias = new Date();
    en7dias.setDate(en7dias.getDate() + 7);
    const en3dias = new Date();
    en3dias.setDate(en3dias.getDate() + 3);

    // Cultivos con cosecha en los próximos 7 días
    const cultivosPorCosechar = await this.cultivoRepo
        .createQueryBuilder('c')
        .leftJoinAndSelect('c.parcela', 'parcela')
        .leftJoinAndSelect('parcela.agricultor', 'agricultor')
        .leftJoinAndSelect('c.tipoCultivo', 'tipoCultivo')
        .where('c.fecha_cosecha_esperada BETWEEN :hoy AND :en7dias', { hoy, en7dias })
        .andWhere('c.estado = :estado', { estado: 'activo' })
        .getMany();

    let creadas = 0;

    for (const cultivo of cultivosPorCosechar) {
        const usuarioId = cultivo.parcela?.agricultor?.usuario_id;
        if (!usuarioId) continue;

        const fechaCosecha = new Date(cultivo.fecha_cosecha_esperada);
        const diasRestantes = Math.ceil((fechaCosecha.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
        const esUrgente = diasRestantes <= 3;

        const tipoAlerta = await this.tipoAlertaRepo.findOne({ where: { codigo: 'recordatorio' } });
        if (!tipoAlerta) continue;

        // No duplicar en últimas 24h
        const hace24h = new Date();
        hace24h.setHours(hace24h.getHours() - 24);
        const existe = await this.alertaRepo
        .createQueryBuilder('a')
        .where('a.usuario_id = :uid', { uid: usuarioId })
        .andWhere('a.tipo_alerta_id = :tid', { tid: tipoAlerta.id })
        .andWhere('a.parcela_id = :pid', { pid: cultivo.parcela_id })
        .andWhere('a.creado_en > :hace24h', { hace24h })
        .getOne();

        if (existe) continue;

        const expira = new Date();
        expira.setDate(expira.getDate() + diasRestantes + 1);

        await this.alertaRepo.save(this.alertaRepo.create({
        parcela_id: cultivo.parcela_id,
        usuario_id: usuarioId,
        tipo_alerta_id: tipoAlerta.id,
        titulo: `🌾 Cosecha próxima — ${cultivo.tipoCultivo?.nombre || 'Cultivo'} en ${diasRestantes} día${diasRestantes !== 1 ? 's' : ''}`,
        mensaje: `El cultivo de ${cultivo.tipoCultivo?.nombre || 'cultivo'} en la parcela ${cultivo.parcela?.nombre} tiene fecha de cosecha estimada para el ${fechaCosecha.toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })}.`,
        severidad: esUrgente ? Severidad.ALTA : Severidad.MEDIA,
        accion_requerida: esUrgente
            ? 'La cosecha es inminente. Prepara equipos, mano de obra y logística de transporte.'
            : 'Prepara los equipos necesarios. Verifica condiciones del cultivo y planifica la logística.',
        esta_leida: false,
        canales_enviados: 'sistema',
        expira_en: expira,
        }));

        creadas++;
        this.logger.log(`Recordatorio cosecha creado para cultivo ${cultivo.cultivo_parcela_id}`);
    }

    return creadas;
    }

    // ── Notificación del sistema (manual desde admin) ──
    async crearNotificacionSistema(
    titulo: string,
    mensaje: string,
    usuarioIds?: string[],
    ): Promise<number> {
    const tipoAlerta = await this.tipoAlertaRepo.findOne({ where: { codigo: 'sistema' } });
    if (!tipoAlerta) throw new Error('Tipo de alerta sistema no encontrado');

    // Si no se especifican usuarios, notificar a todos los agricultores activos
    let targets: { usuario_id: string }[] = [];

    if (usuarioIds && usuarioIds.length > 0) {
        targets = usuarioIds.map((id) => ({ usuario_id: id }));
    } else {
        const parcelas = await this.parcelaRepo
        .createQueryBuilder('p')
        .leftJoinAndSelect('p.agricultor', 'agricultor')
        .select(['p.parcela_id', 'agricultor.usuario_id'])
        .getMany();

        const uniqueUsers = new Set(parcelas.map((p) => p.agricultor?.usuario_id).filter(Boolean));
        targets = [...uniqueUsers].map((uid) => ({ usuario_id: uid as string }));
    }

    const expira = new Date();
    expira.setDate(expira.getDate() + 7);

    let creadas = 0;
    for (const target of targets) {
        await this.alertaRepo.save(this.alertaRepo.create({
        usuario_id: target.usuario_id,
        tipo_alerta_id: tipoAlerta.id,
        titulo,
        mensaje,
        severidad: Severidad.INFO,
        esta_leida: false,
        canales_enviados: 'sistema',
        expira_en: expira,
        }));
        creadas++;
    }

    this.logger.log(`Notificación sistema creada para ${creadas} usuarios: ${titulo}`);
    return creadas;
    }
}